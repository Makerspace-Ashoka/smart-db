import { useState } from "react";
import { useCamera } from "../hooks/useCamera";

interface QRScannerProps {
  onScan: (code: string) => void;
  enabled: boolean;
}

export function QRScanner({ onScan, enabled }: QRScannerProps) {
  const camera = useCamera(onScan);
  const [showManual, setShowManual] = useState(false);

  if (!camera.isSupported) {
    return null;
  }

  if (camera.permissionState === "denied") {
    return (
      <div className="qr-scanner">
        <p className="banner error">Camera permission denied. Use manual input instead.</p>
      </div>
    );
  }

  return (
    <div className="qr-scanner">
      {camera.permissionState !== "granted" && enabled ? (
        <button type="button" onClick={() => void camera.start()}>
          Enable camera
        </button>
      ) : null}
      {camera.permissionState === "granted" ? (
        <>
          <div className="viewfinder">
            <video ref={camera.videoRef} playsInline muted />
            {camera.lastResult ? <div className="scan-flash" /> : null}
          </div>
          <button
            type="button"
            onClick={() => {
              camera.stop();
              setShowManual(true);
            }}
          >
            Switch to manual input
          </button>
        </>
      ) : null}
      {showManual ? (
        <button type="button" onClick={() => { setShowManual(false); void camera.start(); }}>
          Switch to camera
        </button>
      ) : null}
    </div>
  );
}
