// src/pages/Furniture.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  addDoc, collection, collectionGroup, deleteDoc, doc, getDoc, getDocs,
  orderBy, query, serverTimestamp, Timestamp, updateDoc, where
} from "firebase/firestore";
import { db } from "../firebase";

type Params = { dormId?: string };
type Room = { id: string; number?: string; name?: string; roomNumber?: string };

type FurnitureInput = {
  name: string;
  category: "" | "bed" | "wardrobe" | "desk" | "chair" | "appliance" | "other";
  condition: "new" | "good" | "damaged" | "needs_repair";
  status: "in_use" | "stored" | "lost" | "disposed";
  quantity: number;
  price?: number | null;
  imageUrl?: string | null;
  acquiredAt?: Date | null;
  lifespanMonths?: number | null;
  notes?: string | null;
};
type Furniture = FurnitureInput & {
  id: string;
  dormId: string;
  roomId: string;
  createdAt?: any;
  updatedAt?: any;
  endOfLifeAt?: any;
};

// ---------- Types สำหรับแจ้งซ่อม ----------
type MaintHist = {
  at?: any;              // Firestore Timestamp
  by?: string | null;
  note?: string | null;
  status?: "open" | "in_progress" | "done" | "cancelled";
};
type Maintenance = {
  id: string;
  title?: string;
  description?: string;
  imageUrl?: string | null;
  status?: "open" | "in_progress" | "done" | "cancelled";
  createdAt?: any;
  updatedAt?: any;
  history?: MaintHist[];
  roomId?: string;
};

function formatDateTH(d?: Date | null) {
  if (!d) return "";
  try {
    return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return d?.toISOString().slice(0, 10) ?? "";
  }
}

