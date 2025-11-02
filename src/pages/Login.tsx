// src/components/Login.tsx
import { useState } from "react";
import logo from "../assets/logo.png"; // <-- โลโก้ของคุณ

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [remember, setRemember] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: call API
    console.log({ email, pass, remember });
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* เอฟเฟกต์ตกแต่ง */}
      {/* <DecorBlobs /> */}

      {/* โลโก้ */}
      <img
        src={logo}
        alt="App Logo"
        className="w-3/4 sm:w-1/2 md:w-1/3 lg:w-1/4 h-auto mb-8 object-contain select-none"
        draggable={false}
      />

        {/* คอลัมน์ฟอร์ม */}
        <div className="w-full">
          <div className="backdrop-blur-sm bg-white/60 rounded-2xl shadow-xl border border-pink-200/40 p-6 sm:p-8">
            {/* บนจอเล็กโชว์โลโก้ซ้ำด้านบนฟอร์ม */}
            {/* <div className="md:hidden flex justify-center mb-6">
              <img src={logo} alt="App Logo" className="h-16 w-auto" />
            </div> */}

            {/* <h1 className="text-2xl sm:text-3xl font-extrabold text-pink-500 text-center mb-6">
              SIGN IN
            </h1> */}

            <form className="space-y-5" onSubmit={onSubmit}>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Enter your email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-12 rounded-xl border border-pink-200/70 bg-pink-100/100 px-4 outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  required
                  className="w-full h-12 rounded-xl border border-pink-200/70 bg-pink-100/100 px-4 outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="inline-flex items-center gap-2 select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="size-4 accent-pink-500"
                  />
                  <span className="font-semibold">Remember me</span>
                </label>

                <button
                  type="button"
                  className="font-semibold hover:underline"
                  onClick={() => alert("Implement forgot password")}
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-black text-pink-400 font-extrabold tracking-wide shadow hover:opacity-90"
              >
                LOGIN
              </button>
            </form>
          </div>
        </div>
      </div>
  );
}
