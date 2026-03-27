const API_BASE_URL =
  (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const REPAIR_API_URL = `${API_BASE_URL}/api/repair-requests`;

function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
}

function buildHeaders(hasJsonBody = false) {
  const token = getToken();

  return {
    ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(json?.message || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์");
  }

  return json;
}

function buildQueryString(
  query?: Record<string, string | number | null | undefined>
) {
  const params = new URLSearchParams();

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.append(key, String(value));
  });

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export type RepairCategoryValue =
  | "electrical"
  | "water"
  | "furniture"
  | "room"
  | "other";

export type RepairPriorityValue = "low" | "medium" | "high" | "urgent";

export type RepairStatusValue =
  | "pending"
  | "in_progress"
  | "waiting_parts"
  | "completed"
  | "cancelled";

export type RepairCategoryOption = {
  value: RepairCategoryValue;
  label: string;
};

export type RepairPriorityOption = {
  value: RepairPriorityValue;
  label: string;
};

export type RepairFurnitureItem = {
  id: string;
  itemName: string;
  quantity: number;
  conditionStatus: string | null;
  usageStatus: string | null;
  imageUrl: string | null;
  category: {
    id: string;
    name: string;
  } | null;
};

export type TenantRepairFormOptions = {
  room: {
    id: string;
    roomNumber: string;
    floorNo: number | null;
    buildingId: string | null;
    buildingCode: string | null;
    buildingName: string | null;
  };
  contract: {
    id: string;
    status: string;
  };
  categories: RepairCategoryOption[];
  priorities: RepairPriorityOption[];
  furniture: RepairFurnitureItem[];
};

export type RepairAttachment = {
  id: string;
  repairRequestId: string;
  fileUrl: string;
  label: "before" | "after" | "general";
  uploadedBy: string;
  createdAt: string;
};

export type RepairStatusLog = {
  id: string;
  repairRequestId: string;
  oldStatus: RepairStatusValue | null;
  newStatus: RepairStatusValue;
  note: string | null;
  changedBy: string;
  changedByName: string | null;
  changedAt: string;
};

export type RepairRequestItem = {
  id: string;
  dormId: string;
  roomId: string;
  contractId: string | null;
  tenantUserId: string;
  furnitureItemId: string | null;
  title: string;
  description: string;
  category: RepairCategoryValue;
  priority: RepairPriorityValue;
  status: RepairStatusValue;
  ownerNote: string | null;
  requestedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  room: {
    id: string;
    roomNumber: string;
    floorNo: number | null;
    buildingId: string | null;
    buildingCode: string | null;
    buildingName: string | null;
  };
  tenant: {
    id: string;
    fullName: string | null;
    username: string | null;
    phone: string | null;
  };
  furniture: {
    id: string;
    itemName: string | null;
    categoryName: string | null;
  } | null;
  previewImages: {
    before: string | null;
    after: string | null;
  };
  attachments?: RepairAttachment[];
  beforeImages?: RepairAttachment[];
  afterImages?: RepairAttachment[];
  generalImages?: RepairAttachment[];
  statusLogs?: RepairStatusLog[];
};

export type RepairListResponse = {
  data: RepairRequestItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    start: number;
    end: number;
  };
};

export type CreateRepairRequestPayload = {
  category: RepairCategoryValue;
  priority?: RepairPriorityValue;
  description: string;
  furniture_item_id?: string | null;
  title?: string;
  before_image_urls?: string[];
  general_image_urls?: string[];
};

export type UpdateOwnerRepairStatusPayload = {
  status?: RepairStatusValue;
  note?: string;
  owner_note?: string;
  after_image_urls?: string[];
  general_image_urls?: string[];
};

export type CancelRepairRequestPayload = {
  note?: string;
};

export async function getTenantRepairFormOptions(): Promise<TenantRepairFormOptions> {
  const response = await fetch(`${REPAIR_API_URL}/tenant/form-options`, {
    method: "GET",
    headers: buildHeaders(),
  });

  const json = await parseJsonResponse(response);
  return json.data;
}

export async function createRepairRequest(
  payload: CreateRepairRequestPayload
): Promise<RepairRequestItem> {
  const response = await fetch(`${REPAIR_API_URL}/tenant`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify(payload),
  });

  const json = await parseJsonResponse(response);
  return json.data;
}

export async function getMyRepairRequests(query?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: RepairStatusValue | "";
}): Promise<RepairListResponse> {
  const response = await fetch(
    `${REPAIR_API_URL}/tenant/my${buildQueryString(query)}`,
    {
      method: "GET",
      headers: buildHeaders(),
    }
  );

  const json = await parseJsonResponse(response);
  return {
    data: json.data || [],
    meta: json.meta,
  };
}

export async function getMyRepairRequestDetail(
  repairRequestId: string
): Promise<RepairRequestItem> {
  const response = await fetch(
    `${REPAIR_API_URL}/tenant/my/${repairRequestId}`,
    {
      method: "GET",
      headers: buildHeaders(),
    }
  );

  const json = await parseJsonResponse(response);
  return json.data;
}

export async function cancelMyRepairRequest(
  repairRequestId: string,
  payload?: CancelRepairRequestPayload
): Promise<RepairRequestItem> {
  const response = await fetch(
    `${REPAIR_API_URL}/tenant/my/${repairRequestId}/cancel`,
    {
      method: "PATCH",
      headers: buildHeaders(true),
      body: JSON.stringify(payload || {}),
    }
  );

  const json = await parseJsonResponse(response);
  return json.data;
}

export async function getOwnerRepairRequests(query?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: RepairStatusValue | "";
  room_id?: string;
  building_id?: string;
}): Promise<RepairListResponse> {
  const response = await fetch(
    `${REPAIR_API_URL}/owner${buildQueryString(query)}`,
    {
      method: "GET",
      headers: buildHeaders(),
    }
  );

  const json = await parseJsonResponse(response);
  return {
    data: json.data || [],
    meta: json.meta,
  };
}

export async function getOwnerRepairRequestDetail(
  repairRequestId: string
): Promise<RepairRequestItem> {
  const response = await fetch(`${REPAIR_API_URL}/owner/${repairRequestId}`, {
    method: "GET",
    headers: buildHeaders(),
  });

  const json = await parseJsonResponse(response);
  return json.data;
}

export async function updateOwnerRepairRequestStatus(
  repairRequestId: string,
  payload: UpdateOwnerRepairStatusPayload
): Promise<RepairRequestItem> {
  const response = await fetch(
    `${REPAIR_API_URL}/owner/${repairRequestId}/status`,
    {
      method: "PATCH",
      headers: buildHeaders(true),
      body: JSON.stringify(payload),
    }
  );

  const json = await parseJsonResponse(response);
  return json.data;
}