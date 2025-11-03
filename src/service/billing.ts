// src/services/billing.ts
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";

export type NewBillInput = {
  dormId: string;
  roomId: string;
  leaseId: string;
  tenantName?: string | null;
  month: string;              // "YYYY-MM"
  dueDate: Date | string;
  rent: number | string;
  waterUnits: number | string;
  waterRate: number | string;
  elecUnits: number | string;
  elecRate: number | string;
};

const to2 = (n: number) => Math.round(n * 100) / 100;
const assertMonth = (m: string) => {
  if (!/^\d{4}-\d{2}$/.test(m)) throw new Error(`month ต้องเป็น "YYYY-MM" แต่ได้ "${m}"`);
};

function normalize(i: NewBillInput) {
  assertMonth(i.month);
  const due = typeof i.dueDate === "string" ? new Date(i.dueDate) : i.dueDate;
  if (!(due instanceof Date) || isNaN(due.getTime())) throw new Error("dueDate ไม่ถูกต้อง");

  const rent = to2(Number(i.rent) || 0);
  const wu   = to2(Number(i.waterUnits) || 0);
  const wr   = to2(Number(i.waterRate) || 0);
  const eu   = to2(Number(i.elecUnits) || 0);
  const er   = to2(Number(i.elecRate) || 0);

  const waterAmt = to2(wu * wr);
  const elecAmt  = to2(eu * er);
  const subTotal = to2(rent + waterAmt + elecAmt);

  return { due, rent, wu, wr, eu, er, waterAmt, elecAmt, subTotal };
}

export async function createBill(input: NewBillInput) {
  if (!input.dormId || !input.roomId || !input.leaseId)
    throw new Error("ต้องระบุ dormId, roomId, leaseId");

  const { due, rent, wu, wr, eu, er, waterAmt, elecAmt, subTotal } = normalize(input);

  const payload = {
    month: input.month,
    roomId: input.roomId,
    leaseId: input.leaseId,
    tenantName: input.tenantName ?? null,
    status: "unpaid" as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    dueDate: Timestamp.fromDate(due),
    paidAt: null as Timestamp | null,
    payment: {
      method: null as "promptpay" | "transfer" | "cash" | null,
      slipUrl: null as string | null,
      refCode: null as string | null,
      channel: "promptpay" as const,
    },
    items: [
      { code: "rent",  name: "ค่าห้อง", qty: 1,  unit: "เดือน", unitPrice: rent, amount: rent },
      { code: "water", name: "ค่าน้ำ",  qty: wu, unit: "หน่วย", unitPrice: wr,   amount: waterAmt },
      { code: "elec",  name: "ค่าไฟ",   qty: eu, unit: "หน่วย", unitPrice: er,   amount: elecAmt },
    ],
    totals: { subTotal, discount: 0, serviceFee: 0, grandTotal: subTotal },
    meta:   { waterUnits: wu, waterRate: wr, elecUnits: eu, elecRate: er },
    qrcode: { payload: null as string | null, imageUrl: null as string | null, amount: subTotal },
  };

  const ref = await addDoc(collection(db, "dorms", input.dormId, "bills"), payload);
  return ref.id;
}
