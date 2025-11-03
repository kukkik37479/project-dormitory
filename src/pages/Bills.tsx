// src/pages/Bills.tsx
import { useEffect, useMemo, useState } from "react";
import { createBill, type NewBillInput } from "../service/billing";
import { db } from "../firebase";
import {
  collection,
  doc,
  updateDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Timestamp,
} from "firebase/firestore";
import { useOwnerDormName } from "../hooks/useOwnerDormName";
import { buildPromptPayQR } from "../utils/promptpay";

/** หมายเลขพร้อมเพย์จาก .env (เช่น 0812345678 หรือเลขบัตรประชาชน) */
const PROMPTPAY_ID = import.meta.env.VITE_PROMPTPAY_ID as
  | string
  | undefined;

/** แปลง error (unknown) เป็น string ที่อ่านได้ */
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

type Room = { id: string; roomNumber: string };
type RoomDoc = { roomNumber?: number | string };

type LeaseDoc = {
  tenantName?: string;
  tenant?: { name?: string };
  status?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
};

export default function Bills() {
  const { dormId } = useOwnerDormName();

  // รายการห้อง + ห้องที่เลือก
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState<string>("");

  // สัญญาเช่าที่กำลังใช้งาน (ของห้องที่เลือก)
  const [leaseId, setLeaseId] = useState<string>("");
  const [tenantName, setTenantName] = useState<string>("");

  // ฟอร์มค่าใช้จ่าย
  const [month, setMonth] = useState<string>(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${m}`; // YYYY-MM
  });
  const [dueDateStr, setDueDateStr] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  });

  const [rent, setRent] = useState<number>(3500);
  const [waterUnits, setWaterUnits] = useState<number>(0);
  const [waterRate, setWaterRate] = useState<number>(18);
  const [elecUnits, setElecUnits] = useState<number>(0);
  const [elecRate, setElecRate] = useState<number>(6);

  const [creating, setCreating] = useState(false);

  /** โหลดรายการห้องของหอนี้ */
  useEffect(() => {
    if (!dormId) return;
    const ref = collection(db, "dorms", dormId, "rooms");
    const qy = query(ref, orderBy("roomNumber", "asc"));

    const unsub = onSnapshot(qy, (snap) => {
      const list: Room[] = snap.docs
        .map((d) => {
          const data = d.data() as RoomDoc;
          return { id: d.id, roomNumber: String(data.roomNumber ?? "") };
        })
        .sort(
          (a, b) => (Number(a.roomNumber) || 0) - (Number(b.roomNumber) || 0)
        );

      setRooms(list);
      // ใช้ functional update เพื่อตัดการพึ่งพา roomId ใน deps
      setRoomId((prev) => prev || (list[0]?.id ?? ""));
    });

    return unsub;
  }, [dormId]);

  /** เมื่อเลือกห้อง → หา lease ที่ active (ถ้าไม่เจอ เอาล่าสุดตาม updatedAt/createdAt) */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLeaseId("");
      setTenantName("");
      if (!dormId || !roomId) return;

      const leasesRef = collection(db, "dorms", dormId, "leases");

      // 1) หา active ก่อน
      let snap = await getDocs(
        query(
          leasesRef,
          where("roomId", "==", roomId),
          where("status", "==", "active"),
          limit(1)
        )
      );

      // 2) ถ้าไม่เจอ ลองเอาล่าสุดตาม updatedAt (ถ้าใช้ไม่ได้ค่อยย้อนเป็น createdAt)
      if (snap.empty) {
        try {
          snap = await getDocs(
            query(
              leasesRef,
              where("roomId", "==", roomId),
              orderBy("updatedAt", "desc"),
              limit(1)
            )
          );
        } catch {
          snap = await getDocs(
            query(
              leasesRef,
              where("roomId", "==", roomId),
              orderBy("createdAt", "desc"),
              limit(1)
            )
          );
        }
      }

      if (!snap.empty && !cancelled) {
        const d = snap.docs[0];
        const m = d.data() as LeaseDoc;
        setLeaseId(d.id);
        setTenantName(m.tenantName ?? m.tenant?.name ?? "");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dormId, roomId]);

  /** preview รวมเงิน */
  const totals = useMemo(() => {
    const w = +(waterUnits || 0) * +(waterRate || 0);
    const e = +(elecUnits || 0) * +(elecRate || 0);
    const sub = +(rent || 0) + w + e;
    return {
      waterAmt: Math.round(w * 100) / 100,
      elecAmt: Math.round(e * 100) / 100,
      grand: Math.round(sub * 100) / 100,
    };
  }, [rent, waterUnits, waterRate, elecUnits, elecRate]);

  async function handleCreate() {
    try {
      if (!dormId) throw new Error("ไม่พบ dormId");
      if (!roomId) throw new Error("กรุณาเลือกห้อง");
      if (!leaseId) throw new Error("ห้องนี้ยังไม่มีสัญญาเช่าที่ใช้งานอยู่");

      setCreating(true);

      // 1) สร้างเอกสารบิล
      const payload: NewBillInput = {
        dormId,
        roomId,
        leaseId,
        tenantName: tenantName || undefined,
        month,
        dueDate: new Date(dueDateStr),
        rent: Number(rent),
        waterUnits: Number(waterUnits),
        waterRate: Number(waterRate),
        elecUnits: Number(elecUnits),
        elecRate: Number(elecRate),
      };

      const id = await createBill(payload);

      // 2) สร้าง QR พร้อมเพย์ และอัปเดตกลับเข้าเอกสารบิล
      try {
        if (PROMPTPAY_ID) {
          const amount = totals.grand;
          const { payload: qrPayload, dataUrl } = await buildPromptPayQR(
            PROMPTPAY_ID,
            amount
          );

          await updateDoc(doc(db, "dorms", dormId, "bills", id), {
            payment: {
              method: "promptpay",
              status: "unpaid",
              amount,
              qrPayload,
              qrImage: dataUrl, // base64 data URL
              createdAt: new Date(),
            },
          });
        } else {
          console.warn(
            "VITE_PROMPTPAY_ID ไม่ได้ตั้งค่าใน .env — ข้ามการสร้าง QR"
          );
        }
      } catch (qrErr) {
        console.error("สร้าง/บันทึก QR ล้มเหลว:", qrErr);
      }

      alert(`สร้างบิลสำเร็จ (id: ${id})`);
    } catch (e) {
      alert(getErrorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">บิล</h1>
      <p className="text-gray-600 mt-2">
        หอพัก: <b>{dormId || "-"}</b> • เลือกห้องเพื่อสร้างบิลประจำรอบ
      </p>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-2xl border bg-white p-4">
          <h2 className="font-semibold mb-3">สร้าง/แก้ไขบิลรอบ</h2>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm text-gray-600 mb-1">
                ห้องที่ต้องการออกบิล
              </label>
              <select
                className="w-full rounded-lg border px-3 py-2"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.roomNumber}
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-500 mt-1">
                ผู้เช่า: {tenantName || (leaseId ? "-" : "ไม่มีสัญญาใช้งาน")}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">รอบเดือน</label>
              <input
                type="month"
                className="w-full rounded-lg border px-3 py-2"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                วันครบกำหนดชำระ
              </label>
              <input
                type="date"
                className="w-full rounded-lg border px-3 py-2"
                value={dueDateStr}
                onChange={(e) => setDueDateStr(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">ค่าเช่า</label>
              <input
                type="number"
                className="w-full rounded-lg border px-3 py-2"
                value={rent}
                onChange={(e) => setRent(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                ค่าน้ำ (หน่วย)
              </label>
              <input
                type="number"
                className="w-full rounded-lg border px-3 py-2"
                value={waterUnits}
                onChange={(e) => setWaterUnits(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                ราคาต่อหน่วยน้ำ
              </label>
              <input
                type="number"
                className="w-full rounded-lg border px-3 py-2"
                value={waterRate}
                onChange={(e) => setWaterRate(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                ค่าไฟ (หน่วย)
              </label>
              <input
                type="number"
                className="w-full rounded-lg border px-3 py-2"
                value={elecUnits}
                onChange={(e) => setElecUnits(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                ราคาต่อหน่วยไฟ
              </label>
              <input
                type="number"
                className="w-full rounded-lg border px-3 py-2"
                value={elecRate}
                onChange={(e) => setElecRate(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              รวมบิลรอบนี้:{" "}
              <b>
                {totals.grand.toLocaleString("th-TH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                บาท
              </b>
            </div>
            <button
              onClick={handleCreate}
              disabled={creating || !dormId || !roomId || !leaseId}
              className="rounded-lg bg-rose-500 text-white px-4 py-2 hover:bg-rose-600 disabled:opacity-50"
            >
              {creating ? "กำลังสร้าง…" : "สร้างบิล"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-4">
          <h2 className="font-semibold mb-3">บิลรอบนี้ (พรีวิว)</h2>
          <div className="space-y-1 text-sm">
            <div>
              ห้อง: <b>{rooms.find((r) => r.id === roomId)?.roomNumber || "-"}</b>
            </div>
            <div>
              ผู้เช่า: <b>{tenantName || "-"}</b>
            </div>
            <div>
              รอบเดือน: <b>{month}</b>
            </div>
            <div>
              ครบกำหนด: <b>{dueDateStr}</b>
            </div>
            <div className="pt-2">ค่าห้อง: {rent.toLocaleString()} บาท</div>
            <div>
              ค่าน้ำ: {waterUnits} × {waterRate} ={" "}
              {totals.waterAmt.toLocaleString()} บาท
            </div>
            <div>
              ค่าไฟ: {elecUnits} × {elecRate} ={" "}
              {totals.elecAmt.toLocaleString()} บาท
            </div>
            <div className="pt-2 font-semibold">
              รวมทั้งสิ้น: {totals.grand.toLocaleString()} บาท
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
