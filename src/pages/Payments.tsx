import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  approveOwnerPayment,
  getOwnerPaymentDetail,
  getOwnerPayments,
  rejectOwnerPayment,
} from "../service/payments";
import type {
  OwnerPaymentDetail,
  OwnerPaymentInvoiceStatus,
  OwnerPaymentListItem,
} from "../types/payments";

function formatMoney(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateThai(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("th-TH");
}

function formatDateTimeThai(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatMonthLabel(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("th-TH", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "เกิดข้อผิดพลาด";
}

function getMonthInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function toMonthValue(value?: string | null) {
  if (!value) return "";

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return getMonthInputValue(parsed);
  }

  const matched = String(value).match(/^(\d{4})-(\d{2})/);
  return matched ? `${matched[1]}-${matched[2]}` : "";
}

function getLatestBillingMonth(items: OwnerPaymentListItem[]) {
  const months = Array.from(
    new Set(items.map((item) => toMonthValue(item.billing_month)).filter(Boolean))
  );

  return months.sort((a, b) => b.localeCompare(a))[0] || "";
}

function getRoomKey(item: OwnerPaymentListItem) {
  return `${item.building_name || item.building_code || "-"}::${item.room_number || "-"}`;
}

function getInvoiceStatusMeta(status: OwnerPaymentInvoiceStatus) {
  switch (status) {
    case "paid":
      return {
        label: "ตรวจสอบแล้ว",
        chipClass: "bg-emerald-100 text-emerald-700",
        rowClass: "bg-emerald-100/70",
        cardClass: "border-emerald-200 bg-emerald-50/70",
      };
    case "pending_review":
      return {
        label: "รอตรวจสอบ",
        chipClass: "bg-amber-100 text-amber-700",
        rowClass: "bg-amber-50",
        cardClass: "border-amber-200 bg-amber-50/80",
      };
    case "overdue":
      return {
        label: "ค้างชำระ",
        chipClass: "bg-rose-100 text-rose-700",
        rowClass: "bg-rose-100/80",
        cardClass: "border-rose-200 bg-rose-50/80",
      };
    case "draft":
      return {
        label: "ฉบับร่าง",
        chipClass: "bg-slate-100 text-slate-700",
        rowClass: "bg-slate-50",
        cardClass: "border-slate-200 bg-slate-50",
      };
    case "cancelled":
      return {
        label: "ยกเลิก",
        chipClass: "bg-slate-200 text-slate-700",
        rowClass: "bg-slate-100",
        cardClass: "border-slate-200 bg-slate-100/70",
      };
    case "unpaid":
    default:
      return {
        label: "ยังไม่ชำระ",
        chipClass: "bg-sky-100 text-sky-700",
        rowClass: "bg-sky-50",
        cardClass: "border-sky-200 bg-sky-50/80",
      };
  }
}

function SummaryCard({
  title,
  amount,
  count,
  className,
}: {
  title: string;
  amount: number;
  count: number;
  className: string;
}) {
  return (
    <div className={`rounded-2xl p-5 text-white shadow-sm ${className}`}>
      <div className="text-xl font-extrabold sm:text-2xl">{title}</div>
      <div className="mt-2 text-sm">จำนวนห้องที่อยู่ในสถานะนี้ {count} ห้อง</div>
      <div className="mt-2 text-sm">จำนวนเงินรวม</div>
      <div className="mt-1 text-2xl font-bold sm:text-3xl">
        {formatMoney(amount)} บาท
      </div>
    </div>
  );
}

function ActionIconButton({
  children,
  onClick,
  disabled = false,
  title,
  className = "bg-black text-white",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-md text-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

function ActionTextButton({
  children,
  onClick,
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

function PaymentActionButtons({
  item,
  onOpenDetail,
  onOpenApprove,
  onOpenReject,
  mobile = false,
}: {
  item: OwnerPaymentListItem;
  onOpenDetail: (paymentId?: string | null) => void;
  onOpenApprove: (paymentId?: string | null) => void;
  onOpenReject: (paymentId?: string | null) => void;
  mobile?: boolean;
}) {
  const canApprove =
    !!item.payment_id &&
    item.invoice_status === "pending_review" &&
    item.payment_status === "submitted";

  const canReject =
    !!item.payment_id &&
    item.invoice_status === "pending_review" &&
    item.payment_status === "submitted";

  if (mobile) {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <ActionTextButton
          onClick={() => onOpenDetail(item.payment_id)}
          disabled={!item.payment_id}
          className="bg-black text-white"
        >
          ดูหลักฐาน
        </ActionTextButton>

        <ActionTextButton
          onClick={() => onOpenApprove(item.payment_id)}
          disabled={!canApprove}
          className="bg-green-600 text-white"
        >
          ยืนยัน
        </ActionTextButton>

        <ActionTextButton
          onClick={() => onOpenReject(item.payment_id)}
          disabled={!canReject}
          className="bg-red-500 text-white"
        >
          ตีกลับ
        </ActionTextButton>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <ActionIconButton
        title="ดูหลักฐานการโอน"
        onClick={() => onOpenDetail(item.payment_id)}
        disabled={!item.payment_id}
        className="bg-black text-white"
      >
        ≡
      </ActionIconButton>

      <ActionIconButton
        title="ยืนยันการตรวจสอบ"
        onClick={() => onOpenApprove(item.payment_id)}
        disabled={!canApprove}
        className="bg-green-600 text-white"
      >
        ✓
      </ActionIconButton>

      <ActionIconButton
        title="ตีกลับรายการ"
        onClick={() => onOpenReject(item.payment_id)}
        disabled={!canReject}
        className="bg-red-500 text-white"
      >
        ↺
      </ActionIconButton>
    </div>
  );
}

function PaymentInfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="max-w-[60%] break-words text-right text-sm font-semibold text-slate-800">
        {value}
      </div>
    </div>
  );
}

function PaymentMobileCard({
  item,
  onOpenDetail,
  onOpenApprove,
  onOpenReject,
}: {
  item: OwnerPaymentListItem;
  onOpenDetail: (paymentId?: string | null) => void;
  onOpenApprove: (paymentId?: string | null) => void;
  onOpenReject: (paymentId?: string | null) => void;
}) {
  const meta = getInvoiceStatusMeta(item.invoice_status);

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${meta.cardClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-extrabold text-slate-900">
            ตึก {item.building_name || item.building_code || "-"} ห้อง {item.room_number}
          </div>
          <div className="mt-1 break-words text-sm text-slate-600">
            {item.room_type || "-"}
          </div>
          <div className="mt-1 break-words text-sm text-slate-500">
            ผู้เช่า: {item.tenant_name || "-"}
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${meta.chipClass}`}
        >
          {meta.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-white/80 p-3">
        <div>
          <div className="text-xs text-slate-500">ค่าเช่า</div>
          <div className="mt-1 text-sm font-semibold text-slate-800">
            {formatMoney(item.base_rent_amount)}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">ค่าไฟ</div>
          <div className="mt-1 text-sm font-semibold text-slate-800">
            {formatMoney(item.electric_amount)}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">ค่าน้ำ</div>
          <div className="mt-1 text-sm font-semibold text-slate-800">
            {formatMoney(item.water_amount)}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">ทั้งหมด</div>
          <div className="mt-1 text-sm font-extrabold text-slate-900">
            {formatMoney(item.total_amount)}
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-500">
        รอบบิล: {formatMonthLabel(item.billing_month)}
      </div>

      <div className="mt-4">
        <PaymentActionButtons
          item={item}
          onOpenDetail={onOpenDetail}
          onOpenApprove={onOpenApprove}
          onOpenReject={onOpenReject}
          mobile
        />
      </div>
    </div>
  );
}

function PaymentDetailModal({
  open,
  loading,
  detail,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  detail: OwnerPaymentDetail | null;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-3 sm:p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[24px] bg-[#f7f7f7] p-3 sm:rounded-[28px] sm:p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-6">
          <div className="rounded-[24px] bg-white p-4 shadow-sm sm:p-6">
            <div className="text-2xl font-extrabold text-rose-600 sm:text-3xl">
              หลักฐานการโอน
            </div>

            {loading ? (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-14 text-center text-sm text-slate-500">
                กำลังโหลดข้อมูล...
              </div>
            ) : !detail ? (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-14 text-center text-sm text-slate-500">
                ไม่พบรายละเอียดการชำระเงิน
              </div>
            ) : (
              <>
                <div className="mt-6 flex justify-center">
                  {detail.slip_image_url ? (
                    <img
                      src={detail.slip_image_url}
                      alt="payment slip"
                      className="max-h-[70vh] w-full rounded-2xl border border-slate-200 bg-white object-contain"
                    />
                  ) : (
                    <div className="flex h-[280px] w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                      ไม่มีรูปสลิป
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-stretch sm:justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white hover:bg-red-600 sm:w-auto sm:py-2"
                  >
                    ปิด
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="rounded-[24px] bg-white p-4 shadow-sm sm:p-6">
            <div className="text-2xl font-extrabold text-rose-600 sm:text-3xl">
              รายละเอียดการชำระ
            </div>

            {loading ? (
              <div className="mt-6 text-sm text-slate-500">กำลังโหลด...</div>
            ) : !detail ? (
              <div className="mt-6 text-sm text-slate-500">ไม่พบข้อมูล</div>
            ) : (
              <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <PaymentInfoRow label="ห้อง" value={detail.room_number} />
                <PaymentInfoRow label="ตึก" value={detail.building_name} />
                <PaymentInfoRow label="ประเภทห้อง" value={detail.room_type} />
                <PaymentInfoRow label="ผู้เช่า" value={detail.tenant_name || "-"} />
                <PaymentInfoRow
                  label="รอบบิล"
                  value={formatMonthLabel(detail.billing_month)}
                />
                <PaymentInfoRow
                  label="วันครบกำหนด"
                  value={formatDateThai(detail.due_date)}
                />
                <PaymentInfoRow
                  label="จำนวนที่โอน"
                  value={`${formatMoney(detail.submitted_amount)} บาท`}
                />
                <PaymentInfoRow
                  label="เวลาที่โอน"
                  value={formatDateTimeThai(detail.paid_at)}
                />
                <PaymentInfoRow
                  label="ค่าเช่า"
                  value={`${formatMoney(detail.base_rent_amount)} บาท`}
                />
                <PaymentInfoRow
                  label="ค่าน้ำ"
                  value={`${formatMoney(detail.water_amount)} บาท`}
                />
                <PaymentInfoRow
                  label="ค่าไฟ"
                  value={`${formatMoney(detail.electric_amount)} บาท`}
                />
                <PaymentInfoRow
                  label="รวมทั้งหมด"
                  value={`${formatMoney(detail.total_amount)} บาท`}
                />
                <PaymentInfoRow
                  label="อ้างอิง"
                  value={detail.reference_no || "-"}
                />

                {detail.review_note && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    หมายเหตุ: {detail.review_note}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ApproveModal({
  open,
  loading,
  note,
  onNoteChange,
  onClose,
  onConfirm,
}: {
  open: boolean;
  loading: boolean;
  note: string;
  onNoteChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-3 sm:p-4">
      <div className="w-full max-w-2xl rounded-[24px] bg-white p-5 shadow-lg sm:rounded-[28px] sm:p-8">
        <div className="text-2xl font-extrabold text-rose-600 sm:text-3xl">
          ยืนยันการตรวจสอบ
        </div>

        <div className="mt-6 text-center text-xl font-bold text-slate-900 sm:mt-8 sm:text-3xl">
          คุณได้ตรวจสอบความถูกต้องก่อนกดยืนยันใช่หรือไม่
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            หมายเหตุการตรวจสอบ (ไม่บังคับ)
          </label>
          <textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            rows={4}
            placeholder="เช่น ผู้เช่าโอนเกิน 120 บาท เจ้าของโอนคืนแล้ววันที่ 28 มี.ค. 2569"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
            disabled={loading}
          />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full rounded-xl bg-red-500 px-6 py-3 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60 sm:w-auto"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="w-full rounded-xl bg-green-500 px-6 py-3 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-60 sm:w-auto"
          >
            {loading ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectModal({
  open,
  loading,
  reason,
  onReasonChange,
  onClose,
  onConfirm,
}: {
  open: boolean;
  loading: boolean;
  reason: string;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-3 sm:p-4">
      <div className="w-full max-w-2xl rounded-[24px] bg-white p-5 shadow-lg sm:rounded-[28px] sm:p-8">
        <div className="text-2xl font-extrabold text-rose-600 sm:text-3xl">
          ตีกลับรายการชำระเงิน
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            เหตุผลในการตีกลับ
          </label>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={5}
            placeholder="เช่น ยอดยังขาดอีก 220 บาท กรุณาโอนเพิ่มและส่งสลิปใหม่"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
            disabled={loading}
          />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full rounded-xl bg-slate-500 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-600 disabled:opacity-60 sm:w-auto"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="w-full rounded-xl bg-red-500 px-6 py-3 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60 sm:w-auto"
          >
            {loading ? "กำลังบันทึก..." : "ตีกลับ"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Payments() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [month, setMonth] = useState("");
  const [monthInitialized, setMonthInitialized] = useState(false);

  const [items, setItems] = useState<OwnerPaymentListItem[]>([]);
  const [summaryItems, setSummaryItems] = useState<OwnerPaymentListItem[]>([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<OwnerPaymentDetail | null>(null);

  const [approveOpen, setApproveOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [approveNote, setApproveNote] = useState("");

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectPaymentId, setRejectPaymentId] = useState<string | null>(null);

  async function bootstrapMonth() {
    try {
      setLoading(true);
      setError("");

      const data = await getOwnerPayments({
        status: "all",
        search: "",
      });

      const allItems = data.items || [];
      const currentMonth = getMonthInputValue();

      const hasCurrentMonth = allItems.some(
        (item) => toMonthValue(item.billing_month) === currentMonth
      );

      const latestMonth = getLatestBillingMonth(allItems);
      const nextMonth = hasCurrentMonth ? currentMonth : latestMonth || currentMonth;

      setMonth(nextMonth);
    } catch (err) {
      setError(getErrorMessage(err));
      setMonth(getMonthInputValue());
    } finally {
      setMonthInitialized(true);
      setLoading(false);
    }
  }

  async function loadPayments() {
    try {
      setLoading(true);
      setError("");

      const [tableData, summaryData] = await Promise.all([
        getOwnerPayments({
          month: month || undefined,
          status,
          search: "",
        }),
        getOwnerPayments({
          month: month || undefined,
          status: "all",
          search: "",
        }),
      ]);

      setItems(tableData.items || []);
      setSummaryItems(summaryData.items || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (monthInitialized) return;
    bootstrapMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthInitialized]);

  useEffect(() => {
    if (!monthInitialized) return;
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, month, monthInitialized]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) => {
      return (
        (item.room_number || "").toLowerCase().includes(q) ||
        (item.building_name || "").toLowerCase().includes(q) ||
        (item.building_code || "").toLowerCase().includes(q) ||
        (item.tenant_name || "").toLowerCase().includes(q) ||
        (item.room_type || "").toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  const summary = useMemo(() => {
    const liveStatuses: OwnerPaymentInvoiceStatus[] = [
      "paid",
      "pending_review",
      "unpaid",
      "overdue",
    ];

    const liveItems = summaryItems.filter((item) =>
      liveStatuses.includes(item.invoice_status)
    );

    const paidRooms = new Set<string>();
    const pendingRooms = new Set<string>();
    const unpaidRooms = new Set<string>();
    const overdueRooms = new Set<string>();
    const totalRooms = new Set<string>();

    let paidAmount = 0;
    let pendingAmount = 0;
    let unpaidAmount = 0;
    let overdueAmount = 0;

    for (const item of liveItems) {
      const roomKey = getRoomKey(item);
      totalRooms.add(roomKey);

      const amount = Number(item.total_amount || 0);

      if (item.invoice_status === "paid") {
        paidRooms.add(roomKey);
        paidAmount += amount;
      } else if (item.invoice_status === "pending_review") {
        pendingRooms.add(roomKey);
        pendingAmount += amount;
      } else if (item.invoice_status === "unpaid") {
        unpaidRooms.add(roomKey);
        unpaidAmount += amount;
      } else if (item.invoice_status === "overdue") {
        overdueRooms.add(roomKey);
        overdueAmount += amount;
      }
    }

    return {
      totalRooms: totalRooms.size,
      paidCount: paidRooms.size,
      paidAmount,
      pendingCount: pendingRooms.size,
      pendingAmount,
      unpaidCount: unpaidRooms.size,
      unpaidAmount,
      overdueCount: overdueRooms.size,
      overdueAmount,
    };
  }, [summaryItems]);

  const selectedMonthLabel = useMemo(() => {
    return formatMonthLabel(month ? `${month}-01` : null);
  }, [month]);

  async function handleOpenDetail(paymentId?: string | null) {
    if (!paymentId) return;

    try {
      setDetailOpen(true);
      setDetailLoading(true);
      setDetail(null);
      setError("");

      const data = await getOwnerPaymentDetail(paymentId);
      setDetail(data);
    } catch (err) {
      setError(getErrorMessage(err));
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  function handleOpenApprove(paymentId?: string | null) {
    if (!paymentId) return;
    setSelectedPaymentId(paymentId);
    setApproveNote("");
    setApproveOpen(true);
  }

  function handleOpenReject(paymentId?: string | null) {
    if (!paymentId) return;
    setRejectPaymentId(paymentId);
    setRejectReason("");
    setRejectOpen(true);
  }

  async function handleConfirmApprove() {
    if (!selectedPaymentId) return;

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      await approveOwnerPayment(selectedPaymentId, approveNote.trim());

      setSuccess("ยืนยันการตรวจสอบเรียบร้อยแล้ว");
      setApproveOpen(false);
      setSelectedPaymentId(null);
      setApproveNote("");

      if (detail?.payment_id === selectedPaymentId) {
        setDetailOpen(false);
        setDetail(null);
      }

      await loadPayments();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmReject() {
    if (!rejectPaymentId) return;

    try {
      setError("");
      setSuccess("");

      if (!rejectReason.trim()) {
        throw new Error("กรุณาระบุเหตุผลในการตีกลับ");
      }

      setActionLoading(true);

      await rejectOwnerPayment(rejectPaymentId, rejectReason);

      setSuccess("ตีกลับรายการชำระเงินเรียบร้อยแล้ว");
      setRejectOpen(false);
      setRejectPaymentId(null);
      setRejectReason("");

      if (detail?.payment_id === rejectPaymentId) {
        setDetailOpen(false);
        setDetail(null);
      }

      await loadPayments();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] bg-white/60 p-4 ring-1 ring-slate-200 sm:p-5">
        <div className="text-sm font-semibold text-slate-500">
          สรุปตัวเลขของเดือน {selectedMonthLabel}
        </div>
        <div className="mt-1 text-sm text-slate-700 sm:text-base">
          เดือนนี้มีบิลทั้งหมด{" "}
          <span className="font-bold text-slate-900">{summary.totalRooms}</span>{" "}
          ห้องที่มีคนเช่าอยู่
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="จ่ายแล้ว"
          amount={summary.paidAmount}
          count={summary.paidCount}
          className="bg-gradient-to-r from-green-700 to-lime-500"
        />
        <SummaryCard
          title="รอตรวจสอบ"
          amount={summary.pendingAmount}
          count={summary.pendingCount}
          className="bg-gradient-to-r from-amber-500 to-yellow-300"
        />
        <SummaryCard
          title="ยังไม่ชำระ"
          amount={summary.unpaidAmount}
          count={summary.unpaidCount}
          className="bg-gradient-to-r from-sky-600 to-cyan-500"
        />
        <SummaryCard
          title="ค้างชำระ"
          amount={summary.overdueAmount}
          count={summary.overdueCount}
          className="bg-gradient-to-r from-red-600 to-red-500"
        />
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

      <section className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:rounded-[30px] sm:p-6">
        <div className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
          รายการบิล
        </div>

        <div className="mt-2 text-sm text-slate-500">
          ข้อมูลด้านล่างอ้างอิงจากเดือน {selectedMonthLabel}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_200px] lg:items-center">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาห้อง/ค้นหาตึก"
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-rose-400"
            />

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-rose-400"
            >
              <option value="all">ทั้งหมด</option>
              <option value="pending_review">รอตรวจสอบ</option>
              <option value="paid">จ่ายแล้ว</option>
              <option value="unpaid">ยังไม่ชำระ</option>
              <option value="overdue">ค้างชำระ</option>
            </select>
          </div>

          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-rose-400"
          />
        </div>

        <div className="mt-6 md:hidden">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              กำลังโหลดข้อมูล...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              ไม่พบรายการชำระเงิน
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <PaymentMobileCard
                  key={`${item.invoice_id}-${item.payment_id || "no-payment"}`}
                  item={item}
                  onOpenDetail={handleOpenDetail}
                  onOpenApprove={handleOpenApprove}
                  onOpenReject={handleOpenReject}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 hidden overflow-x-auto md:block">
          <table className="min-w-[980px] overflow-hidden rounded-2xl">
            <thead>
              <tr className="bg-rose-100 text-left text-sm font-semibold text-slate-700">
                <th className="px-4 py-4">ตึก</th>
                <th className="px-4 py-4">ห้อง</th>
                <th className="px-4 py-4">ประเภทห้อง</th>
                <th className="px-4 py-4">รอบบิล</th>
                <th className="px-4 py-4">ค่าเช่า</th>
                <th className="px-4 py-4">ค่าไฟ</th>
                <th className="px-4 py-4">ค่าน้ำ</th>
                <th className="px-4 py-4">ทั้งหมด</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 text-center">จัดการ</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="bg-white px-4 py-10 text-center text-sm text-slate-500"
                  >
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="bg-white px-4 py-10 text-center text-sm text-slate-500"
                  >
                    ไม่พบรายการชำระเงิน
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const meta = getInvoiceStatusMeta(item.invoice_status);

                  return (
                    <tr
                      key={`${item.invoice_id}-${item.payment_id || "no-payment"}`}
                      className={`border-t border-white/60 text-sm text-slate-800 ${meta.rowClass}`}
                    >
                      <td className="px-4 py-4 font-semibold">
                        <div className="max-w-[130px] truncate">
                          {item.building_name || item.building_code || "-"}
                        </div>
                      </td>

                      <td className="px-4 py-4 font-semibold">
                        <div className="max-w-[90px] truncate">{item.room_number}</div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="max-w-[150px] truncate">{item.room_type}</div>
                      </td>

                      <td className="px-4 py-4">
                        {formatMonthLabel(item.billing_month)}
                      </td>

                      <td className="px-4 py-4">{formatMoney(item.base_rent_amount)}</td>
                      <td className="px-4 py-4">{formatMoney(item.electric_amount)}</td>
                      <td className="px-4 py-4">{formatMoney(item.water_amount)}</td>
                      <td className="px-4 py-4 font-bold">
                        {formatMoney(item.total_amount)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${meta.chipClass}`}
                        >
                          {meta.label}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <PaymentActionButtons
                          item={item}
                          onOpenDetail={handleOpenDetail}
                          onOpenApprove={handleOpenApprove}
                          onOpenReject={handleOpenReject}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 text-sm leading-6 text-slate-500">
          ถ้ามีสลิปอัปเดตจะเข้ามาอยู่ในสถานะรอตรวจสอบ • สีเขียว = ตรวจสอบแล้ว
          • สีฟ้า = ยังไม่ชำระ • สีแดง = ค้างชำระ
        </div>
      </section>

      <PaymentDetailModal
        open={detailOpen}
        loading={detailLoading}
        detail={detail}
        onClose={() => {
          setDetailOpen(false);
          setDetail(null);
        }}
      />

      <ApproveModal
        open={approveOpen}
        loading={actionLoading}
        note={approveNote}
        onNoteChange={setApproveNote}
        onClose={() => {
          if (actionLoading) return;
          setApproveOpen(false);
          setSelectedPaymentId(null);
          setApproveNote("");
        }}
        onConfirm={handleConfirmApprove}
      />

      <RejectModal
        open={rejectOpen}
        loading={actionLoading}
        reason={rejectReason}
        onReasonChange={setRejectReason}
        onClose={() => {
          if (actionLoading) return;
          setRejectOpen(false);
          setRejectPaymentId(null);
          setRejectReason("");
        }}
        onConfirm={handleConfirmReject}
      />
    </div>
  );
}