import { useCallback, useEffect, useRef, useState } from "react";

type PermissionState = "prompt" | "granted" | "denied" | "unknown";

interface UseCameraResult {
  isSupported: boolean;
  permissionState: PermissionState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isScanning: boolean;
  start: () => Promise<void>;
  stop: () => void;
  lastResult: string | null;
}

const COOLDOWN_MS = 800;
const DUPLICATE_WINDOW_MS = 3000;

export function useCamera(onScan: (code: string) => void): UseCameraResult {
  const [isSupported] = useState(
    () => typeof BarcodeDetector !== "undefined" && !!navigator.mediaDevices?.getUserMedia,
  );
  const [permissionState, setPermissionState] = useState<PermissionState>("unknown");
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastDecodeTimeRef = useRef(0);
  const recentCodesRef = useRef<Map<string, number>>(new Map());
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const stop = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }, []);

  const start = useCallback(async () => {
    if (!isSupported) return;

    stop();
    setLastResult(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setPermissionState("granted");
      setIsScanning(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (!detectorRef.current) {
        detectorRef.current = new BarcodeDetector({
          formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39"],
        });
      }

      const detect = async () => {
        /* v8 ignore next -- refs are always set after start() resolves */
        if (!videoRef.current || !detectorRef.current || !streamRef.current) return;

        const now = Date.now();
        if (now - lastDecodeTimeRef.current < COOLDOWN_MS) {
          animFrameRef.current = requestAnimationFrame(() => void detect());
          return;
        }

        try {
          const barcodes = await detectorRef.current.detect(videoRef.current);
          const first = barcodes[0];
          if (first) {
            const code = first.rawValue;
            const lastSeen = recentCodesRef.current.get(code);
            /* v8 ignore next -- duplicate window re-entry tested via dedup test */
            if (!lastSeen || now - lastSeen > DUPLICATE_WINDOW_MS) {
              recentCodesRef.current.set(code, now);
              lastDecodeTimeRef.current = now;
              setLastResult(code);
              stop();
              onScanRef.current(code);
              return;
            }
          }
        } catch {
          // Detection can fail on empty frames — ignore
        }

        if (streamRef.current) {
          animFrameRef.current = requestAnimationFrame(() => void detect());
        }
      };

      animFrameRef.current = requestAnimationFrame(() => void detect());
    } catch {
      setPermissionState("denied");
    }
  }, [isSupported, stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [stop]);

  return { isSupported, permissionState, videoRef, isScanning, start, stop, lastResult };
}
