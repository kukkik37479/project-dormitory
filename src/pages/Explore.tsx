import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  getPublicHome,
  type PublicDormCard,
  type PublicVacantRoom,
} from "../service/public.service";

function formatPrice(price?: number | null) {
  if (price === null || price === undefined) return "-";
  return new Intl.NumberFormat("th-TH").format(price);
}

function getDormDetailPath(dorm: { dorm_slug?: string | null; id: string }) {
  return `/dorms/${dorm.dorm_slug || dorm.id}`;
}

export default function Explore() {
  const location = useLocation();
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [dorms, setDorms] = useState<PublicDormCard[]>([]);
  const [vacantRooms, setVacantRooms] = useState<PublicVacantRoom[]>([]);
  const [totalDorms, setTotalDorms] = useState(0);
  const [totalVacantRooms, setTotalVacantRooms] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async (keyword = "") => {
    try {
      setLoading(true);
      setError("");

      const data = await getPublicHome({
        search: keyword,
        dormLimit: 12,
        vacantLimit: 6,
      });

      setDorms(data.dorms || []);
      setVacantRooms(data.featured_vacant_rooms || []);
      setTotalDorms(data.counts?.total_dorms || 0);
      setTotalVacantRooms(data.counts?.total_vacant_rooms || 0);
    } catch (err) {
      console.error(err);
      setError("โหลดข้อมูลหน้าเยี่ยมชมไม่สำเร็จ");
      setDorms([]);
      setVacantRooms([]);
      setTotalDorms(0);
      setTotalVacantRooms(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData("");
  }, [loadData]);

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const keyword = input.trim();
    setSearch(keyword);
    loadData(keyword);
  };

  const onClearSearch = () => {
    setInput("");
    setSearch("");
    loadData("");
  };

  const fromList = location.pathname;

  return (
    <div className="min-h-full bg-[#fff7fa]">
      <section className="relative overflow-hidden bg-gradient-to-b from-rose-100 via-rose-50 to-[#fff7fa]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
              ค้นหาหอพักและห้องว่างที่เหมาะกับคุณ
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-sm text-gray-600 sm:text-base">
              ดูหอพักทั้งหมด ห้องว่างแนะนำ และรายละเอียดเบื้องต้นได้ในหน้าเดียว
            </p>

            <form
              onSubmit={onSubmitSearch}
              className="mx-auto mt-8 max-w-3xl rounded-3xl border border-white/80 bg-white/90 p-4 shadow-lg backdrop-blur sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="ค้นหาชื่อหอพัก ที่อยู่ จังหวัด หรือเลขห้อง"
                  className="h-12 w-full rounded-2xl border border-rose-100 bg-white px-4 text-sm outline-none transition focus:border-rose-300"
                />

                <button
                  type="submit"
                  className="h-12 rounded-2xl bg-rose-500 px-6 text-sm font-semibold text-white transition hover:bg-rose-600"
                >
                  ค้นหา
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
                <span className="rounded-full bg-rose-50 px-4 py-2 font-medium text-rose-700">
                  หอพักทั้งหมด {totalDorms} แห่ง
                </span>
                <span className="rounded-full bg-white px-4 py-2 font-medium text-gray-700 border border-rose-100">
                  ห้องว่าง {totalVacantRooms} ห้อง
                </span>

                {search && (
                  <button
                    type="button"
                    onClick={onClearSearch}
                    className="rounded-full border border-rose-200 bg-white px-4 py-2 font-medium text-rose-600"
                  >
                    ล้างคำค้น
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">ห้องว่างแนะนำ</h2>
            <p className="mt-1 text-sm text-gray-500">
              แสดงห้องว่างที่พร้อมเข้าพักจากหอพักที่เปิดให้เข้าชม
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-rose-100 bg-white p-8 text-center text-gray-500 shadow-sm">
            กำลังโหลดข้อมูลห้องว่าง...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-100 bg-white p-8 text-center text-red-500 shadow-sm">
            {error}
          </div>
        ) : vacantRooms.length === 0 ? (
          <div className="rounded-3xl border border-rose-100 bg-white p-8 text-center text-gray-500 shadow-sm">
            {search ? "ไม่พบห้องว่างตามคำค้นนี้" : "ยังไม่มีห้องว่างแนะนำในตอนนี้"}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {vacantRooms.map((room) => (
              <Link
                key={room.id}
                to={`/dorms/${room.dorm_slug || room.dorm_id}`}
                state={{ fromList }}
                className="group overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative h-52 overflow-hidden bg-rose-100">
                  {room.dorm_cover_image ? (
                    <img
                      src={room.dorm_cover_image}
                      alt={room.dorm_name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-400">
                      ไม่มีรูปห้อง/หอพัก
                    </div>
                  )}

                  <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-rose-600 shadow">
                    ห้องว่าง
                  </div>

                  <div className="absolute right-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-gray-700 shadow">
                    {formatPrice(room.monthly_rent)} บาท/เดือน
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900">{room.dorm_name}</h3>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-600">
                      ห้อง {room.room_number}
                    </span>
                    {room.building_name ? (
                      <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">
                        {room.building_name}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">
                      ชั้น {room.floor_no}
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">
                      {room.room_type || "ไม่ระบุประเภท"}
                    </span>
                  </div>

                  <p className="mt-3 min-h-[48px] text-sm leading-6 text-gray-600">
                    {room.dorm_full_address || "ยังไม่มีข้อมูลที่อยู่"}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-500">
                      โทร: {room.dorm_phone || "-"}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
                      ดูรายละเอียด
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">หอพักทั้งหมด</h2>
            <p className="mt-1 text-sm text-gray-500">
              เลือกดูรายละเอียดหอพักที่สนใจได้จากรายการด้านล่าง
            </p>
          </div>

          <div className="text-sm text-gray-500">
            {search ? `ผลการค้นหา ${dorms.length} รายการ` : `แสดง ${dorms.length} รายการ`}
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-rose-100 bg-white p-8 text-center text-gray-500 shadow-sm">
            กำลังโหลดข้อมูลหอพัก...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-100 bg-white p-8 text-center text-red-500 shadow-sm">
            {error}
          </div>
        ) : dorms.length === 0 ? (
          <div className="rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-sm">
            <p className="text-base font-medium text-gray-700">
              ไม่พบหอพักที่ตรงกับคำค้น
            </p>
            <p className="mt-2 text-sm text-gray-500">
              ลองค้นหาด้วยชื่อหอ ที่อยู่ จังหวัด หรือข้อมูลอื่น
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {dorms.map((dorm) => (
              <Link
                key={dorm.id}
                to={getDormDetailPath(dorm)}
                state={{ fromList }}
                className="group overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative h-56 w-full overflow-hidden bg-rose-100">
                  {dorm.cover_image ? (
                    <img
                      src={dorm.cover_image}
                      alt={dorm.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                      ไม่มีรูปปก
                    </div>
                  )}

                  <div className="absolute right-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-gray-700 shadow">
                    {dorm.total_rooms} ห้อง
                  </div>

                  <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-rose-600 shadow">
                    ว่าง {dorm.vacant_rooms} ห้อง
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900">{dorm.name}</h3>

                  <p className="mt-2 min-h-[48px] text-sm leading-6 text-gray-600">
                    {dorm.full_address || "ยังไม่มีข้อมูลที่อยู่"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">
                      โทร: {dorm.phone || "-"}
                    </span>

                    {(dorm.price_min !== null && dorm.price_min !== undefined) ||
                    (dorm.price_max !== null && dorm.price_max !== undefined) ? (
                      <span className="rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-600">
                        {formatPrice(dorm.price_min)} - {formatPrice(dorm.price_max)} บาท
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-center justify-end">
                    <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
                      ดูรายละเอียด
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}