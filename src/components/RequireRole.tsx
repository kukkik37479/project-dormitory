// src/components/RequireRole.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useRole, type Role } from "../hooks/userole";
import { type ReactNode } from "react";

type Props = {
  allow: Role[];          // ["owner"] หรือ ["tenant"] หรือ ["owner","tenant"]
  children: ReactNode;    
};

export default function RequireRole({ allow, children }: Props) {
  const { role, loading } = useRole();
  const loc = useLocation();

  if (loading) return null; // ใส่ spinner/loader ก็ได้

  // ยังไม่ล็อกอิน
  if (!role) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }

  // ล็อกอินแล้วแต่ไม่มีสิทธิ์
  if (!allow.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
