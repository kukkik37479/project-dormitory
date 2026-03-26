import Bills from "./Bills";
import TenantBills from "./TenantBills";

type StoredUser = {
  role?: "owner" | "tenant" | "admin";
};

function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function BillsGateway() {
  const user = getStoredUser();

  if (user?.role === "tenant") {
    return <TenantBills />;
  }

  return <Bills />;
}