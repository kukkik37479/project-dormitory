import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Homepage from "./pages/Homepage";
import Login from "./pages/Login";
import Sign from "./pages/Sign";
import Rooms from "./pages/Rooms";
import RoomDetail from "./pages/RoomDetail";
import Explore from "./pages/Explore";
import DormPublic from "./pages/DormPublic";
import RoomPublicDetail from "./pages/RoomPublicDetail";
import OwnerRepairs from "./pages/OwnerRepairs";
import TenantRepair from "./pages/TenantRepair";
import BillsGateway from "./pages/BillsGateway";
import Payments from "./pages/Payments";
import FurniturePage from "./pages/Furniture";
import FurnitureRoomDetail from "./pages/FurnitureRoomDetail";
import RequireRole from "./components/RequireRole";
import Tenants from "./pages/Tenants";
import Profile from "./pages/Profile";
import MyDorm from "./pages/MyDorm";
import TestMap from "./pages/TestMap";
import MyRoom from "./pages/MyRoom";
import AnnouncementsChat from "./pages/AnnouncementsChat";
import Reviews from "./pages/Reviews";
import Overview from "./pages/Overview";
import AllVacantRooms from "./pages/AllVacantRooms";

function TempPage({ title }: { title: string }) {
  return <div className="p-6 text-xl font-semibold">{title}</div>;
}

function PublicLayout() {
  return <Outlet />;
}

function decodeBase64Url(value: string) {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return atob(padded);
  } catch {
    return "";
  }
}

function getRoleFromStoredToken(): string | null {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token") || "";

  if (!token) return null;

  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const payloadText = decodeBase64Url(parts[1]);
    const payload = JSON.parse(payloadText);
    return payload?.role || null;
  } catch {
    return null;
  }
}

function RepairsPageSwitch() {
  const role = getRoleFromStoredToken();

  if (role === "tenant") {
    return <TenantRepair />;
  }

  return <OwnerRepairs />;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <Homepage /> },
      { path: "explore", element: <Explore /> },
      { path: "dorms/:dormId", element: <DormPublic /> },
      { path: "public/rooms/:roomId", element: <RoomPublicDetail /> },
      { path: "login", element: <Login /> },
      { path: "sign", element: <Sign /> },
    ],
  },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        path: "home",
        element: (
          <RequireRole allow={["owner", "tenant", "admin"]}>
            <Explore />
          </RequireRole>
        ),
      },
      {
        path: "profile",
        element: (
          <RequireRole allow={["owner", "tenant", "admin"]}>
            <Profile />
          </RequireRole>
        ),
      },
      {
        path: "test-map",
        element: (
          <RequireRole allow={["owner", "tenant", "admin"]}>
            <TestMap />
          </RequireRole>
        ),
      },
      {
        path: "announcements-chat",
        element: <AnnouncementsChat />,
      },
      {
        path: "my-dorm",
        element: (
          <RequireRole allow={["owner"]}>
            <MyDorm />
          </RequireRole>
        ),
      },
      {
        path: "rooms",
        element: (
          <RequireRole allow={["owner"]}>
            <Rooms />
          </RequireRole>
        ),
      },
      {
        path: "rooms/:roomId",
        element: (
          <RequireRole allow={["owner"]}>
            <RoomDetail />
          </RequireRole>
        ),
      },
      {
        path: "furniture",
        element: (
          <RequireRole allow={["owner"]}>
            <FurniturePage />
          </RequireRole>
        ),
      },
      {
        path: "furniture/:roomId",
        element: (
          <RequireRole allow={["owner"]}>
            <FurnitureRoomDetail />
          </RequireRole>
        ),
      },
      {
        path: "payments",
        element: (
          <RequireRole allow={["owner"]}>
            <Payments />
          </RequireRole>
        ),
      },
      {
        path: "overview",
        element: (
          <RequireRole allow={["owner"]}>
            <Overview />
          </RequireRole>
        ),
      },
      {
        path: "tenants",
        element: (
          <RequireRole allow={["owner"]}>
            <Tenants />
          </RequireRole>
        ),
      },
      {
        path: "reviews",
        element: (
          <RequireRole allow={["owner"]}>
            <Reviews />
          </RequireRole>
        ),
      },
      {
        path: "announcements",
        element: (
          <RequireRole allow={["owner", "tenant"]}>
            <TempPage title="ประกาศและช่องแชท" />
          </RequireRole>
        ),
      },
      {
        path: "repairs",
        element: (
          <RequireRole allow={["owner", "tenant"]}>
            <RepairsPageSwitch />
          </RequireRole>
        ),
      },
      {
        path: "bills",
        element: (
          <RequireRole allow={["owner", "tenant"]}>
            <BillsGateway />
          </RequireRole>
        ),
      },
      {
        path: "/vacancy",
        element: <AllVacantRooms />,
      },
      {
        path: "my-room",
        element: (
          <RequireRole allow={["tenant"]}>
            <MyRoom />
          </RequireRole>
        ),
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export default router;