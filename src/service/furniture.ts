import type {
  CreateFurnitureCategoryPayload,
  CreateFurnitureCategoryResponse,
  CreateFurnitureItemPayload,
  CreateFurnitureItemResponse,
  DeleteFurnitureItemResponse,
  FurnitureCategoriesResponse,
  FurnitureRoomItemsResponse,
  FurnitureRoomsQuery,
  FurnitureRoomsResponse,
  UpdateFurnitureItemPayload,
  UpdateFurnitureItemResponse,
} from "../types/furniture";

const API_BASE_URL =
  (import.meta as any)?.env?.VITE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

function getAuthToken(): string | null {
  const directToken =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("accessToken") ||
    sessionStorage.getItem("authToken");

  if (directToken) return directToken;

  const possibleJsonKeys = [
    "auth",
    "user",
    "currentUser",
    "roomieAuth",
    "roomieUser",
  ];

  for (const key of possibleJsonKeys) {
    const raw =
      localStorage.getItem(key) || sessionStorage.getItem(key);

    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);

      const nestedToken =
        parsed?.token ||
        parsed?.accessToken ||
        parsed?.authToken ||
        parsed?.data?.token ||
        parsed?.data?.accessToken ||
        parsed?.user?.token ||
        parsed?.user?.accessToken;

      if (nestedToken) return nestedToken;
    } catch {
      // ignore json parse error
    }
  }

  return null;
}

function buildHeaders(extra?: HeadersInit): HeadersInit {
  const token = getAuthToken();

  console.log("furniture token =", token);
  console.log("localStorage keys =", Object.keys(localStorage));
  console.log("sessionStorage keys =", Object.keys(sessionStorage));

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const message =
      data?.message ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

function toQueryString(params?: FurnitureRoomsQuery): string {
  if (!params) return "";

  const searchParams = new URLSearchParams();

  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }

  if (params.building_id?.trim()) {
    searchParams.set("building_id", params.building_id.trim());
  }

  if (
    params.floor_no !== undefined &&
    params.floor_no !== null &&
    Number.isFinite(Number(params.floor_no))
  ) {
    searchParams.set("floor_no", String(params.floor_no));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export async function getFurnitureRooms(
  params?: FurnitureRoomsQuery
): Promise<FurnitureRoomsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/furniture/rooms${toQueryString(params)}`,
    {
      method: "GET",
      headers: buildHeaders(),
    }
  );

  return parseResponse<FurnitureRoomsResponse>(response);
}

export async function getRoomFurnitureItems(
  roomId: string
): Promise<FurnitureRoomItemsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/furniture/rooms/${roomId}/items`,
    {
      method: "GET",
      headers: buildHeaders(),
    }
  );

  return parseResponse<FurnitureRoomItemsResponse>(response);
}

export async function getFurnitureCategories(): Promise<FurnitureCategoriesResponse> {
  const response = await fetch(`${API_BASE_URL}/api/furniture/categories`, {
    method: "GET",
    headers: buildHeaders(),
  });

  return parseResponse<FurnitureCategoriesResponse>(response);
}

export async function createFurnitureCategory(
  payload: CreateFurnitureCategoryPayload
): Promise<CreateFurnitureCategoryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/furniture/categories`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse<CreateFurnitureCategoryResponse>(response);
}

export async function createFurnitureItem(
  payload: CreateFurnitureItemPayload
): Promise<CreateFurnitureItemResponse> {
  const response = await fetch(`${API_BASE_URL}/api/furniture/items`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse<CreateFurnitureItemResponse>(response);
}

export async function updateFurnitureItem(
  itemId: string,
  payload: UpdateFurnitureItemPayload
): Promise<UpdateFurnitureItemResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/furniture/items/${itemId}`,
    {
      method: "PATCH",
      headers: buildHeaders(),
      body: JSON.stringify(payload),
    }
  );

  return parseResponse<UpdateFurnitureItemResponse>(response);
}

export async function deleteFurnitureItem(
  itemId: string
): Promise<DeleteFurnitureItemResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/furniture/items/${itemId}`,
    {
      method: "DELETE",
      headers: buildHeaders(),
    }
  );

  return parseResponse<DeleteFurnitureItemResponse>(response);
}