// src/router.tsx
import { createBrowserRouter } from "react-router-dom";
import Homepage from "./pages/Homepage";
import Login from "./pages/Login";
// import Sign from "./pages/Sign";
import Rooms from "./pages/Rooms";

const router = createBrowserRouter([
  { path: "/", element: <Homepage /> },
  { path: "/login", element: <Login /> },
  // { path: "/sign", element: <Sign /> },
  { path: "/rooms", element: <Rooms /> },
]);

export default router;