export default function FurniturePage() {
  // ---- Dorm context ----
  const { dormId: dormIdParam } = useParams<Params>();
  const dormId = dormIdParam ?? localStorage.getItem("currentDormId") ?? "dormId";

  // ---- URL query ?roomId=xxx (optional) ----
  const [sp] = useSearchParams();
  const preselectRoomId = sp.get("roomId") ?? "";

  // ---- UI state ----
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState<string>(preselectRoomId);
  const [items, setItems] = useState<Furniture[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // ----- ซ่อมเสร็จแล้ว -----
  const [repairs, setRepairs] = useState<Maintenance[]>([]);
  const [repairsLoading, setRepairsLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Furniture | null>(null);
  const [form, setForm] = useState<FurnitureInput>({
    name: "",
    category: "",
    condition: "good",
    status: "in_use",
    quantity: 1,
    price: null,
    imageUrl: "",
    acquiredAt: null,
    lifespanMonths: null,
    notes: "",
  });

  // ใช้ในโมดัลตอน "เพิ่ม" เมื่อ header ยังไม่เลือกห้อง
  const [targetRoomId, setTargetRoomId] = useState<string>(preselectRoomId);

  // ---- Load rooms (for dropdown) ----
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "dorms", dormId, "rooms"));
      const rs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Room[];
      rs.sort((a, b) =>
        String(a.number ?? a.roomNumber ?? a.name ?? a.id)
          .localeCompare(String(b.number ?? b.roomNumber ?? b.name ?? b.id), "th")
      );
      setRooms(rs);
    })();
  }, [dormId]);

  // ---- Load furniture list (room-only or whole-dorm) ----
  async function load() {
    setLoading(true);
    try {
      if (roomId) {
        const qy = query(
          collection(db, "dorms", dormId, "rooms", roomId, "furniture"),
          orderBy("name", "asc")
        );
        const snap = await getDocs(qy);
        setItems(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Furniture[]);
      } else {
        const qy = query(
          collectionGroup(db, "furniture"),
          where("dormId", "==", dormId),
          orderBy("name", "asc")
        );
        const snap = await getDocs(qy);
        setItems(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Furniture[]);
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dormId, roomId]);

  // ---- Load “ซ่อมเสร็จแล้ว” — ต้องเลือกห้องก่อนเท่านั้น ----
  useEffect(() => {
    async function loadRepairs() {
      // ยังไม่เลือกห้อง → ไม่ดึงข้อมูล และเคลียร์รายการ
      if (!roomId) {
        setRepairs([]);
        setRepairsLoading(false);
        return;
      }

      setRepairsLoading(true);
      try {
        const getEffectiveStatus = (data: any): Maintenance["status"] => {
          const s: Maintenance["status"] | undefined = data?.status;
          if (s) return s;
          const hist: MaintHist[] = (data?.history ?? []) as any[];
          if (!hist || hist.length === 0) return undefined;
          return hist[hist.length - 1]?.status;
        };

        const getDoneAt = (data: any): Date | undefined => {
          const hist: MaintHist[] = (data?.history ?? []) as any[];
          const last = hist?.slice().reverse().find(h => h.status === "done");
          if (last?.at?.toDate) return last.at.toDate();
          if (data?.updatedAt?.toDate) return data.updatedAt.toDate();
          if (data?.createdAt?.toDate) return data.createdAt.toDate();
          return undefined;
        };

        // ดึงเฉพาะของ "ห้องที่เลือก"
        let snap;
        try {
          snap = await getDocs(
            query(
              collection(db, "dorms", dormId, "rooms", roomId, "maintenances"),
              orderBy("updatedAt", "desc")
            )
          );
        } catch {
          snap = await getDocs(
            query(
              collection(db, "dorms", dormId, "rooms", roomId, "maintenances"),
              orderBy("createdAt", "desc")
            )
          );
        }

        const list: Maintenance[] = snap.docs.map(d => {
          const data = d.data() as any;
          return {
            id: d.id,
            roomId,
            title: data?.title,
            description: data?.description,
            imageUrl: data?.imageUrl ?? null,
            status: getEffectiveStatus(data),
            createdAt: data?.createdAt,
            updatedAt: data?.updatedAt,
            history: (data?.history ?? []) as MaintHist[],
          };
        });

        const doneOnly = list
          .filter(x => x.status === "done")
          .map(x => ({ ...x, doneAt: getDoneAt(x) } as Maintenance & { doneAt?: Date }))
          .sort((a, b) => (b.doneAt?.getTime() ?? 0) - (a.doneAt?.getTime() ?? 0));

        setRepairs(doneOnly);
      } finally {
        setRepairsLoading(false);
      }
    }

    loadRepairs();
  }, [dormId, roomId]);

  // ---- Search filter ----
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return items;
    return items.filter((i) =>
      (i.name ?? "").toLowerCase().includes(s) ||
      (i.category ?? "").toLowerCase().includes(s) ||
      (i.condition ?? "").toLowerCase().includes(s) ||
      (i.status ?? "").toLowerCase().includes(s) ||
      (i.roomId ?? "").toLowerCase().includes(s)
    );
  }, [items, search]);

  // ---- Form helpers ----
  function openAdd() {
    setEditTarget(null);
    setForm({
      name: "",
      category: "",
      condition: "good",
      status: "in_use",
      quantity: 1,
      price: null,
      imageUrl: "",
      acquiredAt: null,
      lifespanMonths: null,
      notes: "",
    });
    setTargetRoomId(roomId || "");
    setFormOpen(true);
  }

  function openEdit(item: Furniture) {
    setEditTarget(item);
    setForm({
      name: item.name ?? "",
      category: (item.category as any) ?? "",
      condition: item.condition,
      status: item.status,
      quantity: item.quantity ?? 1,
      price: item.price ?? null,
      imageUrl: item.imageUrl ?? "",
      acquiredAt: (item as any).acquiredAt?.toDate?.() ?? null,
      lifespanMonths: (item as any).lifespanMonths ?? null,
      notes: item.notes ?? "",
    });
    setFormOpen(true);
  }

  function calcEndOfLife(acq: Date | null, months: number | null | undefined) {
    if (!acq || !months || months <= 0) return null;
    const d = new Date(acq);
    d.setMonth(d.getMonth() + Number(months));
    return Timestamp.fromDate(d);
  }

  async function submitForm() {
    if (!form.category) { alert("กรุณาเลือกหมวดหมู่"); return; }
    const target = editTarget ? editTarget.roomId : (targetRoomId || roomId);
    if (!target) { alert("กรุณาเลือกห้องที่จะบันทึก"); return; }

    const endOfLifeAt = calcEndOfLife(form.acquiredAt ?? null, form.lifespanMonths ?? null);

    if (editTarget) {
      const ref = doc(db, "dorms", dormId, "rooms", target, "furniture", editTarget.id);
      const payload: any = {
        ...form,
        acquiredAt: form.acquiredAt ? Timestamp.fromDate(form.acquiredAt) : null,
        lifespanMonths: form.lifespanMonths ?? null,
        endOfLifeAt,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(ref, payload);
    } else {
      const col = collection(db, "dorms", dormId, "rooms", target, "furniture");
      await addDoc(col, {
        ...form,
        price: form.price ?? null,
        imageUrl: form.imageUrl ?? null,
        acquiredAt: form.acquiredAt ? Timestamp.fromDate(form.acquiredAt) : null,
        lifespanMonths: form.lifespanMonths ?? null,
        endOfLifeAt,
        dormId,
        roomId: target,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: null,
        updatedBy: null,
      });
    }
    setFormOpen(false);
    await load();
  }

  async function remove(item: Furniture) {
    if (!confirm(`ลบ "${item.name}" ?`)) return;
    const ref = doc(db, "dorms", dormId, "rooms", item.roomId, "furniture", item.id);
    await deleteDoc(ref);
    await load();
  }

  async function move(item: Furniture, toRoomId: string) {
    if (toRoomId === item.roomId) return;
    const fromRef = doc(db, "dorms", dormId, "rooms", item.roomId, "furniture", item.id);
    const snap = await getDoc(fromRef);
    if (!snap.exists()) return;

    const data = snap.data()!;
    const toCol = collection(db, "dorms", dormId, "rooms", toRoomId, "furniture");
    await addDoc(toCol, {
      ...data,
      roomId: toRoomId,
      updatedAt: serverTimestamp(),
      updatedBy: null,
    });
    await deleteDoc(fromRef);
    await load();
  }

  const eolPreviewTs =
    form.acquiredAt && form.lifespanMonths ? calcEndOfLife(form.acquiredAt, form.lifespanMonths) : null;
  const eolPreviewDate: Date | null = eolPreviewTs ? (eolPreviewTs as any).toDate?.() ?? null : null;

  return (
    <div className="p-6 space-y-8">
      {/* Controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3 items-center">
          <select
            className="border rounded-lg px-3 py-2"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          >
            {/* เปลี่ยนข้อความเป็น “กรุณาเลือกห้อง” */}
            <option value="">กรุณาเลือกห้อง</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.number ?? r.roomNumber ?? r.name ?? r.id}
              </option>
            ))}
          </select>

          {/* <input
            className="border rounded-lg px-3 py-2 w-64"
            placeholder="ค้นหา: ชื่อ/หมวด/สภาพ/สถานะ/roomId"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          /> */}
        </div>

        <button
          onClick={openAdd}
          className="px-4 py-2 rounded-xl bg-black text-white shadow hover:opacity-90"
        >
          + เพิ่มเฟอร์นิเจอร์
        </button>
      </div>

      {/* Furniture List */}
      {loading ? (
        <div className="text-sm text-gray-500">กำลังโหลด...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-500">ยังไม่มีรายการ</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((it) => (
            <div
              key={it.id}
              className="rounded-2xl p-4 shadow-sm border-2 border-rose-300 bg-white hover:border-rose-400 hover:shadow-md transition"
            >
              <div className="flex items-center gap-3">
                {it.imageUrl ? (
                  <img src={it.imageUrl} alt={it.name} className="w-16 h-16 rounded-lg object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-lg grid place-items-center text-xs border border-rose-200 bg-rose-50 text-rose-500">
                    No image
                  </div>
                )}
                <div>
                  <div className="font-semibold">{it.name}</div>
                  <div className="text-xs text-gray-500">
                    {it.category} • {it.condition} • x{it.quantity ?? 1}
                  </div>
                  <div className="text-xs text-gray-500">ห้อง: {it.roomId}</div>
                </div>
              </div>

              {/* วันหมดอายุ + อายุคงเหลือ */}
              {(() => {
                const eol = (it as any).endOfLifeAt?.toDate?.() as Date | undefined;
                if (!eol) return null;
                const diffMonths = Math.ceil((eol.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30));
                const remainText =
                  diffMonths >= 0
                    ? `อายุคงเหลือ ~ ${diffMonths} เดือน`
                    : `หมดอายุ ${Math.abs(diffMonths)} เดือนแล้ว`;
                return (
                  <div className="mt-1 text-xs text-gray-600">
                    หมดอายุ: <span className="font-medium">{formatDateTH(eol)}</span> • {remainText}
                  </div>
                );
              })()}

              {it.notes ? <div className="mt-2 text-sm text-gray-700">{it.notes}</div> : null}

              <div className="mt-3 text-xs">
                <span className="inline-block rounded-full px-2 py-0.5 border">
                  สถานะ: {it.status}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => openEdit(it)} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">
                  แก้ไข
                </button>
                <button onClick={() => remove(it)} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">
                  ลบ
                </button>

                <div className="ml-auto">
                  <select
                    className="px-2 py-1.5 rounded-lg border"
                    value={it.roomId}
                    onChange={(e) => move(it, e.target.value)}
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id} disabled={r.id === it.roomId}>
                        ย้ายไป: {r.number ?? r.roomNumber ?? r.name ?? r.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Repairs (DONE) */}
      <div>
        <h2 className="text-lg font-semibold mb-3">ประวัติการแจ้งซ่อมที่ซ่อมเสร็จแล้ว</h2>

        {/* ต้องเลือกห้องก่อนถึงจะแสดงประวัติ */}
        {!roomId ? (
          <div className="text-sm text-gray-500">กรุณาเลือกห้องเพื่อดูประวัติการแจ้งซ่อม</div>
        ) : repairsLoading ? (
          <div className="text-sm text-gray-500">กำลังโหลดประวัติซ่อม...</div>
        ) : repairs.length === 0 ? (
          <div className="text-sm text-gray-500">ยังไม่มีรายการซ่อมที่เสร็จแล้ว</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {repairs.map((r) => {
              const histLastDone =
                (r.history ?? []).slice().reverse().find(h => h.status === "done");
              const doneAt =
                histLastDone?.at?.toDate?.() ??
                r.updatedAt?.toDate?.() ??
                r.createdAt?.toDate?.();

              return (
                <div key={r.id} className="border rounded-2xl p-4 bg-white shadow-sm">
                  <div className="flex items-start gap-3">
                    {r.imageUrl ? (
                      <img src={r.imageUrl} alt={r.title ?? ""} className="w-16 h-16 rounded-lg object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gray-100 grid place-items-center text-xs text-gray-400">
                        No image
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{r.title ?? "(ไม่มีหัวข้อ)"}</div>
                      <div className="text-xs text-gray-500">ห้อง: {r.roomId ?? "-"}</div>
                      {doneAt && (
                        <div className="text-xs text-gray-500">
                          เสร็จเมื่อ: {formatDateTH(doneAt)}
                        </div>
                      )}
                    </div>
                  </div>
                  {r.description && (
                    <div className="mt-2 text-sm text-gray-700 line-clamp-3">{r.description}</div>
                  )}
                  <div className="mt-3 text-xs">
                    <span className="inline-block rounded-full px-2 py-0.5 border">
                      สถานะ: done
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 space-y-4">
            <div className="text-lg font-semibold">
              {editTarget ? "แก้ไขเฟอร์นิเจอร์" : "เพิ่มเฟอร์นิเจอร์"}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* เลือกห้อง (เฉพาะตอนเพิ่ม) */}
              {!editTarget && (
                <div className="relative col-span-2">
                  <select
                    className="peer w-full border rounded-lg px-3 py-3 appearance-none focus:outline-none"
                    value={targetRoomId}
                    onChange={(e) => setTargetRoomId(e.target.value)}
                  >
                    <option value="">— เลือกห้องที่จะบันทึก —</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.number ?? r.roomNumber ?? r.name ?? r.id}
                      </option>
                    ))}
                  </select>
                  <label className="pointer-events-none absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500">
                    ห้อง
                  </label>
                </div>
              )}

              {/* ชื่อ */}
              <div className="relative col-span-2">
                <input
                  className="peer w-full border rounded-lg px-3 py-3"
                  placeholder=" "
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <label className="pointer-events-none absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500">
                  ชื่อเฟอร์นิเจอร์ (เช่น เตียง 5 ฟุต)
                </label>
              </div>

              {/* หมวดหมู่ */}
              <div className="relative">
                <select
                  className="peer w-full border rounded-lg px-3 py-3 appearance-none focus:outline-none"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                  required
                >
                  <option value="">— เลือกหมวดหมู่ —</option>
                  <option value="bed">เตียง</option>
                  <option value="wardrobe">ตู้เสื้อผ้า</option>
                  <option value="desk">โต๊ะ</option>
                  <option value="chair">เก้าอี้</option>
                  <option value="appliance">เครื่องใช้ไฟฟ้า</option>
                  <option value="other">อื่น ๆ</option>
                </select>
                <label className="pointer-events-none absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500">
                  หมวดหมู่
                </label>
              </div>

              {/* สภาพ */}
              <div className="relative">
                <select
                  className="peer w-full border rounded-lg px-3 py-3 appearance-none focus:outline-none"
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value as any })}
                >
                  <option value="new">ใหม่</option>
                  <option value="good">ดี</option>
                  <option value="damaged">ชำรุด</option>
                  <option value="needs_repair">ต้องซ่อม</option>
                </select>
                <label className="pointer-events-none absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500">
                  สภาพ
                </label>
              </div>

              {/* สถานะ */}
              <div className="relative">
                <select
                  className="peer w-full border rounded-lg px-3 py-3 appearance-none focus:outline-none"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                >
                  <option value="in_use">ใช้งานอยู่</option>
                  <option value="stored">เก็บคลัง</option>
                  <option value="lost">สูญหาย</option>
                  <option value="disposed">จำหน่ายทิ้ง</option>
                </select>
                <label className="pointer-events-none absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500">
                  สถานะ
                </label>
              </div>

              {/* จำนวน */}
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  className="peer w-full border rounded-lg px-3 py-3"
                  placeholder=" "
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                />
                <label className="pointer-events-none absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500">
                  จำนวน
                </label>
              </div>

              {/* ราคา */}
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  className="peer w-full border rounded-lg px-3 py-3"
                  placeholder=" "
                  value={form.price ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, price: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
                <label className="pointer-events-none absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500">
                  ราคา (ไม่บังคับ)
                </label>
              </div>

              {/* ลิงก์รูป */}
              <div className="relative col-span-2">
                <input
                  className="peer w-full border rounded-lg px-3 py-3"
                  placeholder=" "
                  value={form.imageUrl ?? ""}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                />
                <label className="pointer-events-none absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500">
                  ลิงก์รูปภาพ (URL)
                </label>
              </div>

              {/* วันที่ได้มา */}
              <div className="relative">
                <input
                  type="date"
                  className="peer w-full border rounded-lg px-3 py-3"
                  value={form.acquiredAt ? new Date(form.acquiredAt).toISOString().slice(0, 10) : ""}
                  onChange={(e) =>
                    setForm({ ...form, acquiredAt: e.target.value ? new Date(e.target.value) : null })
                  }
                />
                <label className="pointer-events-none absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500">
                  วันที่ได้มา
                </label>
              </div>

              {/* อายุการใช้งาน (เดือน) */}
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  className="peer w-full border rounded-lg px-3 py-3"
                  placeholder=" "
                  value={form.lifespanMonths ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      lifespanMonths:
                        e.target.value === "" ? null : Math.max(0, Number(e.target.value)),
                    })
                  }
                />
                <label className="pointer-events-none absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500">
                  อายุการใช้งาน (เดือน)
                </label>
              </div>

              {eolPreviewDate && (
                <div className="col-span-2 text-xs text-gray-500">
                  กำหนดหมดอายุ: <span className="font-medium">{formatDateTH(eolPreviewDate)}</span>
                </div>
              )}

              {/* หมายเหตุ */}
              <div className="relative col-span-2">
                <input
                  className="peer w-full border rounded-lg px-3 py-3"
                  placeholder=" "
                  value={form.notes ?? ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
                <label className="pointer-events-none absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500">
                  หมายเหตุ
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg border">
                ยกเลิก
              </button>
              <button onClick={submitForm} className="px-4 py-2 rounded-lg bg-black text-white">
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
