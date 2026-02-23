import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
  getDoc,
} from "firebase/firestore";
import { initializeApp, getApp, getApps } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signOut,
} from "firebase/auth";

import { db, auth } from "../firebase";
import { FaHouseUser } from "react-icons/fa6";
import { FiSearch, FiTrash2, FiPlus } from "react-icons/fi";

type Room = {
  id: string;
  buildingCode?: string; // "A"
  floor?: number; // 1
  roomNumber?: string; // "101"
  pricePerMonth?: number;
  status?: "vacant" | "occupied" | "maintenance";

  tenantUid?: string | null;
  tenantName?: string | null;
  tenantPhone?: string | null;
};

type Tenant = {
  uid: string;
  fullName: string;
  phone: string;

  // ✅ ใหม่: username ที่ผู้เช่าพิมพ์จริง
  username: string; // phone@loginDorm
  loginDorm: string;

  // ✅ ใหม่: email ที่สร้างใน Auth จริง
  authEmail: string; // phone__dormId@roomie.local

  dormId: string;
  roomId: string;
  buildingCode: string;
  floor: number;
  roomNumber: string;
  roomCode: string;

  status: "active" | "inactive";
  createdAt: any;
  updatedAt: any;
  createdByUid?: string;
};

function normalizePhone(input: string) {
  return input.replace(/[^\d]/g, "").trim();
}
function isPhone(s: string) {
  return /^[0-9]{9,10}$/.test(s);
}

// ✅ Auth email ฟิก: เบอร์__dormId@roomie.local
function makeTenantAuthEmail(phone: string, dormId: string) {
  return `${phone}__${dormId}@roomie.local`;
}

