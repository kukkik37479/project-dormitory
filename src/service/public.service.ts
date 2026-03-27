const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "http://localhost:3000";

export type PublicDormCard = {
  id: string;
  dorm_slug: string;
  name: string;
  name_en?: string | null;
  phone?: string | null;
  full_address?: string | null;
  subdistrict?: string | null;
  district?: string | null;
  province?: string | null;
  description?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  line_id?: string | null;
  water_rate: number;
  electric_rate: number;
  total_rooms: number;
  vacant_rooms: number;
  price_min?: number | null;
  price_max?: number | null;
  cover_image?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type PublicVacantRoom = {
  id: string;
  dorm_id: string;
  dorm_slug: string;
  dorm_name: string;
  dorm_phone?: string | null;
  dorm_full_address?: string | null;
  dorm_cover_image?: string | null;
  building_name?: string | null;
  room_number: string;
  floor_no: number;
  monthly_rent: number;
  room_type?: string | null;
  status: string;
  note?: string | null;
};

export type PublicDormImage = {
  id: string;
  dorm_id: string;
  image_url: string;
  public_id?: string | null;
  sort_order: number;
  is_cover: boolean;
  created_at?: string;
  updated_at?: string;
};

export type PublicRoomType = {
  id: string;
  dorm_id: string;
  type_name: string;
  room_layout?: string | null;
  size_sqm?: number | null;
  price_min: number;
  price_max: number;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type PublicDormAmenity = {
  code: string;
  label_th: string;
  sort_order: number;
};

export type PublicDormContactPhone = {
  id: string;
  dorm_id: string;
  phone: string;
  label?: string | null;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type PublicReviewReply = {
  id: string;
  replied_by: string;
  reply_text: string;
  created_at?: string;
  updated_at?: string;
};

export type PublicReview = {
  id: string;
  dorm_id: string;
  room_id?: string | null;
  tenant_user_id: string;
  rating: number;
  comment: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  reviewer_name: string;
  room_number?: string | null;
  building_name?: string | null;
  reply?: PublicReviewReply | null;
};

export type PublicDormDetail = PublicDormCard & {
  owner_user_id?: string;
  house_no?: string | null;
  road?: string | null;
  alley?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  google_map_url?: string | null;
  contact_line_id?: string | null;
  images: PublicDormImage[];
  room_types: PublicRoomType[];
  contact_phones: PublicDormContactPhone[];
  vacant_rooms: PublicVacantRoom[];
  amenities: PublicDormAmenity[];
  reviews: PublicReview[];
  review_count: number;
  review_average: number;
};

export type PublicRoomDetail = {
  id: string;
  dorm_id: string;
  dorm_slug: string;
  dorm_name: string;
  dorm_name_en?: string | null;
  dorm_phone?: string | null;
  dorm_full_address?: string | null;
  dorm_description?: string | null;
  dorm_cover_image?: string | null;
  building_name?: string | null;
  room_number: string;
  floor_no: number;
  monthly_rent: number;
  room_type?: string | null;
  status: string;
  note?: string | null;
  water_rate: number;
  electric_rate: number;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_line_id?: string | null;
  line_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  google_map_url?: string | null;
};

export type PublicHomeResponse = {
  message: string;
  search: string;
  counts: {
    total_dorms: number;
    total_vacant_rooms: number;
  };
  featured_vacant_rooms: PublicVacantRoom[];
  dorms: PublicDormCard[];
};

export type PublicDormDetailResponse = {
  message: string;
  dorm: PublicDormDetail;
};

export type PublicRoomDetailResponse = {
  message: string;
  room: PublicRoomDetail;
};

type GetPublicHomeParams = {
  search?: string;
  dormLimit?: number;
  dormOffset?: number;
  vacantLimit?: number;
  vacantOffset?: number;
};

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

export async function getPublicHome(
  params: GetPublicHomeParams = {}
): Promise<PublicHomeResponse> {
  const qs = buildQuery({
    search: params.search?.trim(),
    dormLimit: params.dormLimit,
    dormOffset: params.dormOffset,
    vacantLimit: params.vacantLimit,
    vacantOffset: params.vacantOffset,
  });

  const res = await fetch(`${API_BASE_URL}/api/public/home${qs}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return handleJson<PublicHomeResponse>(res);
}

export async function getPublicDormDetail(
  identifier: string
): Promise<PublicDormDetailResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/public/dorms/${encodeURIComponent(identifier)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return handleJson<PublicDormDetailResponse>(res);
}

export async function getPublicRoomDetail(
  roomId: string
): Promise<PublicRoomDetailResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/public/rooms/${encodeURIComponent(roomId)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return handleJson<PublicRoomDetailResponse>(res);
}