// src/pages/OwnerRepairs.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";
import { useOwnerDormName } from "../hooks/useOwnerDormName";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";

/** ---------- Types ---------- */
type MaintenanceStatus = "open" | "in_progress" | "done" | "cancelled";

type Maintenance = {
  id: string;
  title: string;
  description: string;
  status: MaintenanceStatus;
  imageUrl?: string | null;
  images?: string[];
  createdBy?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  history?: Array<{
    status: MaintenanceStatus;
    note?: string | null;
    at?: Timestamp;
    by?: string | null;
  }>;
  tenantName?: string | null;
};

type Room = { id: string; roomNumber: string };
type Task = Maintenance & { roomId: string; roomNumber: string };

/** ---------- Helpers ---------- */
const statusLabel = (s: MaintenanceStatus) =>
  s === "open"
    ? "รอรับเรื่อง"
    : s === "in_progress"
    ? "กำลังดำเนินการ"
    : s === "done"
    ? "ซ่อมเสร็จแล้ว"
    : "ยกเลิก";

const badgeClass = (s: MaintenanceStatus) =>
  s === "open"
    ? "bg-gray-100 text-gray-700"
    : s === "in_progress"
    ? "bg-emerald-100 text-emerald-700"
    : s === "done"
    ? "bg-rose-100 text-rose-700"
    : "bg-neutral-100 text-neutral-600";

const fmt = (ts?: Timestamp) => (ts ? ts.toDate().toLocaleDateString("sv-SE") : "-");

