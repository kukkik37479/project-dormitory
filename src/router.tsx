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

function TempPage({ title }: { title: string }) {
  return <div className="p-6 text-xl font-semibold">{title}</div>;
}

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/sign", element: <Sign /> },
  { path: "/", element: <Homepage /> },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/explore" replace /> },
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
            <BillsGateway />
          </RequireRole>
        ),
      },
      {
        path: "my-room",
        element: (
          <RequireRole allow={["tenant"]}>
            <MyRoom />
          </RequireRole>
        ),
      },
      { path: "*", element: <Navigate to="/explore" replace /> },
    ],
  },
]);

export default router;