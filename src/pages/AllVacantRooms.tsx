import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  getPublicHome,
  type PublicVacantRoom,
} from "../service/public.service";

const PAGE_SIZE = 12;

function formatPrice(price?: number | null) {
  if (price === null || price === undefined) return "-";
  return new Intl.NumberFormat("th-TH").format(price);
}

function getBackHomePath() {
  try {
    const rawUser =
      localStorage.getItem("user") || sessionStorage.getItem("user");

    if (!rawUser) return "/explore";

    const user = JSON.parse(rawUser);
    const role = user?.role;

    if (role === "owner" || role === "tenant" || role === "admin") {
      return "/home";
    }

    return "/explore";
  } catch {
    return "/explore";
  }
}

export default function AllVacantRooms() {
  const location = useLocation();
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [rooms, setRooms] = useState<PublicVacantRoom[]>([]);
  const [totalRooms, setTotalRooms] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalRooms / PAGE_SIZE));
  }, [totalRooms]);

  const backHomePath = getBackHomePath();

  const loadData = useCallback(async (keyword = "", nextPage = 1) => {
    try {
      setLoading(true);
      setError("");

      const data = await getPublicHome({
        search: keyword,
        vacantLimit: PAGE_SIZE,
        vacantOffset: (nextPage - 1) * PAGE_SIZE,
      });

      setRooms(data.featured_vacant_rooms || []);
      setTotalRooms(data.counts?.total_vacant_rooms || 0);
      setPage(nextPage);
    } catch (err) {
      console.error(err);
      setError("โหลดข้อมูลห้องว่างไม่สำเร็จ");
      setRooms([]);
      setTotalRooms(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData("", 1);
  }, [loadData]);

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const keyword = input.trim();
    setSearch(keyword);
    loadData(keyword, 1);
  };

  const onClearSearch = () => {
    setInput("");
    setSearch("");
    loadData("", 1);
  };

  const goToPage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    loadData(search, nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const fromList = location.pathname;

  return (
    <div className="min-h-full bg-[#fff7fa]">
      <section className="relative overflow-hidden bg-gradient-to-b from-rose-100 via-rose-50 to-[#fff7fa]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
              ห้องว่างทั้งหมด
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-sm text-gray-600 sm:text-base">
              ดูรายการห้องว่างทั้งหมดที่พร้อมเข้าพัก พร้อมค้นหาและเปลี่ยนหน้าได้
            </p>

            <form
              onSubmit={onSubmitSearch}
              className="mx-auto mt-8 max-w-3xl rounded-3xl border border-white/80 bg-white/90 p-4 shadow-lg backdrop-blur sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="ค้นหาชื่อหอพัก ที่อยู่ จังหวัด เลขห้อง หรือประเภทห้อง"
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
                  ห้องว่างทั้งหมด {totalRooms} ห้อง
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

            <div className="mt-5">
              <Link
                to={backHomePath}
                className="inline-flex items-center rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
              >
                กลับหน้าหลัก
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">รายการห้องว่าง</h2>
            <p className="mt-1 text-sm text-gray-500">
              แสดงห้องว่างทั้งหมดแบบแบ่งหน้า
            </p>
          </div>

          <div className="text-sm text-gray-500">
            หน้า {page} / {totalPages}
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
        ) : rooms.length === 0 ? (
          <div className="rounded-3xl border border-rose-100 bg-white p-8 text-center text-gray-500 shadow-sm">
            {search ? "ไม่พบห้องว่างตามคำค้นนี้" : "ยังไม่มีห้องว่างในตอนนี้"}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {rooms.map((room) => (
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
                    <h3 className="text-lg font-bold text-gray-900">
                      {room.dorm_name}
                    </h3>

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

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="rounded-2xl border border-rose-200 bg-white px-5 py-2.5 text-sm font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ก่อนหน้า
              </button>

              <div className="rounded-2xl bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-700">
                หน้า {page} จาก {totalPages}
              </div>

              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="rounded-2xl border border-rose-200 bg-white px-5 py-2.5 text-sm font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ถัดไป
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}