// src/components/Sign.tsx

import { useState } from "react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import logosi from "../assets/logosi.png";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";

/** สมัครเจ้าของ + สร้างหอใหม่ทันที */
async function registerOwnerAndCreateDorm(params: {
  email: string;
  password: string;
  ownerName: string;
  dormName: string;
  address: string;
  phone: string;
}) {
  const { email, password, ownerName, dormName, address, phone } = params;

  // 1) สมัครผู้ใช้
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: ownerName });
  const uid = cred.user.uid;

  // 2) เตรียม batch เขียนเอกสารครั้งเดียว
  const batch = writeBatch(db);
  const now = serverTimestamp();

  // dorms/{dormId} (auto id)
  const dormRef = doc(collection(db, "dorms"));
  const dormId = dormRef.id;

  // users/{uid}
  const userRef = doc(db, "users", uid);
  batch.set(
    userRef,
    {
      email,
      name: ownerName,
      phone,
      role: "owner",
      currentDormId: dormId,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  // users/{uid}/dorms/{dormId}
  const userDormRef = doc(db, "users", uid, "dorms", dormId);
  batch.set(userDormRef, { role: "owner", joinedAt: now });

  // dorms/{dormId}
  batch.set(dormRef, {
    name: dormName,
    address,
    contactPhone: phone,
    ownerIds: [uid],
    roomCount: 0,
    status: "active",
    createdAt: now,
    updatedAt: now,
    isPublic: true,     // ให้แสดงในหน้า Explore
    coverImage: null,   // ยังไม่มีรูปก็ปล่อยเป็น null ก่อน
  });

  // seed ตัวนับ
  const countersRef = doc(db, "dorms", dormId, "meta", "counters");
  batch.set(countersRef, { nextRoomNumber: 101 });

  // 3) commit
  await batch.commit();

  return { uid, dormId };
}

export default function Sign() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // รหัสผ่าน
  const [ownerName, setOwnerName] = useState("");
  const [dormName, setDormName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);

    if (!email || !password || !ownerName || !dormName) {
      setErr("กรอก อีเมล/รหัสผ่าน/ชื่อเจ้าของ/ชื่อหอ ให้ครบก่อนค่ะ");
      return;
    }

    try {
      const { dormId } = await registerOwnerAndCreateDorm({
        email,
        password,
        ownerName,
        dormName,
        address,
        phone,
      });

      // ให้หน้า Rooms รู้ว่าจะอ่านหอไหน
      localStorage.setItem("currentDormId", dormId);

      // ไปหน้า /rooms
      navigate("/rooms");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF0F4] text-black flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center relative">
        {/* โลโก้ */}
        <div className="flex flex-col items-center md:items-start">
          <img
            src={logosi}
            alt="App Logo"
            className="h-24 w-auto md:h-64 lg:h-[20rem] object-contain select-none pointer-events-none"
            draggable={false}
          />
        </div>

        {/* ฟอร์มสมัคร */}
        <div className="w-full">
          <div className="backdrop-blur-sm bg-white/70 rounded-2xl shadow-xl border border-pink-200/40 p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-pink-500 text-center mb-6">
              สมัครสมาชิกสำหรับเจ้าของหอพัก
            </h1>

            <form className="space-y-5" onSubmit={onSubmit}>
              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-2">อีเมล</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full h-12 rounded-xl border border-pink-200/70 bg-pink-100/30 px-4 outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-2">รหัสผ่าน</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="ตั้งรหัสผ่าน"
                  className="w-full h-12 rounded-xl border border-pink-200/70 bg-pink-100/30 px-4 outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              {/* Owner name */}
              <div>
                <label className="block text-sm font-medium mb-2">ชื่อเจ้าของ</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="ชื่อ–นามสกุล"
                  className="w-full h-12 rounded-xl border border-pink-200/70 bg-pink-100/30 px-4 outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              {/* Dorm name */}
              <div>
                <label className="block text-sm font-medium mb-2">ชื่อหอพัก</label>
                <input
                  type="text"
                  value={dormName}
                  onChange={(e) => setDormName(e.target.value)}
                  required
                  autoComplete="organization"
                  placeholder="ROOMIE Apartment"
                  className="w-full h-12 rounded-xl border border-pink-200/70 bg-pink-100/30 px-4 outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium mb-2">ที่อยู่</label>
                <textarea
                  className="w-full rounded-xl border px-4 py-3 bg-pink-100/30 border-pink-200/70 outline-none focus:ring-2 focus:ring-pink-300"
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  autoComplete="street-address"
                  placeholder="บ้านเลขที่ / หมู่บ้าน / ถนน / ตำบล / อำเภอ / จังหวัด / รหัสไปรษณีย์"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium mb-2">เบอร์โทรศัพท์</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoComplete="tel"
                  inputMode="numeric"
                  pattern="^[0-9]{9,10}$"
                  maxLength={10}
                  title="กรอกตัวเลข 9–10 หลัก"
                  placeholder="0812345678"
                  className="w-full h-12 rounded-xl border border-pink-200/70 bg-pink-100/30 px-4 outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              {/* error box */}
              {err && (
                <div className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  {err}
                </div>
              )}

              {/* submit */}
              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-black text-pink-400 font-extrabold tracking-wide shadow hover:opacity-90"
              >
                สมัครสมาชิก
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
