import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getRoomDetail } from "../service/rooms.service";

type RoomDetailData = {
  room: {
    id: string;
    room_number: string;
    floor_no: number | string;
    monthly_rent: number | string;
    status: string;
    tenant_name?: string | null;
    room_type?: string | null;
    note?: string | null;
    building_code?: string | null;
    building_display_name?: string | null;
  };
  furniture_items: {
    id: string;
    item_name: string;
    quantity?: number;
    note?: string | null;
    brand?: string | null;
    model?: string | null;
    color?: string | null;
    size_detail?: string | null;
    condition_status?: string | null;
  }[];
  latest_contract?: {
    id: string;
    contract_number?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    rent_amount?: number | string | null;
    deposit_amount?: number | string | null;
    status?: string | null;
  } | null;
};

export default function RoomDetail() {
  const { roomId } = useParams<{ roomId: string }>();

  const [data, setData] = useState<RoomDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!roomId) return;

      try {
        setLoading(true);
        setError("");

        const result = await getRoomDetail(roomId);
        setData(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "โหลดรายละเอียดห้องไม่สำเร็จ"
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [roomId]);

  const furnitureSummary = useMemo(() => {
    if (!data?.furniture_items?.length) return "—";

    return data.furniture_items
      .map((it) => `${it.item_name ?? "ไม่ระบุ"} ${Number(it.quantity ?? 1)}`)
      .join(" • ");
  }, [data]);

  if (!roomId) return <div className="p-6">ไม่พบ roomId</div>;
  if (loading) return <div className="p-6">กำลังโหลด...</div>;
  if (error) return <div className="p-6 text-rose-600">{error}</div>;
  if (!data?.room) return <div className="p-6">ไม่พบห้อง</div>;

  const room = data.room;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Link to="/rooms" className="inline-block text-rose-600 underline">
        ← กลับ
      </Link>

      <div className="rounded-2xl bg-white p-6 shadow border">
        <h1 className="text-2xl font-bold mb-2">
          {room.building_display_name || `ตึก ${room.building_code || "-"}`} ห้อง{" "}
          {room.room_number}
        </h1>

        <p>ตึก: {room.building_display_name || room.building_code || "-"}</p>
        <p>ชั้น: {room.floor_no}</p>
        <p>ห้อง: {room.room_number}</p>
        <p>ค่าเช่า/เดือน: {Number(room.monthly_rent).toLocaleString()} บาท</p>
        <p>สถานะ: {room.status}</p>
        <p>ประเภท: {room.room_type || "-"}</p>
        <p>ผู้เช่า: {room.tenant_name || "-"}</p>
        <p>หมายเหตุ: {room.note || "-"}</p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow border">
        <h2 className="text-xl font-semibold mb-3">สัญญาล่าสุด</h2>

        {data.latest_contract ? (
          <div className="space-y-1 text-sm">
            <p>เลขสัญญา: {data.latest_contract.contract_number || "-"}</p>
            <p>สถานะ: {data.latest_contract.status || "-"}</p>
            <p>เริ่มสัญญา: {data.latest_contract.start_date || "-"}</p>
            <p>สิ้นสุดสัญญา: {data.latest_contract.end_date || "-"}</p>
            <p>
              ค่าเช่า:{" "}
              {data.latest_contract.rent_amount == null
                ? "-"
                : `${Number(data.latest_contract.rent_amount).toLocaleString()} บาท`}
            </p>
            <p>
              เงินประกัน:{" "}
              {data.latest_contract.deposit_amount == null
                ? "-"
                : `${Number(data.latest_contract.deposit_amount).toLocaleString()} บาท`}
            </p>
          </div>
        ) : (
          <div className="text-sm text-gray-500">ยังไม่มีข้อมูลสัญญา</div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">เฟอร์นิเจอร์ในห้องนี้</h2>
        </div>

        {!data.furniture_items?.length ? (
          <div className="text-sm text-gray-500">ยังไม่มีรายการเฟอร์นิเจอร์</div>
        ) : (
          <>
            <div className="mb-3 text-sm">
              <span className="font-medium">สรุป:</span> {furnitureSummary}
            </div>

            <ul className="list-disc pl-5 space-y-2">
              {data.furniture_items.map((it) => (
                <li key={it.id} className="text-sm">
                  <div>
                    {it.item_name} {Number(it.quantity ?? 1)}
                  </div>
                  {(it.brand || it.model || it.color || it.size_detail) && (
                    <div className="text-gray-500">
                      {[it.brand, it.model, it.color, it.size_detail]
                        .filter(Boolean)
                        .join(" • ")}
                    </div>
                  )}
                  {it.condition_status && (
                    <div className="text-gray-500">สภาพ: {it.condition_status}</div>
                  )}
                  {it.note && <div className="text-gray-500">หมายเหตุ: {it.note}</div>}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}