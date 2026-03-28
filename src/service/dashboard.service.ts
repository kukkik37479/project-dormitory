export type DashboardOverviewResponse = {
  month: string;
  rooms: {
    total: number;
    occupied: number;
    vacant: number;
    maintenance: number;
    reserved: number;
    occupiedMonthlyRent: number;
    occupancyRate: number;
  };
  buildings: Array<{
    buildingId: string;
    buildingCode: string;
    buildingName: string;
    sortOrder: number;
    totalRooms: number;
    occupiedRooms: number;
    vacantRooms: number;
    maintenanceRooms: number;
    reservedRooms: number;
    occupancyRate: number;
  }>;
  invoices: {
    totalInvoices: number;
    totalBilledAmount: number;
    paidInvoiceCount: number;
    pendingReviewInvoiceCount: number;
    outstandingInvoiceCount: number;
    overdueInvoiceCount: number;
    cancelledInvoiceCount: number;
    paidInvoiceAmount: number;
    pendingReviewInvoiceAmount: number;
    outstandingInvoiceAmount: number;
    overdueInvoiceAmount: number;
    baseRentTotal: number;
    waterTotal: number;
    electricTotal: number;
    otherTotal: number;
    discountTotal: number;
  };
  payments: {
    approvedPaymentAmount: number;
    submittedPaymentAmount: number;
    rejectedPaymentAmount: number;
    submittedPaymentCount: number;
    rejectedPaymentCount: number;
    collectionRate: number;
  };
  contracts: {
    activeCount: number;
    expiringIn30DaysCount: number;
  };
  alerts: {
    pendingReviewInvoices: number;
    overdueInvoices: number;
    submittedPayments: number;
    rejectedPayments: number;
    expiringContracts: number;
  };
};

export type RevenueTrendItem = {
  month: string;
  billedAmount: number;
  paidInvoiceAmount: number;
  outstandingAmount: number;
  approvedPaymentAmount: number;
};

export type PaymentStatusItem = {
  key: "paid" | "pending_review" | "outstanding" | string;
  label: string;
  count: number;
  amount: number;
  percent: number;
};

export type PaymentStatusResponse = {
  month: string;
  totalInvoices: number;
  totalAmount: number;
  items: PaymentStatusItem[];
};

export type TenantMovementItem = {
  month: string;
  moveInCount: number;
  moveOutCount: number;
};

export type UtilityUsageTrendItem = {
  month: string;
  totalWaterUnits: number;
  totalElectricUnits: number;
  totalWaterAmount: number;
  totalElectricAmount: number;
  totalInvoices: number;
  avgWaterUnits: number;
  avgElectricUnits: number;
};

export type ExpiringContractItem = {
  contractId: string;
  contractNumber: string | null;
  startDate: string | null;
  endDate: string | null;
  moveInDate: string | null;
  moveOutDate: string | null;
  contractStatus: string;
  rentAmount: number;
  roomId: string;
  roomNumber: string;
  buildingId: string;
  buildingName: string;
  tenantName: string;
  daysRemaining: number;
};

export type InvoiceReportItem = {
  invoiceId: string;
  billingMonth: string;
  dueDate: string;
  invoiceStatus: string;
  baseRentAmount: number;
  waterUnits: number;
  waterRate: number;
  waterAmount: number;
  electricUnits: number;
  electricRate: number;
  electricAmount: number;
  otherAmount: number;
  discountAmount: number;
  totalAmount: number;
  generatedAt: string;
  updatedAt: string;
  roomId: string;
  roomNumber: string;
  buildingId: string;
  buildingName: string;
  buildingCode: string;
  tenantName: string;
};

export type PaymentReportItem = {
  paymentId: string;
  invoiceId: string;
  paymentMethod: string;
  submittedAmount: number;
  slipImageUrl: string | null;
  referenceNo: string | null;
  paidAt: string | null;
  paymentStatus: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  billingMonth: string;
  dueDate: string;
  invoiceStatus: string;
  invoiceTotalAmount: number;
  roomId: string;
  roomNumber: string;
  buildingId: string;
  buildingName: string;
  buildingCode: string;
  tenantName: string;
};

export type ArrearsReportItem = {
  invoiceId: string;
  billingMonth: string;
  dueDate: string;
  invoiceStatus: string;
  totalAmount: number;
  baseRentAmount: number;
  waterAmount: number;
  electricAmount: number;
  otherAmount: number;
  discountAmount: number;
  roomId: string;
  roomNumber: string;
  buildingId: string;
  buildingName: string;
  buildingCode: string;
  tenantName: string;
  daysOverdue: number;
};

