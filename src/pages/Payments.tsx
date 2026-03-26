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

function getInvoiceStatusMeta(status: OwnerPaymentInvoiceStatus) {
  switch (status) {
    case "paid":
      return {
        label: "ตรวจสอบแล้ว",
        chipClass: "bg-emerald-100 text-emerald-700",
        rowClass: "bg-emerald-100/70",
      };
    case "pending_review":
      return {
        label: "รอตรวจสอบ",
        chipClass: "bg-amber-100 text-amber-700",
        rowClass: "bg-amber-50",
      };
    case "overdue":
      return {
        label: "ค้างชำระ",
        chipClass: "bg-rose-100 text-rose-700",
        rowClass: "bg-rose-100/80",
      };
    case "draft":
      return {
        label: "ฉบับร่าง",
        chipClass: "bg-slate-100 text-slate-700",
        rowClass: "bg-slate-50",
      };
    case "cancelled":
      return {
        label: "ยกเลิก",
        chipClass: "bg-slate-200 text-slate-700",
        rowClass: "bg-slate-100",
      };
    case "unpaid":
    default:
      return {
        label: "ยังไม่ชำระ",
        chipClass: "bg-sky-100 text-sky-700",
        rowClass: "bg-sky-50",
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
      <div className="text-2xl font-extrabold">{title}</div>
      <div className="mt-2 text-sm">จำนวนห้องที่อยู่ในสถานะนี้ {count} ห้อง</div>
      <div className="mt-2 text-sm">จำนวนเงินรวม</div>
      <div className="mt-1 text-2xl font-bold">{formatMoney(amount)} บาท</div>
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
      className={`inline-flex h-10 w-10 items-center justify-center rounded-md text-xl transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[28px] bg-[#f7f7f7] p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <div className="text-3xl font-extrabold text-rose-600">
              หลักฐานการโอน
            </div>

            {loading ? (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-16 text-center text-sm text-slate-500">
                กำลังโหลดข้อมูล...
              </div>
            ) : !detail ? (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-16 text-center text-sm text-slate-500">
                ไม่พบรายละเอียดการชำระเงิน
              </div>
            ) : (
              <>
                <div className="mt-6 flex justify-center">
                  {detail.slip_image_url ? (
                    <img
                      src={detail.slip_image_url}
                      alt="payment slip"
                      className="max-h-[560px] rounded-2xl border border-slate-200 bg-white object-contain"
                    />
                  ) : (
                    <div className="flex h-[360px] w-full max-w-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                      ไม่มีรูปสลิป
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600"
                  >
                    ปิด
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <div className="text-3xl font-extrabold text-rose-600">
              รายละเอียดการชำระ
            </div>

            {loading ? (
              <div className="mt-6 text-sm text-slate-500">กำลังโหลด...</div>
            ) : !detail ? (
              <div className="mt-6 text-sm text-slate-500">ไม่พบข้อมูล</div>
            ) : (
              <div className="mt-6 space-y-3 text-sm text-slate-700">
                <div>
                  ห้อง: <b>{detail.room_number}</b>
                </div>
                <div>
                  ตึก: <b>{detail.building_name}</b>
                </div>
                <div>
                  ประเภทห้อง: <b>{detail.room_type}</b>
                </div>
                <div>
                  ผู้เช่า: <b>{detail.tenant_name || "-"}</b>
                </div>
                <div>
                  รอบบิล: <b>{formatMonthLabel(detail.billing_month)}</b>
                </div>
                <div>
                  วันครบกำหนด: <b>{formatDateThai(detail.due_date)}</b>
                </div>
                <div>
                  จำนวนที่โอน: <b>{formatMoney(detail.submitted_amount)} บาท</b>
                </div>
                <div>
                  เวลาที่โอน: <b>{formatDateTimeThai(detail.paid_at)}</b>
                </div>
                <div>
                  ค่าเช่า: <b>{formatMoney(detail.base_rent_amount)} บาท</b>
                </div>
                <div>
                  ค่าน้ำ: <b>{formatMoney(detail.water_amount)} บาท</b>
                </div>
                <div>
                  ค่าไฟ: <b>{formatMoney(detail.electric_amount)} บาท</b>
                </div>
                <div>
                  รวมทั้งหมด: <b>{formatMoney(detail.total_amount)} บาท</b>
                </div>
                <div>
                  อ้างอิง: <b>{detail.reference_no || "-"}</b>
                </div>

                {detail.review_note && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700">
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
  onClose,
  onConfirm,
}: {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-2xl rounded-[28px] bg-white p-8 shadow-lg">
        <div className="text-3xl font-extrabold text-rose-600">
          ยืนยันการตรวจสอบ
        </div>

        <div className="mt-8 text-center text-3xl font-bold text-slate-900">
          คุณได้ตรวจสอบความถูกต้องก่อนกดยืนยันใช่หรือไม่
        </div>

        <div className="mt-10 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl bg-red-500 px-6 py-3 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl bg-green-500 px-6 py-3 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-60"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-2xl rounded-[28px] bg-white p-8 shadow-lg">
        <div className="text-3xl font-extrabold text-rose-600">
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

        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl bg-slate-500 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-600 disabled:opacity-60"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl bg-red-500 px-6 py-3 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
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

  const [items, setItems] = useState<OwnerPaymentListItem[]>([]);
  const [summary, setSummary] = useState({
    paidCount: 0,
    paidAmount: 0,
    pendingCount: 0,
    pendingAmount: 0,
    overdueCount: 0,
    overdueAmount: 0,
  });

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<OwnerPaymentDetail | null>(null);

  const [approveOpen, setApproveOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectPaymentId, setRejectPaymentId] = useState<string | null>(null);

  async function loadPayments() {
    try {
      setLoading(true);
      setError("");

      const data = await getOwnerPayments({
        month: month || undefined,
        status,
        search,
      });

      setItems(data.items || []);
      setSummary(
        data.summary || {
          paidCount: 0,
          paidAmount: 0,
          pendingCount: 0,
          pendingAmount: 0,
          overdueCount: 0,
          overdueAmount: 0,
        }
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, [status, month]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) => {
      return (
        item.room_number.toLowerCase().includes(q) ||
        item.building_name.toLowerCase().includes(q) ||
        item.building_code.toLowerCase().includes(q) ||
        (item.tenant_name || "").toLowerCase().includes(q)
      );
    });
  }, [items, search]);

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

      await approveOwnerPayment(selectedPaymentId);

      setSuccess("ยืนยันการตรวจสอบเรียบร้อยแล้ว");
      setApproveOpen(false);
      setSelectedPaymentId(null);

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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

      <section className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="text-4xl font-extrabold text-slate-900">รายการบิล</div>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาห้อง/ค้นหาตึก"
              className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-rose-400"
            />

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-rose-400"
            >
              <option value="all">ทั้งหมด</option>
              <option value="pending_review">รอตรวจสอบ</option>
              <option value="paid">จ่ายแล้ว</option>
              <option value="overdue">ค้างชำระ</option>
              <option value="unpaid">ยังไม่ชำระ</option>
            </select>
          </div>

          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-rose-400"
          />
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full table-fixed overflow-hidden rounded-2xl">
            <colgroup>
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
            </colgroup>

            <thead>
              <tr className="bg-rose-100 text-left text-sm font-semibold text-slate-700">
                <th className="px-4 py-4">ตึก</th>
                <th className="px-4 py-4">ห้อง</th>
                <th className="px-4 py-4">ประเภทห้อง</th>
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
                    colSpan={9}
                    className="bg-white px-4 py-10 text-center text-sm text-slate-500"
                  >
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="bg-white px-4 py-10 text-center text-sm text-slate-500"
                  >
                    ไม่พบรายการชำระเงิน
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const meta = getInvoiceStatusMeta(item.invoice_status);
                  const canApprove =
                    item.payment_id &&
                    item.invoice_status === "pending_review" &&
                    item.payment_status === "submitted";

                  const canReject =
                    item.payment_id &&
                    item.invoice_status === "pending_review" &&
                    item.payment_status === "submitted";

                  return (
                    <tr
                      key={`${item.invoice_id}-${item.payment_id || "no-payment"}`}
                      className={`border-t border-white/60 text-sm text-slate-800 ${meta.rowClass}`}
                    >
                      <td className="px-4 py-4 font-semibold">
                        <div className="truncate">
                          {item.building_name || item.building_code || "-"}
                        </div>
                      </td>

                      <td className="px-4 py-4 font-semibold">
                        <div className="truncate">{item.room_number}</div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="truncate">{item.room_type}</div>
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
                        <div className="flex items-center justify-center gap-2">
                          <ActionIconButton
                            title="ดูหลักฐานการโอน"
                            onClick={() => handleOpenDetail(item.payment_id)}
                            disabled={!item.payment_id}
                            className="bg-black text-white"
                          >
                            ≡
                          </ActionIconButton>

                          <ActionIconButton
                            title="ยืนยันการตรวจสอบ"
                            onClick={() => handleOpenApprove(item.payment_id)}
                            disabled={!canApprove}
                            className="bg-green-600 text-white"
                          >
                            ✓
                          </ActionIconButton>

                          <ActionIconButton
                            title="ตีกลับรายการ"
                            onClick={() => handleOpenReject(item.payment_id)}
                            disabled={!canReject}
                            className="bg-red-500 text-white"
                          >
                            ↺
                          </ActionIconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 text-sm text-slate-500">
          ถ้ามีสลิปอัปเดตจะเข้ามาอยู่ในสถานะรอตรวจสอบ • สีเขียว = ตรวจสอบแล้ว
          • สีแดง = ค้างชำระ
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
        onClose={() => {
          if (actionLoading) return;
          setApproveOpen(false);
          setSelectedPaymentId(null);
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