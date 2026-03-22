import { useEffect, useMemo, useState } from "react";
import { FiFileText } from "react-icons/fi";

const API_BASE_URL = "http://localhost:3000";

type MyRoomResponse = {
  message: string;
  data: {
    room: {
      id: string;
      roomNumber: string;
      floor: number;
      buildingId?: string | null;
      buildingCode?: string | null;
      buildingName?: string | null;
      roomType: "air" | "fan" | "other" | string;
      monthlyRent: number;
      status: "vacant" | "occupied" | "maintenance" | "reserved" | string;
      tenantName?: string | null;
    };
    contract: {
      id: string;
      startDate: string | null;
      endDate: string | null;
      rentAmount: number;
      depositAmount: number;
      waterRate: number;
      electricRate: number;
      billingDueDay: number | null;
      status: string;
      note?: string | null;
      fileName?: string | null;
      fileUrl?: string | null;
    } | null;
    furniture: {
      id: string;
      name: string;
      quantity: number;
      conditionStatus?: string | null;
      usageStatus?: string | null;
    }[];
  } | null;
};

function getToken() {
  try {
    const local = localStorage.getItem("token");
    const session = sessionStorage.getItem("token");
    return local || session || "";
  } catch {
    return "";
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH").format(Number(value || 0));
}

function mapRoomType(value?: string) {
  switch (value) {
    case "air":
      return "ห้องแอร์";
    case "fan":
      return "ห้องพัดลม";
    case "other":
      return "ห้องอื่น ๆ";
    default:
      return value || "-";
  }
}

function mapRoomStatus(value?: string) {
  switch (value) {
    case "occupied":
      return "ไม่ว่าง";
    case "vacant":
      return "ว่าง";
    case "maintenance":
      return "ซ่อมบำรุง";
    case "reserved":
      return "จองแล้ว";
    default:
      return value || "-";
  }
}

export default function MyRoom() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<MyRoomResponse["data"]>(null);

  const token = useMemo(() => getToken(), []);

  useEffect(() => {
    let cancelled = false;

    async function fetchMyRoom() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`${API_BASE_URL}/api/tenants/my-room`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json: MyRoomResponse = await res.json();

        if (!res.ok) {
          throw new Error(json.message || "โหลดข้อมูลไม่สำเร็จ");
        }

        if (!cancelled) {
          setData(json.data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "เกิดข้อผิดพลาด");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchMyRoom();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="px-6 py-6">
        <div className="rounded-[28px] bg-white p-8 shadow-sm text-gray-500">
          กำลังโหลดข้อมูลห้อง...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-6">
        <div className="rounded-[28px] bg-white p-8 shadow-sm text-red-500">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-6 py-6">
        <h1 className="mb-6 text-[20px] font-bold text-gray-900">ข้อมูลการเช่า</h1>
        <div className="rounded-[28px] bg-white p-8 shadow-sm text-gray-500">
          ยังไม่มีข้อมูลการเช่าสำหรับบัญชีนี้
        </div>
      </div>
    );
  }

  const { room, contract, furniture } = data;
  const totalFurniture = furniture.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return (
    <div className="px-6 py-6 bg-[#f7f7f7] min-h-screen">
      <h1 className="mb-6 text-[20px] font-bold text-gray-900">ข้อมูลการเช่า</h1>

      <div className="space-y-8">
        <section className="rounded-[28px] bg-[#fcfcfc] px-8 py-7 shadow-sm">
          <h2 className="mb-6 text-[22px] font-bold text-gray-900">ข้อมูลการเช่า</h2>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_1.2fr_1.6fr]">
            <div className="space-y-4">
              <InfoRow label="ห้อง" value={room.roomNumber} />
              <InfoRow label="ชั้น" value={String(room.floor ?? "-")} />
              <InfoRow label="อาคาร" value={room.buildingCode || room.buildingName || "-"} />
            </div>

            <div className="space-y-4">
              <InfoRow label="ประเภท" value={mapRoomType(room.roomType)} />
              <InfoRow
                label="ค่าเช่า/เดือน"
                value={`${formatCurrency(room.monthlyRent)} บาท`}
              />

              <div className="flex items-center gap-2 pt-1">
                <span className="text-[16px] text-gray-800">สถานะ :</span>
                <span className="inline-flex rounded-full bg-pink-200 px-4 py-1 text-[13px] text-gray-700">
                  {mapRoomStatus(room.status)}
                </span>
              </div>
            </div>

            <div className="flex items-start lg:justify-center">
              {contract?.fileUrl ? (
                <a
                  href={`${API_BASE_URL}${contract.fileUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-4 text-gray-800 transition hover:opacity-80"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50">
                    <FiFileText className="text-[28px] text-red-500" />
                  </div>
                  <span className="text-[18px] font-semibold break-all">
                    {contract.fileName || "สัญญาเช่า.pdf"}
                  </span>
                </a>
              ) : (
                <div className="flex items-center gap-4 text-gray-400">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                    <FiFileText className="text-[28px]" />
                  </div>
                  <span className="text-[18px] font-semibold">ยังไม่มีไฟล์สัญญา</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] bg-[#fcfcfc] px-8 py-7 shadow-sm min-h-[260px]">
          <h2 className="mb-6 text-[22px] font-bold text-gray-900">เฟอร์นิเจอร์ในห้องนี้</h2>

          <div className="mb-6 text-[18px] font-semibold text-gray-900">
            ทั้งหมด {totalFurniture} ชิ้น
          </div>

          {furniture.length === 0 ? (
            <div className="text-gray-500">ยังไม่มีรายการเฟอร์นิเจอร์</div>
          ) : (
            <ul className="list-disc space-y-2 pl-6 text-[18px] text-gray-900">
              {furniture.map((item) => (
                <li key={item.id}>
                  {item.name} {item.quantity > 1 ? item.quantity : ""}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-[16px] text-gray-900">
      <span className="font-semibold">{label}:</span>
      <span>{value}</span>
    </div>
  );
}