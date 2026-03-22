import type {
  ChatConversation,
  ChatConversationsResponse,
  ChatMessage,
  ChatMessagesResponse,
  MarkAsReadResponse,
  SendMessageResponse,
} from "../types/chat";

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

      if (
        raw.startsWith("eyJ") ||
        raw.startsWith("Bearer ")
      ) {
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
        // ignore JSON parse errors
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

export async function getChatConversations(): Promise<ChatConversation[]> {
  const response = await fetch(`${API_BASE_URL}/chat/conversations`, {
    method: "GET",
    headers: getAuthHeaders(false),
  });

  const data = await handleResponse<ChatConversationsResponse>(response);
  return data.data;
}

export async function getChatMessages(
  conversationId: string
): Promise<ChatMessage[]> {
  const response = await fetch(
    `${API_BASE_URL}/chat/conversations/${conversationId}/messages`,
    {
      method: "GET",
      headers: getAuthHeaders(false),
    }
  );

  const data = await handleResponse<ChatMessagesResponse>(response);
  return data.data;
}

export async function sendChatMessage(
  conversationId: string,
  messageText: string
): Promise<SendMessageResponse["data"]> {
  const response = await fetch(
    `${API_BASE_URL}/chat/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: getAuthHeaders(true),
      body: JSON.stringify({
        message_text: messageText,
      }),
    }
  );

  const data = await handleResponse<SendMessageResponse>(response);
  return data.data;
}

export async function markChatAsRead(
  conversationId: string
): Promise<MarkAsReadResponse["data"]> {
  const response = await fetch(
    `${API_BASE_URL}/chat/conversations/${conversationId}/read`,
    {
      method: "PATCH",
      headers: getAuthHeaders(false),
    }
  );

  const data = await handleResponse<MarkAsReadResponse>(response);
  return data.data;
}