import { useState } from "react";
import type React from "react";
import { useNavigate, Link } from "react-router-dom";
import logosi from "../assets/logosi.png";

const API_BASE_URL = "http://localhost:3000";

function mapRegisterError(message: string): string {
  switch (message) {
    case "username, email, password, full_name, phone, dorm_name, dorm_name_en are required":
      return "กรุณากรอกข้อมูลให้ครบทุกช่อง";
    case "Password must be at least 6 characters":
      return "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
    case "Email already exists":
      return "อีเมลนี้ถูกใช้งานแล้ว";
    case "dorm_name_en must contain English letters only (numbers, spaces, and hyphen are allowed)":
      return "ชื่อหอพักภาษาอังกฤษต้องใช้ตัวอักษรอังกฤษเท่านั้น โดยใช้ตัวเลข ช่องว่าง และ - ได้";
    default:
      return message || "สมัครสมาชิกไม่สำเร็จ";
  }
}

function mapLoginError(message: string): string {
  switch (message) {
    case "identifier and password are required":
      return "กรุณากรอกชื่อผู้ใช้@ชื่อหอ และรหัสผ่าน";
    case "Invalid identifier or password":
      return "ชื่อผู้ใช้@ชื่อหอ หรือรหัสผ่านไม่ถูกต้อง";
    case "Invalid login format":
      return "รูปแบบการเข้าสู่ระบบไม่ถูกต้อง";
    default:
      return message || "เข้าสู่ระบบไม่สำเร็จ";
  }
}

function isEnglishDormName(value: string) {
  const normalized = value.trim();

  if (!normalized) return false;

  const allowedPattern = /^[A-Za-z0-9][A-Za-z0-9\s-]*$/;
  const hasEnglishLetter = /[A-Za-z]/.test(normalized);

  return allowedPattern.test(normalized) && hasEnglishLetter;
}

export default function Sign() {
  const navigate = useNavigate();

  const [dormName, setDormName] = useState("");
  const [dormNameEn, setDormNameEn] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      if (
        !dormName.trim() ||
        !dormNameEn.trim() ||
        !ownerName.trim() ||
        !email.trim() ||
        !username.trim() ||
        !phone.trim() ||
        !password.trim() ||
        !confirmPassword.trim()
      ) {
        setErr("กรุณากรอกข้อมูลให้ครบทุกช่อง");
        return;
      }

      if (password.length < 6) {
        setErr("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
        return;
      }

      if (password !== confirmPassword) {
        setErr("ยืนยันรหัสผ่านไม่ตรงกัน");
        return;
      }

      if (!/^[0-9]{9,10}$/.test(phone.trim())) {
        setErr("กรุณากรอกเบอร์โทรศัพท์ 9–10 หลัก");
        return;
      }

      if (!isEnglishDormName(dormNameEn)) {
        setErr(
          "ชื่อหอพักภาษาอังกฤษต้องใช้ตัวอักษรอังกฤษเท่านั้น โดยใช้ตัวเลข ช่องว่าง และ - ได้"
        );
        return;
      }

      const registerRes = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password,
          full_name: ownerName.trim(),
          phone: phone.trim(),
          dorm_name: dormName.trim(),
          dorm_name_en: dormNameEn.trim(),
        }),
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok) {
        setErr(mapRegisterError(registerData.message));
        return;
      }

      const loginIdentifier =
        registerData.login_identifier ||
        `${username.trim().toLowerCase()}@${registerData?.dorm?.dorm_slug}`;

      const loginRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: loginIdentifier,
          password,
        }),
      });

      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        setErr(
          mapLoginError(
            loginData.message || "สมัครสำเร็จ แต่เข้าสู่ระบบอัตโนมัติไม่สำเร็จ"
          )
        );
        return;
      }

      localStorage.setItem("token", loginData.token);
      localStorage.setItem("user", JSON.stringify(loginData.user));

      navigate("/home", { replace: true });
    } catch (error) {
      setErr("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF1F5] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl bg-[#F7E9EE] rounded-none sm:rounded-xl p-6 sm:p-10">
        <div className="flex justify-center mb-8">
          <img
            src={logosi}
            alt="Roomie Logo"
            className="h-28 sm:h-36 object-contain select-none"
            draggable={false}
          />
        </div>

        <div className="max-w-4xl mx-auto bg-white/80 rounded-[24px] shadow-sm p-6 sm:p-8">
          <h1 className="text-center text-2xl sm:text-3xl font-extrabold text-pink-500 mb-8">
            สมัครสมาชิกสำหรับเจ้าของหอพัก
          </h1>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">ชื่อหอพัก</label>
              <input
                type="text"
                value={dormName}
                onChange={(e) => setDormName(e.target.value)}
                className="w-full h-12 rounded-xl border border-pink-200 bg-pink-50 px-4 outline-none focus:ring-2 focus:ring-pink-300"
                placeholder="กรอกชื่อหอพักภาษาไทย"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                ชื่อหอพักภาษาอังกฤษ
              </label>
              <input
                type="text"
                value={dormNameEn}
                onChange={(e) => setDormNameEn(e.target.value)}
                className="w-full h-12 rounded-xl border border-pink-200 bg-pink-50 px-4 outline-none focus:ring-2 focus:ring-pink-300"
                placeholder="เช่น Naja Dorm"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                ใช้ได้เฉพาะ A-Z, a-z, 0-9, ช่องว่าง และ -
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium mb-2">ชื่อเจ้าของ</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full h-12 rounded-xl border border-pink-200 bg-pink-50 px-4 outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="ชื่อเจ้าของ"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">อีเมล</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 rounded-xl border border-pink-200 bg-pink-50 px-4 outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="example@email.com"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium mb-2">UserName</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-12 rounded-xl border border-pink-200 bg-pink-50 px-4 outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="ตั้งชื่อผู้ใช้"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">เบอร์โทรศัพท์</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-12 rounded-xl border border-pink-200 bg-pink-50 px-4 outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="0899999999"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium mb-2">รหัสผ่าน</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 rounded-xl border border-pink-200 bg-pink-50 px-4 outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="กรอกรหัสผ่าน"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">ยืนยันรหัสผ่าน</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-12 rounded-xl border border-pink-200 bg-pink-50 px-4 outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                  required
                />
              </div>
            </div>

            {err && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {err}
              </div>
            )}

            <div className="pt-2 flex justify-center">
              <button
                type="submit"
                disabled={loading}
                className="w-full max-w-xs h-12 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-extrabold shadow disabled:opacity-60"
              >
                {loading ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
              </button>
            </div>
          </form>

          <div className="text-center text-sm mt-5">
            มีบัญชีอยู่แล้ว?{" "}
            <Link to="/login" className="text-pink-600 font-semibold hover:underline">
              เข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}