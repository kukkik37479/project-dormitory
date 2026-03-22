import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createBuilding,
  createRoom,
  getRooms,
  getRoomsMeta,
} from "../service/rooms.service";

type Room = {
  id: string;
  dorm_id: string;
  building_id: string;
  room_number: string;
  floor_no: number | string;
  monthly_rent: number | string;
  room_type: string;
  status: "vacant" | "occupied" | "maintenance";
  tenant_name?: string | null;
  note?: string | null;
  building_code?: string;
  building_display_name?: string;
};

type Building = {
  id: string;
  dorm_id: string;
  building_code: string;
  display_name: string;
  sort_order: number;
};

type RoomTypeOption = {
  id: string;
  type_name: string;
  room_layout?: string | null;
  size_sqm?: number | string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
};

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [openAddRoom, setOpenAddRoom] = useState(false);
  const [openAddBuilding, setOpenAddBuilding] = useState(false);

  const [selectedBuilding, setSelectedBuilding] = useState<string>("ALL");
  const [selectedFloor, setSelectedFloor] = useState<number | "ALL">("ALL");

  const loadAll = async () => {
    try {
      setLoading(true);
      setError("");

      const [metaData, roomsData] = await Promise.all([
        getRoomsMeta(),
        getRooms(),
      ]);

      setBuildings(metaData.buildings || []);
      setRoomTypes(metaData.room_types || []);
      setRooms(roomsData.rooms || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดข้อมูลห้องไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    setSelectedFloor("ALL");
  }, [selectedBuilding]);

  const buildingFilteredRooms = useMemo(() => {
    if (selectedBuilding === "ALL") return rooms;

    return rooms.filter(
      (r) => (r.building_code || "").toUpperCase() === selectedBuilding
    );
  }, [rooms, selectedBuilding]);

  const floors = useMemo(() => {
    const set = new Set<number>();

    for (const r of buildingFilteredRooms) {
      set.add(Number(r.floor_no ?? 0));
    }

    return Array.from(set).sort((a, b) => a - b);
  }, [buildingFilteredRooms]);

  const filteredRooms = useMemo(() => {
    if (selectedFloor === "ALL") return buildingFilteredRooms;

    return buildingFilteredRooms.filter(
      (r) => Number(r.floor_no ?? 0) === selectedFloor
    );
  }, [buildingFilteredRooms, selectedFloor]);

  const statusBadgeClass = (status: Room["status"]) => {
    if (status === "vacant")
      return "bg-green-50 text-green-700 border border-green-200";
    if (status === "maintenance")
      return "bg-amber-50 text-amber-700 border border-amber-200";
    return "bg-rose-50 text-rose-700 border border-rose-200";
  };

  return (
    <div className="min-h-screen bg-rose-50 flex flex-col">
      <div className="mx-auto w-full max-w-7xl px-4 py-4 flex items-center gap-2">
        <h1 className="text-xl font-bold text-rose-600 mr-auto">
          รายการห้องพัก
        </h1>

        <button
          onClick={() => setOpenAddBuilding(true)}
          className="rounded-xl px-4 py-2 bg-white border hover:bg-gray-50"
        >
          เพิ่มตึก
        </button>

        <button
          onClick={() => setOpenAddRoom(true)}
          className="rounded-xl px-4 py-2 bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-60"
          disabled={buildings.length === 0}
          title={buildings.length === 0 ? "กรุณาเพิ่มตึกก่อน" : ""}
        >
          เพิ่มห้อง
        </button>
      </div>

      <main className="mx-auto w-full max-w-7xl px-4 pb-10">
        {loading ? (
          <p className="text-gray-500">กำลังโหลด…</p>
        ) : error ? (
          <div className="rounded-2xl bg-white p-4 border border-rose-100 text-rose-600">
            {error}
          </div>
        ) : buildings.length === 0 ? (
          <div className="rounded-2xl bg-white p-4 border border-rose-100">
            <p className="text-gray-700">
              ยังไม่มีตึกในหอนี้ — ให้กด <b>เพิ่มตึก</b> ก่อน แล้วค่อยเพิ่มห้อง
            </p>
          </div>
        ) : rooms.length === 0 ? (
          <p className="text-gray-500">ยังไม่มีข้อมูลห้อง</p>
        ) : (
          <>
            {buildings.length > 1 && (
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedBuilding("ALL")}
                  className={
                    selectedBuilding === "ALL"
                      ? "px-3 py-1 rounded-full bg-rose-500 text-white text-sm"
                      : "px-3 py-1 rounded-full bg-white border text-sm hover:bg-gray-50"
                  }
                >
                  ทั้งหมด ({rooms.length})
                </button>

                {buildings.map((b) => {
                  const code = (b.building_code || "").toUpperCase();
                  const count = rooms.filter(
                    (r) => (r.building_code || "").toUpperCase() === code
                  ).length;

                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBuilding(code)}
                      className={
                        selectedBuilding === code
                          ? "px-3 py-1 rounded-full bg-rose-500 text-white text-sm"
                          : "px-3 py-1 rounded-full bg-white border text-sm hover:bg-gray-50"
                      }
                    >
                      {b.display_name} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mb-4 flex items-end gap-3 flex-wrap">
              <div className="min-w-[220px]">
                <label className="text-sm text-gray-600">เลือกชั้น</label>
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2 bg-white"
                  value={selectedFloor === "ALL" ? "ALL" : String(selectedFloor)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedFloor(v === "ALL" ? "ALL" : Number(v));
                  }}
                  disabled={floors.length === 0}
                >
                  <option value="ALL">
                    ทุกชั้น ({buildingFilteredRooms.length})
                  </option>
                  {floors.map((f) => {
                    const count = buildingFilteredRooms.filter(
                      (r) => Number(r.floor_no ?? 0) === f
                    ).length;

                    return (
                      <option key={f} value={String(f)}>
                        ชั้น {f} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedFloor !== "ALL" && (
                <button
                  onClick={() => setSelectedFloor("ALL")}
                  className="rounded-xl px-3 py-2 bg-white border hover:bg-gray-50 text-sm"
                >
                  ล้างตัวกรองชั้น
                </button>
              )}
            </div>

            {filteredRooms.length === 0 ? (
              <p className="text-gray-500">ยังไม่มีห้องในตึก/ชั้นที่เลือก</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredRooms.map((room) => (
                  <div
                    key={room.id}
                    className="rounded-2xl bg-white p-4 shadow-sm border border-rose-100"
                  >
                    <div className="flex items-start justify-between">
                      <h2 className="text-lg font-semibold text-rose-700">
                        {room.building_display_name ||
                          `ตึก ${room.building_code || "-"}`}{" "}
                        ห้อง {room.room_number}
                      </h2>
                      <span
                        className={`text-xs rounded-full px-2 py-0.5 ${statusBadgeClass(
                          room.status
                        )}`}
                      >
                        {room.status}
                      </span>
                    </div>

                    <p className="mt-1 text-sm">ชั้น: {room.floor_no}</p>
                    <p className="text-sm">
                      ค่าเช่า/เดือน:{" "}
                      {Number(room.monthly_rent).toLocaleString()} บาท
                    </p>
                    <p className="text-sm">ประเภท: {room.room_type || "-"}</p>
                    <p className="text-sm">ผู้เช่า: {room.tenant_name || "-"}</p>

                    <div className="mt-3">
                      <Link
                        to={`/rooms/${room.id}`}
                        className="text-sm rounded-lg border px-3 py-1 hover:bg-gray-50"
                      >
                        ดูรายละเอียด
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <AddBuildingModal
        open={openAddBuilding}
        onClose={() => setOpenAddBuilding(false)}
        onSaved={loadAll}
      />

      <AddRoomModal
        open={openAddRoom}
        onClose={() => setOpenAddRoom(false)}
        onSaved={loadAll}
        buildings={buildings}
        roomTypes={roomTypes}
      />
    </div>
  );
}

function AddRoomModal({
  open,
  onClose,
  onSaved,
  buildings,
  roomTypes,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
  buildings: Building[];
  roomTypes: RoomTypeOption[];
}) {
  type FormState = {
    building_id: string;
    room_number: string;
    floor_no: number;
    monthly_rent: number;
    room_type: string;
    status: "vacant" | "occupied" | "maintenance";
    tenant_name: string;
    note: string;
  };

  const [form, setForm] = useState<FormState>({
    building_id: "",
    room_number: "",
    floor_no: 1,
    monthly_rent: 0,
    room_type: "",
    status: "vacant",
    tenant_name: "",
    note: "",
  });

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;

    setForm({
      building_id: buildings[0]?.id || "",
      room_number: "",
      floor_no: 1,
      monthly_rent: 0,
      room_type: roomTypes[0]?.type_name || "",
      status: "vacant",
      tenant_name: "",
      note: "",
    });
    setErr("");
  }, [open, buildings, roomTypes]);

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr("");

    if (!form.building_id) return setErr("กรุณาเลือกตึก");
    if (!form.room_number.trim()) return setErr("กรุณากรอกเลขห้อง");
    if (!form.room_type.trim()) return setErr("กรุณาระบุประเภทห้อง");
    if (form.monthly_rent < 0)
      return setErr("ค่าเช่าต้องมากกว่าหรือเท่ากับ 0");

    try {
      setSaving(true);

      await createRoom({
        building_id: form.building_id,
        room_number: form.room_number.trim(),
        floor_no: Number(form.floor_no),
        monthly_rent: Number(form.monthly_rent),
        room_type: form.room_type.trim(),
        status: form.status,
        tenant_name: form.tenant_name.trim() || null,
        note: form.note.trim() || null,
      });

      await onSaved();
      onClose();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "เพิ่มห้องไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-rose-700">เพิ่มห้องใหม่</h3>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">ตึก *</label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={form.building_id}
                onChange={(e) => update("building_id", e.target.value)}
              >
                <option value="" disabled>
                  เลือกตึก
                </option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600">เลขห้อง *</label>
              <input
                type="text"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={form.room_number}
                onChange={(e) => update("room_number", e.target.value)}
                placeholder="เช่น 101"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">ชั้น</label>
              <input
                type="number"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={form.floor_no}
                onChange={(e) => update("floor_no", Number(e.target.value))}
                min={0}
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">
                ค่าเช่า/เดือน (บาท)
              </label>
              <input
                type="number"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={form.monthly_rent}
                onChange={(e) => update("monthly_rent", Number(e.target.value))}
                min={0}
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600">ประเภทห้อง</label>
            {roomTypes.length > 0 ? (
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={form.room_type}
                onChange={(e) => update("room_type", e.target.value)}
              >
                {roomTypes.map((item) => (
                  <option key={item.id} value={item.type_name}>
                    {item.type_name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={form.room_type}
                onChange={(e) => update("room_type", e.target.value)}
                placeholder="เช่น ห้องแอร์"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">สถานะ</label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={form.status}
                onChange={(e) =>
                  update(
                    "status",
                    e.target.value as "vacant" | "occupied" | "maintenance"
                  )
                }
              >
                <option value="vacant">vacant</option>
                <option value="occupied">occupied</option>
                <option value="maintenance">maintenance</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600">ชื่อผู้เช่า (ถ้ามี)</label>
              <input
                type="text"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={form.tenant_name}
                onChange={(e) => update("tenant_name", e.target.value)}
                placeholder="สมชาย ใจดี"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600">หมายเหตุ</label>
            <textarea
              className="mt-1 w-full rounded-xl border px-3 py-2"
              rows={3}
              value={form.note}
              onChange={(e) => update("note", e.target.value)}
              placeholder="รายละเอียดเพิ่มเติม"
            />
          </div>

          {err && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 text-sm">
              {err}
            </div>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl px-3 py-2 bg-gray-100 hover:bg-gray-200"
              onClick={onClose}
              disabled={saving}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="rounded-xl px-4 py-2 bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "กำลังบันทึก…" : "บันทึก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddBuildingModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [buildingCode, setBuildingCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setBuildingCode("");
    setDisplayName("");
    setErr("");
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    const code = buildingCode.trim().toUpperCase();
    if (!code) return setErr("กรุณากรอกรหัสตึก เช่น A");
    if (!/^[A-Z0-9_-]{1,10}$/.test(code)) {
      return setErr("รหัสตึกไม่ถูกต้อง (A-Z/0-9/-/_)");
    }

    try {
      setSaving(true);

      await createBuilding({
        building_code: code,
        display_name: displayName.trim() || `ตึก ${code}`,
      });

      await onSaved();
      onClose();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "เพิ่มตึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-rose-700">เพิ่มตึก</h3>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-sm text-gray-600">รหัสตึก *</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={buildingCode}
              onChange={(e) => setBuildingCode(e.target.value)}
              placeholder="เช่น A"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">ชื่อแสดงผล</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder='เช่น "ตึก A"'
            />
          </div>

          {err && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 text-sm">
              {err}
            </div>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl px-3 py-2 bg-gray-100 hover:bg-gray-200"
              onClick={onClose}
              disabled={saving}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="rounded-xl px-4 py-2 bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "กำลังบันทึก…" : "บันทึก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}