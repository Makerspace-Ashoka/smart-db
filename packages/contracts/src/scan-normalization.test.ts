import { describe, expect, it } from "vitest";
import { sanitizeScannedCode, scanLookupCompactKey } from "./scan-normalization";

describe("scan normalization", () => {
  it("only strips transport noise from the scanned payload", () => {
    expect(sanitizeScannedCode("  qr_1001\r\n")).toBe("qr_1001");
    expect(sanitizeScannedCode("  QR-1001  ")).toBe("QR-1001");
  });

  it("produces the same compact lookup key for flexible external-barcode variants", () => {
    expect(scanLookupCompactKey("QR-1001")).toBe("qr1001");
    expect(scanLookupCompactKey("qr_1001")).toBe("qr1001");
    expect(scanLookupCompactKey("QR – 1001")).toBe("qr1001");
    expect(scanLookupCompactKey(" QR 1001 ")).toBe("qr1001");
  });
});
