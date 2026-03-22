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
    contract_file_name?: string | null;
    contract_file_path?: string | null;
    contract_file_url?: string | null;
    contract_file_mime_type?: string | null;
    contract_file_size?: number | null;
  } | null;
};

function formatFileSize(bytes?: number | null) {
  if (bytes == null || Number.isNaN(Number(bytes))) return "-";

  const size = Number(bytes);

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileExtension(fileName?: string | null, fileUrl?: string | null) {
  const source = (fileName || fileUrl || "").toLowerCase();
  const dotIndex = source.lastIndexOf(".");
  if (dotIndex === -1) return "FILE";
  return source.slice(dotIndex + 1).toUpperCase();
}

const API_BASE_URL = "http://localhost:3000";

function getContractHref(
  fileUrl?: string | null,
  filePath?: string | null
) {
  const raw = (fileUrl || filePath || "").trim();

  if (!raw) return "";

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  if (raw.startsWith("/")) {
    return `${API_BASE_URL}${raw}`;
  }

  return `${API_BASE_URL}/${raw}`;
}

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

  const contractHref = getContractHref(
  data?.latest_contract?.contract_file_url,
  data?.latest_contract?.contract_file_path
);  

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
          <div className="space-y-4 text-sm">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 font-semibold text-gray-900">ไฟล์สัญญาเช่า</div>

              {contractHref ? (
                <a
                  href={contractHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-pink-300 hover:shadow-sm"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-9 w-9 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
                      <path d="M14 2v5h5" />
                      <path d="M9 13h6" />
                      <path d="M9 17h6" />
                      <path d="M10 9h1" />
                    </svg>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xl font-bold text-slate-900">
                      {data.latest_contract?.contract_file_name || "ไฟล์สัญญาเช่า"}
                    </div>

                    <div className="mt-1 text-sm text-gray-500">
                      {getFileExtension(
                        data.latest_contract?.contract_file_name,
                        contractHref
                      )}
                      {data.latest_contract?.contract_file_size != null
                        ? ` • ${formatFileSize(data.latest_contract.contract_file_size)}`
                        : ""}
                    </div>
                  </div>
                </a>
              ) : (
                <div className="text-gray-500">ยังไม่มีไฟล์สัญญาเช่า</div>
              )}
            </div>
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
