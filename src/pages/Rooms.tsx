// src/pages/Rooms.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useOwnerDormName } from "../hooks/useOwnerDormName";

type Room = {
  id: string;
  roomNumber: string;
  floor: number;
  pricePerMonth: number;
  status: "vacant" | "occupied" | "maintenance";
  tenantName?: string | null;
  cooling?: "air" | "fan";
  buildingCode?: string; // เช่น "A"
};

type Building = {
  id: string; // doc id เช่น "A"
  code: string; // "A"
  displayName: string; // "ตึก A"
  isActive?: boolean;
};

export default function Rooms() {
  const { dormId, loading: loadingDorm } = useOwnerDormName();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);

  const [loading, setLoading] = useState(true);
  const [openAddRoom, setOpenAddRoom] = useState(false);
  const [openAddBuilding, setOpenAddBuilding] = useState(false);

  // ✅ เลือกตึกเพื่อกรอง
  const [selectedBuilding, setSelectedBuilding] = useState<string>("ALL");
  // ✅ เลือกชั้นเพื่อกรอง (เปลี่ยน UI เป็น select เหมือนเพิ่มห้อง)
  const [selectedFloor, setSelectedFloor] = useState<number | "ALL">("ALL");

  // โหลด rooms
  useEffect(() => {
    if (!dormId) {
      setRooms([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const ref = collection(db, "dorms", dormId, "rooms");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Room, "id">),
        })) as Room[];

        // sort: ตึก -> ชั้น -> ห้อง
        list.sort((a, b) => {
          const ba = (a.buildingCode || "").toUpperCase();
          const bb = (b.buildingCode || "").toUpperCase();
          if (ba !== bb) return ba.localeCompare(bb);

          const fa = Number(a.floor ?? 0);
          const fb = Number(b.floor ?? 0);
          if (fa !== fb) return fa - fb;

          return (a.roomNumber || "").localeCompare(b.roomNumber || "", undefined, {
            numeric: true,
            sensitivity: "base",
          });
        });

        setRooms(list);
        setLoading(false);
      },
      (err) => {
        console.error("rooms onSnapshot:", err);
        setRooms([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [dormId]);

  // โหลด buildings (ตึก)
  useEffect(() => {
    if (!dormId) {
      setBuildings([]);
      return;
    }

    const ref = collection(db, "dorms", dormId, "buildings");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Building, "id">),
        })) as Building[];

        const active = list
          .filter((b) => b.isActive !== false)
          .map((b) => ({
            ...b,
            code: (b.code || b.id || "").toUpperCase(),
            displayName: b.displayName || `ตึก ${(b.code || b.id || "").toUpperCase()}`,
          }))
          .sort((a, b) => a.code.localeCompare(b.code));

        setBuildings(active);
      },
      (err) => {
        console.error("buildings onSnapshot:", err);
        setBuildings([]);
      }
    );

    return () => unsub();
  }, [dormId]);

  // เปลี่ยนตึกแล้วรีเซ็ตชั้นเป็น ALL กันกรองแล้วว่างแบบงง ๆ
  useEffect(() => {
    setSelectedFloor("ALL");
  }, [selectedBuilding]);

  // กรองตาม “ตึก” ก่อน
  const buildingFilteredRooms = useMemo(() => {
    if (selectedBuilding === "ALL") return rooms;

    if (selectedBuilding === "UNASSIGNED") {
      return rooms.filter((r) => !r.buildingCode);
    }

    return rooms.filter((r) => (r.buildingCode || "").toUpperCase() === selectedBuilding);
  }, [rooms, selectedBuilding]);

  // สร้างรายการ “ชั้น” จากห้องที่กรองตามตึกแล้ว
  const floors = useMemo(() => {
    const set = new Set<number>();
    for (const r of buildingFilteredRooms) set.add(Number(r.floor ?? 0));
    return Array.from(set).sort((a, b) => a - b);
  }, [buildingFilteredRooms]);

  // กรองตาม “ชั้น” ต่อ
  const filteredRooms = useMemo(() => {
    if (selectedFloor === "ALL") return buildingFilteredRooms;
    return buildingFilteredRooms.filter((r) => Number(r.floor ?? 0) === selectedFloor);
  }, [buildingFilteredRooms, selectedFloor]);

  const statusBadgeClass = (status: Room["status"]) => {
    if (status === "vacant") return "bg-green-50 text-green-700 border border-green-200";
    if (status === "maintenance") return "bg-amber-50 text-amber-700 border border-amber-200";
    return "bg-rose-50 text-rose-700 border border-rose-200"; // occupied
  };

  const canAddRoom = useMemo(() => !!dormId && buildings.length > 0, [dormId, buildings.length]);

  return (
    <div className="min-h-screen bg-rose-50 flex flex-col">
      {/* Top bar */}
      <div className="mx-auto w-full max-w-7xl px-4 py-4 flex items-center gap-2">
        <h1 className="text-xl font-bold text-rose-600 mr-auto">รายการห้องพัก</h1>

        <button
          onClick={() => setOpenAddBuilding(true)}
          className="rounded-xl px-4 py-2 bg-white border hover:bg-gray-50 disabled:opacity-60"
          disabled={!dormId}
          title={!dormId ? "ยังไม่ได้เลือก/สร้างหอพัก" : ""}
        >
          เพิ่มตึก
        </button>

        <button
          onClick={() => setOpenAddRoom(true)}
          className="rounded-xl px-4 py-2 bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-60"
          disabled={!canAddRoom}
          title={
            !dormId
              ? "ยังไม่ได้เลือก/สร้างหอพัก"
              : buildings.length === 0
              ? "กรุณาเพิ่มตึกก่อน (เช่น ตึก A)"
              : ""
          }
        >
          เพิ่มห้อง
        </button>
      </div>

      {/* Content */}
      <main className="mx-auto w-full max-w-7xl px-4 pb-10">
        {loadingDorm ? (
          <p className="text-gray-500">กำลังโหลดหอของคุณ…</p>
        ) : !dormId ? (
          <p className="text-rose-600">ยังไม่ได้เลือก/สร้างหอพัก</p>
        ) : buildings.length === 0 ? (
          <div className="rounded-2xl bg-white p-4 border border-rose-100">
            <p className="text-gray-700">
              ยังไม่มี “ตึก” ในหอนี้ — ให้กด <b>เพิ่มตึก</b> (เช่น A) ก่อน แล้วค่อยเพิ่มห้อง
            </p>
          </div>
        ) : loading ? (
          <p className="text-gray-500">กำลังโหลด…</p>
        ) : rooms.length === 0 ? (
          <p className="text-gray-500">ยังไม่มีข้อมูลห้อง</p>
        ) : (
          <>
            {/* แถบปุ่มเลือกตึก */}
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
                  const code = (b.code || b.id || "").toUpperCase();
                  const count = rooms.filter((r) => (r.buildingCode || "").toUpperCase() === code).length;

                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBuilding(code)}
                      className={
                        selectedBuilding === code
                          ? "px-3 py-1 rounded-full bg-rose-500 text-white text-sm"
                          : "px-3 py-1 rounded-full bg-white border text-sm hover:bg-gray-50"
                      }
                      title={b.displayName}
                    >
                      {b.displayName || `ตึก ${code}`} ({count})
                    </button>
                  );
                })}

                {/* ห้องที่ยังไม่กำหนดตึก */}
                {rooms.some((r) => !r.buildingCode) && (
                  <button
                    onClick={() => setSelectedBuilding("UNASSIGNED")}
                    className={
                      selectedBuilding === "UNASSIGNED"
                        ? "px-3 py-1 rounded-full bg-rose-500 text-white text-sm"
                        : "px-3 py-1 rounded-full bg-white border text-sm hover:bg-gray-50"
                    }
                  >
                    ไม่ระบุ ({rooms.filter((r) => !r.buildingCode).length})
                  </button>
                )}
              </div>
            )}

            {/* ✅ เลือกชั้นแบบ select (เหมือนหน้าเพิ่มห้อง) */}
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
                  <option value="ALL">ทุกชั้น ({buildingFilteredRooms.length})</option>
                  {floors.map((f) => {
                    const count = buildingFilteredRooms.filter((r) => Number(r.floor ?? 0) === f).length;
                    return (
                      <option key={f} value={String(f)}>
                        ชั้น {f} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* ปุ่มล้างตัวกรองชั้น (ทางเลือก) */}
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
                  <div key={room.id} className="rounded-2xl bg-white p-4 shadow-sm border border-rose-100">
                    <div className="flex items-start justify-between">
                      <h2 className="text-lg font-semibold text-rose-700">
                        ตึก {room.buildingCode || "-"} ห้อง {room.roomNumber}
                      </h2>
                      <span className={`text-xs rounded-full px-2 py-0.5 ${statusBadgeClass(room.status)}`}>
                        {room.status}
                      </span>
                    </div>

                    <p className="mt-1 text-sm">ชั้น: {room.floor}</p>
                    <p className="text-sm">ค่าเช่า/เดือน: {Number(room.pricePerMonth).toLocaleString()} บาท</p>
                    <p className="text-sm">ประเภท: {room.cooling === "air" ? "ห้องแอร์" : "ห้องพัดลม"}</p>
                    <p className="text-sm">ผู้เช่า: {room.tenantName || "-"}</p>

                    <div className="mt-3">
                      <Link to={room.id} className="text-sm rounded-lg border px-3 py-1 hover:bg-gray-50">
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

      {/* Modal: เพิ่มตึก */}
      <AddBuildingModal open={openAddBuilding} onClose={() => setOpenAddBuilding(false)} dormId={dormId || ""} />

      {/* Modal: เพิ่มห้อง */}
      <AddRoomModal open={openAddRoom} onClose={() => setOpenAddRoom(false)} dormId={dormId || ""} buildings={buildings} />
    </div>
  );
}

/* -------------------- Modal: เพิ่มห้อง -------------------- */
function AddRoomModal({
  open,
  onClose,
  dormId,
  buildings,
}: {
  open: boolean;
  onClose: () => void;
  dormId: string;
  buildings: Building[];
}) {
  type FormState = {
    buildingCode: string;
    roomNumber: string;
    floor: number;
    pricePerMonth: number;
    status: "vacant" | "occupied" | "maintenance";
    tenantName: string;
    cooling: "air" | "fan";
  };

  const [form, setForm] = useState<FormState>({
    buildingCode: "",
    roomNumber: "",
    floor: 1,
    pricePerMonth: 0,
    status: "vacant",
    tenantName: "",
    cooling: "fan",
  });

  useEffect(() => {
    if (!open) return;
    if (!form.buildingCode && buildings.length > 0) {
      setForm((s) => ({ ...s, buildingCode: buildings[0].code }));
    }
  }, [open, buildings, form.buildingCode]);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr("");

    if (!dormId) return setErr("ยังไม่ได้เลือก/สร้างหอพัก");
    if (buildings.length === 0) return setErr("ยังไม่มีตึก กรุณาเพิ่มตึกก่อน");
    if (!form.buildingCode) return setErr("กรุณาเลือกตึก");
    if (!form.roomNumber.trim()) return setErr("กรุณากรอกเลขห้อง");
    if (form.pricePerMonth < 0) return setErr("ค่าเช่าต้องเป็นจำนวนบวก");

    setSaving(true);
    try {
      await addDoc(collection(db, "dorms", dormId, "rooms"), {
        buildingCode: form.buildingCode,
        roomNumber: form.roomNumber.trim(),
        floor: Number(form.floor),
        pricePerMonth: Number(form.pricePerMonth),
        status: form.status,
        tenantName: form.tenantName.trim() || null,
        cooling: form.cooling,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      onClose();
      setForm({
        buildingCode: buildings[0]?.code || "",
        roomNumber: "",
        floor: 1,
        pricePerMonth: 0,
        status: "vacant",
        tenantName: "",
        cooling: "fan",
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
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
                value={form.buildingCode}
                onChange={(e) => update("buildingCode", e.target.value)}
                disabled={buildings.length === 0}
              >
                <option value="" disabled>
                  เลือกตึก
                </option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.code}>
                    {b.displayName || b.code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600">เลขห้อง *</label>
              <input
                type="text"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={form.roomNumber}
                onChange={(e) => update("roomNumber", e.target.value)}
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
                value={form.floor}
                onChange={(e) => update("floor", Number(e.target.value))}
                min={0}
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">ค่าเช่า/เดือน (บาท)</label>
              <input
                type="number"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={form.pricePerMonth}
                onChange={(e) => update("pricePerMonth", Number(e.target.value))}
                min={0}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">สถานะ</label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={form.status}
                onChange={(e) => update("status", e.target.value as FormState["status"])}
              >
                <option value="vacant">vacant</option>
                <option value="occupied">occupied</option>
                <option value="maintenance">maintenance</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600">ประเภทห้อง</label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={form.cooling}
                onChange={(e) => update("cooling", e.target.value as FormState["cooling"])}
              >
                <option value="fan">ห้องพัดลม</option>
                <option value="air">ห้องแอร์</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600">ชื่อผู้เช่า (ถ้ามี)</label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={form.tenantName}
              onChange={(e) => update("tenantName", e.target.value)}
              placeholder="สมชาย ใจดี"
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

/* -------------------- Modal: เพิ่มตึก -------------------- */
function AddBuildingModal({
  open,
  onClose,
  dormId,
}: {
  open: boolean;
  onClose: () => void;
  dormId: string;
}) {
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    if (!dormId) return setErr("ยังไม่ได้เลือก/สร้างหอพัก");

    const c = code.trim().toUpperCase();
    if (!c) return setErr("กรุณากรอกรหัสตึก เช่น A");
    if (!/^[A-Z0-9_-]{1,10}$/.test(c)) return setErr("รหัสตึกไม่ถูกต้อง (A-Z/0-9/-/_)");

    setSaving(true);
    try {
      const ref = doc(db, "dorms", dormId, "buildings", c);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setErr(`ตึก ${c} มีอยู่แล้ว`);
        return;
      }

      await setDoc(ref, {
        code: c,
        displayName: displayName.trim() || `ตึก ${c}`,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setCode("");
      setDisplayName("");
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
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
              value={code}
              onChange={(e) => setCode(e.target.value)}
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
