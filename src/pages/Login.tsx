// src/pages/Login.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";   // ⭐ ใช้ type ที่ถูกต้อง
import { auth } from "../firebase";
import logo from "../assets/Logo.png";

// แปลงโค้ดเออเรอร์ของ Firebase → ข้อความที่อ่านง่าย (ไม่ใช้ any)
function mapAuthError(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-email":
        return "อีเมลไม่ถูกต้อง";
      case "auth/user-disabled":
        return "บัญชีนี้ถูกระงับการใช้งาน";
      case "auth/user-not-found":
      case "auth/invalid-credential":
        return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
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
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [remember, setRemember] = useState(false);
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email.trim(), pass);
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
          SIGN IN
        </h1>

        <form className="space-y-5" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium mb-2">
              Enter your email address
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-12 rounded-xl border border-pink-200/70 bg-pink-100 px-4 outline-none focus:ring-2 focus:ring-pink-300"
              placeholder="you@example.com"
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
            disabled={loading || !email || !pass}
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
