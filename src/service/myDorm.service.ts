import { supabase } from "../supabase";

const API_URL = "http://localhost:3000/api/my-dorm";
const SUPABASE_BUCKET = "dorm-images";

function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function createSafeFileName(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  const ext = dotIndex >= 0 ? fileName.slice(dotIndex + 1).toLowerCase() : "jpg";
  const base = dotIndex >= 0 ? fileName.slice(0, dotIndex) : fileName;

  const safeBase = base
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${safeBase || "image"}-${Date.now()}.${ext}`;
}

function getPublicUrlFromPath(path: string) {
  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function isRemoteImageUrl(url?: string | null) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

async function uploadDormImageToSupabase(file: File) {
  const fileName = createSafeFileName(file.name);
  const path = `dorms/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${fileName}`;

  const { error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(error.message || "อัปโหลดรูปไป Supabase ไม่สำเร็จ");
  }

  const publicUrl = getPublicUrlFromPath(path);

  return {
    path,
    publicUrl,
  };
}

async function parseResponse(res: Response) {
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return res.json();
  }

  const text = await res.text();
  return { message: text || "Server error" };
}

export async function getMyDormProfile() {
  const token = getToken();

  const res = await fetch(`${API_URL}/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await parseResponse(res);

  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch dorm profile");
  }

  return data;
}

type ImagePayloadItem = {
  image_url?: string;
  public_id?: string | null;
  sort_order?: number;
  is_cover?: boolean;
  file?: File;
};

type UpdateDormPayload = Record<string, any> & {
  images?: ImagePayloadItem[];
};

export async function updateMyDormProfile(data: UpdateDormPayload) {
  const token = getToken();

  const uploadedImages: ImagePayloadItem[] = [];

  if (Array.isArray(data.images)) {
    for (let index = 0; index < data.images.length; index += 1) {
      const item = data.images[index];

      if (item?.file instanceof File) {
        const uploaded = await uploadDormImageToSupabase(item.file);

        uploadedImages.push({
          image_url: uploaded.publicUrl,
          public_id: uploaded.path,
          sort_order:
            item.sort_order !== undefined && item.sort_order !== null
              ? item.sort_order
              : index,
          is_cover: Boolean(item.is_cover),
        });
        continue;
      }

      if (isRemoteImageUrl(item?.image_url)) {
        uploadedImages.push({
          image_url: item.image_url,
          public_id: item.public_id ?? null,
          sort_order:
            item.sort_order !== undefined && item.sort_order !== null
              ? item.sort_order
              : index,
          is_cover: Boolean(item.is_cover),
        });
      }
    }
  }

  const payload = {
    ...data,
    images: uploadedImages,
  };

  const res = await fetch(`${API_URL}/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await parseResponse(res);

  if (!res.ok) {
    throw new Error(result.message || "Failed to update dorm profile");
  }

  return result;
}

export async function createDormAmenity(label_th: string) {
  const token = getToken();

  const res = await fetch(`${API_URL}/amenities`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ label_th }),
  });

  const data = await parseResponse(res);

  if (!res.ok) {
    throw new Error(data.message || "เพิ่มสิ่งอำนวยความสะดวกไม่สำเร็จ");
  }

  return data;
}

export async function deleteDormAmenity(code: string) {
  const token = getToken();

  const res = await fetch(`${API_URL}/amenities/${encodeURIComponent(code)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await parseResponse(res);

  if (!res.ok) {
    throw new Error(data.message || "ลบสิ่งอำนวยความสะดวกไม่สำเร็จ");
  }

  return data;
}

export async function deleteDormImagesFromSupabase(paths: string[]) {
  const validPaths = paths.filter(Boolean);

  if (!validPaths.length) return;

  const { error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .remove(validPaths);

  if (error) {
    throw new Error(error.message || "ลบรูปจาก Supabase ไม่สำเร็จ");
  }
}