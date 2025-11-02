// src/router.tsx
import { createBrowserRouter } from "react-router-dom";
import Homepage from "./pages/Homepage";
import Login from "./pages/Login";
import Sign from "./pages/Sign";
import Rooms from "./pages/Rooms";
import RoomDetail from "./pages/RoomDetail";

const router = createBrowserRouter([
  { path: "/", element: <Homepage /> },
  { path: "/login", element: <Login /> },
  { path: "/sign", element: <Sign /> },
  { path: "/rooms", element: <Rooms /> },
  { path: "/rooms/:roomId", element: <RoomDetail /> }, 
]);

export default router;
