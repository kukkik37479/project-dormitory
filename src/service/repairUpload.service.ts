import { supabase } from "../supabase";

const REPAIR_BUCKET = import.meta.env.VITE_REPAIR_BUCKET || "repair-images";

function sanitizeFileName(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  const ext = dotIndex >= 0 ? fileName.slice(dotIndex + 1).toLowerCase() : "jpg";

  return `repair-image-${Date.now()}-${crypto.randomUUID()}.${ext}`;
}

function ensureImageFile(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error(`ไฟล์ ${file.name} ไม่ใช่รูปภาพ`);
  }
}

function getPublicUrlFromPath(path: string) {
  const { data } = supabase.storage.from(REPAIR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadRepairImage(
  file: File,
  folder = "general"
): Promise<string> {
  ensureImageFile(file);

  const safeName = sanitizeFileName(file.name);
  const path = `${folder}/${safeName}`;

  const { error } = await supabase.storage
    .from(REPAIR_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(error.message || "อัปโหลดรูปไม่สำเร็จ");
  }

  return getPublicUrlFromPath(path);
}

export async function uploadRepairImages(
  files: File[] | FileList,
  folder = "general"
): Promise<string[]> {
  const fileArray = Array.from(files || []);

  if (fileArray.length === 0) {
    return [];
  }

  const uploadedUrls: string[] = [];

  for (const file of fileArray) {
    const url = await uploadRepairImage(file, folder);
    uploadedUrls.push(url);
  }

  return uploadedUrls;
}