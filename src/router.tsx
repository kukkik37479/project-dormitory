// src/router.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";

import AppLayout   from "./layouts/AppLayout";
import Homepage    from "./pages/Homepage";
import Login       from "./pages/Login";
import Sign        from "./pages/Sign";
import Rooms       from "./pages/Rooms";
import RoomDetail  from "./pages/RoomDetail";
import Explore     from "./pages/Explore";
import DormPublic  from "./pages/DormPublic";
import OwnerRepairs from "./pages/OwnerRepairs";
import Bills       from "./pages/Bills";
// import BillDetail  from "./pages/BillDetail";

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/sign",  element: <Sign  /> },

  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Homepage /> },

      { path: "rooms",         element: <Rooms /> },
      { path: "rooms/:roomId", element: <RoomDetail /> },

      { path: "explore",  element: <Explore /> },
      { path: "d/:dormId", element: <DormPublic /> },
      { path: "repairs",  element: <OwnerRepairs /> },

      { path: "bills",        element: <Bills /> },
      // { path: "bills/:billId", element: <BillDetail /> },

      // 404 ภายใน layout -> กลับไปหน้าหลักของ layout
      { path: "*", element: <Navigate to="." replace /> },
    ],
  },

  // 404 ระดับ root -> redirect กลับ /
  { path: "*", element: <Navigate to="/" replace /> },
]);

export default router;
