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

function HistoryCard({ item }: { item: TenantBillingHistoryItem }) {
  const invoiceMeta = getInvoiceStatusMeta(item.invoice_status);
  const paymentMeta = getPaymentStatusMeta(item.latest_payment?.payment_status);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-lg font-bold text-slate-900">
            บิลเดือน {formatMonthThai(item.billing_month)}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            ห้อง {item.room_number} • {item.building_name}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusBadge
            label={invoiceMeta.label}
            className={invoiceMeta.className}
          />
          <StatusBadge
            label={paymentMeta.label}
            className={paymentMeta.className}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <div>
          ครบกำหนด: <b>{formatDateThai(item.due_date)}</b>
        </div>
        <div>
          ยอดรวม: <b>{formatMoney(item.total_amount)} บาท</b>
        </div>
        <div>
          ค่าเช่า: <b>{formatMoney(item.base_rent_amount)} บาท</b>
        </div>
        <div>
          ค่าน้ำ + ค่าไฟ:{" "}
          <b>
            {formatMoney(
              Number(item.water_amount || 0) + Number(item.electric_amount || 0)
            )}{" "}
            บาท
          </b>
        </div>
      </div>

      {item.latest_payment && (
        <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm">
          <div className="font-semibold text-slate-800">ข้อมูลการชำระล่าสุด</div>
          <div className="mt-2 grid gap-2 text-slate-600 sm:grid-cols-2">
            <div>
              จำนวนเงิน: <b>{formatMoney(item.latest_payment.submitted_amount)} บาท</b>
            </div>
            <div>
              เวลาชำระ: <b>{formatDateTimeThai(item.latest_payment.paid_at)}</b>
            </div>
            <div>
              อัปเดตล่าสุด:{" "}
              <b>{formatDateTimeThai(item.latest_payment.updated_at)}</b>
            </div>
            <div>
              อ้างอิง: <b>{item.latest_payment.reference_no || "-"}</b>
            </div>
          </div>

          {item.latest_payment.review_note && (
            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
              หมายเหตุ: {item.latest_payment.review_note}
            </div>
          )}

          {item.latest_payment.slip_image_url && (
            <a
              href={item.latest_payment.slip_image_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex text-sm font-semibold text-rose-600 hover:text-rose-700"
            >
              ดูหลักฐานการโอน
            </a>
          )}
        </div>
      )}
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
    if (!currentInvoice) {
      setSubmittedAmount("");
      return;
    }

    setSubmittedAmount(String(Number(currentInvoice.total_amount || 0)));
    setReferenceNo("");
    setPaidAt(getNowLocalDateTimeInputValue());
    setSelectedSlipFile(null);
    setSlipPreviewUrl("");
  }, [currentInvoice?.invoice_id]);

  useEffect(() => {
    return () => {
      if (slipPreviewUrl) {
        URL.revokeObjectURL(slipPreviewUrl);
      }
    };
  }, [slipPreviewUrl]);

  const currentInvoiceStatusMeta = currentInvoice
    ? getInvoiceStatusMeta(currentInvoice.invoice_status)
    : null;

  const latestPaymentStatusMeta = currentInvoice
    ? getPaymentStatusMeta(currentInvoice.latest_payment?.payment_status)
    : null;

  const canSubmitPayment = useMemo(() => {
    if (!currentInvoice) return false;
    if (!["unpaid", "overdue"].includes(currentInvoice.invoice_status)) return false;

    const latestStatus = currentInvoice.latest_payment?.payment_status;
    if (latestStatus === "submitted" || latestStatus === "approved") {
      return false;
    }

    return true;
  }, [currentInvoice]);

  const utilityAmount = useMemo(() => {
    if (!currentInvoice) return 0;
    return (
      Number(currentInvoice.water_amount || 0) +
      Number(currentInvoice.electric_amount || 0)
    );
  }, [currentInvoice]);

  const resolvedDormId = useMemo(() => {
    if (storedUser?.dorm_id) return storedUser.dorm_id;

    if (
      currentInvoice &&
      "dorm_id" in currentInvoice &&
      typeof (currentInvoice as TenantCurrentInvoice & { dorm_id?: string | null })
        .dorm_id !== "undefined"
    ) {
      return (
        (currentInvoice as TenantCurrentInvoice & { dorm_id?: string | null })
          .dorm_id || null
      );
    }

    return null;
  }, [storedUser?.dorm_id, currentInvoice]);

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

      if (!currentInvoice) {
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
        currentInvoice.invoice_id,
        selectedSlipFile
      );

      await submitTenantPayment({
        invoice_id: currentInvoice.invoice_id,
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
          ดูยอดชำระปัจจุบัน อัปโหลดสลิป และติดตามสถานะการตรวจสอบได้ที่นี่
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
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-lg font-bold text-slate-900">
                    บิลปัจจุบัน
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {currentInvoice
                      ? `บิลเดือน ${formatMonthThai(currentInvoice.billing_month)}`
                      : "ยังไม่มีบิลปัจจุบัน"}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {currentInvoiceStatusMeta && (
                    <StatusBadge
                      label={currentInvoiceStatusMeta.label}
                      className={currentInvoiceStatusMeta.className}
                    />
                  )}
                  {latestPaymentStatusMeta && currentInvoice && (
                    <StatusBadge
                      label={latestPaymentStatusMeta.label}
                      className={latestPaymentStatusMeta.className}
                    />
                  )}
                </div>
              </div>

              {!currentInvoice ? (
                <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
                  ยังไม่มีบิลสำหรับชำระในขณะนี้
                </div>
              ) : (
                <>
                  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <div className="text-sm text-slate-500">ห้อง</div>
                      <div className="mt-1 text-xl font-bold text-slate-900">
                        {currentInvoice.room_number}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {currentInvoice.building_name} • ชั้น {currentInvoice.floor_no}
                      </div>
                    </div>

                    <div className="rounded-3xl bg-rose-50 p-4">
                      <div className="text-sm text-rose-500">ยอดที่ต้องชำระ</div>
                      <div className="mt-1 text-3xl font-extrabold text-rose-600">
                        {formatMoney(currentInvoice.total_amount)}
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
                        value={`${formatMoney(currentInvoice.base_rent_amount)} บาท`}
                      />
                      <SummaryRow
                        label="ค่าน้ำ"
                        value={`${formatMoney(currentInvoice.water_amount)} บาท`}
                      />
                      <SummaryRow
                        label="ค่าไฟ"
                        value={`${formatMoney(currentInvoice.electric_amount)} บาท`}
                      />
                      <SummaryRow
                        label="รวมค่าน้ำ + ค่าไฟ"
                        value={`${formatMoney(utilityAmount)} บาท`}
                      />
                      <SummaryRow
                        label="ค่าอื่น ๆ"
                        value={`${formatMoney(currentInvoice.other_amount)} บาท`}
                      />
                      <SummaryRow
                        label="ส่วนลด"
                        value={`${formatMoney(currentInvoice.discount_amount)} บาท`}
                      />
                      <div className="border-t border-slate-200 pt-3">
                        <SummaryRow
                          label="ครบกำหนดชำระ"
                          value={formatDateThai(currentInvoice.due_date)}
                          valueClassName={
                            currentInvoice.invoice_status === "overdue"
                              ? "text-rose-600"
                              : "text-slate-900"
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {currentInvoice.latest_payment && (
                    <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-4">
                      <div className="text-base font-bold text-amber-800">
                        รายการชำระล่าสุด
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-amber-900 sm:grid-cols-2">
                        <div>
                          จำนวนเงิน:{" "}
                          <b>
                            {formatMoney(currentInvoice.latest_payment.submitted_amount)}{" "}
                            บาท
                          </b>
                        </div>
                        <div>
                          เวลาชำระ:{" "}
                          <b>{formatDateTimeThai(currentInvoice.latest_payment.paid_at)}</b>
                        </div>
                        <div>
                          สถานะ:{" "}
                          <b>
                            {
                              getPaymentStatusMeta(
                                currentInvoice.latest_payment.payment_status
                              ).label
                            }
                          </b>
                        </div>
                        <div>
                          อ้างอิง: <b>{currentInvoice.latest_payment.reference_no || "-"}</b>
                        </div>
                      </div>

                      {currentInvoice.latest_payment.review_note && (
                        <div className="mt-3 rounded-2xl border border-amber-300 bg-white/70 px-3 py-2 text-sm text-amber-800">
                          หมายเหตุจากเจ้าของหอ:{" "}
                          {currentInvoice.latest_payment.review_note}
                        </div>
                      )}

                      {currentInvoice.latest_payment.slip_image_url && (
                        <a
                          href={currentInvoice.latest_payment.slip_image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex text-sm font-semibold text-rose-600 hover:text-rose-700"
                        >
                          ดูหลักฐานการโอนล่าสุด
                        </a>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>

            <aside className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <div className="text-lg font-bold text-slate-900">ชำระเงิน</div>
              <div className="mt-1 text-sm text-slate-500">
                อัปโหลดสลิปเพื่อส่งให้เจ้าของหอตรวจสอบ
              </div>

              {!currentInvoice ? (
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
                        ธนาคาร: <b>{currentInvoice.payment_bank_name || "-"}</b>
                      </div>
                      <div>
                        ชื่อบัญชี: <b>{currentInvoice.payment_account_name || "-"}</b>
                      </div>
                      <div>
                        เลขบัญชี: <b>{currentInvoice.payment_account_number || "-"}</b>
                      </div>
                      <div>
                        พร้อมเพย์: <b>{currentInvoice.payment_promptpay_id || "-"}</b>
                      </div>

                      {currentInvoice.payment_qr_image_url ? (
                        <div className="pt-2">
                          <div className="mb-2 text-sm font-medium text-slate-700">
                            QR ชำระเงิน
                          </div>
                          <img
                            src={currentInvoice.payment_qr_image_url}
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

                    {!canSubmitPayment && currentInvoice && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                        {currentInvoice.invoice_status === "pending_review"
                          ? "บิลนี้ส่งสลิปแล้ว กำลังรอเจ้าของหอตรวจสอบ"
                          : currentInvoice.latest_payment?.payment_status === "approved"
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
                      {submitting ? "กำลังส่งหลักฐาน..." : "ยืนยันการชำระเงิน"}
                    </button>
                  </div>
                </>
              )}
            </aside>
          </div>

          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-slate-900">
                  ประวัติการชำระเงิน
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  รายการย้อนหลังทั้งหมดของผู้เช่า
                </div>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
                ยังไม่มีประวัติการชำระเงิน
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-4">
                {history.map((item) => (
                  <HistoryCard key={item.invoice_id} item={item} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}