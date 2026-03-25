import type {
  BillingFormOptionsResponse,
  CreateInvoicePayload,
  CreateInvoiceResponse,
  DefaultBankAccountResponse,
  GetInvoiceFormOptionsParams,
} from "../types/billing";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("token") ||
    ""
  );
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const isFormData = options?.body instanceof FormData;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data as T;
}

export async function getInvoiceFormOptions(
  params?: GetInvoiceFormOptionsParams
): Promise<BillingFormOptionsResponse> {
  const search = new URLSearchParams();

  if (params?.building_id) search.set("building_id", params.building_id);
  if (params?.floor_no !== undefined) {
    search.set("floor_no", String(params.floor_no));
  }
  if (params?.room_id) search.set("room_id", params.room_id);
  if (params?.billing_month) search.set("billing_month", params.billing_month);

  const query = search.toString();

  return request<BillingFormOptionsResponse>(
    `/invoices/form-options${query ? `?${query}` : ""}`
  );
}

export async function createInvoice(
  payload: CreateInvoicePayload
): Promise<CreateInvoiceResponse> {
  return request<CreateInvoiceResponse>("/invoices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getDefaultBankAccount(): Promise<DefaultBankAccountResponse> {
  return request<DefaultBankAccountResponse>("/bank-accounts/default");
}

export async function saveDefaultBankAccount(
  formData: FormData
): Promise<DefaultBankAccountResponse> {
  return request<DefaultBankAccountResponse>("/bank-accounts/default", {
    method: "PUT",
    body: formData,
  });
}