export type MonthlyRevenueSummaryItem = {
  month: string;
  totalInvoices: number;
  totalBilledAmount: number;
  paidInvoiceAmount: number;
  pendingReviewAmount: number;
  outstandingAmount: number;
  overdueAmount: number;
  paidInvoiceCount: number;
  pendingReviewCount: number;
  outstandingCount: number;
  approvedPaymentAmount: number;
  submittedPaymentAmount: number;
  rejectedPaymentAmount: number;
  approvedPaymentCount: number;
  submittedPaymentCount: number;
  rejectedPaymentCount: number;
  collectionRate: number;
};

type ApiEnvelope<T> = {
  ok: boolean;
  data: T;
  message?: string;
};

type QueryValue = string | number | null | undefined;

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);

function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
}

function buildQuery(params: Record<string, QueryValue>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function request<T>(path: string, params: Record<string, QueryValue> = {}) {
  const token = getToken();

  const response = await fetch(`${API_URL}${path}${buildQuery(params)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const rawText = await response.text();
  let json: ApiEnvelope<T> | null = null;

  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    throw new Error(json?.message || `Request failed with status ${response.status}`);
  }

  if (!json?.ok) {
    throw new Error(json?.message || "เกิดข้อผิดพลาดในการดึงข้อมูล");
  }

  return json.data;
}

function decodeBase64Url(value: string) {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return atob(padded);
  } catch {
    return "";
  }
}

function resolveDormId(providedDormId?: string) {
  if (providedDormId) return providedDormId;

  const token = getToken();
  if (!token) return "";

  const parts = token.split(".");
  if (parts.length < 2) return "";

  try {
    const payloadText = decodeBase64Url(parts[1]);
    const payload = JSON.parse(payloadText);
    return payload?.dormId || payload?.dorm_id || "";
  } catch {
    return "";
  }
}

export const dashboardService = {
  getOverview(params?: { dormId?: string; month?: string }) {
    return request<DashboardOverviewResponse>("/api/dashboard/overview", {
      dormId: resolveDormId(params?.dormId),
      month: params?.month,
    });
  },

  getRevenueTrend(params?: { dormId?: string; months?: number }) {
    return request<RevenueTrendItem[]>("/api/dashboard/revenue-trend", {
      dormId: resolveDormId(params?.dormId),
      months: params?.months ?? 6,
    });
  },

  getPaymentStatus(params?: { dormId?: string; month?: string }) {
    return request<PaymentStatusResponse>("/api/dashboard/payment-status", {
      dormId: resolveDormId(params?.dormId),
      month: params?.month,
    });
  },

  getTenantMovement(params?: { dormId?: string; months?: number }) {
    return request<TenantMovementItem[]>("/api/dashboard/tenant-movement", {
      dormId: resolveDormId(params?.dormId),
      months: params?.months ?? 6,
    });
  },

  getUtilityUsageTrend(params?: { dormId?: string; months?: number }) {
    return request<UtilityUsageTrendItem[]>(
      "/api/dashboard/utility-usage-trend",
      {
        dormId: resolveDormId(params?.dormId),
        months: params?.months ?? 6,
      }
    );
  },

  getExpiringContracts(params?: { dormId?: string; days?: number }) {
    return request<ExpiringContractItem[]>("/api/dashboard/expiring-contracts", {
      dormId: resolveDormId(params?.dormId),
      days: params?.days ?? 30,
    });
  },

  getInvoiceReport(params?: {
    dormId?: string;
    month?: string;
    buildingId?: string;
    status?: string;
  }) {
    return request<InvoiceReportItem[]>("/api/dashboard/reports/invoices", {
      dormId: resolveDormId(params?.dormId),
      month: params?.month,
      buildingId: params?.buildingId,
      status: params?.status,
    });
  },

  getPaymentReport(params?: {
    dormId?: string;
    month?: string;
    buildingId?: string;
    status?: string;
  }) {
    return request<PaymentReportItem[]>("/api/dashboard/reports/payments", {
      dormId: resolveDormId(params?.dormId),
      month: params?.month,
      buildingId: params?.buildingId,
      status: params?.status,
    });
  },

  getArrearsReport(params?: {
    dormId?: string;
    month?: string;
    buildingId?: string;
  }) {
    return request<ArrearsReportItem[]>("/api/dashboard/reports/arrears", {
      dormId: resolveDormId(params?.dormId),
      month: params?.month,
      buildingId: params?.buildingId,
    });
  },

  getMonthlyRevenueSummaryReport(params?: {
    dormId?: string;
    months?: number;
  }) {
    return request<MonthlyRevenueSummaryItem[]>(
      "/api/dashboard/reports/revenue-summary",
      {
        dormId: resolveDormId(params?.dormId),
        months: params?.months ?? 6,
      }
    );
  },
};

export default dashboardService;