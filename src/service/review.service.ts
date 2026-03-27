const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "http://localhost:3000";

function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });

  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

async function handleJson<T>(res: Response): Promise<T> {
  const data: unknown = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : "Request failed";

    throw new Error(message);
  }

  return data as T;
}

function getAuthHeaders(includeJson = true): HeadersInit {
  const token = getToken();

  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    Authorization: `Bearer ${token}`,
  };
}

export type OwnerReviewReply = {
  id: string;
  replied_by: string;
  reply_text: string;
  created_at?: string;
  updated_at?: string;
};

export type OwnerReview = {
  id: string;
  dorm_id: string;
  room_id?: string | null;
  tenant_user_id: string;
  rating: number;
  comment: string;
  status: "visible" | "hidden" | "pending" | string;
  created_at?: string;
  updated_at?: string;
  reviewer_name: string;
  tenant_username?: string | null;
  room_number?: string | null;
  building_name?: string | null;
  has_reply: boolean;
  reply?: OwnerReviewReply | null;
};

export type OwnerReviewStats = {
  total_reviews: number;
  average_rating: number;
  waiting_reply_count: number;
  replied_count: number;
  visible_count: number;
  hidden_count: number;
  pending_count: number;
};

export type OwnerReviewListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  start: number;
  end: number;
};

export type OwnerReviewStatsResponse = {
  message: string;
  data: OwnerReviewStats;
};

export type OwnerReviewListResponse = {
  message: string;
  data: OwnerReview[];
  meta: OwnerReviewListMeta;
};

export type OwnerReviewMutationResponse = {
  message: string;
  data: any;
};

export type GetOwnerReviewsParams = {
  search?: string;
  status?: string;
  replyStatus?: string;
  rating?: number | string;
  sort?: string;
  page?: number;
  limit?: number;
};

export async function getOwnerReviewStats(): Promise<OwnerReviewStatsResponse> {
  const res = await fetch(`${API_BASE_URL}/api/reviews/owner/stats`, {
    method: "GET",
    headers: getAuthHeaders(false),
  });

  return handleJson<OwnerReviewStatsResponse>(res);
}

export async function getOwnerReviews(
  params: GetOwnerReviewsParams = {}
): Promise<OwnerReviewListResponse> {
  const qs = buildQuery({
    search: params.search?.trim(),
    status: params.status,
    replyStatus: params.replyStatus,
    rating:
      params.rating !== undefined &&
      params.rating !== null &&
      String(params.rating) !== "all"
        ? params.rating
        : undefined,
    sort: params.sort,
    page: params.page,
    limit: params.limit,
  });

  const res = await fetch(`${API_BASE_URL}/api/reviews/owner${qs}`, {
    method: "GET",
    headers: getAuthHeaders(false),
  });

  return handleJson<OwnerReviewListResponse>(res);
}

export async function createOwnerReviewReply(
  reviewId: string,
  replyText: string
): Promise<OwnerReviewMutationResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/reviews/${encodeURIComponent(reviewId)}/reply`,
    {
      method: "POST",
      headers: getAuthHeaders(true),
      body: JSON.stringify({
        reply_text: replyText.trim(),
      }),
    }
  );

  return handleJson<OwnerReviewMutationResponse>(res);
}

export async function updateOwnerReviewReply(
  reviewId: string,
  replyText: string
): Promise<OwnerReviewMutationResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/reviews/${encodeURIComponent(reviewId)}/reply`,
    {
      method: "PATCH",
      headers: getAuthHeaders(true),
      body: JSON.stringify({
        reply_text: replyText.trim(),
      }),
    }
  );

  return handleJson<OwnerReviewMutationResponse>(res);
}

export async function deleteOwnerReviewReply(
  reviewId: string
): Promise<OwnerReviewMutationResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/reviews/${encodeURIComponent(reviewId)}/reply`,
    {
      method: "DELETE",
      headers: getAuthHeaders(false),
    }
  );

  return handleJson<OwnerReviewMutationResponse>(res);
}

export async function updateOwnerReviewStatus(
  reviewId: string,
  status: "visible" | "hidden"
): Promise<OwnerReviewMutationResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/reviews/${encodeURIComponent(reviewId)}/status`,
    {
      method: "PATCH",
      headers: getAuthHeaders(true),
      body: JSON.stringify({ status }),
    }
  );

  return handleJson<OwnerReviewMutationResponse>(res);
}

export async function deleteOwnerReview(
  reviewId: string
): Promise<OwnerReviewMutationResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/reviews/${encodeURIComponent(reviewId)}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(false),
    }
  );

  return handleJson<OwnerReviewMutationResponse>(res);
}