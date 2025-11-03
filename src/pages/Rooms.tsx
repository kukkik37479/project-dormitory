// src/pages/Rooms.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useOwnerDormName } from "../hooks/useOwnerDormName";

type Room = {
  id: string;
  roomNumber: string;
  floor: number;
  pricePerMonth: number;
  status: "vacant" | "occupied" | "maintenance";
  tenantName?: string | null;
  cooling?: "air" | "fan";
};

export default function Rooms() {
  const { dormId, loading: loadingDorm } = useOwnerDormName();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);

  useEffect(() => {
    if (!dormId) {
      setRooms([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    // ไม่ใส่ orderBy เพื่อลดการต้องสร้าง index — sort ฝั่ง client แทน
    const ref = collection(db, "dorms", dormId, "rooms");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Room, "id">) })) as Room[];
        list.sort((a, b) => Number(a.roomNumber) - Number(b.roomNumber));
        setRooms(list);
        setLoading(false);
      },
      (err) => {
        console.error("rooms onSnapshot:", err);
        setRooms([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [dormId]);

  const statusBadgeClass = (status: Room["status"]) => {
    if (status === "vacant") return "bg-green-50 text-green-700 border border-green-200";
    if (status === "maintenance") return "bg-amber-50 text-amber-700 border border-amber-200";
    return "bg-rose-50 text-rose-700 border border-rose-200"; // occupied
  };

  return (
    <div className="min-h-screen bg-rose-50 flex flex-col">
      {/* Top bar */}
      <div className="mx-auto w-full max-w-7xl px-4 py-4 flex items-center gap-2">
        <h1 className="text-xl font-bold text-rose-600 mr-auto">รายการห้องพัก</h1>
        <button
          onClick={() => setOpenAdd(true)}
          className="rounded-xl px-4 py-2 bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-60"
          disabled={!dormId}
          title={!dormId ? "ยังไม่ได้เลือก/สร้างหอพัก" : ""}
        >
          เพิ่มห้อง
        </button>
      </div>

      {/* Content */}
      <main className="mx-auto w-full max-w-7xl px-4 pb-10">
        {loadingDorm ? (
          <p className="text-gray-500">กำลังโหลดหอของคุณ…</p>
        ) : !dormId ? (
          <p className="text-rose-600">ยังไม่ได้เลือก/สร้างหอพัก</p>
        ) : loading ? (
          <p className="text-gray-500">กำลังโหลด…</p>
        ) : rooms.length === 0 ? (
          <p className="text-gray-500">ยังไม่มีข้อมูลห้อง</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <div key={room.id} className="rounded-2xl bg-white p-4 shadow-sm border border-rose-100">
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-semibold text-rose-700">ห้อง {room.roomNumber}</h2>
                  <span className={`text-xs rounded-full px-2 py-0.5 ${statusBadgeClass(room.status)}`}>
                    {room.status}
                  </span>
                </div>

                <p className="mt-1 text-sm">ชั้น: {room.floor}</p>
                <p className="text-sm">ค่าเช่า/เดือน: {Number(room.pricePerMonth).toLocaleString()} บาท</p>
                <p className="text-sm">ประเภท: {room.cooling === "air" ? "ห้องแอร์" : "ห้องพัดลม"}</p>
                <p className="text-sm">ผู้เช่า: {room.tenantName || "-"}</p>

                <div className="mt-3">
                  {/* ลิงก์แบบ relative → /rooms/:roomId */}
                  <Link to={room.id} className="text-sm rounded-lg border px-3 py-1 hover:bg-gray-50">
                    ดูรายละเอียด
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal: เพิ่มห้อง */}
      <AddRoomModal open={openAdd} onClose={() => setOpenAdd(false)} dormId={dormId || ""} />
    </div>
  );
}

/* -------------------- Modal: เพิ่มห้อง (ฉบับเต็ม) -------------------- */
function AddRoomModal({
  open,
  onClose,
  dormId,
}: {
  open: boolean;
  onClose: () => void;
  dormId: string;
}) {
  type FormState = {
    roomNumber: string;
    floor: number;
    pricePerMonth: number;
    status: "vacant" | "occupied" | "maintenance";
    tenantName: string;
    cooling: "air" | "fan";
  };

  const [form, setForm] = useState<FormState>({
    roomNumber: "",
    floor: 1,
    pricePerMonth: 0,
    status: "vacant",
    tenantName: "",
    cooling: "fan",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // ใช้ function declaration เพื่อเลี่ยง JSX generic issue และอ่านง่าย
  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr("");

    if (!dormId) return setErr("ยังไม่ได้เลือก/สร้างหอพัก");
    if (!form.roomNumber.trim()) return setErr("กรุณากรอกเลขห้อง");
    if (form.pricePerMonth < 0) return setErr("ค่าเช่าต้องเป็นจำนวนบวก");

    setSaving(true);
    try {
      await addDoc(collection(db, "dorms", dormId, "rooms"), {
        roomNumber: form.roomNumber.trim(), // เก็บเป็น string เพื่อ sort ง่าย
        floor: Number(form.floor),
        pricePerMonth: Number(form.pricePerMonth),
        status: form.status,
        tenantName: form.tenantName.trim() || null,
        cooling: form.cooling,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      onClose();
      // reset แบบรวดเร็ว
      setForm({
        roomNumber: "",
        floor: 1,
        pricePerMonth: 0,
        status: "vacant",
        tenantName: "",
        cooling: "fan",
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-rose-700">เพิ่มห้องใหม่</h3>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {/* เลขห้อง */}
          <div>
            <label className="text-sm text-gray-600">เลขห้อง *</label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={form.roomNumber}
              onChange={(e) => update("roomNumber", e.target.value)}
              placeholder="เช่น 101"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* ชั้น */}
            <div>
              <label className="text-sm text-gray-600">ชั้น</label>
              <input
                type="number"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={form.floor}
                onChange={(e) => update("floor", Number(e.target.value))}
                min={0}
              />
            </div>

            {/* ค่าเช่า/เดือน */}
            <div>
              <label className="text-sm text-gray-600">ค่าเช่า/เดือน (บาท)</label>
              <input
                type="number"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={form.pricePerMonth}
                onChange={(e) => update("pricePerMonth", Number(e.target.value))}
                min={0}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* สถานะ */}
            <div>
              <label className="text-sm text-gray-600">สถานะ</label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={form.status}
                onChange={(e) => update("status", e.target.value as FormState["status"])}
              >
                <option value="vacant">vacant</option>
                <option value="occupied">occupied</option>
                <option value="maintenance">maintenance</option>
              </select>
            </div>

            {/* ประเภทห้อง */}
            <div>
              <label className="text-sm text-gray-600">ประเภทห้อง</label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={form.cooling}
                onChange={(e) => update("cooling", e.target.value as FormState["cooling"])}
              >
                <option value="fan">ห้องพัดลม</option>
                <option value="air">ห้องแอร์</option>
              </select>
            </div>
          </div>

          {/* ชื่อผู้เช่า (ถ้ามี) */}
          <div>
            <label className="text-sm text-gray-600">ชื่อผู้เช่า (ถ้ามี)</label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={form.tenantName}
              onChange={(e) => update("tenantName", e.target.value)}
              placeholder="สมชาย ใจดี"
            />
          </div>

          {/* error */}
          {err && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 text-sm">
              {err}
            </div>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl px-3 py-2 bg-gray-100 hover:bg-gray-200"
              onClick={onClose}
              disabled={saving}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="rounded-xl px-4 py-2 bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "กำลังบันทึก…" : "บันทึก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
