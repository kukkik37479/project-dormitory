import React, { useMemo, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  FiMenu,
  FiX,
  FiHome,
  FiTool,
  FiFileText,
  FiCreditCard,
  FiPackage,
  FiBox,
  FiMessageCircle,
  FiStar,
} from "react-icons/fi";
import { GrOverview } from "react-icons/gr";
import { FaHouseUser } from "react-icons/fa6";
import { MdOutlineApartment } from "react-icons/md";

import { getAvatarByRoleAndGender } from "../utils/roleAvatar";
import logoImg from "../assets/logosi.png";

type AppRole = "owner" | "tenant" | "admin";

type StoredUser = {
  id?: string;
  role?: AppRole;
  email?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string | null;
  dorm_id?: string | null;
  dorm_slug?: string | null;
  dorm_name?: string | null;
  dorm_name_en?: string | null;
  login_identifier?: string | null;
  gender?: string | null;
};

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const storedUser: StoredUser | null = useMemo(() => {
    try {
      const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const role: AppRole = storedUser?.role ?? "admin";

  const avatarSrc = getAvatarByRoleAndGender({
    role: storedUser?.role,
    gender: storedUser?.gender,
  });

  const displayName =
    storedUser?.full_name ||
    storedUser?.username ||
    storedUser?.email?.split("@")[0] ||
    "-";

  const dormName = storedUser?.dorm_name || "ชื่อหอพัก";

  const sidebarTitle =
    role === "owner" || role === "tenant" ? dormName : "Roomie";
  const headerTitle =
    role === "owner" || role === "tenant" ? dormName : displayName;

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans">
      <aside className="hidden md:flex md:w-72 md:flex-col bg-white shadow-sm">
        <Brand title={sidebarTitle} onClose={undefined} />
        <Nav role={role} onNavigate={() => {}} />
      </aside>

      <div
        className={`fixed inset-0 z-40 md:hidden ${
          open ? "" : "pointer-events-none"
        }`}
      >
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setOpen(false)}
        />

        <aside
          className={`absolute left-0 top-0 h-full w-72 bg-white shadow-2xl transform transition-transform ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Brand title={sidebarTitle} onClose={() => setOpen(false)} />
          <Nav role={role} onNavigate={() => setOpen(false)} />
        </aside>
      </div>

      <main className="flex flex-1 flex-col min-w-0">
        <header
          className="
            flex items-center justify-between
            h-20 px-6
            bg-gradient-to-r from-[#e11d48] via-[#f43f8c] to-[#fb7185]
            shadow-md
          "
        >
          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-lg text-white hover:bg-white/20 md:hidden"
              onClick={() => setOpen(true)}
            >
              <FiMenu size={24} />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-bold text-white">{headerTitle}</div>
              <div className="text-xs text-white/90">{displayName}</div>
            </div>

            <button
              type="button"
              className="rounded-full bg-white p-0.5 shadow"
              onClick={() => navigate("/profile")}
            >
              <img
                src={avatarSrc}
                alt="avatar"
                className="h-10 w-10 rounded-full object-cover"
              />
            </button>
          </div>
        </header>

        <div className="overflow-y-auto p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function Brand({
  title,
  onClose,
}: {
  title: string;
  onClose?: () => void;
}) {
  return (
    <div className="flex h-24 items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <img src={logoImg} alt="logo" className="h-16 w-16 object-contain" />

        <div className="flex flex-col">
          <span className="text-lg font-extrabold leading-tight text-gray-800 line-clamp-2">
            {title}
          </span>
        </div>
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

function Nav({
  role,
  onNavigate,
}: {
  role: AppRole;
  onNavigate: () => void;
}) {
  const base =
    "flex items-center gap-3 px-4 py-3 mx-2 my-1 rounded-xl font-medium text-gray-500 transition hover:bg-pink-50 hover:text-[#e11d48]";

  const active = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "flex items-center gap-3 px-4 py-3 mx-2 my-1 rounded-xl bg-[#f43f8c] text-white font-bold shadow-md"
      : base;

  const ownerMenus = [
    { to: "/home", label: "หน้าแรก", icon: <FiHome size={22} /> },
    { to: "/my-dorm", label: "หอของฉัน", icon: <MdOutlineApartment size={22} /> },
    { to: "/rooms", label: "ห้องพัก", icon: <FiBox size={22} /> },
    {
      to: "/announcements-chat",
      label: "ประกาศและช่องแชท",
      icon: <FiMessageCircle size={22} />,
    },
    { to: "/furniture", label: "เฟอร์นิเจอร์", icon: <FiPackage size={22} /> },
    { to: "/bills", label: "บิล/ใบแจ้งหนี้", icon: <FiFileText size={22} /> },
    { to: "/payments", label: "การชำระเงิน", icon: <FiCreditCard size={22} /> },
    { to: "/repairs", label: "แจ้งซ่อม", icon: <FiTool size={22} /> },
    { to: "/overview", label: "ภาพรวม", icon: <GrOverview size={22} /> },
    { to: "/tenants", label: "รายชื่อผู้เช่า", icon: <FaHouseUser size={22} /> },
    { to: "/reviews", label: "รีวิว", icon: <FiStar size={22} /> },
  ];

  const tenantMenus = [
    { to: "/home", label: "หน้าแรก", icon: <FiHome size={22} /> },
    { to: "/my-room", label: "ห้องของฉัน", icon: <MdOutlineApartment size={22} /> },
    {
      to: "/announcements-chat",
      label: "ประกาศและช่องแชท",
      icon: <FiMessageCircle size={22} />,
    },
    { to: "/repairs", label: "แจ้งซ่อม", icon: <FiTool size={22} /> },
    { to: "/bills", label: "บิล/ใบแจ้งหนี้", icon: <FiFileText size={22} /> },
  ];

  const adminMenus = [
    { to: "/home", label: "หน้าแรก", icon: <FiHome size={22} /> },
  ];

  const menus =
    role === "owner"
      ? ownerMenus
      : role === "tenant"
      ? tenantMenus
      : adminMenus;

  return (
    <nav className="mt-2 space-y-1 p-2">
      <div className="px-4 pb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
        Menu
      </div>

      {menus.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/home"}
          className={active}
          onClick={onNavigate}
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}