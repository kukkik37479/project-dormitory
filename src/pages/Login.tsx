import { useState } from "react";
import type React from "react";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/Logo.png";

const API_BASE_URL = "http://localhost:3000";

function mapApiError(message: string): string {
  switch (message) {
    case "identifier and password are required":
      return "กรุณากรอกชื่อผู้ใช้@ชื่อหอ และรหัสผ่าน";
    case "Invalid identifier or password":
      return "ชื่อผู้ใช้@ชื่อหอ หรือรหัสผ่านไม่ถูกต้อง";
    case "Invalid login format":
      return "รูปแบบการเข้าสู่ระบบไม่ถูกต้อง";
    case "This account is inactive":
      return "บัญชีนี้ถูกระงับการใช้งาน";
    default:
      return message || "เข้าสู่ระบบไม่สำเร็จ";
  }
}

export default function Login() {
  const nav = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [pass, setPass] = useState("");
  const [remember, setRemember] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: identifier.trim().toLowerCase(),
          password: pass,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErr(mapApiError(data.message));
        return;
      }

      const storage = remember ? localStorage : sessionStorage;

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");

      storage.setItem("token", data.token);
      storage.setItem("user", JSON.stringify(data.user));

      const role = data.user?.role;

      if (role === "owner") {
        nav("/explore");
      } else if (role === "tenant") {
        nav("/explore");
      } else if (role === "admin") {
        nav("/explore");
      } else {
        nav("/");
      }
    } catch (error) {
      setErr("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
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
              Username@ชื่อหอภาษาอังกฤษ
            </label>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full h-12 rounded-xl border border-pink-200/70 bg-pink-100 px-4 outline-none focus:ring-2 focus:ring-pink-300"
              placeholder="เช่น owner_a@naja"
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