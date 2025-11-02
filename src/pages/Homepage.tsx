// src/pages/Homepage.tsx
import { Link } from "react-router-dom";
import logosi from "../assets/logosi.png";

export default function Homepage() {
  return (
    <div className="min-h-screen bg-rose-50 flex items-center">
      <div className="w-full max-w-5xl mx-auto px-4 py-10">
        {/* โลโก้แบบวงกลม */}
        <div className="mx-auto mb-8 relative w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72">
          <div className="absolute inset-0 bg-white rounded-full" />
          <img
            src={logosi}
            alt="Roomie Logo"
            className="absolute -top-2 left-1/2 -translate-x-1/2 w-60 h-60 sm:w-64 sm:h-64 md:w-72 md:h-72 object-contain"
          />
        </div>

        <h1 className="text-center text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
          ยินดีต้อนรับสู่ <span className="text-rose-400">ROOMIE</span>
        </h1>

        <p className="mt-4 text-center text-base sm:text-lg md:text-xl text-neutral-900">
          แหล่งรวบรวมข้อมูลหอพักต่างๆ พร้อมการจัดการที่ครบวงจร
          สำหรับเจ้าของหอพัก และ ผู้เช่า
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {/* ปุ่มเข้าหน้ารายการห้อง แนะนำให้พาไป /rooms แทน / (จะได้ไม่วนหน้าเดิม) */}
          <Link
            to="/rooms"
            className="h-12 px-6 rounded-lg bg-black text-rose-400 font-extrabold
                       shadow-[0_4px_4px_rgba(0,0,0,0.25)] flex items-center justify-center
                       w-full sm:w-auto"
          >
            เข้าสู่เว็บไซต์
          </Link>

          <Link
            to="/login"
            className="h-12 px-6 rounded-lg bg-rose-400 text-black font-extrabold
                       shadow-[0_4px_4px_rgba(0,0,0,0.25)] flex items-center justify-center
                       w-full sm:w-auto"
          >
            เข้าสู่ระบบ
          </Link>

          <Link
            to="/sign"
            className="h-12 px-6 rounded-lg bg-black text-rose-400 font-extrabold
                       shadow-[0_4px_4px_rgba(240,98,146,0.30)] flex items-center justify-center
                       w-full sm:w-auto"
          >
            ลงทะเบียนสำหรับเจ้าของหอพัก
          </Link>
        </div>
      </div>
    </div>
  );
}
