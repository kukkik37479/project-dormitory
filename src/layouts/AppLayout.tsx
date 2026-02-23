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
import { FaHouseUser } from "react-icons/fa6";


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
    <div className="min-h-screen flex bg-gray-50 font-sans">
      
      {/* ================= Sidebar (Desktop) ================= */}
      {isOwner && (
        <aside className="hidden md:flex md:w-72 md:flex-col bg-white shadow-sm">
          <Brand isOwner />
          <Nav role="owner" onNavigate={() => {}} />
        </aside>
      )}

      {/* ================= Sidebar (Mobile) ================= */}
      {isOwner && (
        <div
          className={`fixed inset-0 z-40 md:hidden ${
            open ? "" : "pointer-events-none"
          }`}
        >
          {/* Overlay */}
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity ${
              open ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <aside
            className={`absolute left-0 top-0 h-full w-72 bg-white shadow-2xl transform transition-transform ${
              open ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <Brand isOwner onClose={() => setOpen(false)} />
            <Nav role="owner" onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* ================= Main ================= */}
      <main className="flex flex-1 flex-col min-w-0">

        {/* ================= Header ================= */}
        <header
          className="
            flex items-center justify-between
            h-20 px-6
            bg-gradient-to-r from-[#e11d48] via-[#f43f8c] to-[#fb7185]
            shadow-md
          "
        >
          {/* Mobile menu button */}
          <div className="flex items-center gap-2">
            {isOwner && (
              <button
                className="p-2 rounded-lg text-white hover:bg-white/20 md:hidden"
                onClick={() => setOpen(true)}
              >
                <FiMenu size={24} />
              </button>
            )}
          </div>

          {/* User Info */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-bold text-white">
                {isOwner
                  ? dormLoading
                    ? "..."
                    : dormName || "My Dorm"
                  : null}
              </div>

              <div className="text-xs text-white/90">
                {user?.displayName ||
                  user?.email?.split("@")[0] ||
                  "-"}
              </div>
            </div>

            <div className="rounded-full bg-white p-0.5 shadow">
              <img
                src={avatarSrc}
                alt="avatar"
                className="h-10 w-10 rounded-full object-cover"
              />
            </div>
          </div>
        </header>

        {/* ================= Content ================= */}
        <div className="overflow-y-auto p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

/* =========================================================
                        Brand
========================================================= */

function Brand({
  onClose,
  isOwner,
}: {
  onClose?: () => void;
  isOwner?: boolean;
}) {
  const { name, loading } = useOwnerDormName();

  return (
    <div className="flex h-24 items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <img
          src={logoImg}
          alt="logo"
          className="h-16 w-16 object-contain"
        />

        {isOwner && (
          <div className="flex flex-col">
            <span className="text-lg font-extrabold leading-tight text-gray-800 line-clamp-2">
              {loading ? "..." : name || "Dormitory"}
            </span>
          </div>
        )}
      </div>

      {onClose && (
        <button
          className="rounded-lg p-2 hover:bg-gray-100"
          onClick={onClose}
        >
          <FiX size={24} />
        </button>
      )}
    </div>
  );
}

/* =========================================================
                        Navigation
========================================================= */

function Nav({
  role,
  onNavigate,
}: {
  role: "owner" | "tenant";
  onNavigate: () => void;
}) {
  const base =
    "flex items-center gap-3 px-4 py-3 mx-2 my-1 rounded-xl font-medium text-gray-500 transition hover:bg-pink-50 hover:text-[#e11d48]";

  const active = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "flex items-center gap-3 px-4 py-3 mx-2 my-1 rounded-xl bg-[#f43f8c] text-white font-bold shadow-md"
      : base;

  if (role !== "owner") return null;

  return (
    <nav className="mt-2 space-y-1 p-2">
      <div className="px-4 pb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
        Menu
      </div>

      <NavLink to="explore" end className={active} onClick={onNavigate}>
        <FiHome size={22} />
        หน้าแรก
      </NavLink>

      <NavLink to="rooms" className={active} onClick={onNavigate}>
        <FiBox size={22} />
        ห้องพัก
      </NavLink>

      <NavLink to="repairs" className={active} onClick={onNavigate}>
        <FiTool size={22} />
        แจ้งซ่อม
      </NavLink>

      <NavLink to="bills" className={active} onClick={onNavigate}>
        <FiFileText size={22} />
        บิล/ใบแจ้งหนี้
      </NavLink>

      <NavLink to="payments" className={active} onClick={onNavigate}>
        <FiCreditCard size={22} />
        การชำระเงิน
      </NavLink>

      <NavLink to="furniture" className={active} onClick={onNavigate}>
        <FiPackage size={22} />
        เฟอร์นิเจอร์
      </NavLink>

      <NavLink to="overview" className={active} onClick={onNavigate}>
        <GrOverview size={22} />
        ภาพรวม
      </NavLink>

      <NavLink to="tenants" className={active} onClick={onNavigate}>
        <FaHouseUser size={22} />
        รายชื่อผู้เช่า
      </NavLink>
    </nav>
  );
}
