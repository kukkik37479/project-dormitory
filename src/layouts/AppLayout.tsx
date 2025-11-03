// src/layouts/AppLayout.tsx
import React, { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { FiMenu, FiX, FiHome, FiTool, FiFileText, FiCreditCard, FiPackage, FiBox} from "react-icons/fi";
import { GrOverview } from "react-icons/gr";

import { useOwnerDormName } from "../hooks/useOwnerDormName";
import avatarDefault from "../assets/user.png";
import logoImg from "../assets/logosi.png";


export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const auth = getAuth();
  const user = auth.currentUser;
  const { name: dormName, loading } = useOwnerDormName(); // <<< ใช้ชื่อหอ
  const avatarSrc = user?.photoURL || avatarDefault;

  return (
    <div className="min-h-screen bg-rose-50 text-gray-900 flex">
      {/* --- Desktop Sidebar --- */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-rose-200/50 border-r">
        <Brand />
        <Nav onNavigate={() => {}} />
      </aside>

      {/* --- Mobile Sidebar / Drawer --- */}
      <div className={`fixed inset-0 z-40 md:hidden ${open ? "" : "pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-72 bg-rose-200/50 border-r transform transition-transform ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Brand onClose={() => setOpen(false)} />
          <Nav onNavigate={() => setOpen(false)} />
        </aside>
      </div>

      {/* --- Main --- */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <button
              className="md:hidden p-2 rounded-lg hover:bg-rose-50"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <FiMenu size={20} />
            </button>
          </div>

          {/* ขวาบน: แสดงชื่อหอที่ล็อกอินเข้ามา */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium">
                {loading ? "กำลังโหลด…" : dormName || "—"}
              </div>

              <div className="text-right">
                <div className="text-xs text-neutral-500">
                    {user?.displayName || user?.email?.split("@")[0] || "-"}
                </div>
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

function Brand({ onClose }: { onClose?: () => void }) {
  const { name, loading } = useOwnerDormName();

  return (
    <div className="h-16 flex items-center justify-between px-4 border-b">
      <div className="flex items-center gap-3">
        <img
            src={logoImg}
            alt="logo"
            className="w-12 h-12 object-contain"
        />
        <div>
          <div className="text-lg font-bold">
            {loading ? "กำลังโหลด…" : name || "—"}
          </div>
        </div>
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

function Nav({ onNavigate }: { onNavigate: () => void }) {
  const base = "flex items-center gap-3 px-4 py-2 rounded-xl mx-2 my-1 hover:bg-white/70";
  const active = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${base} bg-white font-medium` : base;

  return (
    <nav className="p-2">
      <NavLink to="" end className={active} onClick={onNavigate}>
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
      <NavLink to="assets" className={active} onClick={onNavigate}>
        <FiPackage size={20} /> <span>เฟอร์นิเจอร์/ทรัพย์สิน</span>
      </NavLink>
      <NavLink to="Overview" className={active} onClick={onNavigate}>
        <GrOverview size={20} /> <span>ภาพรวม</span>
      </NavLink>
    </nav>
  );
}
