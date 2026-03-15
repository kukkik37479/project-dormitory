import { useEffect, useMemo, useState } from "react";
import avatarDefault from "../assets/user.png";

const API_BASE_URL = "http://localhost:3000";

type AppRole = "owner" | "tenant" | "admin";

type StoredUser = {
  id?: string;
  role?: AppRole;
  email?: string;
  username?: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string | null;
  dorm_id?: string | null;
  dorm_slug?: string | null;
  dorm_name?: string | null;
  dorm_name_en?: string | null;
  login_identifier?: string | null;
  created_at?: string | null;
  prefix?: string | null;
  gender?: string | null;
  birth_date?: string | null;
};

type ProfileForm = {
  prefix: string;
  full_name: string;
  gender: string;
  phone: string;
  email: string;
  birth_date: string;
};

function formatThaiDate(dateString?: string | null) {
  if (!dateString) return "00/00/0000";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "00/00/0000";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());

  return `${day}/${month}/${year}`;
}

function getRoleLabel(role?: AppRole) {
  if (role === "owner") return "เจ้าของ";
  if (role === "tenant") return "ผู้เช่า";
  if (role === "admin") return "แอดมิน";
  return "-";
}

function toDateInputValue(dateString?: string | null) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

export default function Profile() {
  const storageUser: StoredUser | null = useMemo(() => {
    try {
      const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const token = useMemo(() => {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  }, []);

  const [user, setUser] = useState<StoredUser | null>(storageUser);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");
  const [showForgotModal, setShowForgotModal] = useState(false);

  const [profileForm, setProfileForm] = useState<ProfileForm>({
    prefix: "",
    full_name: "",
    gender: "",
    phone: "",
    email: "",
    birth_date: "",
  });

  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setLoadingProfile(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/users/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          setProfileError(data.message || "โหลดข้อมูลโปรไฟล์ไม่สำเร็จ");
          setLoadingProfile(false);
          return;
        }

        const fetchedUser: StoredUser = data.user;
        setUser(fetchedUser);

        setProfileForm({
          prefix: fetchedUser.prefix || "",
          full_name: fetchedUser.full_name || "",
          gender: fetchedUser.gender || "",
          phone: fetchedUser.phone || "",
          email: fetchedUser.email || "",
          birth_date: toDateInputValue(fetchedUser.birth_date),
        });

        if (localStorage.getItem("user")) {
          localStorage.setItem("user", JSON.stringify(fetchedUser));
        }
        if (sessionStorage.getItem("user")) {
          sessionStorage.setItem("user", JSON.stringify(fetchedUser));
        }
      } catch (error) {
        setProfileError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [token]);

  const role = user?.role || "tenant";
  const avatarSrc = avatarDefault;

  const displayName = profileForm.full_name || user?.full_name || "ชื่อผู้ใช้";
  const dormName = user?.dorm_name || "ชื่อหอพัก";
  const roleLabel = getRoleLabel(role);
  const roomLabel = role === "tenant" ? "ห้องที่ผู้เช่าอยู่" : "-";
  const registerDate = formatThaiDate(user?.created_at);

  const handleProfileChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage("");
    setProfileError("");

    if (!profileForm.full_name.trim()) {
      setProfileError("กรุณากรอกชื่อ-นามสกุล");
      return;
    }

    if (!profileForm.phone.trim()) {
      setProfileError("กรุณากรอกเบอร์โทรศัพท์");
      return;
    }

    if (!profileForm.email.trim()) {
      setProfileError("กรุณากรอกอีเมล");
      return;
    }

    if (!token) {
      setProfileError("ไม่พบ token สำหรับเข้าสู่ระบบ");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: profileForm.full_name.trim(),
          phone: profileForm.phone.trim(),
          email: profileForm.email.trim().toLowerCase(),
          prefix: profileForm.prefix || null,
          gender: profileForm.gender || null,
          birth_date: profileForm.birth_date || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setProfileError(data.message || "อัปเดตโปรไฟล์ไม่สำเร็จ");
        return;
      }

      const updatedUser: StoredUser = data.user;
      setUser(updatedUser);

      setProfileForm({
        prefix: updatedUser.prefix || "",
        full_name: updatedUser.full_name || "",
        gender: updatedUser.gender || "",
        phone: updatedUser.phone || "",
        email: updatedUser.email || "",
        birth_date: toDateInputValue(updatedUser.birth_date),
      });

      if (localStorage.getItem("user")) {
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }
      if (sessionStorage.getItem("user")) {
        sessionStorage.setItem("user", JSON.stringify(updatedUser));
      }

      setProfileMessage("บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว");
    } catch (error) {
      setProfileError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage("");
    setPasswordError("");

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError("กรุณากรอกข้อมูลให้ครบ");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError("ยืนยันรหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }

    if (!token) {
      setPasswordError("ไม่พบ token สำหรับเข้าสู่ระบบ");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/me/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_new_password: confirmNewPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
        return;
      }

      setPasswordMessage("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      setPasswordError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] p-6">
        <div className="rounded-[28px] bg-white p-6 shadow-sm text-lg font-semibold">
          กำลังโหลดข้อมูลโปรไฟล์...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-3xl font-extrabold text-gray-900">
          จัดการข้อมูลส่วนตัว
        </h1>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center">
              <img
                src={avatarSrc}
                alt="avatar"
                className="h-24 w-24 rounded-full object-cover"
              />

              <h2 className="mt-4 text-xl font-extrabold text-gray-900">
                {displayName}
              </h2>
            </div>

            <div className="mt-8 grid grid-cols-[90px_1fr] gap-y-3 text-sm text-gray-800">
              <div className="font-semibold">หอพัก</div>
              <div>{dormName}</div>

              <div className="font-semibold">บทบาท</div>
              <div>{roleLabel}</div>

              <div className="font-semibold">ห้อง</div>
              <div>{roomLabel}</div>

              <div className="font-semibold">ลงทะเบียน</div>
              <div>{registerDate}</div>
            </div>
          </div>

          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-wrap items-center gap-3 border-b pb-4">
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={`rounded-xl px-5 py-2.5 font-semibold transition ${
                  activeTab === "profile"
                    ? "bg-[#ff4f8b] text-white"
                    : "bg-[#f1f2f4] text-gray-700"
                }`}
              >
                ข้อมูลผู้ใช้
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("password")}
                className={`rounded-xl px-5 py-2.5 font-semibold transition ${
                  activeTab === "password"
                    ? "bg-[#ff4f8b] text-white"
                    : "bg-[#f1f2f4] text-gray-700"
                }`}
              >
                แก้ไขรหัสผ่าน
              </button>
            </div>

            {activeTab === "profile" && (
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      คำนำหน้า
                    </label>
                    <select
                      name="prefix"
                      value={profileForm.prefix}
                      onChange={handleProfileChange}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                    >
                      <option value="">เลือกคำนำหน้า</option>
                      <option value="นาย">นาย</option>
                      <option value="นางสาว">นางสาว</option>
                      <option value="นาง">นาง</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      ชื่อ-นามสกุล
                    </label>
                    <input
                      name="full_name"
                      value={profileForm.full_name}
                      onChange={handleProfileChange}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                      placeholder="กรอกชื่อ-นามสกุล"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      เพศ
                    </label>
                    <select
                      name="gender"
                      value={profileForm.gender}
                      onChange={handleProfileChange}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                    >
                      <option value="">เลือกเพศ</option>
                      <option value="male">ชาย</option>
                      <option value="female">หญิง</option>
                      <option value="other">อื่น ๆ</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      เบอร์โทรศัพท์
                    </label>
                    <input
                      name="phone"
                      value={profileForm.phone}
                      onChange={handleProfileChange}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                      placeholder="กรอกเบอร์โทรศัพท์"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      อีเมล
                    </label>
                    <input
                      name="email"
                      value={profileForm.email}
                      onChange={handleProfileChange}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                      placeholder="กรอกอีเมล"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      วัน/เดือน/ปีเกิด
                    </label>
                    <input
                      type="date"
                      name="birth_date"
                      value={profileForm.birth_date}
                      onChange={handleProfileChange}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                    />
                  </div>
                </div>

                {profileError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {profileError}
                  </div>
                )}

                {profileMessage && (
                  <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
                    {profileMessage}
                  </div>
                )}

                <div className="flex justify-center">
                  <button
                    type="submit"
                    className="h-12 rounded-xl bg-[#ff4f8b] px-10 font-bold text-white shadow hover:opacity-95"
                  >
                    บันทึกข้อมูล
                  </button>
                </div>
              </form>
            )}

            {activeTab === "password" && (
              <form onSubmit={handleChangePassword} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    รหัสผ่านเดิม
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                    placeholder="กรอกรหัสผ่านเดิม"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    รหัสผ่านใหม่
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                    placeholder="กรอกรหัสผ่านใหม่"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    ยืนยันรหัสผ่านใหม่
                  </label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                    placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-sm font-semibold text-pink-600 hover:underline"
                    onClick={() => setShowForgotModal(true)}
                  >
                    ลืมรหัสผ่าน?
                  </button>
                </div>

                {passwordError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {passwordError}
                  </div>
                )}

                {passwordMessage && (
                  <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
                    {passwordMessage}
                  </div>
                )}

                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmNewPassword("");
                      setPasswordError("");
                      setPasswordMessage("");
                    }}
                    className="h-12 rounded-xl bg-[#ef4444] px-8 font-bold text-white shadow hover:opacity-95"
                  >
                    ล้างข้อมูล
                  </button>

                  <button
                    type="submit"
                    className="h-12 rounded-xl bg-[#22c55e] px-8 font-bold text-white shadow hover:opacity-95"
                  >
                    บันทึกข้อมูล
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-2xl font-extrabold text-pink-600">ลืมรหัส</h3>

            <p className="mt-4 text-sm text-gray-600">
              ฟังก์ชันลืมรหัสผ่านยังไม่ได้เชื่อมในรอบนี้
            </p>

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="rounded-xl bg-[#ef4444] px-6 py-2.5 font-semibold text-white"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="rounded-xl bg-[#84cc16] px-6 py-2.5 font-semibold text-white"
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}