// src/router.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout     from "./layouts/AppLayout";
import Homepage      from "./pages/Homepage";
import Login         from "./pages/Login";
import Sign          from "./pages/Sign";
import Rooms         from "./pages/Rooms";
import RoomDetail    from "./pages/RoomDetail";
import Explore       from "./pages/Explore";
import DormPublic    from "./pages/DormPublic";
import OwnerRepairs  from "./pages/OwnerRepairs";
import Bills         from "./pages/Bills";
import FurniturePage from "./pages/Furniture";
import RequireRole   from "./components/RequireRole";
import Tenants       from "./pages/Tenants";

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/sign",  element: <Sign />  },
  { index: true, element: <Homepage /> },

  {
    path: "/",
    element: <AppLayout />,
    children: [
      // เพจเข้าถึงได้ทั่วไป (หรือภายในระบบแต่ไม่ผูกบทบาท)
      { path: "explore",  element: <Explore /> },
      { path: "public",   element: <DormPublic /> },

      // --- Owner only ---
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
        path: "repairs",
        element: (
          <RequireRole allow={["owner"]}>
            <OwnerRepairs />
          </RequireRole>
        ),
      },
      {
        path: "bills",
        element: (
          <RequireRole allow={["owner"]}>
            <Bills />
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
        path: "tenants",
        element: (
          <RequireRole allow={["owner"]}>
            <Tenants />
          </RequireRole>
        ),
      },

      // 404 ภายใน layout -> กลับไปหน้าแรกของ layout
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export default router;
