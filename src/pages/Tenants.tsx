import { useEffect, useMemo, useState } from "react";
import AddTenantModal from "../components/tenants/AddTenantModal";

const API_BASE_URL =
  (import.meta as any)?.env?.VITE_API_BASE_URL || "http://localhost:3000";

type TenantItem = {
  tenant_profile_id: string;
  tenant_user_id: string;
  full_name: string;
  phone: string | null;
  username: string;
  building_id: string | null;
  building_code: string | null;
  building_name: string | null;
  room_id: string | null;
  room_number: string | null;
  floor_no: number | null;
  room_status: string | null;
  contract_id: string | null;
  contract_status: string | null;
  contract_file_path: string | null;
  contract_file_name: string | null;
};

type TenantListResponse = {
  message: string;
  data: TenantItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    start: number;
    end: number;
  };
};

function getAccessToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
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

function toAbsoluteFileUrl(filePath?: string | null) {
  if (!filePath) return null;
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }
  return `${API_BASE_URL}/${filePath.replace(/^\/+/, "")}`;
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M9 3a1 1 0 0 0-1 1v1H5.5a1 1 0 1 0 0 2H6l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12h.5a1 1 0 1 0 0-2H16V4a1 1 0 0 0-1-1H9Zm1 2h4v1h-4V5Zm-1.5 5a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Zm7 0a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1ZM12 10a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

export default function Tenants() {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [openAddTenant, setOpenAddTenant] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [endingId, setEndingId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    start: 0,
    end: 0,
  });

  async function loadTenants() {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search.trim()) query.set("search", search.trim());
      query.set("page", String(page));
      query.set("limit", String(limit));

      const res = await apiFetch<TenantListResponse>(`/api/tenants?${query.toString()}`);

      setTenants(res.data || []);
      setMeta(
        res.meta || {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 1,
          start: 0,
          end: 0,
        }
      );
    } catch (error) {
      console.error("loadTenants error:", error);
      setTenants([]);
      setMeta({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
        start: 0,
        end: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page, refreshKey]);

  const tenantCount = useMemo(() => meta.total || tenants.length, [meta.total, tenants.length]);

  async function handleEndContract(contractId: string | null) {
    if (!contractId) return;

    const confirmed = window.confirm("ต้องการจบสัญญาผู้เช่ารายนี้ใช่ไหม");
    if (!confirmed) return;

    try {
      setEndingId(contractId);
      await apiFetch(`/api/contracts/${contractId}/end`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      setRefreshKey((n) => n + 1);
    } catch (error) {
      alert(error instanceof Error ? error.message : "จบสัญญาไม่สำเร็จ");
    } finally {
      setEndingId(null);
    }
  }

  return (
  <div className="min-h-screen bg-[#F9F9F9] px-6 py-8">
    <div className="mx-auto max-w-6xl">
      <div className="mb-10 flex items-start justify-between">
        <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-2 text-pink-600">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M16 11c1.66 0 2.99-1.57 2.99-3.5S17.66 4 16 4s-3 1.57-3 3.5 1.34 3.5 3 3.5ZM8 11c1.66 0 2.99-1.57 2.99-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.96 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z" />
            </svg>
            <span className="text-[28px] font-bold">ผู้เข้าพักทั้งหมด</span>
            <span className="ml-3 text-sm font-medium text-pink-500">
              จำนวนผู้เช่าที่มี
            </span>
          </div>
        </div>

        <button
          onClick={() => setOpenAddTenant(true)}
          className="rounded-md bg-[#F63B74] px-5 py-2.5 text-sm font-semibold text-white shadow hover:opacity-95"
        >
          เพิ่มผู้เช่าใหม่ +
        </button>
      </div>

      <div className="rounded-[28px] bg-[#FFFFFF] p-7 shadow-sm">
        <h2 className="mb-4 text-[24px] font-extrabold text-[#222]">
          รายชื่อผู้เช่าทั้งหมด
        </h2>

        <div className="mb-5 flex items-center gap-3">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                setSearch(searchInput);
              }
            }}
            placeholder="ค้นหาห้อง/ค้นหาคน"
            className="h-10 w-[170px] rounded border border-[#e3d4db] bg-white px-3 text-sm outline-none"
          />
          <button
            onClick={() => {
              setPage(1);
              setSearch(searchInput);
            }}
            className="h-10 rounded bg-[#F63B74] px-4 text-sm font-medium text-white"
          >
            ค้นหา
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-sm text-gray-500">กำลังโหลดข้อมูล...</div>
        ) : tenants.length === 0 ? (
          <div className="py-10 text-sm text-gray-500">ยังไม่มีข้อมูลผู้เช่า</div>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-[#ead6de] bg-white">
              <table className="min-w-full border-collapse text-center text-sm">
                <thead>
                  <tr>
                    <th className="bg-[#f8dde6] px-4 py-3 font-semibold text-[#333]">
                      ห้อง
                    </th>
                    <th className="bg-[#f1608d] px-4 py-3 font-semibold text-white">
                      ผู้เช่า
                    </th>
                    <th className="bg-[#f1d6df] px-4 py-3 font-semibold text-[#333]">
                      เบอร์โทรศัพท์
                    </th>
                    <th className="bg-[#f1608d] px-4 py-3 font-semibold text-white">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant, index) => {
                    const fileUrl = toAbsoluteFileUrl(tenant.contract_file_path);

                    return (
                      <tr
                        key={tenant.tenant_user_id || index}
                        className="border-t border-[#ead6de]"
                      >
                        <td className="bg-white px-4 py-4 font-semibold text-[#222]">
                          {tenant.room_number || "-"}
                        </td>

                        <td className="bg-[#f8e3ea] px-4 py-4 text-[#222]">
                          <div>{tenant.full_name || "-"}</div>
                          <div className="mt-1 text-xs text-[#666]">
                            {tenant.username || "-"}
                          </div>
                          {fileUrl && (
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-block text-xs text-pink-600 underline"
                            >
                              ดูไฟล์สัญญา
                            </a>
                          )}
                        </td>

                        <td className="bg-white px-4 py-4 text-[#222]">
                          {tenant.phone || "-"}
                        </td>

                        <td className="bg-[#f8e3ea] px-4 py-4">
                          <button
                            type="button"
                            onClick={() => handleEndContract(tenant.contract_id)}
                            disabled={!tenant.contract_id || endingId === tenant.contract_id}
                            className="inline-flex items-center justify-center text-[#c91c23] disabled:opacity-40"
                            title="จบสัญญา"
                          >
                            <TrashIcon />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                แสดง {meta.start}-{meta.end} จากทั้งหมด {meta.total} รายการ
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                  className="rounded border border-[#e2d4da] bg-white px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  ← ซ้าย
                </button>

                <div className="text-sm text-gray-700">
                  หน้า {meta.page} / {meta.totalPages || 1}
                </div>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(p + 1, meta.totalPages || 1))}
                  disabled={page >= (meta.totalPages || 1)}
                  className="rounded border border-[#e2d4da] bg-white px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  ขวา →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>

    <AddTenantModal
      open={openAddTenant}
      onClose={() => setOpenAddTenant(false)}
      onCreated={() => {
        setOpenAddTenant(false);
        setPage(1);
        setRefreshKey((n) => n + 1);
      }}
    />
  </div>
);
}