/** ====================================================== */
export default function OwnerRepairs() {
  const { dormId } = useOwnerDormName();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  const [filter, setFilter] = useState<"all" | MaintenanceStatus>("all");

  // อัปเดตสถานะ
  const [newStatus, setNewStatus] = useState<MaintenanceStatus>("in_progress");
  const [note, setNote] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // เก็บ unsub ของ snapshot รายห้อง
  const taskUnsubs = useRef<Record<string, () => void>>({});

  /** โหลด rooms แล้ว subscribe maintenances ของทุกห้อง */
  useEffect(() => {
    // cleanup ทั้งหมดก่อนเริ่มรอบใหม่
    Object.values(taskUnsubs.current).forEach((fn) => fn?.());
    taskUnsubs.current = {};
    setTasks([]);
    setSelectedId("");

    if (!dormId) return;

    const roomsRef = collection(db, "dorms", dormId, "rooms");
    const unsubRooms = onSnapshot(
      roomsRef,
      (snap) => {
        const list: Room[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return { id: d.id, roomNumber: String(data.roomNumber ?? "") };
        });
        list.sort((a, b) => Number(a.roomNumber) - Number(b.roomNumber));
        setRooms(list);

        // subscribe ทีละห้อง (สมัครเฉพาะที่ยังไม่ได้สมัคร)
        const alive = new Set<string>();
        list.forEach((r) => {
          alive.add(r.id);
          if (taskUnsubs.current[r.id]) return;

          const ref = collection(db, "dorms", dormId, "rooms", r.id, "maintenances");
          const qy = query(ref, orderBy("createdAt", "desc"));
          taskUnsubs.current[r.id] = onSnapshot(
            qy,
            (ms) => {
              setTasks((prev) => {
                const others = prev.filter((t) => t.roomId !== r.id);
                const incoming: Task[] = ms.docs.map((d) => {
                  const m = d.data() as any;
                  return {
                    id: d.id,
                    title: m.title,
                    description: m.description,
                    status: (m.status ?? "open") as MaintenanceStatus,
                    imageUrl: m.imageUrl ?? null,
                    images: Array.isArray(m.images) ? m.images.filter(Boolean) : undefined,
                    createdBy: m.createdBy ?? null,
                    createdAt: m.createdAt,
                    updatedAt: m.updatedAt,
                    history: m.history ?? [],
                    tenantName: m.tenantName ?? null,
                    roomId: r.id,
                    roomNumber: r.roomNumber,
                  };
                });
                return [...others, ...incoming].sort(
                  (a, b) =>
                    (b.createdAt?.toMillis?.() ?? 0) -
                    (a.createdAt?.toMillis?.() ?? 0)
                );
              });
            },
            (err) => console.error("maintenances:", err)
          );
        });

        // ยกเลิก subscribe ห้องที่ถูกลบออก
        Object.keys(taskUnsubs.current).forEach((roomId) => {
          if (!alive.has(roomId)) {
            taskUnsubs.current[roomId]?.();
            delete taskUnsubs.current[roomId];
          }
        });
      },
      (err) => console.error("rooms:", err)
    );

    return () => {
      unsubRooms();
      Object.values(taskUnsubs.current).forEach((fn) => fn?.());
      taskUnsubs.current = {};
    };
  }, [dormId]); // ✅ กันลูป — ไม่ผูกกับ selectedId อีก

  /** Auto-select รายการแรกเมื่อ tasks เปลี่ยน หรือ selection ไม่ valid */
  useEffect(() => {
    if (tasks.length === 0) return;

    let ok = false;
    if (selectedId) {
      const [id, roomId] = selectedId.split("@");
      ok = tasks.some((t) => t.id === id && t.roomId === roomId);
    }

    if (!ok) {
      const first = tasks[0];
      setSelectedId(first.id + "@" + first.roomId);
      setNewStatus(first.status);
      setImageUrl(first.imageUrl || "");
      setNote("");
    }
  }, [tasks, selectedId]);

  /** คำนวณ tasks ตาม filter */
  const filtered = useMemo(
    () => (filter === "all" ? tasks : tasks.filter((t) => t.status === filter)),
    [tasks, filter]
  );

  /** task ที่เลือก */
  const selectedTask = useMemo(() => {
    if (!selectedId) return null;
    const [id, roomId] = selectedId.split("@");
    return tasks.find((t) => t.id === id && t.roomId === roomId) || null;
  }, [selectedId, tasks]);

  async function handleUpdateStatus() {
    if (!dormId || !selectedTask) return;

    try {
      const auth = getAuth();
      const ref = doc(
        db,
        "dorms",
        dormId,
        "rooms",
        selectedTask.roomId,
        "maintenances",
        selectedTask.id
      );

      await updateDoc(ref, {
        status: newStatus,
        imageUrl: imageUrl.trim() || null,
        updatedAt: serverTimestamp(), // ✅ sentinel ใช้ได้เพราะเป็นฟิลด์ระดับบนสุด
        history: arrayUnion({
          status: newStatus,
          note: note.trim() || null,
          at: Timestamp.now(),           // ✅ ใช้ Timestamp จริงแทน serverTimestamp()
          by: auth.currentUser?.uid ?? null,
        }),
      });

      setNote("");
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="p-2 md:p-4">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">จัดการรายการแจ้งซ่อม</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* LEFT */}
          <div className="space-y-4 lg:col-span-1">
            <section className="rounded-2xl bg-white border p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">รายการทั้งหมด</h2>
                <select
                  className="rounded-lg border px-3 py-1.5 text-sm"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="open">รอรับเรื่อง</option>
                  <option value="in_progress">กำลังดำเนินการ</option>
                  <option value="done">ซ่อมเสร็จแล้ว</option>
                  <option value="cancelled">ยกเลิก</option>
                </select>
              </div>

              {filtered.length === 0 ? (
                <p className="text-gray-500 text-sm">ไม่มีงานซ่อม</p>
              ) : (
                <ul className="space-y-2 max-h-[420px] overflow-auto pr-1">
                  {filtered.map((t) => {
                    const key = t.id + "@" + t.roomId;
                    const active = selectedId === key;
                    return (
                      <li key={key}>
                        <button
                          onClick={() => {
                            setSelectedId(key);
                            setNewStatus(t.status);
                            setImageUrl(t.imageUrl || "");
                            setNote("");
                          }}
                          className={`w-full text-left rounded-xl p-3 border ${
                            active
                              ? "bg-rose-50 border-rose-300"
                              : "bg-white hover:bg-rose-50/60 border-gray-100"
                          }`}
                        >
                          <div className="font-semibold text-gray-900">
                            {t.roomNumber}{" "}
                            <span className="ml-1 text-gray-500 font-normal">
                              {t.tenantName ? `| ${t.tenantName}` : ""}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700 truncate">{t.title}</div>
                          <div className="mt-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass(
                                t.status
                              )}`}
                            >
                              {statusLabel(t.status)}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="rounded-2xl bg-white border p-4">
              <h2 className="font-semibold text-gray-900 mb-3">ประวัติการแจ้งซ่อม</h2>
              {!selectedTask ? (
                <p className="text-gray-500 text-sm">ยังไม่เลือกรายการ</p>
              ) : selectedTask.history && selectedTask.history.length > 0 ? (
                <ul className="space-y-2 max-h-[220px] overflow-auto pr-1">
                  {selectedTask.history
                    .slice()
                    .sort(
                      (a, b) => (b.at?.toMillis?.() ?? 0) - (a.at?.toMillis?.() ?? 0)
                    )
                    .map((h, idx) => (
                      <li key={(h.at?.toMillis?.() || idx) + ":" + h.status} className="text-sm">
                        <div className="text-gray-600">
                          {fmt(h.at)} • {statusLabel(h.status)}
                        </div>
                        {h.note ? <div className="text-gray-700">{h.note}</div> : null}
                      </li>
                    ))}
                </ul>
              ) : (
                <div className="text-sm text-gray-600">
                  {fmt(selectedTask.createdAt)} • {statusLabel(selectedTask.status)}
                </div>
              )}
            </section>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-2 space-y-4">
            <section className="rounded-2xl bg-white border p-4">
              <h2 className="font-semibold text-gray-900 mb-3">รายละเอียดการแจ้งซ่อม</h2>
              {!selectedTask ? (
                <p className="text-gray-500 text-sm">เลือกรายการทางซ้ายเพื่อดูรายละเอียด</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <LabelValue label="ห้อง" value={selectedTask.roomNumber} />
                  <LabelValue label="ผู้เช่า" value={selectedTask.tenantName || "-"} />
                  <LabelValue label="ปัญหา" value={selectedTask.title} />
                  <LabelValue label="วันที่แจ้ง" value={fmt(selectedTask.createdAt)} />
                  <div className="sm:col-span-2 flex items-center gap-2 mt-1">
                    <span className="text-gray-600">สถานะปัจจุบัน:</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass(
                        selectedTask.status
                      )}`}
                    >
                      {statusLabel(selectedTask.status)}
                    </span>
                  </div>
                  {selectedTask.description ? (
                    <div className="sm:col-span-2">
                      <div className="text-gray-600">รายละเอียด:</div>
                      <div className="text-gray-800">{selectedTask.description}</div>
                    </div>
                  ) : null}

                  {/* รูปจากแจ้งซ่อม: รองรับ imageUrl เดี่ยว หรือ images หลายรูป */}
                  {(() => {
                    const arr = Array.isArray(selectedTask?.images)
                      ? (selectedTask!.images as string[]).filter(Boolean)
                      : [];
                    const single = (selectedTask?.imageUrl || "") as string;
                    const all = arr.length ? arr : single ? [single] : [];
                    if (!all.length) return null;
                    return (
                      <div className="sm:col-span-2">
                        <div className="text-gray-600">รูปจากแจ้งซ่อม:</div>
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {all.map((src, i) => (
                            <a key={i} href={src} target="_blank" rel="noreferrer">
                              <img
                                src={src}
                                alt={`maintenance-${i}`}
                                className="w-full h-36 object-cover rounded-lg border"
                                loading="lazy"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </section>

            <section className="rounded-2xl bg-white border p-4">
              <h2 className="font-semibold text-gray-900 mb-3">อัปเดตสถานะการซ่อม</h2>
              {!selectedTask ? (
                <p className="text-gray-500 text-sm">เลือกรายการทางซ้ายก่อน</p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      className="rounded-xl border px-3 py-2"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as MaintenanceStatus)}
                    >
                      <option value="open">รอรับเรื่อง</option>
                      <option value="in_progress">กำลังดำเนินการ</option>
                      <option value="done">ซ่อมเสร็จแล้ว</option>
                      <option value="cancelled">ยกเลิก</option>
                    </select>
                    <input
                      className="rounded-xl border px-3 py-2"
                      placeholder="หมายเหตุเพิ่มเติม (ลำบี)"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>

                  <div>
                    <div className="text-sm text-gray-600">แบบภาพ (ลำบี):</div>
                    <input
                      className="mt-1 w-full rounded-xl border px-3 py-2"
                      placeholder="วางลิงก์รูปภาพ (ถ้าจะอัปโหลดจริงค่อยเชื่อม Firebase Storage)"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                    />
                    {imageUrl ? (
                      <img src={imageUrl} className="mt-3 max-h-36 rounded-lg border" alt="preview" />
                    ) : null}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleUpdateStatus}
                      className="rounded-xl px-5 py-2.5 bg-rose-500 text-white hover:bg-rose-600"
                    >
                      บันทึกการอัปเดต
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ---------- Small components ---------- */
function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-gray-600">{label}:</div>
      <div className="text-gray-900">{value}</div>
    </div>
  );
}
