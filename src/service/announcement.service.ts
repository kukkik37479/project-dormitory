import type {
  Announcement,
  AnnouncementResponse,
  AnnouncementsResponse,
  CreateAnnouncementPayload,
  DeleteAnnouncementResponse,
  UpdateAnnouncementPayload,
} from "../types/announcement";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

function getToken(): string | null {
  const candidateKeys = [
    "token",
    "accessToken",
    "authToken",
    "roomie_token",
    "jwt",
    "auth",
    "user",
    "currentUser",
  ];

  const storages = [localStorage, sessionStorage];

  for (const storage of storages) {
    for (const key of candidateKeys) {
      const raw = storage.getItem(key);
      if (!raw) continue;

      if (raw.startsWith("eyJ") || raw.startsWith("Bearer ")) {
        return raw.replace(/^Bearer\s+/i, "");
      }

      try {
        const parsed = JSON.parse(raw);

        const nestedToken =
          parsed?.token ||
          parsed?.accessToken ||
          parsed?.authToken ||
          parsed?.jwt ||
          parsed?.data?.token ||
          parsed?.user?.token ||
          parsed?.user?.accessToken;

        if (typeof nestedToken === "string" && nestedToken.trim()) {
          return nestedToken.replace(/^Bearer\s+/i, "");
        }
      } catch {
        // ignore
      }
    }
  }

  return null;
}

function getAuthHeaders(contentType = true): HeadersInit {
  const token = getToken();

  if (!token) {
    throw new Error("ไม่พบ token สำหรับเรียก API");
  }

  return {
    ...(contentType ? { "Content-Type": "application/json" } : {}),
    Authorization: `Bearer ${token}`,
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "เกิดข้อผิดพลาดในการเรียก API");
  }

  return data as T;
}

export async function getAnnouncements(dormId: string): Promise<Announcement[]> {
  const response = await fetch(
    `${API_BASE_URL}/announcements?dormId=${encodeURIComponent(dormId)}`,
    {
      method: "GET",
      headers: getAuthHeaders(false),
    }
  );

  const data = await handleResponse<AnnouncementsResponse>(response);
  return data.data;
}

export async function createAnnouncement(
  payload: CreateAnnouncementPayload
): Promise<Announcement> {
  const response = await fetch(`${API_BASE_URL}/announcements`, {
    method: "POST",
    headers: getAuthHeaders(true),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<AnnouncementResponse>(response);
  return data.data;
}

export async function updateAnnouncement(
  announcementId: string,
  payload: UpdateAnnouncementPayload
): Promise<Announcement> {
  const response = await fetch(
    `${API_BASE_URL}/announcements/${announcementId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload),
    }
  );

  const data = await handleResponse<AnnouncementResponse>(response);
  return data.data;
}

export async function deleteAnnouncement(
  announcementId: string,
  dormId: string
): Promise<DeleteAnnouncementResponse["data"]> {
  const response = await fetch(
    `${API_BASE_URL}/announcements/${announcementId}?dormId=${encodeURIComponent(
      dormId
    )}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(false),
    }
  );

  const data = await handleResponse<DeleteAnnouncementResponse>(response);
  return data.data;
}