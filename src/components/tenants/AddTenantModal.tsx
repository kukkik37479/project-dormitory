import { useEffect, useMemo, useState, type ReactNode } from "react";

const API_BASE_URL =
  (import.meta as any)?.env?.VITE_API_BASE_URL || "http://localhost:3000";

type BuildingOption = {
  id: string;
  building_code: string;
  display_name: string;
  sort_order?: number;
};

type RoomOption = {
  id: string;
  building_id: string;
  building_name: string;
  room_number: string;
  floor_no: number;
  monthly_rent: number | null;
  status: string;
};

type FormOptionsResponse = {
  buildings: BuildingOption[];
  floors: number[];
  rooms: RoomOption[];
};

type MeResponse = {
  message: string;
  user: {
    dorm_slug?: string | null;
    dorm_name?: string | null;
    dorm_name_en?: string | null;
  };
};

type CreateTenantForm = {
  full_name: string;
  phone: string;
  building_id: string;
  floor_no: string;
  room_id: string;
  username_prefix: string;
  password: string;
  tenant_note: string;
  contract_note: string;
  contract_file: File | null;
};

function getAccessToken() {
  return (
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("authToken") ||
    ""
  );
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();

  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์");
  }

  return data as T;
}

function generatePassword(length = 10) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function sanitizeUsernamePrefix(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "");
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export type AddTenantModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export default function AddTenantModal({
  open,
  onClose,
  onCreated,
}: AddTenantModalProps) {
  const [dormSuffix, setDormSuffix] = useState("");
  const [form, setForm] = useState<CreateTenantForm>({
    full_name: "",
    phone: "",
    building_id: "",
    floor_no: "",
    room_id: "",
    username_prefix: "",
    password: "",
    tenant_note: "",
    contract_note: "",
    contract_file: null,
  });

  const [options, setOptions] = useState<FormOptionsResponse>({
    buildings: [],
    floors: [],
    rooms: [],
  });

  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const finalUsername = useMemo(() => {
    const prefix = sanitizeUsernamePrefix(form.username_prefix);
    if (!prefix) return "";
    if (!dormSuffix) return prefix;
    return `${prefix}@${dormSuffix}`;
  }, [form.username_prefix, dormSuffix]);

  function update<K extends keyof CreateTenantForm>(
    key: K,
    value: CreateTenantForm[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadDormSuffix() {
    try {
      const res = await apiFetch<MeResponse>("/api/auth/me");
      const suffix = String(res?.user?.dorm_slug || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^a-z0-9._-]/g, "");

      setDormSuffix(suffix);
    } catch (error) {
      console.error("loadDormSuffix error:", error);
      setDormSuffix("");
    }
  }

  async function loadFormOptions(buildingId?: string, floorNo?: string) {
    setLoadingOptions(true);
    try {
      const query = new URLSearchParams();
      if (buildingId) query.set("building_id", buildingId);
      if (floorNo) query.set("floor_no", floorNo);

      const res = await apiFetch<{ message: string; data: FormOptionsResponse }>(
        `/api/tenants/form-options${query.toString() ? `?${query.toString()}` : ""}`
      );

      setOptions(res.data || { buildings: [], floors: [], rooms: [] });
    } catch (error) {
      console.error("loadFormOptions error:", error);
      setOptions({ buildings: [], floors: [], rooms: [] });
    } finally {
      setLoadingOptions(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    setErr("");
    setCopyMessage("");
    setForm({
      full_name: "",
      phone: "",
      building_id: "",
      floor_no: "",
      room_id: "",
      username_prefix: "",
      password: generatePassword(10),
      tenant_note: "",
      contract_note: "",
      contract_file: null,
    });

    loadDormSuffix();
    loadFormOptions();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    loadFormOptions(form.building_id || undefined, form.floor_no || undefined);
  }, [form.building_id, form.floor_no, open]);

  async function handleCopyAccount() {
    const text = `Username: ${finalUsername}\nPassword: ${form.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage("คัดลอกข้อมูลบัญชีแล้ว");
      setTimeout(() => setCopyMessage(""), 1800);
    } catch {
      setCopyMessage("คัดลอกไม่สำเร็จ");
      setTimeout(() => setCopyMessage(""), 1800);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    if (!form.full_name.trim()) return setErr("กรุณากรอกชื่อผู้เช่า");
    if (!form.phone.trim()) return setErr("กรุณากรอกเบอร์โทรศัพท์");
    if (!form.building_id) return setErr("กรุณาเลือกตึก");
    if (!form.floor_no) return setErr("กรุณาเลือกชั้น");
    if (!form.room_id) return setErr("กรุณาเลือกห้อง");
    if (!sanitizeUsernamePrefix(form.username_prefix)) {
      return setErr("กรุณากรอก Username");
    }
    if (!dormSuffix) {
      return setErr("ไม่พบชื่อหอสำหรับสร้าง Username");
    }
    if (!form.password.trim() || form.password.trim().length < 6) {
      return setErr("Password ต้องมีอย่างน้อย 6 ตัวอักษร");
    }

    setSaving(true);
    try {
      const body = new FormData();
      body.append("full_name", form.full_name.trim());
      body.append("phone", form.phone.trim());
      body.append("building_id", form.building_id);
      body.append("floor_no", form.floor_no);
      body.append("room_id", form.room_id);
      body.append("username", finalUsername);
      body.append("password", form.password.trim());
      body.append("tenant_note", form.tenant_note.trim());
      body.append("contract_note", form.contract_note.trim());

      if (form.contract_file) {
        body.append("contract_file", form.contract_file);
      }

      await apiFetch("/api/tenants", {
        method: "POST",
        body,
      });

      onCreated();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/20 p-4">
      <div className="mt-8 w-full max-w-[643px] rounded-[6px] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-[15px] font-bold text-[#49a3ff]">
            Pop-up เพิ่มผู้เช่าใหม่
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-lg font-bold text-[#49a3ff]"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4">
          <h4 className="mb-3 text-[34px] font-extrabold leading-none text-[#ff2f73]">
            เพิ่มผู้เช่าใหม่
          </h4>

          <div className="space-y-3">
            <Field label="ชื่อผู้เช่า">
              <input
                className="h-11 w-full rounded border border-[#e5e5e5] bg-[#f5f5f5] px-3 text-sm outline-none"
                value={form.full_name}
                onChange={(e) => update("full_name", e.target.value)}
                placeholder="ชื่อ-นามสกุล ผู้เช่า"
              />
            </Field>

            <Field label="เบอร์โทรศัพท์">
              <input
                className="h-11 w-full rounded border border-[#e5e5e5] bg-[#f5f5f5] px-3 text-sm outline-none"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="เบอร์โทรศัพท์ผู้เช่า"
              />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="ตึก">
                <select
                  className="h-11 w-full rounded border border-[#e5e5e5] bg-[#f5f5f5] px-3 text-sm outline-none"
                  value={form.building_id}
                  onChange={(e) => {
                    update("building_id", e.target.value);
                    update("floor_no", "");
                    update("room_id", "");
                  }}
                  disabled={loadingOptions}
                >
                  <option value="">เช่น ตึก A</option>
                  {options.buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.display_name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="ชั้น">
                <select
                  className="h-11 w-full rounded border border-[#e5e5e5] bg-[#f5f5f5] px-3 text-sm outline-none"
                  value={form.floor_no}
                  onChange={(e) => {
                    update("floor_no", e.target.value);
                    update("room_id", "");
                  }}
                  disabled={loadingOptions || !form.building_id}
                >
                  <option value="">1</option>
                  {options.floors.map((floor) => (
                    <option key={floor} value={String(floor)}>
                      {floor}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="เลขห้อง">
                <select
                  className="h-11 w-full rounded border border-[#e5e5e5] bg-[#f5f5f5] px-3 text-sm outline-none"
                  value={form.room_id}
                  onChange={(e) => update("room_id", e.target.value)}
                  disabled={loadingOptions || !form.building_id || !form.floor_no}
                >
                  <option value="">เช่น 101</option>
                  {options.rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.room_number}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Username">
              <div className="flex h-11 overflow-hidden rounded border border-[#e5e5e5] bg-[#f5f5f5]">
                <input
                  className="h-full w-full bg-transparent px-3 text-sm outline-none"
                  value={form.username_prefix}
                  onChange={(e) =>
                    update("username_prefix", sanitizeUsernamePrefix(e.target.value))
                  }
                  placeholder="เช่น somchai"
                />
                <div className="flex items-center border-l bg-[#ececec] px-3 text-sm text-[#666]">
                  @{dormSuffix || "dormname"}
                </div>
              </div>
            </Field>

            <Field label="Password">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="h-11 w-full rounded border border-[#e5e5e5] bg-[#f5f5f5] px-3 text-sm outline-none"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="Generate Password สุ่มให้"
                />
                <button
                  type="button"
                  onClick={() => update("password", generatePassword(10))}
                  className="rounded bg-[#ff4f86] px-4 text-sm font-medium text-white"
                >
                  สุ่ม
                </button>
              </div>
            </Field>

            <Field label="Username สำหรับคัดลอก">
              <div className="flex gap-2">
                <input
                  readOnly
                  className="h-11 w-full rounded border border-[#e5e5e5] bg-[#f5f5f5] px-3 text-sm outline-none"
                  value={finalUsername}
                  placeholder="Username สำหรับส่งผู้เช่า"
                />
                <button
                  type="button"
                  onClick={() => copyText(finalUsername)}
                  disabled={!finalUsername}
                  className="rounded bg-[#5aa9ff] px-4 text-sm font-medium text-white disabled:opacity-50"
                >
                  คัดลอก
                </button>
              </div>
            </Field>

            <Field label="Password สำหรับคัดลอก">
              <div className="flex gap-2">
                <input
                  readOnly
                  className="h-11 w-full rounded border border-[#e5e5e5] bg-[#f5f5f5] px-3 text-sm outline-none"
                  value={form.password}
                  placeholder="Password สำหรับส่งผู้เช่า"
                />
                <button
                  type="button"
                  onClick={() => copyText(form.password)}
                  disabled={!form.password}
                  className="rounded bg-[#5aa9ff] px-4 text-sm font-medium text-white disabled:opacity-50"
                >
                  คัดลอก
                </button>
              </div>
            </Field>

            <div className="rounded border border-[#d6ebff] bg-[#f3f9ff] p-3">
              <div className="mb-2 text-sm font-semibold text-[#2b6cb0]">
                คัดลอกส่งผู้เช่า
              </div>
              <div className="space-y-2">
                <div className="rounded bg-white px-3 py-2 text-sm">
                  Username: <span className="font-medium">{finalUsername || "-"}</span>
                </div>
                <div className="rounded bg-white px-3 py-2 text-sm">
                  Password: <span className="font-medium">{form.password || "-"}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyAccount}
                  disabled={!finalUsername || !form.password}
                  className="rounded bg-[#49a3ff] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  คัดลอกทั้งชุด
                </button>
                {copyMessage && (
                  <div className="text-xs text-[#2b6cb0]">{copyMessage}</div>
                )}
              </div>
            </div>

            <Field label="ไฟล์สัญญา">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="block w-full rounded border border-[#e5e5e5] bg-[#f5f5f5] px-3 py-3 text-sm outline-none file:mr-3 file:rounded file:border-0 file:bg-pink-500 file:px-3 file:py-2 file:text-white"
                onChange={(e) => update("contract_file", e.target.files?.[0] || null)}
              />
            </Field>

            <Field label="หมายเหตุผู้เช่า">
              <textarea
                className="min-h-[84px] w-full rounded border border-[#e5e5e5] bg-[#f5f5f5] px-3 py-3 text-sm outline-none"
                value={form.tenant_note}
                onChange={(e) => update("tenant_note", e.target.value)}
                placeholder="โน้ตของผู้เช่า"
              />
            </Field>

            <Field label="หมายเหตุสัญญา">
              <textarea
                className="min-h-[84px] w-full rounded border border-[#e5e5e5] bg-[#f5f5f5] px-3 py-3 text-sm outline-none"
                value={form.contract_note}
                onChange={(e) => update("contract_note", e.target.value)}
                placeholder="โน้ตของสัญญา"
              />
            </Field>
          </div>

          {err && (
            <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {err}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md bg-[#ef5350] px-5 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-60"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-[#7bc96f] px-5 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-60"
            >
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-[#222]">{label}</div>
      {children}
    </label>
  );
}