// src/pages/Explore.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../firebase";
import type { Timestamp } from "firebase/firestore";

type Dorm = {
  id: string;
  name: string;
  address?: string;
  coverImage?: string | null;
  contactPhone?: string;
  updatedAt?: Timestamp | null;     // ✅ ใช้ Timestamp | null
  roomCount?: number;
  status?: string;                  // "active" | ...
  isPublic?: boolean;
};

export default function Explore() {
  const [dorms, setDorms] = useState<Dorm[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ถ้าเริ่มบันทึก isPublic สามารถเพิ่ม where("isPublic", "==", true) ภายหลังได้
    const qRef = query(collection(db, "dorms"));

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        let rows = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Dorm, "id">),
        }));

        // แสดงเฉพาะหอ active ถ้ามีฟิลด์
        rows = rows.filter((r) => !r.status || r.status === "active");

        // ✅ เรียงใหม่ล่าสุดก่อน (Fallback เป็นชื่อ)
        rows.sort((a, b) => {
          const at = a.updatedAt?.toMillis() ?? 0;
          const bt = b.updatedAt?.toMillis() ?? 0;
          return bt - at || a.name.localeCompare(b.name);
        });

        setDorms(rows);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const filtered = dorms.filter((d) => {
    const q = text.trim().toLowerCase();
    if (!q) return true;
    return (
      (d.name ?? "").toLowerCase().includes(q) ||
      (d.address ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-rose-50">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-center gap-3 mb-5">
          <h1 className="text-2xl font-bold text-rose-600 mr-auto">หอพักทั้งหมด</h1>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="ค้นหาชื่อหอ / ที่อยู่"
            className="w-full sm:w-80 rounded-xl border bg-white px-3 py-2"
          />
        </div>

        {loading ? (
          <p className="text-gray-500">กำลังโหลด…</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500">ไม่พบหอพักที่ตรงกับคำค้น</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((d) => (
              <Link
                key={d.id}
                to={`/d/${d.id}`}
                className="group rounded-2xl overflow-hidden border bg-white shadow-sm hover:shadow-md transition"
              >
                <div className="h-40 w-full bg-gray-100">
                  {d.coverImage ? (
                    <img
                      src={d.coverImage}
                      alt={d.name}
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div className="h-40 w-full flex items-center justify-center text-gray-400">
                      ไม่มีรูปปก
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-rose-700">{d.name}</h3>
                    {typeof d.roomCount === "number" && (
                      <span className="text-xs text-gray-500">{d.roomCount} ห้อง</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">{d.address}</p>
                  <div className="mt-3 text-xs text-gray-500">
                    โทร: {d.contactPhone || "-"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
