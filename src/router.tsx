import { createBrowserRouter } from "react-router-dom";
import Homepasg from "./pages/Homepage";
import Login from "./pages/Login";
import Sign from "./pages/Sign";   // <-- หน้า sign (สมัครสมาชิก)
// import Home from "./components/Home";   // ตัวอย่างหน้าอื่น

export const router = createBrowserRouter([
  { path: "/", element: <Homepasg /> }, 
  { path: "/login", element: <Login /> },
  { path: "/sign", element: <Sign /> },
]);