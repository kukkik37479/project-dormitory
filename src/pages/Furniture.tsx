import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getFurnitureRooms } from "../service/furniture";
import type { FurnitureRoom, FurnitureRoomsResponse } from "../types/furniture";

type BuildingOption = {
  id: string;
  displayName: string;
  buildingCode: string;
  sortOrder: number;
};

function normalizeBuildings(
  raw: FurnitureRoomsResponse["filters"]["buildings"] | undefined
): BuildingOption[] {
  if (!raw) return [];

  return raw.map((building: any) => ({
    id: String(building.id ?? ""),
    displayName: String(
      building.displayName ?? building.display_name ?? building.buildingName ?? "-"
    ),
    buildingCode: String(
      building.buildingCode ?? building.building_code ?? ""
    ),
    sortOrder: Number(building.sortOrder ?? building.sort_order ?? 0),
  }));
}

function getRoomStatusLabel(status: string) {
  switch (status) {
    case "vacant":
      return "ว่าง";
    case "occupied":
      return "มีผู้เช่า";
    case "maintenance":
      return "ปรับปรุง";
    case "reserved":
      return "จองแล้ว";
    default:
      return status || "-";
  }
}

function getRoomStatusClass(status: string) {
  switch (status) {
    case "vacant":
      return "bg-emerald-100 text-emerald-700";
    case "occupied":
      return "bg-sky-100 text-sky-700";
    case "maintenance":
      return "bg-amber-100 text-amber-700";
    case "reserved":
      return "bg-violet-100 text-violet-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function Furniture() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [selectedFloorNo, setSelectedFloorNo] = useState("");

  const [response, setResponse] = useState<FurnitureRoomsResponse | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const data = await getFurnitureRooms({
        search: search.trim() || undefined,
        building_id: selectedBuildingId || undefined,
        floor_no: selectedFloorNo ? Number(selectedFloorNo) : undefined,
      });

      setResponse(data);
    } catch (err: any) {
      setError(err?.message || "โหลดข้อมูลห้องสำหรับหน้าเฟอร์นิเจอร์ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [search, selectedBuildingId, selectedFloorNo]);

  const rooms = response?.rooms ?? [];
  const buildings = useMemo(
    () => normalizeBuildings(response?.filters?.buildings),
    [response]
  );
  const floors = response?.filters?.floors ?? [];

  const totalRooms = rooms.length;
  const roomsWithFurniture = rooms.filter((room) => room.hasFurniture).length;
  const totalFurnitureItems = rooms.reduce(
    (sum, room) => sum + (room.furnitureCount || 0),
    0
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                เฟอร์นิเจอร์
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                ค้นหาและจัดการข้อมูลเฟอร์นิเจอร์ของแต่ละห้อง
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                <div className="text-xs text-slate-400">ห้องทั้งหมด</div>
                <div className="mt-1 text-lg font-bold text-slate-900">
                  {totalRooms}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                <div className="text-xs text-slate-400">ห้องที่มีเฟอร์นิเจอร์</div>
                <div className="mt-1 text-lg font-bold text-slate-900">
                  {roomsWithFurniture}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                <div className="text-xs text-slate-400">จำนวนรายการรวม</div>
                <div className="mt-1 text-lg font-bold text-slate-900">
                  {totalFurnitureItems}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">ค้นหาและกรองข้อมูล</h2>
            <p className="mt-1 text-sm text-slate-500">
              ค้นหาจากเลขห้อง ชื่อตึก หรือโค้ดตึก
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                ค้นหาห้อง
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="เช่น 101, A, ตึก A"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <div className="lg:col-span-3">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                ตึก
              </label>
              <select
                value={selectedBuildingId}
                onChange={(e) => {
                  setSelectedBuildingId(e.target.value);
                  setSelectedFloorNo("");
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              >
                <option value="">ทั้งหมด</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-3">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                ชั้น
              </label>
              <select
                value={selectedFloorNo}
                onChange={(e) => setSelectedFloorNo(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              >
                <option value="">ทั้งหมด</option>
                {floors.map((floor) => (
                  <option key={floor} value={floor}>
                    ชั้น {floor}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
          กำลังโหลดข้อมูล...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : (
        <>
          <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
              <h2 className="text-lg font-bold text-slate-900">ห้องทั้งหมด</h2>
              <p className="mt-1 text-sm text-slate-500">
                เลือกห้องเพื่อดูข้อมูลเฟอร์นิเจอร์
              </p>
            </div>

            {rooms.length === 0 ? (
              <div className="p-8 text-center sm:p-12">
                <h3 className="text-lg font-semibold text-slate-900">
                  ไม่พบข้อมูลห้อง
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  ลองเปลี่ยนคำค้นหาหรือตัวกรองใหม่อีกครั้ง
                </p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-sm font-semibold text-slate-700">
                        <th className="px-6 py-4">ห้อง</th>
                        <th className="px-6 py-4">ตึก</th>
                        <th className="px-6 py-4">ชั้น</th>
                        <th className="px-6 py-4">สถานะห้อง</th>
                        <th className="px-6 py-4">จำนวนเฟอร์นิเจอร์</th>
                        <th className="px-6 py-4 text-right">จัดการ</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {rooms.map((room) => (
                        <tr key={room.id} className="text-sm text-slate-700">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">
                              ห้อง {room.roomNumber}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {room.roomLabel}
                            </div>
                          </td>

                          <td className="px-6 py-4">{room.buildingName}</td>
                          <td className="px-6 py-4">ชั้น {room.floorNo}</td>

                          <td className="px-6 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${getRoomStatusClass(
                                room.status
                              )}`}
                            >
                              {getRoomStatusLabel(room.status)}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-900">
                              {room.furnitureCount} รายการ
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {room.hasFurniture
                                ? "มีข้อมูลเฟอร์นิเจอร์"
                                : "ยังไม่มีข้อมูลเฟอร์นิเจอร์"}
                            </div>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <Link
                              to={`/furniture/${room.id}`}
                              className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
                            >
                              ข้อมูลเฟอร์นิเจอร์
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:hidden">
                  {rooms.map((room) => (
                    <article
                      key={room.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold text-slate-900">
                            ห้อง {room.roomNumber}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {room.buildingName} • ชั้น {room.floorNo}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getRoomStatusClass(
                            room.status
                          )}`}
                        >
                          {getRoomStatusLabel(room.status)}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <div className="text-xs text-slate-400">ผู้เช่า</div>
                          <div className="mt-1 font-medium text-slate-800">
                            {room.tenantName || "-"}
                          </div>
                        </div>

                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <div className="text-xs text-slate-400">
                            จำนวนเฟอร์นิเจอร์
                          </div>
                          <div className="mt-1 font-medium text-slate-800">
                            {room.furnitureCount} รายการ
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <Link
                          to={`/furniture/${room.id}`}
                          className="inline-flex w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
                        >
                          ข้อมูลเฟอร์นิเจอร์
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}