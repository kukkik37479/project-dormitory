// src/components/Sign.tsx  (หรือ src/pages/Sign.tsx ถ้าคุณแยกเป็น pages)
import { useState } from "react";
import logosi from "../assets/logosi.png";

export default function Sign() {
  const [email, setEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [dormname, setDormname] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: call API สมัครสมาชิกเจ้าของหอพัก
    console.log({ email, ownerName, dormname, address, phone });
  };

  return (
    <div className="min-h-screen bg-[#FFF0F4] text-black flex items-center justify-center p-4">
      {/* มือถือ = 1 คอลัมน์, จอกว้าง = 2 คอลัมน์ */}
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
                <label className="block text-sm font-medium mb-2">
                  อีเมล
                </label>
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

              {/* ชื่อเจ้าของ */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  ชื่อเจ้าของ
                </label>
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

              {/* ชื่อหอพัก */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  ชื่อหอพัก
                </label>
                <input
                  type="text"
                  value={dormname}
                  onChange={(e) => setDormname(e.target.value)}
                  required
                  autoComplete="organization" // ให้เบราว์เซอร์ช่วยกรอกชื่อกิจการ/สถานที่
                  placeholder="ROOMIE Apartment"
                  className="w-full h-12 rounded-xl border border-pink-200/70 bg-pink-100/30 px-4 outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              {/* ที่อยู่ */}
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

              {/* เบอร์โทรศัพท์ */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  เบอร์โทรศัพท์
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoComplete="tel"
                  inputMode="numeric"
                  pattern="^[0-9]{9,10}$"      // ไทยส่วนใหญ่ 10 หลัก
                  maxLength={10}
                  title="กรอกตัวเลข 9–10 หลัก"
                  placeholder="0812345678"
                  className="w-full h-12 rounded-xl border border-pink-200/70 bg-pink-100/30 px-4 outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-black text-pink-400 font-extrabold tracking-wide shadow hover:opacity-90"
              >
                สมัครสมาชิก
              </button>

              {/* ถ้าต้องการปุ่มไปหน้าเข้าสู่ระบบ */}
              {/* <Link to="/login" className="block text-center font-semibold hover:underline">
                มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
              </Link> */}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
