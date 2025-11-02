// src/pages/RoomDetail.tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

const DORM_ID = "dormId";

type Room = {
  id: string;
  roomNumber: string;
  floor: number;
  pricePerMonth: number;
  status: "vacant" | "occupied" | "maintenance" | string;
  tenantName?: string | null;
  cooling?: "air" | "fan";
};

export default function RoomDetail() {
  const { roomId } = useParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    const ref = doc(db, "dorms", DORM_ID, "rooms", roomId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setRoom(null);
        } else {
          setRoom({ id: snap.id, ...(snap.data() as Omit<Room, "id">) });
        }
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [roomId]);

  if (loading) return <div className="p-6">กำลังโหลด...</div>;
  if (!room) return <div className="p-6">ไม่พบห้อง</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link to="/rooms" className="inline-block mb-4 text-rose-600 underline">← กลับ</Link>
      <div className="rounded-2xl bg-white p-6 shadow border">
        <h1 className="text-2xl font-bold mb-2">รายละเอียดห้อง {room.roomNumber}</h1>
        <p>ชั้น: {room.floor}</p>
        <p>ค่าเช่า/เดือน: {Number(room.pricePerMonth).toLocaleString()} บาท</p>
        <p>สถานะ: {room.status}</p>
        <p>ประเภท: {room.cooling === "air" ? "ห้องแอร์" : "ห้องพัดลม"}</p>
        <p>ผู้เช่า: {room.tenantName || "-"}</p>
      </div>
    </div>
  );
}
