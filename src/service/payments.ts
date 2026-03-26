import type {
  ApproveOwnerPaymentResponse,
  GetOwnerPaymentsParams,
  OwnerPaymentDetail,
  OwnerPaymentsResponse,
  RejectOwnerPaymentResponse,
} from "../types/payments";

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

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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

export async function getOwnerPayments(
  params?: GetOwnerPaymentsParams
): Promise<OwnerPaymentsResponse> {
  const search = new URLSearchParams();

  if (params?.month && params.month !== "all") {
    search.set("month", params.month);
  }

  if (params?.status && params.status !== "all") {
    search.set("status", params.status);
  }

  if (params?.search && params.search.trim() !== "") {
    search.set("search", params.search.trim());
  }

  const query = search.toString();

  return request<OwnerPaymentsResponse>(
    `/payments${query ? `?${query}` : ""}`
  );
}

export async function getOwnerPaymentDetail(
  paymentId: string
): Promise<OwnerPaymentDetail> {
  return request<OwnerPaymentDetail>(`/payments/${paymentId}`);
}

export async function approveOwnerPayment(
  paymentId: string,
  reviewNote?: string
): Promise<ApproveOwnerPaymentResponse> {
  return request<ApproveOwnerPaymentResponse>(`/payments/${paymentId}/approve`, {
    method: "PATCH",
    body: JSON.stringify({
      reviewNote: reviewNote?.trim() ? reviewNote.trim() : undefined,
    }),
  });
}

export async function rejectOwnerPayment(
  paymentId: string,
  reviewNote: string
): Promise<RejectOwnerPaymentResponse> {
  return request<RejectOwnerPaymentResponse>(`/payments/${paymentId}/reject`, {
    method: "PATCH",
    body: JSON.stringify({
      reviewNote: reviewNote.trim(),
    }),
  });
}