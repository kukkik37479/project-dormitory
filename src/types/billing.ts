export type BillingInvoiceStatus =
  | "draft"
  | "unpaid"
  | "pending_review"
  | "paid"
  | "overdue"
  | "cancelled";

export type BillingPaymentStatus = "submitted" | "approved" | "rejected";

export type BillingBuilding = {
  id: string;
  dorm_id: string;
  building_code: string;
  display_name: string;
  sort_order: number;
};

export type BillingRoom = {
  id: string;
  dorm_id: string;
  building_id: string;
  room_number: string;
  floor_no: number;
  monthly_rent: number | string;
  status: string;
  tenant_name?: string | null;
};

export type BillingBankAccount = {
  id: string;
  dorm_id?: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  promptpay_id?: string | null;
  qr_image_url?: string | null;
  qr_public_id?: string | null;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type BillingSelectedRoomContract = {
  room_id: string;
  dorm_id: string;
  building_id: string;
  room_number: string;
  floor_no: number;
  room_status: string;
  building_name: string;
  building_code: string;
  tenant_name?: string | null;
  contract_id?: string | null;
  tenant_user_id?: string | null;
  base_rent_amount: number;
  water_rate: number;
  electric_rate: number;
  billing_due_day?: number | null;
  suggested_due_date?: string | null;
  bank_account?: BillingBankAccount | null;
};

export type BillingFormOptionsResponse = {
  message: string;
  buildings: BillingBuilding[];
  floors: number[];
  rooms: BillingRoom[];
  selected_room_contract: BillingSelectedRoomContract | null;
};

export type GetInvoiceFormOptionsParams = {
  building_id?: string;
  floor_no?: number;
  room_id?: string;
  billing_month?: string;
};

export type CreateInvoicePayload = {
  room_id: string;
  billing_month: string;
  due_date: string;
  base_rent_amount: number;
  water_units: number;
  water_rate: number;
  electric_units: number;
  electric_rate: number;
  other_amount: number;
  discount_amount: number;
  status?: "draft" | "unpaid";
};

export type CreateInvoiceResponse = {
  message: string;
  invoice: {
    id: string;
    dorm_id?: string;
    room_id?: string;
    contract_id?: string;
    tenant_user_id?: string;
    billing_month?: string;
    due_date?: string;
    total_amount?: number | string;
    status?: string;
  };
};

export type DefaultBankAccountResponse = {
  message: string;
  bank_account: BillingBankAccount | null;
};

/* =========================
   Tenant billing / payment
   ========================= */

export type TenantPaymentItem = {
  payment_id: string;
  invoice_id: string;
  submitted_amount: number | string;
  slip_image_url?: string | null;
  reference_no?: string | null;
  paid_at?: string | null;
  payment_method?: "transfer" | "cash" | "qr";
  payment_status: BillingPaymentStatus;
  reviewed_at?: string | null;
  review_note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type TenantBillingHistoryItem = {
  invoice_id: string;
  billing_month: string;
  due_date: string;
  room_number: string;
  floor_no: number;
  building_name: string;
  building_code: string;
  tenant_name?: string | null;
  base_rent_amount: number | string;
  water_amount: number | string;
  electric_amount: number | string;
  other_amount: number | string;
  discount_amount: number | string;
  total_amount: number | string;
  invoice_status: BillingInvoiceStatus;
  latest_payment: TenantPaymentItem | null;
};

export type TenantCurrentInvoice = {
  invoice_id: string;
  dorm_id?: string | null;
  billing_month: string;
  due_date: string;
  room_id: string;
  room_number: string;
  floor_no: number;
  building_id: string;
  building_name: string;
  building_code: string;
  tenant_name?: string | null;
  base_rent_amount: number | string;
  water_amount: number | string;
  electric_amount: number | string;
  other_amount: number | string;
  discount_amount: number | string;
  total_amount: number | string;
  invoice_status: BillingInvoiceStatus;
  payment_bank_name?: string | null;
  payment_account_name?: string | null;
  payment_account_number?: string | null;
  payment_promptpay_id?: string | null;
  payment_qr_image_url?: string | null;
  latest_payment: TenantPaymentItem | null;
};

export type TenantBillingOverviewResponse = {
  message: string;
  current_invoice: TenantCurrentInvoice | null;
  history: TenantBillingHistoryItem[];
};

export type SubmitTenantPaymentPayload = {
  invoice_id: string;
  submitted_amount: number;
  slip_image_url: string;
  reference_no?: string;
  paid_at?: string;
  payment_method?: "transfer" | "cash" | "qr";
};

export type SubmitTenantPaymentResponse = {
  message: string;
  payment: TenantPaymentItem;
};