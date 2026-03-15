import React from "react";
import { Navigate, useLocation } from "react-router-dom";

type AppRole = "owner" | "tenant" | "admin";

type StoredUser = {
  id?: string;
  role?: AppRole;
  email?: string;
  username?: string;
  full_name?: string;
  dorm_id?: string | null;
  dorm_slug?: string | null;
};

type RequireRoleProps = {
  allow: AppRole[];
  children: React.ReactNode;
};

export default function RequireRole({
  allow,
  children,
}: RequireRoleProps) {
  const location = useLocation();

  let user: StoredUser | null = null;
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  try {
    const raw =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    user = raw ? JSON.parse(raw) : null;
  } catch {
    user = null;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const role = user.role;

  if (!role || !allow.includes(role)) {
    return <Navigate to="/explore" replace />;
  }

  return <>{children}</>;
}