function generatePassword(length = 12) {
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const nums = "0123456789";
  const all = lower + upper + nums;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  let pwd = pick(lower) + pick(upper) + pick(nums);
  for (let i = pwd.length; i < length; i++) pwd += pick(all);
  return pwd
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

// ✅ Secondary Auth: สร้างบัญชีผู้เช่าโดยไม่ทำให้ owner หลุด session
function getSecondaryAuth() {
  const primary = getApp();
  const existed = getApps().find((a) => a.name === "secondary-auth");
  const secondaryApp =
    existed ?? initializeApp(primary.options, "secondary-auth");
  return getAuth(secondaryApp);
}

export default function Tenants() {
  const [dormId, setDormId] = useState<string | null>(null);
  const [loginDorm, setLoginDorm] = useState<string>(""); // ✅ ใหม่
  const [rooms, setRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState("");

  const [loadingDorm, setLoadingDorm] = useState(true);

  const [openAdd, setOpenAdd] = useState(false);
  const [openCred, setOpenCred] = useState<null | { username: string; password: string }>(null);

  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<null | Room>(null);

  // ✅ หา dormId + loginDorm จาก owner
  useEffect(() => {
    let ignore = false;

    async function loadDorm() {
      setLoadingDorm(true);
      try {
        const ownerUid = auth.currentUser?.uid;
        if (!ownerUid) return;

        const q = query(
          collection(db, "dorms"),
          where("ownerIds", "array-contains", ownerUid)
        );
        const snap = await getDocs(q);
        const first = snap.docs[0];

        if (!ignore) {
          const id = first?.id ?? null;
          setDormId(id);

          const data = first?.data() as any;
          setLoginDorm((data?.loginDorm ?? "").toString().trim().toLowerCase());
        }
      } finally {
        if (!ignore) setLoadingDorm(false);
      }
    }

    loadDorm();
    return () => {
      ignore = true;
    };
  }, []);

  // ✅ subscribe rooms
  useEffect(() => {
    if (!dormId) return;

    const ref = collection(db, `dorms/${dormId}/rooms`);
    const unsub = onSnapshot(ref, (snap) => {
      const list: Room[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setRooms(list);
    });

    return () => unsub();
  }, [dormId]);

  const occupiedRooms = useMemo(() => {
    return rooms
      .map((r) => ({
        ...r,
        roomCode: `${r.buildingCode ?? ""}${r.roomNumber ?? ""}`,
      }))
      .filter((r: any) => (r.status ?? "vacant") === "occupied" && !!r.tenantName);
  }, [rooms]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return occupiedRooms;
    return occupiedRooms.filter((r: any) => {
      const roomCode = `${r.buildingCode ?? ""}${r.roomNumber ?? ""}`.toLowerCase();
      const building = (r.buildingCode ?? "").toLowerCase();
      const tenant = (r.tenantName ?? "").toLowerCase();
      return roomCode.includes(s) || building.includes(s) || tenant.includes(s);
    });
  }, [occupiedRooms, search]);

  async function handleDeleteTenant(room: Room) {
    if (!dormId) return;

    setDeleting(true);
    try {
      const roomRef = doc(db, `dorms/${dormId}/rooms/${room.id}`);
      const tenantUid = room.tenantUid ?? null;

      await runTransaction(db, async (tx) => {
        const roomSnap = await tx.get(roomRef);
        if (!roomSnap.exists()) throw new Error("ROOM_NOT_FOUND");

        // เคลียร์ห้อง
        tx.update(roomRef, {
          status: "vacant",
          tenantUid: null,
          tenantName: null,
          tenantPhone: null,
          updatedAt: serverTimestamp(),
        });

        // mark tenant inactive (เก็บประวัติ)
        if (tenantUid) {
          const tenantRef = doc(db, `dorms/${dormId}/tenants/${tenantUid}`);
          tx.set(
            tenantRef,
            {
              status: "inactive",
              updatedAt: serverTimestamp(),
              movedOutAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
      });

      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  if (loadingDorm) {
    return <div className="p-6 text-gray-500">กำลังโหลด...</div>;
  }

  if (!dormId) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-200 text-gray-700">
          ไม่พบหอของเจ้าของบัญชีนี้ (ตรวจ ownerIds ใน dorms)
        </div>
      </div>
    );
  }

  // ✅ แจ้งเตือนถ้า dorm ยังไม่ได้ตั้ง loginDorm
  if (!loginDorm) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-2xl p-6 border border-red-200 text-red-700">
          หอของคุณยังไม่มี <b>loginDorm</b> ในเอกสาร dorms/{dormId} <br />
          กรุณาไปตั้งค่า loginDorm (ตัวอังกฤษตัวเล็ก ไม่มีเว้นวรรค) ก่อนเพิ่มผู้เช่า
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary + CTA */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:justify-between">
        <div className="w-full lg:max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-pink-50 flex items-center justify-center text-[#e11d48]">
              <FaHouseUser size={22} />
            </div>
            <div>
              <div className="text-[#e11d48] text-lg font-extrabold">
                ผู้เช่าทั้งหมด
              </div>
              <div className="text-sm text-gray-500">
                จำนวนผู้เช่าที่มี:{" "}
                <span className="font-bold text-gray-900">
                  {occupiedRooms.length}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                loginDorm: <span className="font-semibold">{loginDorm}</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setOpenAdd(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#f43f8c] text-white font-bold shadow-md hover:opacity-95"
        >
          เพิ่มผู้เช่าใหม่
          <FiPlus size={18} />
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="text-2xl font-semibold text-gray-900">
            รายชื่อผู้เช่าทั้งหมด
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาห้อง/ตึก/ชื่อผู้เช่า"
                className="pl-9 pr-3 py-2 w-full sm:w-72 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-pink-400"
              />
            </div>

            <button
              onClick={() => setSearch("")}
              className="px-4 py-2 rounded-xl bg-pink-50 text-[#e11d48] font-bold border border-pink-100 hover:bg-pink-100"
            >
              ทั้งหมด
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="px-6 pb-6">
          <div className="w-full rounded-2xl border border-gray-200 overflow-hidden">
            {/* header */}
            <div className="grid grid-cols-12">
              <div className="col-span-2 bg-pink-50 border-b border-gray-200 py-3 text-center text-sm font-semibold text-gray-800">
                ห้อง
              </div>
              <div className="col-span-5 bg-[#f43f8c] border-b border-gray-200 py-3 text-center text-sm font-semibold text-white">
                ผู้เช่า
              </div>
              <div className="col-span-3 bg-pink-50 border-b border-gray-200 py-3 text-center text-sm font-semibold text-gray-800">
                เบอร์โทรศัพท์
              </div>
              <div className="col-span-2 bg-[#f43f8c] border-b border-gray-200 py-3 text-center text-sm font-semibold text-white">
                จัดการ
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="py-10 text-center text-gray-500">
                ยังไม่มีผู้เช่าในระบบ
              </div>
            ) : (
              filtered.map((r: any) => {
                const roomCode = `${r.buildingCode ?? ""}${r.roomNumber ?? ""}`;
                return (
                  <div
                    key={r.id}
                    className="grid grid-cols-12 border-b border-gray-200"
                  >
                    <div className="col-span-2 py-4 text-center text-sm font-bold text-gray-900">
                      {roomCode || "-"}
                    </div>

                    <div className="col-span-5 py-4 text-center text-sm font-semibold bg-pink-50 text-gray-900">
                      {r.tenantName ?? "-"}
                    </div>

                    <div className="col-span-3 py-4 text-center text-sm font-semibold text-gray-900">
                      {r.tenantPhone ?? "-"}
                    </div>

                    <div className="col-span-2 py-4 flex items-center justify-center bg-pink-50">
                      <button
                        onClick={() => setDeleteTarget(r)}
                        className="inline-flex items-center justify-center text-red-600 hover:text-red-700"
                        title="ลบผู้เช่าออกจากห้อง"
                      >
                        <FiTrash2 size={20} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Add Tenant Modal */}
      {openAdd && (
        <AddTenantModal
          dormId={dormId}
          loginDorm={loginDorm}
          rooms={rooms}
          onClose={() => setOpenAdd(false)}
          onCreated={(cred) => {
            setOpenAdd(false);
            setOpenCred(cred);
          }}
        />
      )}

      {/* Credentials Modal */}
      {openCred && (
        <CredentialsModal
          username={openCred.username}
          password={openCred.password}
          onClose={() => setOpenCred(null)}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmModal
          title="ยืนยันการลบผู้เช่า"
          desc={`ต้องการลบผู้เช่าออกจากห้อง ${
            (deleteTarget.buildingCode ?? "") + (deleteTarget.roomNumber ?? "")
          } ใช่ไหม?`}
          loading={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => handleDeleteTenant(deleteTarget)}
          confirmText="ลบ"
        />
      )}
    </div>
  );
}

/* ----------------------------- Modal: Add Tenant ---------------------------- */

function AddTenantModal({
  dormId,
  loginDorm,
  rooms,
  onClose,
  onCreated,
}: {
  dormId: string;
  loginDorm: string;
  rooms: Room[];
  onClose: () => void;
  onCreated: (cred: { username: string; password: string }) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [building, setBuilding] = useState<string>("");
  const [floor, setFloor] = useState<number | "">("");
  const [roomId, setRoomId] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildings = useMemo(() => {
    const set = new Set<string>();
    rooms.forEach((r) => r.buildingCode && set.add(r.buildingCode));
    return Array.from(set).sort();
  }, [rooms]);

  const floors = useMemo(() => {
    if (!building) return [];
    const set = new Set<number>();
    rooms
      .filter((r) => (r.buildingCode ?? "") === building)
      .forEach((r) => typeof r.floor === "number" && set.add(r.floor));
    return Array.from(set).sort((a, b) => a - b);
  }, [rooms, building]);

  const vacantRooms = useMemo(() => {
    if (!building || floor === "") return [];
    return rooms
      .filter((r) => (r.buildingCode ?? "") === building)
      .filter((r) => r.floor === floor)
      .filter((r) => (r.status ?? "vacant") === "vacant")
      .filter((r) => !!r.roomNumber)
      .sort((a, b) => (a.roomNumber ?? "").localeCompare(b.roomNumber ?? ""));
  }, [rooms, building, floor]);

  const selectedRoom = useMemo(() => rooms.find((r) => r.id === roomId) ?? null, [rooms, roomId]);

  const phonePreview = normalizePhone(phone);
  const loginKey = (loginDorm ?? "").trim().toLowerCase();
  const usernamePreview =
    isPhone(phonePreview) && loginKey ? `${phonePreview}@${loginKey}` : "-";

  async function handleSave() {
    setError(null);

    const name = fullName.trim();
    const p = normalizePhone(phone);

    if (!name || !p || !building || floor === "" || !roomId) {
      setError("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }
    if (!isPhone(p)) {
      setError("เบอร์โทรไม่ถูกต้อง (กรอก 9–10 หลัก)");
      return;
    }
    if (!loginKey) {
      setError("หอยังไม่ได้ตั้งค่า loginDorm");
      return;
    }

    // ✅ username ที่ผู้เช่าพิมพ์จริง
    const usernameDisplay = `${p}@${loginKey}`;

    // ✅ auth email ที่ใช้จริงใน Firebase Auth
    const authEmail = makeTenantAuthEmail(p, dormId);

    // ✅ pre-check room
    const roomRef = doc(db, `dorms/${dormId}/rooms/${roomId}`);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) {
      setError("ไม่พบห้องที่เลือก");
      return;
    }
    const roomData = roomSnap.data() as any;
    if ((roomData.status ?? "vacant") !== "vacant") {
      setError("ห้องนี้มีผู้เช่าอยู่แล้ว");
      return;
    }

    // ✅ pre-check username lock (กันซ้ำแบบ เบอร์@loginDorm)
    const usernameRef = doc(db, `usernames/${usernameDisplay}`);
    const usernameSnap = await getDoc(usernameRef);
    if (usernameSnap.exists()) {
      setError("username นี้ถูกใช้แล้ว (เบอร์ซ้ำในหอนี้)");
      return;
    }

    setSaving(true);

    const password = generatePassword(12);
    const secondaryAuth = getSecondaryAuth();

    let createdUser: any = null;

    try {
      // 1) create auth user (secondary)
      const cred = await createUserWithEmailAndPassword(secondaryAuth, authEmail, password);
      createdUser = cred.user;

      // 2) Firestore transaction
      const uid = createdUser.uid;
      const roomNumber = (selectedRoom?.roomNumber ?? roomData.roomNumber ?? "").toString();
      const roomCode = `${building}${roomNumber}`;

      await runTransaction(db, async (tx) => {
        const latestRoom = await tx.get(roomRef);
        if (!latestRoom.exists()) throw new Error("ROOM_NOT_FOUND");

        const latest = latestRoom.data() as any;
        if ((latest.status ?? "vacant") !== "vacant") throw new Error("ROOM_OCCUPIED");

        const latestUsername = await tx.get(usernameRef);
        if (latestUsername.exists()) throw new Error("USERNAME_USED");

        // ✅ lock username
        tx.set(usernameRef, {
          username: usernameDisplay,
          phone: p,
          loginDorm: loginKey,
          uid,
          dormId,
          createdAt: serverTimestamp(),
        });

        // ✅ users/{uid} (role tenant) เพื่อให้ระบบรู้บทบาท
        const userRef = doc(db, `users/${uid}`);
        tx.set(
          userRef,
          {
            role: "tenant",
            name,
            phone: p,
            username: usernameDisplay,
            dormId,
            currentDormId: dormId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // ✅ tenant doc
        const tenantRef = doc(db, `dorms/${dormId}/tenants/${uid}`);
        const tenantDoc: Tenant = {
          uid,
          fullName: name,
          phone: p,
          username: usernameDisplay,
          loginDorm: loginKey,
          authEmail,

          dormId,
          roomId,
          buildingCode: building,
          floor: floor as number,
          roomNumber,
          roomCode,

          status: "active",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdByUid: auth.currentUser?.uid ?? "",
        };

        tx.set(tenantRef, tenantDoc);

        // ✅ update room
        tx.update(roomRef, {
          status: "occupied",
          tenantUid: uid,
          tenantName: name,
          tenantPhone: p,
          updatedAt: serverTimestamp(),
        });
      });

      await signOut(secondaryAuth);
      onCreated({ username: usernameDisplay, password });
    } catch (e: any) {
      // cleanup auth user if firestore fails
      try {
        if (createdUser) await deleteUser(createdUser);
      } catch {}

      const msg =
        e?.message?.includes("USERNAME_USED")
          ? "username นี้ถูกใช้แล้ว (เบอร์ซ้ำในหอนี้)"
          : e?.message?.includes("ROOM_OCCUPIED")
          ? "ห้องนี้มีผู้เช่าอยู่แล้ว"
          : e?.code === "auth/email-already-in-use"
          ? "บัญชีผู้เช่านี้ถูกสร้างแล้ว (Auth ซ้ำ)"
          : "บันทึกไม่สำเร็จ กรุณาลองใหม่";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="เพิ่มผู้เช่าใหม่" onClose={onClose}>
      <div className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Field label="ชื่อผู้เช่า">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="ชื่อ-นามสกุล ผู้เช่า"
            className="w-full p-2.5 rounded-xl bg-slate-900/5 border border-slate-900/10 outline-none focus:border-pink-400"
          />
        </Field>

        <Field label="เบอร์โทรศัพท์">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="เช่น 0812345678"
            inputMode="numeric"
            className="w-full p-2.5 rounded-xl bg-slate-900/5 border border-slate-900/10 outline-none focus:border-pink-400"
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="ตึก">
            <select
              value={building}
              onChange={(e) => {
                setBuilding(e.target.value);
                setFloor("");
                setRoomId("");
              }}
              className="w-full p-2.5 rounded-xl bg-slate-900/5 border border-slate-900/10 outline-none focus:border-pink-400"
            >
              <option value="">เลือกตึก</option>
              {buildings.map((b) => (
                <option key={b} value={b}>
                  ตึก {b}
                </option>
              ))}
            </select>
          </Field>

          <Field label="ชั้น">
            <select
              value={floor}
              onChange={(e) => {
                const v = e.target.value;
                setFloor(v === "" ? "" : Number(v));
                setRoomId("");
              }}
              disabled={!building}
              className="w-full p-2.5 rounded-xl bg-slate-900/5 border border-slate-900/10 outline-none focus:border-pink-400 disabled:opacity-60"
            >
              <option value="">เลือกชั้น</option>
              {floors.map((f) => (
                <option key={f} value={f}>
                  ชั้น {f}
                </option>
              ))}
            </select>
          </Field>

          <Field label="เลขห้อง (ห้องว่าง)">
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              disabled={!building || floor === ""}
              className="w-full p-2.5 rounded-xl bg-slate-900/5 border border-slate-900/10 outline-none focus:border-pink-400 disabled:opacity-60"
            >
              <option value="">เลือกห้อง</option>
              {vacantRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Username (ฟิกอัตโนมัติ)">
          <div className="w-full p-2.5 rounded-xl bg-slate-900/5 border border-slate-900/10 text-sm text-slate-900/60">
            รูปแบบ: <b>เบอร์@loginDorm</b> <br />
            ตัวอย่าง: <span className="font-semibold">{usernamePreview}</span>
          </div>
        </Field>

        {/* <Field label="Password (สุ่มอัตโนมัติ)">
          <div className="w-full p-2.5 rounded-xl bg-slate-900/5 border border-slate-900/10 text-sm text-slate-900/60">
            สุ่มให้ตอนกดบันทึก และจะแสดงให้คัดลอกหลังบันทึกสำเร็จ
          </div>
        </Field> */}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 disabled:opacity-60"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 disabled:opacity-60"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* -------------------------- Modal: Credentials copy ------------------------- */

function CredentialsModal({
  username,
  password,
  onClose,
}: {
  username: string;
  password: string;
  onClose: () => void;
}) {
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  }

  return (
    <ModalShell title="สร้างผู้เช่าสำเร็จ" onClose={onClose}>
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          รหัสผ่านจะแสดง <span className="font-bold">ครั้งนี้ครั้งเดียว</span> กรุณาคัดลอกส่งให้ผู้เช่า
        </div>

        <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
          <RowCopy label="Username" value={username} onCopy={() => copy(username)} />
          <RowCopy label="Password" value={password} onCopy={() => copy(password)} />
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#f43f8c] text-white font-bold shadow-md hover:opacity-95"
          >
            ปิด
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function RowCopy({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="font-bold text-gray-900">{value}</div>
      </div>
      <button
        onClick={onCopy}
        className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
      >
        คัดลอก
      </button>
    </div>
  );
}

/* ------------------------------ Small UI parts ------------------------------ */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-bold text-slate-900">{label}</div>
      {children}
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-xl">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="text-[#e11d48] text-2xl font-extrabold">{title}</div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}

function ConfirmModal({
  title,
  desc,
  loading,
  onCancel,
  onConfirm,
  confirmText = "ยืนยัน",
}: {
  title: string;
  desc: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <div className="font-bold text-lg text-gray-900">{title}</div>
          <div className="text-sm text-gray-600 mt-1">{desc}</div>
        </div>
        <div className="px-5 py-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 font-semibold"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 font-bold disabled:opacity-60"
          >
            {loading ? "กำลังลบ..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}