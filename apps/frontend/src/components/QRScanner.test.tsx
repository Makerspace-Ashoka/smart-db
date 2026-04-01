import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QRScanner } from "./QRScanner";

vi.mock("../hooks/useCamera", () => ({
  useCamera: vi.fn(),
}));

import { useCamera } from "../hooks/useCamera";
const mockUseCamera = vi.mocked(useCamera);

function baseCameraResult() {
  return {
    isSupported: true,
    permissionState: "prompt" as const,
    videoRef: { current: null },
    start: vi.fn(),
    stop: vi.fn(),
    lastResult: null,
  };
}

describe("QRScanner", () => {
  it("renders nothing when BarcodeDetector is unsupported", () => {
    mockUseCamera.mockReturnValue({
      ...baseCameraResult(),
      isSupported: false,
    });
    const { container } = render(<QRScanner onScan={vi.fn()} enabled />);
    expect(container.innerHTML).toBe("");
  });

  it("shows enable button when permission is prompt", () => {
    mockUseCamera.mockReturnValue(baseCameraResult());
    render(<QRScanner onScan={vi.fn()} enabled />);
    expect(screen.getByRole("button", { name: "Enable camera" })).toBeInTheDocument();
  });

  it("calls start when enable button is clicked", async () => {
    const user = userEvent.setup();
    const start = vi.fn();
    mockUseCamera.mockReturnValue({ ...baseCameraResult(), start });
    render(<QRScanner onScan={vi.fn()} enabled />);
    await user.click(screen.getByRole("button", { name: "Enable camera" }));
    expect(start).toHaveBeenCalled();
  });

  it("shows viewfinder and scan flash when permission is granted with a result", () => {
    mockUseCamera.mockReturnValue({
      ...baseCameraResult(),
      permissionState: "granted",
      lastResult: "QR-TEST",
    });
    const { container } = render(<QRScanner onScan={vi.fn()} enabled />);
    expect(screen.getByRole("button", { name: "Switch to manual input" })).toBeInTheDocument();
    expect(container.querySelector(".scan-flash")).toBeInTheDocument();
  });

  it("toggles between manual input and camera", async () => {
    const user = userEvent.setup();
    const stop = vi.fn();
    const start = vi.fn();
    mockUseCamera.mockReturnValue({
      ...baseCameraResult(),
      permissionState: "granted",
      stop,
      start,
    });
    render(<QRScanner onScan={vi.fn()} enabled />);
    await user.click(screen.getByRole("button", { name: "Switch to manual input" }));
    expect(stop).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Switch to camera" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Switch to camera" }));
    expect(start).toHaveBeenCalled();
  });

  it("shows denied banner when camera permission is denied", () => {
    mockUseCamera.mockReturnValue({
      ...baseCameraResult(),
      permissionState: "denied",
    });
    render(<QRScanner onScan={vi.fn()} enabled />);
    expect(screen.getByText("Camera permission denied. Use manual input instead.")).toBeInTheDocument();
  });
});
