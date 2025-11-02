// src/router.tsx
import { createBrowserRouter } from "react-router-dom";
import Homepage from "./pages/Homepage";
import Login from "./pages/Login";
import Sign from "./pages/Sign";
import Rooms from "./pages/Rooms";
import RoomDetail from "./pages/RoomDetail";
import Explore from "./pages/Explore";
import DormPublic from "./pages/DormPublic";

const router = createBrowserRouter([
  { path: "/", element: <Homepage /> },
  { path: "/login", element: <Login /> },
  { path: "/sign", element: <Sign /> },
  { path: "/rooms", element: <Rooms /> },
  { path: "/rooms/:roomId", element: <RoomDetail /> }, 
  { path: "/explore", element: <Explore /> },        // ผู้เข้าชมดูหอทั้งหมด
  { path: "/d/:dormId", element: <DormPublic /> },   // รายละเอียดหอ + ห้องว่าง
]);

export default router;
