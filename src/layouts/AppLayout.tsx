// src/layouts/AppLayout.tsx
import React, { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { getAuth } from "firebase/auth";
import {
  FiMenu,
  FiX,
  FiHome,
  FiTool,
  FiFileText,
  FiCreditCard,
  FiPackage,
  FiBox,
} from "react-icons/fi";
import { GrOverview } from "react-icons/gr";

// ❗ ถ้าโฟลเดอร์/ไฟล์เป็น useRole.ts ให้ปรับ path ให้ถูกกับโปรเจกต์ของคุณ
import { useRole } from "../hooks/userole";
import { useOwnerDormName } from "../hooks/useOwnerDormName";
import avatarDefault from "../assets/user.png";
import logoImg from "../assets/logosi.png";

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const auth = getAuth();
  const user = auth.currentUser;

  const { role } = useRole();
  const { name: dormName, loading: dormLoading } = useOwnerDormName();

  const avatarSrc = user?.photoURL || avatarDefault;
  const isOwner = role === "owner";

  return (
    <div className="min-h-screen bg-rose-50 text-gray-900 flex">
      {/* --- Desktop Sidebar (owner เท่านั้น) --- */}
      {isOwner && (
        <aside className="hidden md:flex md:w-64 md:flex-col bg-rose-200/50 border-r">
          <Brand isOwner />
          <Nav role="owner" onNavigate={() => {}} />
        </aside>
      )}

      {/* --- Mobile Sidebar/Drawer (owner เท่านั้น) --- */}
      {isOwner && (
        <div
          className={`fixed inset-0 z-40 md:hidden ${
            open ? "" : "pointer-events-none"
          }`}
        >
          {/* ⬇⬇ เปลี่ยน overlay ให้ “ทึบ” (ไม่โปร่งใส) เฉพาะมือถือ */}
          <div
            className={`absolute inset-0 bg-transparent-opacity ${
              open ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setOpen(false)}
          />
          {/* ⬇⬇ เปลี่ยนพื้นหลัง drawer ให้ทึบ (ไม่ /50) และวางบน overlay */}
          <aside
            className={`absolute left-0 top-0 h-full w-72 bg-rose-200 border-r shadow-2xl z-50 transform transition-transform ${
              open ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <Brand isOwner onClose={() => setOpen(false)} />
            <Nav role="owner" onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* --- Main --- */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {/* ปุ่มเปิดเมนูมือถือ (owner เท่านั้น) */}
            {isOwner && (
              <button
                className="md:hidden p-2 rounded-lg hover:bg-rose-50"
                onClick={() => setOpen(true)}
                aria-label="Open menu"
              >
                <FiMenu size={20} />
              </button>
            )}
          </div>

          {/* ขวาบน: ชื่อหอ (owner) + ชื่อผู้ใช้ */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium">
                {isOwner ? (dormLoading ? "กำลังโหลด…" : dormName || "—") : null}
              </div>
              <div className="text-xs text-neutral-500">
                {user?.displayName || user?.email?.split("@")[0] || "-"}
              </div>
            </div>
            <img
              src={avatarSrc}
              className="w-10 h-10 rounded-full object-cover"
              alt="avatar"
            />
          </div>
        </header>

        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function Brand({ onClose, isOwner }: { onClose?: () => void; isOwner?: boolean }) {
  const { name, loading } = useOwnerDormName();
  return (
    <div className="h-16 flex items-center justify-between px-4 border-b">
      <div className="flex items-center gap-3">
        <img src={logoImg} alt="logo" className="w-12 h-12 object-contain" />
        {isOwner && (
          <div className="text-lg font-bold">
            {loading ? "กำลังโหลด…" : name || "—"}
          </div>
        )}
      </div>
      {onClose && (
        <button
          className="p-2 rounded-lg hover:bg-rose-50"
          onClick={() => onClose()}
          aria-label="Close menu"
        >
          <FiX size={20} />
        </button>
      )}
    </div>
  );
}

function Nav({
  role,
  onNavigate,
}: {
  role: "owner" | "tenant";
  onNavigate: () => void;
}) {
  const base =
    "flex items-center gap-3 px-4 py-2 rounded-xl mx-2 my-1 hover:bg-white/70";
  const active = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${base} bg-white font-medium` : base;

  if (role === "owner") {
    return (
      <nav className="p-2">
        <NavLink to="explore" end className={active} onClick={onNavigate}>
          <FiHome size={20} /> <span>หน้าแรก</span>
        </NavLink>

        <NavLink to="rooms" className={active} onClick={onNavigate}>
          <FiBox size={20} /> <span>ห้อง</span>
        </NavLink>

        <NavLink to="repairs" className={active} onClick={onNavigate}>
          <FiTool size={20} /> <span>แจ้งซ่อม</span>
        </NavLink>

        <NavLink to="bills" className={active} onClick={onNavigate}>
          <FiFileText size={20} /> <span>บิล</span>
        </NavLink>

        <NavLink to="payments" className={active} onClick={onNavigate}>
          <FiCreditCard size={20} /> <span>การชำระเงิน</span>
        </NavLink>

        <NavLink to="furniture" className={active} onClick={onNavigate}>
          <FiPackage size={20} /> <span>เฟอร์นิเจอร์/ทรัพย์สิน</span>
        </NavLink>

        <NavLink to="overview" className={active} onClick={onNavigate}>
          <GrOverview size={20} /> <span>ภาพรวม</span>
        </NavLink>
      </nav>
    );
  }

  // เมนูผู้เช่า (สามารถเพิ่มภายหลัง)
  return (
    <nav className="p-2">
      <NavLink to="explore" end className={active} onClick={onNavigate}>
        <FiHome size={20} /> <span>หน้าแรก</span>
      </NavLink>
    </nav>
  );
}
