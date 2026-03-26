export type OwnerPaymentInvoiceStatus =
  | "draft"
  | "unpaid"
  | "pending_review"
  | "paid"
  | "overdue"
  | "cancelled";

export type OwnerPaymentStatus = "submitted" | "approved" | "rejected";

export type OwnerPaymentListItem = {
  invoice_id: string;
  billing_month: string;
  due_date: string;
  base_rent_amount: number | string;
  water_amount: number | string;
  electric_amount: number | string;
  other_amount: number | string;
  discount_amount: number | string;
  total_amount: number | string;
  invoice_status: OwnerPaymentInvoiceStatus;
  updated_at?: string | null;

  room_id: string;
  room_number: string;
  room_type: string;
  floor_no: number;
  tenant_name?: string | null;

  building_id: string;
  building_code: string;
  building_name: string;

  payment_id?: string | null;
  submitted_amount?: number | string | null;
  slip_image_url?: string | null;
  reference_no?: string | null;
  paid_at?: string | null;
  payment_method?: "transfer" | "cash" | "qr" | null;
  payment_status?: OwnerPaymentStatus | null;
  reviewed_at?: string | null;
  review_note?: string | null;
  payment_created_at?: string | null;
  payment_updated_at?: string | null;
};

export type OwnerPaymentsSummary = {
  paidCount: number;
  paidAmount: number;
  pendingCount: number;
  pendingAmount: number;
  overdueCount: number;
  overdueAmount: number;
};

export type OwnerPaymentsResponse = {
  items: OwnerPaymentListItem[];
  summary: OwnerPaymentsSummary;
};

export type GetOwnerPaymentsParams = {
  month?: string;
  status?: string;
  search?: string;
};

export type OwnerPaymentDetail = {
  payment_id: string;
  invoice_id: string;
  submitted_amount: number | string;
  slip_image_url?: string | null;
  reference_no?: string | null;
  paid_at?: string | null;
  payment_method?: "transfer" | "cash" | "qr" | null;
  payment_status: OwnerPaymentStatus;
  reviewed_at?: string | null;
  review_note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;

  billing_month: string;
  due_date: string;
  base_rent_amount: number | string;
  water_amount: number | string;
  electric_amount: number | string;
  other_amount: number | string;
  discount_amount: number | string;
  total_amount: number | string;
  invoice_status: OwnerPaymentInvoiceStatus;

  room_number: string;
  room_type: string;
  floor_no: number;
  tenant_name?: string | null;

  building_name: string;
  building_code: string;
};

export type ApproveOwnerPaymentResponse = {
  message: string;
  data: {
    payment_id: string;
    invoice_id: string;
    payment_status: OwnerPaymentStatus;
    reviewed_at?: string | null;
    review_note?: string | null;
    invoice_status: OwnerPaymentInvoiceStatus;
  };
};

export type RejectOwnerPaymentResponse = {
  message: string;
  data: {
    payment_id: string;
    invoice_id: string;
    payment_status: OwnerPaymentStatus;
    reviewed_at?: string | null;
    review_note?: string | null;
    invoice_status: OwnerPaymentInvoiceStatus;
  };
};