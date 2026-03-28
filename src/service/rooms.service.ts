const API_URL = "http://localhost:3000/api/rooms";

function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

async function parseResponse(res: Response) {
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return res.json();
  }

  const text = await res.text();
  return { message: text || "Server error" };
}

export async function getRoomsMeta() {
  const token = getToken();

  const res = await fetch(`${API_URL}/meta`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await parseResponse(res);

  if (!res.ok) {
    throw new Error(data.message || "โหลดข้อมูล meta ห้องไม่สำเร็จ");
  }

  return data;
}

export async function getRooms() {
  const token = getToken();

  const res = await fetch(`${API_URL}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await parseResponse(res);

  if (!res.ok) {
    throw new Error(data.message || "โหลดรายการห้องไม่สำเร็จ");
  }

  return data;
}

export async function getVacantRooms() {
  const token = getToken();

  const res = await fetch(`${API_URL}/vacant`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await parseResponse(res);

  if (!res.ok) {
    throw new Error(data.message || "โหลดห้องว่างไม่สำเร็จ");
  }

  return data;
}

export async function createBuilding(data: {
  building_code: string;
  display_name?: string;
  sort_order?: number;
}) {
  const token = getToken();

  const res = await fetch(`${API_URL}/buildings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const result = await parseResponse(res);

  if (!res.ok) {
    throw new Error(result.message || "เพิ่มตึกไม่สำเร็จ");
  }

  return result;
}

export async function createRoom(data: {
  building_id: string;
  room_number: string;
  floor_no: number;
  monthly_rent: number;
  room_type: string;
  status: "vacant" | "occupied" | "maintenance";
  tenant_name?: string | null;
  note?: string | null;
}) {
  const token = getToken();

  const res = await fetch(`${API_URL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const result = await parseResponse(res);

  if (!res.ok) {
    throw new Error(result.message || "เพิ่มห้องไม่สำเร็จ");
  }

  return result;
}

export async function updateRoomStatus(
  roomId: string,
  status: "vacant" | "maintenance"
) {
  const token = getToken();

  const res = await fetch(`${API_URL}/${roomId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  const result = await parseResponse(res);

  if (!res.ok) {
    throw new Error(result.message || "อัปเดตสถานะห้องไม่สำเร็จ");
  }

  return result;
}

export async function getRoomDetail(roomId: string) {
  const token = getToken();

  const res = await fetch(`${API_URL}/${roomId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await parseResponse(res);

  if (!res.ok) {
    throw new Error(data.message || "โหลดรายละเอียดห้องไม่สำเร็จ");
  }

  return data;
}