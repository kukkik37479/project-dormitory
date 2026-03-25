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