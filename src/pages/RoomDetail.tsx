// src/pages/RoomDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";

type Params = { dormId?: string; roomId?: string };

type Room = {
  id: string;
  roomNumber: string;
  floor: number;
  pricePerMonth: number;
  status: "vacant" | "occupied" | "maintenance" | string;
  tenantName?: string | null;
  cooling?: "air" | "fan" | string;

  // ✅ เพิ่ม: ตึก (ต้องตรงกับ field ใน Firestore: buildingCode)
  buildingCode?: string; // เช่น "A"
};

type Furniture = {
  id: string;
  name: string;
  quantity?: number;
  category?: string;
};

export default function RoomDetail() {
  const { dormId: dormIdParam, roomId } = useParams<Params>();

  // ใช้ dormId จากพารามิเตอร์ถ้ามี ไม่งั้นใช้ที่เก็บไว้ใน localStorage
  const dormId = dormIdParam ?? localStorage.getItem("currentDormId") ?? "dormId";

  const [room, setRoom] = useState<Room | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);

  const [furniture, setFurniture] = useState<Furniture[]>([]);
  const [loadingFurniture, setLoadingFurniture] = useState(true);

  // ----- โหลดข้อมูลห้องแบบเรียลไทม์ -----
  useEffect(() => {
    if (!roomId) return;
    const ref = doc(db, "dorms", dormId, "rooms", roomId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setRoom(null);
        } else {
          setRoom({ id: snap.id, ...(snap.data() as Omit<Room, "id">) });
        }
        setLoadingRoom(false);
      },
      () => setLoadingRoom(false)
    );
    return () => unsub();
  }, [dormId, roomId]);

  // ----- โหลดรายการเฟอร์นิเจอร์ของห้องแบบเรียลไทม์ -----
  useEffect(() => {
    if (!roomId) return;
    setLoadingFurniture(true);
    const col = collection(db, "dorms", dormId, "rooms", roomId, "furniture");
    const q = query(col, orderBy("name", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data = d.data() as Omit<Furniture, "id">;
          return {
            id: d.id,
            name: data.name,
            quantity: data.quantity ?? 1,
            category: (data as any).category,
          };
        });
        setFurniture(rows);
        setLoadingFurniture(false);
      },
      () => setLoadingFurniture(false)
    );
    return () => unsub();
  }, [dormId, roomId]);

  // ทำสรุปสั้น ๆ แบบ: เตียง 5 ฟุต 1 • ตู้เสื้อผ้า 1
  const furnitureSummary = useMemo(() => {
    if (!furniture.length) return "—";
    return furniture.map((it) => `${it.name ?? "ไม่ระบุ"} ${Number(it.quantity ?? 1)}`).join(" • ");
  }, [furniture]);

  if (!roomId) return <div className="p-6">ไม่พบ roomId ในพารามิเตอร์</div>;
  if (loadingRoom) return <div className="p-6">กำลังโหลด...</div>;
  if (!room) return <div className="p-6">ไม่พบห้อง</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Link to="/rooms" className="inline-block text-rose-600 underline">
        ← กลับ
      </Link>

      {/* การ์ดรายละเอียดห้อง */}
      <div className="rounded-2xl bg-white p-6 shadow border">
        <h1 className="text-2xl font-bold mb-2">
          ตึก{room.buildingCode || "-"} ห้อง {room.roomNumber}
        </h1>

        {/* ✅ เพิ่มบรรทัดโชว์ตึก */}
        <p>ตึก: {room.buildingCode || "-"}</p>
        <p>ชั้น: {room.floor}</p>
        <p>ห้อง: {room.roomNumber}</p>
        <p>ค่าเช่า/เดือน: {Number(room.pricePerMonth).toLocaleString()} บาท</p>
        <p>สถานะ: {room.status}</p>
        <p>ประเภท: {room.cooling === "air" ? "ห้องแอร์" : "ห้องพัดลม"}</p>
        <p>ผู้เช่า: {room.tenantName || "-"}</p>
      </div>

      {/* การ์ดแสดงเฟอร์นิเจอร์ของห้องนี้ */}
      <div className="rounded-2xl bg-white p-6 shadow border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">เฟอร์นิเจอร์ในห้องนี้</h2>
        </div>

        {loadingFurniture ? (
          <div className="text-sm text-gray-500">กำลังโหลดรายการเฟอร์นิเจอร์...</div>
        ) : furniture.length === 0 ? (
          <div className="text-sm text-gray-500">ยังไม่มีรายการเฟอร์นิเจอร์</div>
        ) : (
          <>
            {/* สรุปแบบบรรทัดเดียว */}
            <div className="mb-3 text-sm">
              <span className="font-medium">สรุป:</span> {furnitureSummary}
            </div>

            {/* ลิสต์ทีละรายการ */}
            <ul className="list-disc pl-5 space-y-1">
              {furniture.map((it) => (
                <li key={it.id} className="text-sm">
                  {it.name} {Number(it.quantity ?? 1)}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
