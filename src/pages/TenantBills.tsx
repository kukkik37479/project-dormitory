import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  getTenantBillingOverview,
  submitTenantPayment,
  uploadPaymentSlipToSupabase,
} from "../service/billing";
import type {
  BillingInvoiceStatus,
  BillingPaymentStatus,
  TenantBillingHistoryItem,
  TenantCurrentInvoice,
} from "../types/billing";

type StoredUser = {
  id?: string;
  role?: "owner" | "tenant" | "admin";
  dorm_id?: string | null;
  full_name?: string | null;
  username?: string | null;
  email?: string | null;
};

type DisplayInvoiceItem = {
  invoice_id: string;
  dorm_id?: string | null;
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
  latest_payment: TenantBillingHistoryItem["latest_payment"];
  payment_bank_name?: string | null;
  payment_account_name?: string | null;
  payment_account_number?: string | null;
  payment_promptpay_id?: string | null;
  payment_qr_image_url?: string | null;
  source: "current" | "history";
};

function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "เกิดข้อผิดพลาด";
}

function formatMoney(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateThai(dateValue?: string | null) {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString("th-TH");
}

function formatDateTimeThai(dateValue?: string | null) {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatMonthThai(dateValue?: string | null) {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;

  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function getNowLocalDateTimeInputValue() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function getInvoiceStatusMeta(status: BillingInvoiceStatus) {
  switch (status) {
    case "paid":
      return {
        label: "ชำระแล้ว",
        className: "bg-emerald-100 text-emerald-700 border-emerald-200",
      };
    case "pending_review":
      return {
        label: "รอตรวจสอบ",
        className: "bg-amber-100 text-amber-700 border-amber-200",
      };
    case "overdue":
      return {
        label: "ค้างชำระ",
        className: "bg-rose-100 text-rose-700 border-rose-200",
      };
    case "draft":
      return {
        label: "ฉบับร่าง",
        className: "bg-slate-100 text-slate-700 border-slate-200",
      };
    case "cancelled":
      return {
        label: "ยกเลิก",
        className: "bg-slate-100 text-slate-700 border-slate-200",
      };
    case "unpaid":
    default:
      return {
        label: "ยังไม่ชำระ",
        className: "bg-sky-100 text-sky-700 border-sky-200",
      };
  }
}

function getPaymentStatusMeta(status?: BillingPaymentStatus | null) {
  switch (status) {
    case "approved":
      return {
        label: "ตรวจสอบแล้ว",
        className: "bg-emerald-100 text-emerald-700 border-emerald-200",
      };
    case "rejected":
      return {
        label: "ตีกลับ",
        className: "bg-rose-100 text-rose-700 border-rose-200",
      };
    case "submitted":
      return {
        label: "ส่งสลิปแล้ว",
        className: "bg-amber-100 text-amber-700 border-amber-200",
      };
    default:
      return {
        label: "ยังไม่มีรายการชำระ",
        className: "bg-slate-100 text-slate-600 border-slate-200",
      };
  }
}

function StatusBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

function SummaryRow({
  label,
  value,
  valueClassName = "text-slate-900",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold ${valueClassName}`}>{value}</span>
    </div>
  );
}

function isManageableStatus(status: BillingInvoiceStatus) {
  return ["unpaid", "overdue", "pending_review", "draft"].includes(status);
}

function getInvoicePriority(status: BillingInvoiceStatus) {
  switch (status) {
    case "overdue":
      return 1;
    case "unpaid":
      return 2;
    case "pending_review":
      return 3;
    case "draft":
      return 4;
    case "paid":
      return 5;
    case "cancelled":
    default:
      return 99;
  }
}

function normalizeCurrentInvoice(
  invoice: TenantCurrentInvoice | null
): DisplayInvoiceItem | null {
  if (!invoice) return null;

  return {
    invoice_id: invoice.invoice_id,
    dorm_id: invoice.dorm_id,
    billing_month: invoice.billing_month,
    due_date: invoice.due_date,
    room_number: invoice.room_number,
    floor_no: invoice.floor_no,
    building_name: invoice.building_name,
    building_code: invoice.building_code,
    tenant_name: invoice.tenant_name,
    base_rent_amount: invoice.base_rent_amount,
    water_amount: invoice.water_amount,
    electric_amount: invoice.electric_amount,
    other_amount: invoice.other_amount,
    discount_amount: invoice.discount_amount,
    total_amount: invoice.total_amount,
    invoice_status: invoice.invoice_status,
    latest_payment: invoice.latest_payment,
    payment_bank_name: invoice.payment_bank_name,
    payment_account_name: invoice.payment_account_name,
    payment_account_number: invoice.payment_account_number,
    payment_promptpay_id: invoice.payment_promptpay_id,
    payment_qr_image_url: invoice.payment_qr_image_url,
    source: "current",
  };
}

function normalizeHistoryInvoice(
  invoice: TenantBillingHistoryItem,
  fallbackCurrentInvoice: TenantCurrentInvoice | null
): DisplayInvoiceItem {
  return {
    invoice_id: invoice.invoice_id,
    dorm_id: fallbackCurrentInvoice?.dorm_id || null,
    billing_month: invoice.billing_month,
    due_date: invoice.due_date,
    room_number: invoice.room_number,
    floor_no: invoice.floor_no,
    building_name: invoice.building_name,
    building_code: invoice.building_code,
    tenant_name: invoice.tenant_name,
    base_rent_amount: invoice.base_rent_amount,
    water_amount: invoice.water_amount,
    electric_amount: invoice.electric_amount,
    other_amount: invoice.other_amount,
    discount_amount: invoice.discount_amount,
    total_amount: invoice.total_amount,
    invoice_status: invoice.invoice_status,
    latest_payment: invoice.latest_payment,
    payment_bank_name: fallbackCurrentInvoice?.payment_bank_name || null,
    payment_account_name: fallbackCurrentInvoice?.payment_account_name || null,
    payment_account_number:
      fallbackCurrentInvoice?.payment_account_number || null,
    payment_promptpay_id: fallbackCurrentInvoice?.payment_promptpay_id || null,
    payment_qr_image_url: fallbackCurrentInvoice?.payment_qr_image_url || null,
    source: "history",
  };
}

function ActiveInvoiceCard({
  item,
  selected,
  onSelect,
}: {
  item: DisplayInvoiceItem;
  selected: boolean;
  onSelect: (invoiceId: string) => void;
}) {
  const invoiceMeta = getInvoiceStatusMeta(item.invoice_status);
  const paymentMeta = getPaymentStatusMeta(item.latest_payment?.payment_status);

  return (
    <div
      className={`rounded-3xl border p-4 transition ${
        selected
          ? "border-rose-300 bg-rose-50 shadow-sm"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-bold text-slate-900">
            บิลเดือน {formatMonthThai(item.billing_month)}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            ห้อง {item.room_number} • {item.building_name} • ชั้น {item.floor_no}
          </div>
        </div>

        <StatusBadge
          label={invoiceMeta.label}
          className={invoiceMeta.className}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-slate-500">ครบกำหนด</div>
          <div className="mt-1 font-semibold">{formatDateThai(item.due_date)}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-slate-500">ยอดที่ต้องชำระ</div>
          <div className="mt-1 font-semibold">
            ฿{formatMoney(item.total_amount)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge
          label={paymentMeta.label}
          className={paymentMeta.className}
        />

        <button
          type="button"
          onClick={() => onSelect(item.invoice_id)}
          className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
            selected
              ? "bg-rose-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          ดูรายละเอียด
        </button>
      </div>
    </div>
  );
}

function PaymentHistoryCard({
  item,
  expanded,
  onToggleDetail,
  onViewSlip,
}: {
  item: DisplayInvoiceItem;
  expanded: boolean;
  onToggleDetail: (invoiceId: string) => void;
  onViewSlip: (url: string) => void;
}) {
  const invoiceMeta = getInvoiceStatusMeta(item.invoice_status);
  const paymentMeta = getPaymentStatusMeta(item.latest_payment?.payment_status);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-lg font-bold text-slate-900">
              บิลเดือน {formatMonthThai(item.billing_month)}
            </div>
            <StatusBadge
              label={invoiceMeta.label}
              className={invoiceMeta.className}
            />
            <StatusBadge
              label={paymentMeta.label}
              className={paymentMeta.className}
            />
          </div>

          <div className="mt-1 text-sm text-slate-500">
            ห้อง {item.room_number} • {item.building_name}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm lg:min-w-[360px]">
          <div>
            <div className="text-slate-500">ยอดรวม</div>
            <div className="mt-1 font-semibold">
              ฿{formatMoney(item.total_amount)}
            </div>
          </div>
          <div>
            <div className="text-slate-500">ชำระเมื่อ</div>
            <div className="mt-1 font-semibold">
              {formatDateThai(item.latest_payment?.paid_at)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onToggleDetail(item.invoice_id)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {expanded ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
          </button>

          <button
            type="button"
            onClick={() =>
              item.latest_payment?.slip_image_url &&
              onViewSlip(item.latest_payment.slip_image_url)
            }
            disabled={!item.latest_payment?.slip_image_url}
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ดูสลิป
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white px-4 py-3 text-sm">
              <div className="text-slate-500">ครบกำหนด</div>
              <div className="mt-1 font-semibold">{formatDateThai(item.due_date)}</div>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 text-sm">
              <div className="text-slate-500">เลขอ้างอิง</div>
              <div className="mt-1 font-semibold">
                {item.latest_payment?.reference_no || "-"}
              </div>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 text-sm">
              <div className="text-slate-500">อัปโหลดสลิป</div>
              <div className="mt-1 font-semibold">
                {formatDateTimeThai(item.latest_payment?.updated_at)}
              </div>
            </div>
          </div>

          {item.latest_payment?.review_note ? (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <span className="font-semibold">หมายเหตุ:</span>{" "}
              {item.latest_payment.review_note}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function TenantBills() {
  const storedUser = useMemo(() => getStoredUser(), []);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [currentInvoice, setCurrentInvoice] = useState<TenantCurrentInvoice | null>(
    null
  );
  const [history, setHistory] = useState<TenantBillingHistoryItem[]>([]);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [expandedHistoryId, setExpandedHistoryId] = useState<string>("");
  const [slipModalUrl, setSlipModalUrl] = useState<string>("");

  const [selectedSlipFile, setSelectedSlipFile] = useState<File | null>(null);
  const [slipPreviewUrl, setSlipPreviewUrl] = useState("");
  const [submittedAmount, setSubmittedAmount] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [paidAt, setPaidAt] = useState(getNowLocalDateTimeInputValue());

  async function loadBillingOverview() {
    try {
      setLoading(true);
      setError("");

      const data = await getTenantBillingOverview();
      setCurrentInvoice(data.current_invoice);
      setHistory(data.history || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBillingOverview();
  }, []);

  useEffect(() => {
    return () => {
      if (slipPreviewUrl) {
        URL.revokeObjectURL(slipPreviewUrl);
      }
    };
  }, [slipPreviewUrl]);

  const normalizedCurrent = useMemo(
    () => normalizeCurrentInvoice(currentInvoice),
    [currentInvoice]
  );

  const normalizedHistory = useMemo(
    () => history.map((item) => normalizeHistoryInvoice(item, currentInvoice)),
    [history, currentInvoice]
  );

  const activeInvoices = useMemo(() => {
    const items = [
      ...(normalizedCurrent ? [normalizedCurrent] : []),
      ...normalizedHistory.filter((item) => isManageableStatus(item.invoice_status)),
    ];

    return items.sort((a, b) => {
      const statusDiff =
        getInvoicePriority(a.invoice_status) - getInvoicePriority(b.invoice_status);
      if (statusDiff !== 0) return statusDiff;

      return (
        new Date(b.billing_month).getTime() - new Date(a.billing_month).getTime()
      );
    });
  }, [normalizedCurrent, normalizedHistory]);

  const paymentHistoryItems = useMemo(() => {
    return normalizedHistory.filter(
      (item) => !isManageableStatus(item.invoice_status)
    );
  }, [normalizedHistory]);

  useEffect(() => {
    if (!activeInvoices.length) {
      setSelectedInvoiceId("");
      return;
    }

    const stillExists = activeInvoices.some(
      (item) => item.invoice_id === selectedInvoiceId
    );

    if (!selectedInvoiceId || !stillExists) {
      setSelectedInvoiceId(activeInvoices[0].invoice_id);
    }
  }, [activeInvoices, selectedInvoiceId]);

  const selectedInvoice = useMemo(() => {
    return (
      activeInvoices.find((item) => item.invoice_id === selectedInvoiceId) || null
    );
  }, [activeInvoices, selectedInvoiceId]);

  useEffect(() => {
    if (!selectedInvoice) {
      setSubmittedAmount("");
      return;
    }

    setSubmittedAmount(String(Number(selectedInvoice.total_amount || 0)));
    setReferenceNo("");
    setPaidAt(getNowLocalDateTimeInputValue());
    setSelectedSlipFile(null);
    setSlipPreviewUrl("");
  }, [selectedInvoice?.invoice_id]);

  const selectedInvoiceStatusMeta = selectedInvoice
    ? getInvoiceStatusMeta(selectedInvoice.invoice_status)
    : null;

  const selectedPaymentStatusMeta = selectedInvoice
    ? getPaymentStatusMeta(selectedInvoice.latest_payment?.payment_status)
    : null;

  const canSubmitPayment = useMemo(() => {
    if (!selectedInvoice) return false;
    if (!["unpaid", "overdue"].includes(selectedInvoice.invoice_status)) {
      return false;
    }

    const latestStatus = selectedInvoice.latest_payment?.payment_status;
    if (latestStatus === "submitted" || latestStatus === "approved") {
      return false;
    }

    return true;
  }, [selectedInvoice]);

  const utilityAmount = useMemo(() => {
    if (!selectedInvoice) return 0;
    return (
      Number(selectedInvoice.water_amount || 0) +
      Number(selectedInvoice.electric_amount || 0)
    );
  }, [selectedInvoice]);

  const resolvedDormId = useMemo(() => {
    if (selectedInvoice?.dorm_id) return selectedInvoice.dorm_id;
    if (currentInvoice?.dorm_id) return currentInvoice.dorm_id;
    if (storedUser?.dorm_id) return storedUser.dorm_id;
    return null;
  }, [selectedInvoice?.dorm_id, currentInvoice?.dorm_id, storedUser?.dorm_id]);

  const overdueCount = useMemo(
    () => activeInvoices.filter((item) => item.invoice_status === "overdue").length,
    [activeInvoices]
  );

  const outstandingAmount = useMemo(() => {
    return activeInvoices
      .filter((item) => ["unpaid", "overdue"].includes(item.invoice_status))
      .reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
  }, [activeInvoices]);

  const pendingCount = useMemo(
    () =>
      activeInvoices.filter((item) => item.invoice_status === "pending_review")
        .length,
    [activeInvoices]
  );

  function handleSlipChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (slipPreviewUrl) {
      URL.revokeObjectURL(slipPreviewUrl);
    }

    setSelectedSlipFile(file);
    setSlipPreviewUrl(URL.createObjectURL(file));
    setError("");
    setSuccess("");
  }

  async function handleSubmitPayment() {
    try {
      setError("");
      setSuccess("");

      if (!selectedInvoice) {
        throw new Error("ไม่พบบิลสำหรับชำระเงิน");
      }

      if (!canSubmitPayment) {
        throw new Error("บิลนี้ยังไม่สามารถส่งหลักฐานการชำระได้");
      }

      if (!resolvedDormId) {
        throw new Error("ไม่พบข้อมูลหอพักสำหรับอัปโหลดสลิป");
      }

      if (!selectedSlipFile) {
        throw new Error("กรุณาอัปโหลดหลักฐานการโอน");
      }

      const amount = Number(submittedAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("กรุณากรอกจำนวนเงินให้ถูกต้อง");
      }

      setSubmitting(true);

      const uploaded = await uploadPaymentSlipToSupabase(
        resolvedDormId,
        selectedInvoice.invoice_id,
        selectedSlipFile
      );

      await submitTenantPayment({
        invoice_id: selectedInvoice.invoice_id,
        submitted_amount: amount,
        slip_image_url: uploaded.publicUrl,
        reference_no: referenceNo.trim() || undefined,
        paid_at: paidAt || undefined,
        payment_method: "transfer",
      });

      setSuccess("ส่งหลักฐานการชำระเงินเรียบร้อยแล้ว");
      await loadBillingOverview();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[30px] bg-gradient-to-r from-[#e11d48] via-[#f43f8c] to-[#fb7185] px-6 py-6 text-white shadow-md">
        <div className="text-sm font-medium text-white/90">บิลและการชำระเงิน</div>
        <h1 className="mt-2 text-3xl font-extrabold">ชำระค่าเช่าห้อง</h1>
        <p className="mt-2 text-sm text-white/90">
          ดูบิลที่ต้องจัดการทั้งหมด อัปโหลดสลิป และติดตามสถานะการตรวจสอบได้ที่นี่
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {loading ? (
        <div className="rounded-[28px] bg-white p-10 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
          กำลังโหลดข้อมูล...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-[28px] border border-rose-200 bg-white p-5 shadow-sm ring-1 ring-rose-100">
              <div className="text-sm text-slate-500">ค้างชำระ</div>
              <div className="mt-2 text-3xl font-bold text-rose-600">
                {overdueCount} บิล
              </div>
              <div className="mt-1 text-sm text-slate-500">ต้องจัดการก่อน</div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="text-sm text-slate-500">ยอดค้างรวม</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">
                ฿{formatMoney(outstandingAmount)}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                รวมบิลที่ยังไม่ชำระและค้างชำระ
              </div>
            </div>

            <div className="rounded-[28px] border border-amber-200 bg-white p-5 shadow-sm ring-1 ring-amber-100">
              <div className="text-sm text-slate-500">รอตรวจสอบ</div>
              <div className="mt-2 text-3xl font-bold text-amber-600">
                {pendingCount} บิล
              </div>
              <div className="mt-1 text-sm text-slate-500">
                เจ้าของหอยังไม่ยืนยันสลิป
              </div>
            </div>
          </div>

          {activeInvoices.length > 1 && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <span className="font-semibold">แจ้งเตือน:</span> คุณมีบิลที่ต้องจัดการ{" "}
              {activeInvoices.length} รายการ กรุณาเลือกบิลจากรายการด้านล่าง
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <section className="rounded-[28px] bg-white shadow-sm ring-1 ring-slate-200">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xl font-bold text-slate-900">
                      บิลที่ต้องจัดการ
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      แสดงบิลค้างชำระ ยังไม่ชำระ และรอตรวจสอบ
                    </div>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                    {activeInvoices.length} รายการ
                  </span>
                </div>
              </div>

              <div className="space-y-4 p-4">
                {activeInvoices.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
                    ยังไม่มีบิลที่ต้องจัดการในขณะนี้
                  </div>
                ) : (
                  activeInvoices.map((item) => (
                    <ActiveInvoiceCard
                      key={item.invoice_id}
                      item={item}
                      selected={item.invoice_id === selectedInvoiceId}
                      onSelect={setSelectedInvoiceId}
                    />
                  ))
                )}
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-xl font-bold text-slate-900">
                      รายละเอียดบิลที่เลือก
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {selectedInvoice
                        ? `บิลเดือน ${formatMonthThai(selectedInvoice.billing_month)}`
                        : "ยังไม่มีบิลที่เลือก"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedInvoiceStatusMeta && (
                      <StatusBadge
                        label={selectedInvoiceStatusMeta.label}
                        className={selectedInvoiceStatusMeta.className}
                      />
                    )}
                    {selectedPaymentStatusMeta && selectedInvoice && (
                      <StatusBadge
                        label={selectedPaymentStatusMeta.label}
                        className={selectedPaymentStatusMeta.className}
                      />
                    )}
                  </div>
                </div>

                {!selectedInvoice ? (
                  <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
                    ยังไม่มีบิลสำหรับแสดงรายละเอียด
                  </div>
                ) : (
                  <>
                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-3xl bg-slate-50 p-4">
                        <div className="text-sm text-slate-500">ห้อง</div>
                        <div className="mt-1 text-xl font-bold text-slate-900">
                          {selectedInvoice.room_number}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {selectedInvoice.building_name} • ชั้น {selectedInvoice.floor_no}
                        </div>
                      </div>

                      <div className="rounded-3xl bg-rose-50 p-4">
                        <div className="text-sm text-rose-500">ยอดที่ต้องชำระ</div>
                        <div className="mt-1 text-3xl font-extrabold text-rose-600">
                          {formatMoney(selectedInvoice.total_amount)}
                        </div>
                        <div className="mt-1 text-sm text-rose-500">บาท</div>
                      </div>
                    </div>

                    <div className="mt-6 rounded-3xl border border-slate-200 p-4">
                      <div className="text-base font-bold text-slate-900">
                        รายละเอียดค่าใช้จ่าย
                      </div>

                      <div className="mt-4 space-y-3">
                        <SummaryRow
                          label="ค่าเช่าห้อง"
                          value={`${formatMoney(selectedInvoice.base_rent_amount)} บาท`}
                        />
                        <SummaryRow
                          label="ค่าน้ำ"
                          value={`${formatMoney(selectedInvoice.water_amount)} บาท`}
                        />
                        <SummaryRow
                          label="ค่าไฟ"
                          value={`${formatMoney(selectedInvoice.electric_amount)} บาท`}
                        />
                        <SummaryRow
                          label="รวมค่าน้ำ + ค่าไฟ"
                          value={`${formatMoney(utilityAmount)} บาท`}
                        />
                        <SummaryRow
                          label="ค่าอื่น ๆ"
                          value={`${formatMoney(selectedInvoice.other_amount)} บาท`}
                        />
                        <SummaryRow
                          label="ส่วนลด"
                          value={`${formatMoney(selectedInvoice.discount_amount)} บาท`}
                        />
                        <div className="border-t border-slate-200 pt-3">
                          <SummaryRow
                            label="ครบกำหนดชำระ"
                            value={formatDateThai(selectedInvoice.due_date)}
                            valueClassName={
                              selectedInvoice.invoice_status === "overdue"
                                ? "text-rose-600"
                                : "text-slate-900"
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {selectedInvoice.latest_payment && (
                      <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-4">
                        <div className="text-base font-bold text-amber-800">
                          รายการชำระล่าสุด
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-amber-900 sm:grid-cols-2">
                          <div>
                            จำนวนเงิน:{" "}
                            <b>
                              {formatMoney(
                                selectedInvoice.latest_payment.submitted_amount
                              )}{" "}
                              บาท
                            </b>
                          </div>
                          <div>
                            เวลาชำระ:{" "}
                            <b>
                              {formatDateTimeThai(
                                selectedInvoice.latest_payment.paid_at
                              )}
                            </b>
                          </div>
                          <div>
                            สถานะ:{" "}
                            <b>
                              {
                                getPaymentStatusMeta(
                                  selectedInvoice.latest_payment.payment_status
                                ).label
                              }
                            </b>
                          </div>
                          <div>
                            อ้างอิง:{" "}
                            <b>
                              {selectedInvoice.latest_payment.reference_no || "-"}
                            </b>
                          </div>
                        </div>

                        {selectedInvoice.latest_payment.review_note && (
                          <div className="mt-3 rounded-2xl border border-amber-300 bg-white/70 px-3 py-2 text-sm text-amber-800">
                            หมายเหตุจากเจ้าของหอ:{" "}
                            {selectedInvoice.latest_payment.review_note}
                          </div>
                        )}

                        {selectedInvoice.latest_payment.slip_image_url && (
                          <button
                            type="button"
                            onClick={() =>
                              setSlipModalUrl(
                                selectedInvoice.latest_payment?.slip_image_url || ""
                              )
                            }
                            className="mt-3 inline-flex text-sm font-semibold text-rose-600 hover:text-rose-700"
                          >
                            ดูหลักฐานการโอนล่าสุด
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <aside className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
                <div className="text-lg font-bold text-slate-900">ชำระเงิน</div>
                <div className="mt-1 text-sm text-slate-500">
                  อัปโหลดสลิปเพื่อส่งให้เจ้าของหอตรวจสอบ
                </div>

                {!selectedInvoice ? (
                  <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                    ยังไม่มีบิลที่สามารถชำระได้
                  </div>
                ) : (
                  <>
                    <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                      <div className="border-b border-slate-200 px-4 py-3">
                        <div className="text-sm font-semibold text-slate-700">
                          บัญชีรับเงินของหอ
                        </div>
                      </div>

                      <div className="space-y-3 px-4 py-4 text-sm text-slate-600">
                        <div>
                          ธนาคาร: <b>{selectedInvoice.payment_bank_name || "-"}</b>
                        </div>
                        <div>
                          ชื่อบัญชี:{" "}
                          <b>{selectedInvoice.payment_account_name || "-"}</b>
                        </div>
                        <div>
                          เลขบัญชี:{" "}
                          <b>{selectedInvoice.payment_account_number || "-"}</b>
                        </div>
                        <div>
                          พร้อมเพย์:{" "}
                          <b>{selectedInvoice.payment_promptpay_id || "-"}</b>
                        </div>

                        {selectedInvoice.payment_qr_image_url ? (
                          <div className="pt-2">
                            <div className="mb-2 text-sm font-medium text-slate-700">
                              QR ชำระเงิน
                            </div>
                            <img
                              src={selectedInvoice.payment_qr_image_url}
                              alt="payment qr"
                              className="mx-auto h-52 w-52 rounded-2xl border border-slate-200 bg-white object-contain p-3"
                            />
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-400">
                            เจ้าของหอยังไม่ได้ตั้งค่า QR รับเงิน
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          จำนวนเงินที่โอน
                        </label>
                        <input
                          type="number"
                          value={submittedAmount}
                          onChange={(e) => setSubmittedAmount(e.target.value)}
                          className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                          placeholder="กรอกจำนวนเงิน"
                          disabled={!canSubmitPayment || submitting}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          วันเวลาที่ชำระ
                        </label>
                        <input
                          type="datetime-local"
                          value={paidAt}
                          onChange={(e) => setPaidAt(e.target.value)}
                          className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                          disabled={!canSubmitPayment || submitting}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          เลขอ้างอิง
                        </label>
                        <input
                          type="text"
                          value={referenceNo}
                          onChange={(e) => setReferenceNo(e.target.value)}
                          className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                          placeholder="ถ้ามี"
                          disabled={!canSubmitPayment || submitting}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          หลักฐานการโอน
                        </label>

                        <label className="flex min-h-[164px] cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 text-center transition hover:border-rose-300 hover:bg-rose-50">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleSlipChange}
                            disabled={!canSubmitPayment || submitting}
                          />
                          {slipPreviewUrl ? (
                            <img
                              src={slipPreviewUrl}
                              alt="slip preview"
                              className="max-h-44 rounded-2xl object-contain"
                            />
                          ) : (
                            <>
                              <div className="text-3xl">⬆</div>
                              <div className="mt-2 text-sm font-semibold text-slate-700">
                                อัปโหลดสลิปการโอน
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                รองรับไฟล์รูปภาพเท่านั้น
                              </div>
                            </>
                          )}
                        </label>
                      </div>

                      {!canSubmitPayment && selectedInvoice && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                          {selectedInvoice.invoice_status === "pending_review"
                            ? "บิลนี้ส่งสลิปแล้ว กำลังรอเจ้าของหอตรวจสอบ"
                            : selectedInvoice.latest_payment?.payment_status ===
                              "approved"
                            ? "บิลนี้ตรวจสอบการชำระเรียบร้อยแล้ว"
                            : "บิลนี้ยังไม่สามารถส่งหลักฐานการชำระได้"}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleSubmitPayment}
                        disabled={!canSubmitPayment || submitting}
                        className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-rose-600 px-5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submitting ? "กำลังส่งหลักฐาน..." : "ส่งหลักฐานการชำระของบิลนี้"}
                      </button>
                    </div>
                  </>
                )}
              </aside>
            </section>
          </div>

          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-slate-900">
                  ประวัติการชำระเงิน
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  เวอร์ชันย่อ อ่านง่ายขึ้น และกดดูรายละเอียดหรือดูสลิปได้
                </div>
              </div>
            </div>

            {paymentHistoryItems.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
                ยังไม่มีประวัติการชำระเงิน
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {paymentHistoryItems.map((item) => (
                  <PaymentHistoryCard
                    key={item.invoice_id}
                    item={item}
                    expanded={expandedHistoryId === item.invoice_id}
                    onToggleDetail={(invoiceId) =>
                      setExpandedHistoryId((prev) =>
                        prev === invoiceId ? "" : invoiceId
                      )
                    }
                    onViewSlip={(url) => setSlipModalUrl(url)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {slipModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="w-full max-w-3xl rounded-[28px] bg-white p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="text-lg font-bold text-slate-900">หลักฐานการโอน</div>
              <button
                type="button"
                onClick={() => setSlipModalUrl("")}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                ปิด
              </button>
            </div>

            <div className="rounded-3xl bg-slate-50 p-4">
              <img
                src={slipModalUrl}
                alt="payment slip"
                className="mx-auto max-h-[70vh] w-auto rounded-2xl object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}