import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Homepage from "./pages/Homepage";
import Login from "./pages/Login";
import Sign from "./pages/Sign";
import Rooms from "./pages/Rooms";
import RoomDetail from "./pages/RoomDetail";
import Explore from "./pages/Explore";
import DormPublic from "./pages/DormPublic";
import OwnerRepairs from "./pages/OwnerRepairs";
import Bills from "./pages/Bills";
import FurniturePage from "./pages/Furniture";
import RequireRole from "./components/RequireRole";
import Tenants from "./pages/Tenants";
import Profile from "./pages/Profile";

// หน้า placeholder ชั่วคราว
function TempPage({ title }: { title: string }) {
  return <div className="p-6 text-xl font-semibold">{title}</div>;
}

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/sign", element: <Sign /> },

  // หน้าแรกก่อนเข้าระบบ
  { path: "/", element: <Homepage /> },

  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/explore" replace /> },

      // -------- Shared / Public in system --------
      { path: "explore", element: <Explore /> },
      { path: "public", element: <DormPublic /> },

      {
        path: "profile",
        element: (
          <RequireRole allow={["owner", "tenant", "admin"]}>
            <Profile />
          </RequireRole>
        ),
      },

      // -------- Owner only --------
      {
        path: "my-dorm",
        element: (
          <RequireRole allow={["owner"]}>
            <TempPage title="หอของฉัน" />
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
        path: "payments",
        element: (
          <RequireRole allow={["owner"]}>
            <TempPage title="การชำระเงิน" />
          </RequireRole>
        ),
      },
      {
        path: "overview",
        element: (
          <RequireRole allow={["owner"]}>
            <TempPage title="ภาพรวม" />
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
            <TempPage title="รีวิว" />
          </RequireRole>
        ),
      },

      // -------- Shared owner + tenant --------
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
            <OwnerRepairs />
          </RequireRole>
        ),
      },
      {
        path: "bills",
        element: (
          <RequireRole allow={["owner", "tenant"]}>
            <Bills />
          </RequireRole>
        ),
      },

      // -------- Tenant only --------
      {
        path: "my-room",
        element: (
          <RequireRole allow={["tenant"]}>
            <TempPage title="ห้องของฉัน" />
          </RequireRole>
        ),
      },

      { path: "*", element: <Navigate to="/explore" replace /> },
    ],
  },
]);

export default router;