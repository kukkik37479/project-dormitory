import adminAvatar from "../assets/avatars/addmin-avatar.png";
import ownerAvatar1 from "../assets/avatars/owner-avatar1.png";
import ownerAvatar2 from "../assets/avatars/owner-avatar2.png";
import ownerAvatar3 from "../assets/avatars/owner-avatar3.png";
import tenantAvatar1 from "../assets/avatars/tenant-avatar1.png";
import tenantAvatar2 from "../assets/avatars/tenant-avatar2.png";
import tenantAvatar3 from "../assets/avatars/tenant-avatar3.png";

type AvatarUser = {
  role?: string | null;
  gender?: string | null;
};

function normalizeRole(role?: string | null) {
  const value = String(role || "").trim().toLowerCase();

  if (value === "owner" || value === "เจ้าของ") return "owner";
  if (value === "tenant" || value === "ผู้เช่า") return "tenant";
  if (value === "admin" || value === "แอดมิน") return "admin";

  return "unknown";
}

function normalizeGender(gender?: string | null) {
  const value = String(gender || "").trim().toLowerCase();

  if (
    value === "male" ||
    value === "man" ||
    value === "ชาย" ||
    value === "ผู้ชาย"
  ) {
    return "male";
  }

  if (
    value === "female" ||
    value === "woman" ||
    value === "หญิง" ||
    value === "ผู้หญิง"
  ) {
    return "female";
  }

  return "other";
}

export function getAvatarByRoleAndGender(user?: AvatarUser | null) {
  const role = normalizeRole(user?.role);
  const gender = normalizeGender(user?.gender);

  if (role === "admin") {
    return adminAvatar;
  }

  if (role === "owner") {
    if (gender === "female") return ownerAvatar1;
    if (gender === "male") return ownerAvatar2;
    return ownerAvatar3;
  }

  if (role === "tenant") {
    if (gender === "female") return tenantAvatar1;
    if (gender === "male") return tenantAvatar2;
    return tenantAvatar3;
  }

  return adminAvatar;
}