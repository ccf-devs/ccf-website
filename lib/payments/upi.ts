import QRCode from "qrcode";
import { PaymentDomainError, PaymentErrorCode } from "./types";

/**
 * Builds a standard trusted UPI payment URI conforming to the NPCI specification.
 *
 * Pattern:
 * upi://pay?pa=<UPI_ID>&pn=<PAYEE_NAME>&am=<AMOUNT>&cu=INR&tn=<NOTE>
 *
 * @param upiId Payee Virtual Payment Address (VPA) / UPI ID (e.g. ccf@okaxis)
 * @param payeeName Registered name of the payee/organization
 * @param amount Transaction amount in INR (must be positive)
 * @param note Optional transaction note / reference description (e.g. Registration Code)
 */
export function buildUpiUri(
  upiId: string,
  payeeName: string,
  amount: number | string,
  note?: string
): string {
  const cleanUpiId = (upiId || "").trim();
  const cleanPayee = (payeeName || "").trim();

  if (!cleanUpiId) {
    throw new PaymentDomainError(
      "UPI ID is required to generate payment URI.",
      PaymentErrorCode.INVALID_REQUEST,
      400
    );
  }

  if (!cleanPayee) {
    throw new PaymentDomainError(
      "Payee name is required to generate payment URI.",
      PaymentErrorCode.INVALID_REQUEST,
      400
    );
  }

  const numAmount = typeof amount === "number" ? amount : parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new PaymentDomainError(
      "Payment amount must be a positive number.",
      PaymentErrorCode.INVALID_REQUEST,
      400
    );
  }

  // Format amount to 2 decimal places if fractional, or integer string
  const formattedAmount = numAmount % 1 === 0 ? String(numAmount) : numAmount.toFixed(2);

  const params = new URLSearchParams({
    pa: cleanUpiId,
    pn: cleanPayee,
    am: formattedAmount,
    cu: "INR",
  });

  if (note && note.trim()) {
    params.set("tn", note.trim());
  }

  return `upi://pay?${params.toString()}`;
}

/**
 * Generates a dynamic QR code as a PNG Data URL from a trusted UPI payment URI.
 *
 * Strictly executes on-demand in-memory; dynamic QR codes are NEVER stored as
 * static assets or database blobs.
 *
 * @param paymentUri Standard trusted UPI URI
 * @returns Base64-encoded Data URL (data:image/png;base64,...)
 */
export async function generateUpiQrCodeDataUrl(paymentUri: string): Promise<string> {
  const cleanUri = (paymentUri || "").trim();
  if (!cleanUri || !cleanUri.startsWith("upi://pay")) {
    throw new PaymentDomainError(
      "A valid upi://pay URI is required to generate a dynamic QR code.",
      PaymentErrorCode.INVALID_REQUEST,
      400
    );
  }

  try {
    return await QRCode.toDataURL(cleanUri, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 280,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.error("[generateUpiQrCodeDataUrl] Failed to generate QR code:", err);
    throw new PaymentDomainError(
      "Failed to generate dynamic payment QR code.",
      PaymentErrorCode.INTERNAL_ERROR,
      500
    );
  }
}

/**
 * Validates and normalizes user-submitted payment reference / UTR.
 *
 * Indian banking UPI UTRs (Unified Transaction Reference) are typically
 * 12-digit numeric codes, though some netbanking or third-party apps format
 * them with letters or prefixes (e.g. UPI/408112345678).
 *
 * Enforces:
 * - Trimmed length between 6 and 50 characters
 * - Alphanumeric with safe delimiters (- / _)
 */
export function normalizeAndValidatePaymentReference(rawReference: string): string {
  if (typeof rawReference !== "string") {
    throw new PaymentDomainError(
      "Payment reference must be a string.",
      PaymentErrorCode.INVALID_REFERENCE,
      400
    );
  }

  const trimmed = rawReference.trim();

  if (!trimmed) {
    throw new PaymentDomainError(
      "Payment reference cannot be empty.",
      PaymentErrorCode.INVALID_REFERENCE,
      400
    );
  }

  if (trimmed.length < 6 || trimmed.length > 50) {
    throw new PaymentDomainError(
      "Payment reference / UTR must be between 6 and 50 characters.",
      PaymentErrorCode.INVALID_REFERENCE,
      400
    );
  }

  // Reject obvious dangerous strings or injection attempts
  if (/[<>{}\\\^~`"]/.test(trimmed)) {
    throw new PaymentDomainError(
      "Payment reference contains invalid characters.",
      PaymentErrorCode.INVALID_REFERENCE,
      400
    );
  }

  return trimmed;
}
