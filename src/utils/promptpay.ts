// src/utils/promptpay.ts
import generatePayload from "promptpay-qr";
import QRCode from "qrcode";

/**
 * id: หมายเลขพร้อมเพย์ (เช่น 0812345678 หรือ เลขบัตรประชาชน)
 * amount: จำนวนเงิน (เช่น 4756.00)
 * return: payload (สตริงสำหรับสแกน) และ dataUrl (รูป QR base64)
 */
export async function buildPromptPayQR(id: string, amount?: number) {
  // amount ใส่ทศนิยม 2 ตำแหน่งพอ
  const payload = generatePayload(id, {
    amount: typeof amount === "number" && amount > 0 ? Number(amount.toFixed(2)) : undefined,
  });
  const dataUrl = await QRCode.toDataURL(payload, { margin: 1, scale: 6 });
  return { payload, dataUrl };
}
