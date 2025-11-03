// src/router.tsx
import { createBrowserRouter } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Homepage from "./pages/Homepage";
import Login from "./pages/Login";
import Sign from "./pages/Sign";
import Rooms from "./pages/Rooms";
import RoomDetail from "./pages/RoomDetail";
import Explore from "./pages/Explore";
import DormPublic from "./pages/DormPublic";
import OwnerRepairs from "./pages/OwnerRepairs";

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/sign", element: <Sign /> },
  { index: true, element: <Homepage /> },   
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { path: "rooms", element: <Rooms /> },           // "rooms"
      { path: "rooms/:roomId", element: <RoomDetail /> },
      { path: "explore", element: <Explore /> },
      { path: "d/:dormId", element: <DormPublic /> },
      { path: "repairs", element: <OwnerRepairs /> },
    ],
  },
]);

export default router;
