import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  getPublicRoomDetail,
  type PublicRoomDetail,
} from "../service/public.service";

type RoomLocationState = {
  fromList?: string;
  dormPath?: string;
};

function formatPrice(price?: number | null) {
  if (price === null || price === undefined) return "-";
  return new Intl.NumberFormat("th-TH").format(price);
}

function getDefaultListPath() {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token") || "";
  return token ? "/home" : "/explore";
}

export default function RoomPublicDetail() {
  const { roomId } = useParams();
  const location = useLocation();
  const locationState = (location.state as RoomLocationState | null) ?? null;

  const [room, setRoom] = useState<PublicRoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRoom() {
      if (!roomId) {
        setError("ไม่พบรหัสห้อง");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data = await getPublicRoomDetail(roomId);

        if (cancelled) return;
        setRoom(data.room);
      } catch (err) {
        console.error(err);
        if (cancelled) return;
        setRoom(null);
        setError("ไม่พบข้อมูลห้องนี้");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRoom();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  if (loading) {
    return (
      <div className="min-h-full bg-[#fff7fa] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-3xl border border-rose-100 bg-white p-8 text-center text-gray-500 shadow-sm">
          กำลังโหลดรายละเอียดห้อง...
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-full bg-[#fff7fa] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-800">
            {error || "ไม่พบข้อมูลห้อง"}
          </p>

          <div className="mt-4">
            <Link
              to={locationState?.fromList || getDefaultListPath()}
              className="inline-flex items-center rounded-2xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white"
            >
              กลับไปหน้ารายการหอพัก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const backToList = locationState?.fromList || getDefaultListPath();
  const backToDorm =
    locationState?.dormPath || `/dorms/${room.dorm_slug || room.dorm_id}`;

  return (
    <div className="min-h-full bg-[#fff7fa]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap gap-3">
          <Link
            to={backToDorm}
            state={{ fromList: backToList }}
            className="inline-flex items-center rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600"
          >
            ← กลับไปหน้ารายละเอียดหอ
          </Link>

          <Link
            to={backToList}
            className="inline-flex items-center rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600"
          >
            ดูหอพักทั้งหมด
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm">
            <div className="h-[260px] w-full bg-rose-100 sm:h-[360px]">
              {room.dorm_cover_image ? (
                <img
                  src={room.dorm_cover_image}
                  alt={room.dorm_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  ไม่มีรูปภาพห้อง
                </div>
              )}
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
                  {room.status === "vacant" ? "ห้องว่าง" : room.status}
                </span>
                <span className="rounded-full border border-rose-100 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                  ชั้น {room.floor_no}
                </span>
                <span className="rounded-full border border-rose-100 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                  {room.room_type || "ไม่ระบุประเภทห้อง"}
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-bold text-gray-900">
                ห้อง {room.room_number}
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                {room.dorm_name}
                {room.dorm_name_en ? ` • ${room.dorm_name_en}` : ""}
              </p>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoCard
                  label="ค่าเช่ารายเดือน"
                  value={`${formatPrice(room.monthly_rent)} บาท/เดือน`}
                />
                <InfoCard label="สถานะห้อง" value={room.status || "-"} />
                <InfoCard label="ตึก" value={room.building_name || "-"} />
                <InfoCard
                  label="ค่าน้ำ"
                  value={`${formatPrice(room.water_rate)} บาท/หน่วย`}
                />
                <InfoCard
                  label="ค่าไฟ"
                  value={`${formatPrice(room.electric_rate)} บาท/หน่วย`}
                />
              </div>

              {room.note ? (
                <div className="mt-6">
                  <h2 className="text-lg font-semibold text-gray-900">หมายเหตุ</h2>
                  <p className="mt-2 text-sm leading-7 text-gray-600">
                    {room.note}
                  </p>
                </div>
              ) : null}

              {room.dorm_description ? (
                <div className="mt-6">
                  <h2 className="text-lg font-semibold text-gray-900">
                    ข้อมูลเพิ่มเติมเกี่ยวกับหอพัก
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-gray-600">
                    {room.dorm_description}
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-2xl font-bold text-gray-900">ข้อมูลติดต่อ</h2>

            <div className="mt-5 space-y-4">
              <InfoBlock label="ชื่อหอพัก" value={room.dorm_name} />
              <InfoBlock label="ที่อยู่" value={room.dorm_full_address || "-"} />
              <InfoBlock label="เบอร์โทร" value={room.dorm_phone || "-"} />
              <InfoBlock label="ผู้ติดต่อ" value={room.contact_name || "-"} />
              <InfoBlock label="อีเมล" value={room.contact_email || "-"} />
              <InfoBlock label="Line ID" value={room.line_id || "-"} />
              <InfoBlock
                label="Line ผู้ติดต่อ"
                value={room.contact_line_id || "-"}
              />
            </div>

            <div className="mt-6 space-y-3">
              <Link
                to={backToDorm}
                state={{ fromList: backToList }}
                className="flex w-full items-center justify-center rounded-2xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white"
              >
                ดูรายละเอียดหอพัก
              </Link>

              {room.google_map_url ? (
                <a
                  href={room.google_map_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-rose-600"
                >
                  เปิดแผนที่
                </a>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-[#fffafb] p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-gray-900 break-words">
        {value}
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-gray-900 break-words">
        {value}
      </div>
    </div>
  );
}