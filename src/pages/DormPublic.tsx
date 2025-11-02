// src/pages/DormPublic.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { collection, doc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";

type Dorm = { name: string; address?: string; coverImage?: string | null; contactPhone?: string; };
type Room = { id: string; roomNumber: string; pricePerMonth: number; cooling?: "air" | "fan" };

export default function DormPublic() {
  const { dormId } = useParams();
  const [dorm, setDorm] = useState<Dorm | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    if (!dormId) return;

    const u1 = onSnapshot(doc(db, "dorms", dormId), (d) => {
      if (d.exists()) setDorm(d.data() as Dorm);
      else setDorm(null);
    });

    const q = query(
      collection(db, "dorms", dormId, "rooms"),
      where("status", "==", "vacant"),
      orderBy("roomNumber")
    );
    const u2 = onSnapshot(q, (snap) => {
      setRooms(snap.docs.map((x) => ({ id: x.id, ...(x.data() as Omit<Room, "id">) })));
    });

    return () => {
      u1();
      u2();
    };
  }, [dormId]);

  if (!dorm) return <div className="min-h-screen bg-rose-50 p-6">ไม่พบหอนี้</div>;

  return (
    <div className="min-h-screen bg-rose-50">
      <div className="h-56 w-full bg-gray-200">
        {dorm.coverImage && <img src={dorm.coverImage} className="h-56 w-full object-cover" />}
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-bold text-rose-700">{dorm.name}</h1>
        <p className="mt-1 text-gray-700">{dorm.address}</p>
        <p className="mt-1 text-sm text-gray-500">โทร: {dorm.contactPhone || "-"}</p>

        <h2 className="mt-6 mb-3 text-lg font-semibold">ห้องว่าง</h2>
        {rooms.length === 0 ? (
          <p className="text-gray-500">ตอนนี้ยังไม่มีห้องว่าง</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rooms.map((r) => (
              <div key={r.id} className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">ห้อง {r.roomNumber}</div>
                  <div className="text-sm text-gray-500">{r.cooling === "air" ? "แอร์" : "พัดลม"}</div>
                </div>
                <div className="mt-1 text-rose-700 font-bold">
                  {Number(r.pricePerMonth).toLocaleString()} บาท/เดือน
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
