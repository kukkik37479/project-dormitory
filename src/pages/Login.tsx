// src/pages/Login.tsx
import { useState } from "react";
import type React from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../firebase";
import logo from "../assets/Logo.png";

// ---------- helpers ----------
function normalizePhone(input: string) {
  return input.replace(/[^\d]/g, "").trim();
}
function isPhone(s: string) {
  return /^[0-9]{9,10}$/.test(s);
}
function makeAuthEmail(phone: string, dormId: string) {
  return `${phone}__${dormId}@roomie.local`;
}

// แปลงโค้ดเออเรอร์ของ Firebase → ข้อความที่อ่านง่าย
function mapAuthError(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-email":
        return "อีเมลไม่ถูกต้อง";
      case "auth/user-disabled":
        return "บัญชีนี้ถูกระงับการใช้งาน";
      case "auth/user-not-found":
      case "auth/invalid-credential":
        return "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
      case "auth/wrong-password":
        return "รหัสผ่านไม่ถูกต้อง";
      case "auth/too-many-requests":
        return "พยายามผิดหลายครั้ง โปรดลองใหม่ภายหลัง";
      default:
        return "เข้าสู่ระบบไม่สำเร็จ";
    }
  }
  return "เข้าสู่ระบบไม่สำเร็จ";
}

export default function Login() {
  const nav = useNavigate();

  // ✅ เปลี่ยนจาก email → identifier (อีเมลเจ้าของ หรือ เบอร์@loginDorm ผู้เช่า)
  const [identifier, setIdentifier] = useState("");
  const [pass, setPass] = useState("");
  const [remember, setRemember] = useState(false);
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence
      );

      const raw = identifier.trim();
      if (!raw) {
        setErr("กรุณากรอกอีเมล หรือ เบอร์@loginDorm");
        return;
      }

      // ✅ ตัดสินใจว่าเป็นเจ้าของหรือผู้เช่า
      // - เจ้าของ: อีเมลจริง (raw มี @ และซ้ายไม่ใช่เบอร์ 9–10 หลัก) หรือ user กรอกอีเมลปกติ
      // - ผู้เช่า: เบอร์@loginDorm (ซ้ายเป็นเบอร์ 9–10 หลัก)
      let loginEmail = raw;

      if (raw.includes("@")) {
        const at = raw.indexOf("@");
        const left = raw.slice(0, at);
        const right = raw.slice(at + 1);

        const phone = normalizePhone(left);
        const loginDorm = right.trim().toLowerCase();

        // ถ้าซ้ายเป็นเบอร์ → ถือว่าเป็น tenant
        if (isPhone(phone)) {
          if (!loginDorm) {
            setErr("กรุณากรอก loginDorm หลัง @ เช่น 0661234567@hotong");
            return;
          }

          // lookup dormId จาก dormLogins/{loginDorm}
          const snap = await getDoc(doc(db, "dormLogins", loginDorm));
          if (!snap.exists()) {
            setErr("ไม่พบรหัสหอนี้ (loginDorm) ในระบบ");
            return;
          }

          const dormId = (snap.data() as any).dormId as string;
          if (!dormId) {
            setErr("ข้อมูล dormLogins ไม่ครบ (ไม่มี dormId)");
            return;
          }

          loginEmail = makeAuthEmail(phone, dormId);
        } else {
          // ซ้ายไม่ใช่เบอร์ → ถือว่า owner email
          loginEmail = raw;
        }
      } else {
        // ไม่มี @ เลย → ถือว่าเป็นอีเมล (owner) เท่านั้น
        // (ถ้าอยากให้ผู้เช่าพิมพ์แค่เบอร์อย่างเดียว ต้องคุยเพิ่มเรื่องจะรู้ dorm ไหน)
        loginEmail = raw;
      }

      await signInWithEmailAndPassword(auth, loginEmail, pass);

      // ✅ ตอนนี้คุณมีระบบ owner อยู่แล้ว → ไป /rooms ก่อน
      // (ถ้าภายหลังอยาก redirect ตาม role เดี๋ยวค่อยเพิ่มอ่าน users/{uid}.role)
      nav("/rooms");
    } catch (error) {
      setErr(mapAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-6">
      <img
        src={logo}
        alt="App Logo"
        className="w-3/4 sm:w-1/2 md:w-1/3 lg:w-1/4 h-auto mb-8 object-contain select-none"
        draggable={false}
      />

      <div className="w-full max-w-md backdrop-blur-sm bg-white/60 rounded-2xl shadow-xl border border-pink-200/40 p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-pink-500 text-center mb-6">
          LOGIN
        </h1>

        <form className="space-y-5" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium mb-2">
              Email (เจ้าของ) / เบอร์@loginDorm (ผู้เช่า)
            </label>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full h-12 rounded-xl border border-pink-200/70 bg-pink-100 px-4 outline-none focus:ring-2 focus:ring-pink-300"
              placeholder="you@example.com หรือ 0661234567@hotong"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              required
              className="w-full h-12 rounded-xl border border-pink-200/70 bg-pink-100 px-4 outline-none focus:ring-2 focus:ring-pink-300"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="inline-flex items-center gap-2 select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="size-4 accent-pink-500"
              />
              <span className="font-semibold">Remember me</span>
            </label>

            <button
              type="button"
              className="font-semibold hover:underline"
              onClick={() => alert("Implement forgot password")}
            >
              Forgot Password?
            </button>
          </div>

          {err && <div className="text-red-600 text-sm -mt-2">{err}</div>}

          <button
            type="submit"
            disabled={loading || !identifier || !pass}
            className="w-full h-12 rounded-xl bg-black text-pink-400 font-extrabold tracking-wide shadow disabled:opacity-60"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "LOGIN"}
          </button>
        </form>

        <div className="text-center text-sm mt-4">
          ยังไม่มีบัญชี?{" "}
          <Link to="/sign" className="text-pink-600 font-semibold hover:underline">
            สมัครสำหรับเจ้าของหอพัก
          </Link>
        </div>
      </div>
    </div>
  );
}