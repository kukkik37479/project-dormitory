import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import dashboardService, {
  type ArrearsReportItem,
  type DashboardOverviewResponse,
  type ExpiringContractItem,
  type InvoiceReportItem,
  type MonthlyRevenueSummaryItem,
  type PaymentReportItem,
  type PaymentStatusResponse,
  type RevenueTrendItem,
  type UtilityUsageTrendItem,
} from "../service/dashboard.service";

type ReportType =
  | "invoices"
  | "payments"
  | "arrears"
  | "revenue_summary";
type TabType = "overview" | "excel";

function getCurrentMonthValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH").format(value || 0);
}

function formatMonthLabel(value: string) {
  if (!value) return "-";

  const [year, month] = value.slice(0, 7).split("-");
  const monthNames = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];

  const monthIndex = Number(month) - 1;
  if (monthIndex < 0 || monthIndex > 11) return value;

  return `${monthNames[monthIndex]} ${year}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusText(status: string) {
  const map: Record<string, string> = {
    paid: "ชำระแล้ว",
    pending_review: "รอตรวจสอบ",
    unpaid: "ยังไม่ชำระ",
    overdue: "ค้างชำระ",
    cancelled: "ยกเลิก",
    draft: "ฉบับร่าง",
    approved: "อนุมัติแล้ว",
    submitted: "ส่งตรวจสอบ",
    rejected: "ตีกลับ",
    outstanding: "ค้างชำระ",
  };

  return map[status] || status;
}

function getStatusClass(status: string) {
  const map: Record<string, string> = {
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending_review: "bg-amber-50 text-amber-700 border-amber-200",
    submitted: "bg-amber-50 text-amber-700 border-amber-200",
    overdue: "bg-rose-50 text-rose-700 border-rose-200",
    rejected: "bg-rose-50 text-rose-700 border-rose-200",
    unpaid: "bg-orange-50 text-orange-700 border-orange-200",
    outstanding: "bg-orange-50 text-orange-700 border-orange-200",
    cancelled: "bg-slate-100 text-slate-600 border-slate-200",
    draft: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return map[status] || "bg-slate-100 text-slate-700 border-slate-200";
}

function getPaymentMethodText(method: string) {
  const map: Record<string, string> = {
    transfer: "โอนเงิน",
    cash: "เงินสด",
    qr: "QR",
  };
  return map[method] || method;
}

function StatCard({
  title,
  value,
  subtitle,
  tone = "default",
}: {
  title: string;
  value: string;
  subtitle?: string;
  tone?: "default" | "rose" | "emerald" | "amber";
}) {
  const toneClass =
    tone === "rose"
      ? "bg-rose-50 border-rose-100"
      : tone === "emerald"
      ? "bg-emerald-50 border-emerald-100"
      : tone === "amber"
      ? "bg-amber-50 border-amber-100"
      : "bg-white border-rose-100";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
    </div>
  );
}

function LoadingBlock({ text = "กำลังโหลด..." }: { text?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
      {text}
    </div>
  );
}

function EmptyChart({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      <div className="mt-6 flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
        ยังไม่มีข้อมูลเพียงพอสำหรับแสดงกราฟ
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusClass(
        status
      )}`}
    >
      {getStatusText(status)}
    </span>
  );
}

function ExportButton({
  rows,
  filename,
  sheetName = "Report",
}: {
  rows: Record<string, unknown>[];
  filename: string;
  sheetName?: string;
}) {
  const handleExport = () => {
    if (!rows.length) return;

    const worksheet = XLSX.utils.json_to_sheet(rows);

    const headers = Object.keys(rows[0] || {});
    worksheet["!cols"] = headers.map((header) => {
      const headerLength = String(header).length;
      const maxCellLength = Math.max(
        headerLength,
        ...rows.map((row) => String(row[header] ?? "").length)
      );

      return {
        wch: Math.min(Math.max(maxCellLength + 2, 12), 28),
      };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, filename);
  };

  return (
    <button
      onClick={handleExport}
      disabled={!rows.length}
      className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      Export Excel
    </button>
  );
}

function RevenueTrendChart({ rows }: { rows: RevenueTrendItem[] }) {
  const hasData = rows.some(
    (row) => row.billedAmount > 0 || row.approvedPaymentAmount > 0
  );

  if (!hasData) {
    return (
      <EmptyChart
        title="แนวโน้มรายรับ 6 เดือน"
        subtitle="เปรียบเทียบยอดออกบิลกับยอดรับเงินจริง"
      />
    );
  }

  const width = 760;
  const height = 320;
  const left = 58;
  const right = 18;
  const top = 18;
  const bottom = 56;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(
    ...rows.flatMap((row) => [row.billedAmount, row.approvedPaymentAmount]),
    1
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900">แนวโน้มรายรับ 6 เดือน</h3>
        <p className="mt-1 text-sm text-slate-500">
          เปรียบเทียบยอดออกบิลกับยอดรับเงินจริง
        </p>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[320px] w-full">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const y = top + plotHeight - plotHeight * ratio;
            const value = Math.round(maxValue * ratio);

            return (
              <g key={index}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={y}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                />
                <text
                  x={left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#94A3B8"
                >
                  {formatNumber(value)}
                </text>
              </g>
            );
          })}

          {rows.map((row, index) => {
            const groupWidth = plotWidth / rows.length;
            const x = left + index * groupWidth;
            const centerX = x + groupWidth / 2;
            const barWidth = Math.min(26, groupWidth * 0.24);

            const billedHeight = (row.billedAmount / maxValue) * plotHeight;
            const approvedHeight =
              (row.approvedPaymentAmount / maxValue) * plotHeight;

            const billedY = top + plotHeight - billedHeight;
            const approvedY = top + plotHeight - approvedHeight;

            return (
              <g key={row.month}>
                <rect
                  x={centerX - barWidth - 4}
                  y={billedY}
                  width={barWidth}
                  height={Math.max(billedHeight, 2)}
                  rx={8}
                  fill="#FB7185"
                  opacity="0.95"
                />
                <rect
                  x={centerX + 4}
                  y={approvedY}
                  width={barWidth}
                  height={Math.max(approvedHeight, 2)}
                  rx={8}
                  fill="#94A3B8"
                  opacity="0.95"
                />

                {row.billedAmount > 0 ? (
                  <text
                    x={centerX - barWidth / 2 - 4}
                    y={billedY - 8}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#64748B"
                  >
                    {formatNumber(row.billedAmount)}
                  </text>
                ) : null}

                {row.approvedPaymentAmount > 0 ? (
                  <text
                    x={centerX + barWidth / 2 + 4}
                    y={approvedY - 8}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#64748B"
                  >
                    {formatNumber(row.approvedPaymentAmount)}
                  </text>
                ) : null}

                <text
                  x={centerX}
                  y={height - 22}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#64748B"
                >
                  {formatMonthLabel(row.month)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-rose-400" />
          ยอดออกบิล
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-slate-400" />
          รับเงินจริง
        </div>
      </div>
    </div>
  );
}

function UtilityUsageChart({ rows }: { rows: UtilityUsageTrendItem[] }) {
  const hasData = rows.some(
    (row) => row.totalWaterUnits > 0 || row.totalElectricUnits > 0
  );

  if (!hasData) {
    return (
      <EmptyChart
        title="แนวโน้มการใช้น้ำและไฟ"
        subtitle="ดูการใช้งานรวมของหอพักในแต่ละเดือน"
      />
    );
  }

  const width = 760;
  const height = 320;
  const left = 44;
  const right = 18;
  const top = 18;
  const bottom = 56;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(
    ...rows.flatMap((row) => [row.totalWaterUnits, row.totalElectricUnits]),
    1
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900">แนวโน้มการใช้น้ำและไฟ</h3>
        <p className="mt-1 text-sm text-slate-500">
          แสดงหน่วยการใช้น้ำและไฟรวมของหอพักในแต่ละเดือน
        </p>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[320px] w-full">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const y = top + plotHeight - plotHeight * ratio;
            const value = Math.round(maxValue * ratio);

            return (
              <g key={index}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={y}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                />
                <text
                  x={left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#94A3B8"
                >
                  {formatNumber(value)}
                </text>
              </g>
            );
          })}

          {rows.map((row, index) => {
            const groupWidth = plotWidth / rows.length;
            const x = left + index * groupWidth;
            const centerX = x + groupWidth / 2;
            const barWidth = Math.min(24, groupWidth * 0.22);

            const waterHeight = (row.totalWaterUnits / maxValue) * plotHeight;
            const electricHeight = (row.totalElectricUnits / maxValue) * plotHeight;

            const waterY = top + plotHeight - waterHeight;
            const electricY = top + plotHeight - electricHeight;

            return (
              <g key={row.month}>
                <rect
                  x={centerX - barWidth - 4}
                  y={waterY}
                  width={barWidth}
                  height={Math.max(waterHeight, 2)}
                  rx={8}
                  fill="#38BDF8"
                />
                <rect
                  x={centerX + 4}
                  y={electricY}
                  width={barWidth}
                  height={Math.max(electricHeight, 2)}
                  rx={8}
                  fill="#F59E0B"
                />
                <text
                  x={centerX}
                  y={height - 22}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#64748B"
                >
                  {formatMonthLabel(row.month)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-sky-400" />
          หน่วยน้ำรวม
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-amber-500" />
          หน่วยไฟรวม
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-sky-50 px-4 py-3">
          <p className="text-xs text-sky-700">หน่วยน้ำเฉลี่ยล่าสุด</p>
          <p className="mt-1 text-lg font-bold text-sky-800">
            {formatNumber(rows[rows.length - 1]?.avgWaterUnits || 0)}
          </p>
        </div>
        <div className="rounded-xl bg-amber-50 px-4 py-3">
          <p className="text-xs text-amber-700">หน่วยไฟเฉลี่ยล่าสุด</p>
          <p className="mt-1 text-lg font-bold text-amber-800">
            {formatNumber(rows[rows.length - 1]?.avgElectricUnits || 0)}
          </p>
        </div>
      </div>
    </div>
  );
}

function PaymentStatusCard({ data }: { data: PaymentStatusResponse | null }) {
  if (!data) {
    return <LoadingBlock text="กำลังโหลดสถานะบิลของเดือน..." />;
  }

  const paid = data.items.find((item) => item.key === "paid");
  const pending = data.items.find((item) => item.key === "pending_review");
  const outstanding = data.items.find((item) => item.key === "outstanding");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900">สถานะบิลของเดือน</h3>
        <p className="mt-1 text-sm text-slate-500">
          ดูสัดส่วนชำระแล้ว รอตรวจสอบ และค้างชำระของเดือนนี้
        </p>
      </div>

      <div className="h-4 overflow-hidden rounded-full bg-slate-100">
        <div className="flex h-full w-full">
          {data.items.map((item) => {
            const color =
              item.key === "paid"
                ? "bg-emerald-500"
                : item.key === "pending_review"
                ? "bg-amber-500"
                : "bg-rose-500";

            return (
              <div
                key={item.key}
                className={color}
                style={{ width: `${item.percent}%` }}
                title={`${item.label} ${item.percent}%`}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {data.items.map((item) => {
          const dotColor =
            item.key === "paid"
              ? "bg-emerald-500"
              : item.key === "pending_review"
              ? "bg-amber-500"
              : "bg-rose-500";

          return (
            <div
              key={item.key}
              className="grid grid-cols-[1fr,100px,120px] items-center gap-3 rounded-xl border border-slate-200 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${dotColor}`} />
                <span className="text-sm font-medium text-slate-700">
                  {item.label}
                </span>
              </div>
              <div className="text-right text-sm text-slate-600">
                {formatNumber(item.count)} รายการ
              </div>
              <div className="text-right text-sm font-semibold text-slate-900">
                {formatCurrency(item.amount)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-emerald-50 px-4 py-3">
          <p className="text-xs text-emerald-700">ชำระแล้ว</p>
          <p className="mt-1 text-lg font-bold text-emerald-800">
            {formatCurrency(paid?.amount || 0)}
          </p>
        </div>
        <div className="rounded-xl bg-amber-50 px-4 py-3">
          <p className="text-xs text-amber-700">รอตรวจสอบ</p>
          <p className="mt-1 text-lg font-bold text-amber-800">
            {formatCurrency(pending?.amount || 0)}
          </p>
        </div>
        <div className="rounded-xl bg-rose-50 px-4 py-3">
          <p className="text-xs text-rose-700">ค้างชำระ</p>
          <p className="mt-1 text-lg font-bold text-rose-800">
            {formatCurrency(outstanding?.amount || 0)}
          </p>
        </div>
      </div>
    </div>
  );
}

function AlertsPanel({
  overview,
  expiringContracts,
}: {
  overview: DashboardOverviewResponse | null;
  expiringContracts: ExpiringContractItem[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-900">สิ่งที่ต้องติดตาม</h2>
        <p className="mt-1 text-sm text-slate-500">
          งานสำคัญที่เจ้าของหอควรตรวจสอบในรอบนี้
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">บิลรอตรวจสอบ</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {formatNumber(overview?.alerts.pendingReviewInvoices || 0)}
          </p>
          <p className="mt-1 text-sm text-slate-500">ใบแจ้งหนี้</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">รายการชำระรอตรวจ</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {formatNumber(overview?.alerts.submittedPayments || 0)}
          </p>
          <p className="mt-1 text-sm text-slate-500">รายการ</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">บิลค้างชำระ</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {formatNumber(overview?.alerts.overdueInvoices || 0)}
          </p>
          <p className="mt-1 text-sm text-slate-500">ใบแจ้งหนี้</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">สัญญาใกล้หมด</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {formatNumber(overview?.alerts.expiringContracts || 0)}
          </p>
          <p className="mt-1 text-sm text-slate-500">ภายใน 30 วัน</p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h3 className="font-semibold text-slate-900">สัญญาใกล้หมด</h3>
        </div>

        <div className="max-h-72 overflow-auto">
          {expiringContracts.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">
              ยังไม่มีสัญญาที่ใกล้หมดในช่วงนี้
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-white text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">ห้อง</th>
                  <th className="px-4 py-3 font-medium">ผู้เช่า</th>
                  <th className="px-4 py-3 font-medium">วันสิ้นสุด</th>
                  <th className="px-4 py-3 font-medium">เหลือ</th>
                  <th className="px-4 py-3 font-medium">ค่าเช่า</th>
                </tr>
              </thead>
              <tbody>
                {expiringContracts.map((item) => (
                  <tr key={item.contractId} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      {item.buildingName} / {item.roomNumber}
                    </td>
                    <td className="px-4 py-3">{item.tenantName}</td>
                    <td className="px-4 py-3">{formatDate(item.endDate)}</td>
                    <td className="px-4 py-3">
                      {formatNumber(item.daysRemaining)} วัน
                    </td>
                    <td className="px-4 py-3">{formatCurrency(item.rentAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function BuildingSummaryCard({
  overview,
}: {
  overview: DashboardOverviewResponse | null;
}) {
  const buildings = overview?.buildings || [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900">สรุประดับตึก</h3>
        <p className="mt-1 text-sm text-slate-500">
          ดูจำนวนห้องและอัตราการเข้าพักแยกตามตึก
        </p>
      </div>

      <div className="space-y-4">
        {buildings.map((item) => (
          <div key={item.buildingId} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-slate-900">{item.buildingName}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatNumber(item.occupiedRooms)}/{formatNumber(item.totalRooms)} ห้องมีผู้เช่า
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900">
                  {formatNumber(item.occupancyRate)}%
                </p>
                <p className="text-xs text-slate-500">อัตราเข้าพัก</p>
              </div>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-rose-400"
                style={{ width: `${item.occupancyRate}%` }}
              />
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2 text-xs text-slate-500">
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                ทั้งหมด {formatNumber(item.totalRooms)}
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                ว่าง {formatNumber(item.vacantRooms)}
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                ซ่อม {formatNumber(item.maintenanceRooms)}
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                จอง {formatNumber(item.reservedRooms)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportSummaryCards({
  reportType,
  invoiceRows,
  paymentRows,
  arrearsRows,
  revenueSummaryRows,
}: {
  reportType: ReportType;
  invoiceRows: InvoiceReportItem[];
  paymentRows: PaymentReportItem[];
  arrearsRows: ArrearsReportItem[];
  revenueSummaryRows: MonthlyRevenueSummaryItem[];
}) {
  const summary = useMemo(() => {
    if (reportType === "payments") {
      const totalSubmitted = paymentRows.reduce(
        (sum, row) => sum + row.submittedAmount,
        0
      );
      const approvedCount = paymentRows.filter(
        (row) => row.paymentStatus === "approved"
      ).length;
      const submittedCount = paymentRows.filter(
        (row) => row.paymentStatus === "submitted"
      ).length;
      const rejectedCount = paymentRows.filter(
        (row) => row.paymentStatus === "rejected"
      ).length;

      return {
        totalRows: paymentRows.length,
        totalAmount: totalSubmitted,
        secondLabel: "อนุมัติแล้ว",
        secondValue: formatNumber(approvedCount),
        thirdLabel: "รอตรวจสอบ",
        thirdValue: formatNumber(submittedCount),
        fourthLabel: "ตีกลับ",
        fourthValue: formatNumber(rejectedCount),
      };
    }

    if (reportType === "arrears") {
      const totalAmount = arrearsRows.reduce((sum, row) => sum + row.totalAmount, 0);
      const overdueCount = arrearsRows.filter(
        (row) => row.invoiceStatus === "overdue"
      ).length;
      const unpaidCount = arrearsRows.filter(
        (row) => row.invoiceStatus === "unpaid"
      ).length;
      const maxDays = arrearsRows.reduce(
        (max, row) => Math.max(max, row.daysOverdue),
        0
      );

      return {
        totalRows: arrearsRows.length,
        totalAmount,
        secondLabel: "ค้างชำระจริง",
        secondValue: formatNumber(overdueCount),
        thirdLabel: "ยังไม่ชำระ",
        thirdValue: formatNumber(unpaidCount),
        fourthLabel: "ค้างสูงสุด",
        fourthValue: `${formatNumber(maxDays)} วัน`,
      };
    }

    if (reportType === "revenue_summary") {
      const totalBilled = revenueSummaryRows.reduce(
        (sum, row) => sum + row.totalBilledAmount,
        0
      );
      const totalApproved = revenueSummaryRows.reduce(
        (sum, row) => sum + row.approvedPaymentAmount,
        0
      );
      const totalPending = revenueSummaryRows.reduce(
        (sum, row) => sum + row.pendingReviewAmount,
        0
      );
      const avgCollectionRate =
        revenueSummaryRows.length > 0
          ? revenueSummaryRows.reduce((sum, row) => sum + row.collectionRate, 0) /
            revenueSummaryRows.length
          : 0;

      return {
        totalRows: revenueSummaryRows.length,
        totalAmount: totalBilled,
        secondLabel: "รับเงินจริงรวม",
        secondValue: formatCurrency(totalApproved),
        thirdLabel: "รอตรวจสอบรวม",
        thirdValue: formatCurrency(totalPending),
        fourthLabel: "Collection Rate เฉลี่ย",
        fourthValue: `${formatNumber(Number(avgCollectionRate.toFixed(2)))}%`,
      };
    }

    const totalAmount = invoiceRows.reduce((sum, row) => sum + row.totalAmount, 0);
    const paidCount = invoiceRows.filter((row) => row.invoiceStatus === "paid").length;
    const pendingCount = invoiceRows.filter(
      (row) => row.invoiceStatus === "pending_review"
    ).length;
    const overdueCount = invoiceRows.filter((row) =>
      ["unpaid", "overdue"].includes(row.invoiceStatus)
    ).length;

    return {
      totalRows: invoiceRows.length,
      totalAmount,
      secondLabel: "ชำระแล้ว",
      secondValue: formatNumber(paidCount),
      thirdLabel: "รอตรวจสอบ",
      thirdValue: formatNumber(pendingCount),
      fourthLabel: "ค้างชำระ",
      fourthValue: formatNumber(overdueCount),
    };
  }, [reportType, invoiceRows, paymentRows, arrearsRows, revenueSummaryRows]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="จำนวนรายการ"
        value={formatNumber(summary.totalRows)}
        subtitle="รายการทั้งหมดในรายงาน"
      />
      <StatCard
        title="ยอดรวม"
        value={formatCurrency(summary.totalAmount)}
        subtitle="คำนวณจากข้อมูลที่กรองอยู่"
        tone="emerald"
      />
      <StatCard
        title={summary.secondLabel}
        value={summary.secondValue}
        subtitle="สรุปจากประเภทที่เลือก"
      />
      <StatCard
        title={summary.fourthLabel}
        value={summary.fourthValue}
        subtitle={summary.thirdLabel}
      />
    </div>
  );
}

export default function Overview() {
  const [tab, setTab] = useState<TabType>("overview");
  const [month, setMonth] = useState(getCurrentMonthValue());

  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendItem[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusResponse | null>(
    null
  );
  const [utilityUsageTrend, setUtilityUsageTrend] = useState<
    UtilityUsageTrendItem[]
  >([]);
  const [expiringContracts, setExpiringContracts] = useState<ExpiringContractItem[]>(
    []
  );

  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");

  const [reportType, setReportType] = useState<ReportType>("invoices");
  const [buildingId, setBuildingId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [invoiceRows, setInvoiceRows] = useState<InvoiceReportItem[]>([]);
  const [paymentRows, setPaymentRows] = useState<PaymentReportItem[]>([]);
  const [arrearsRows, setArrearsRows] = useState<ArrearsReportItem[]>([]);
  const [revenueSummaryRows, setRevenueSummaryRows] = useState<
    MonthlyRevenueSummaryItem[]
  >([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");

  const buildingOptions = overview?.buildings || [];

  const isRevenueSummaryReport = reportType === "revenue_summary";
  const isArrearsReport = reportType === "arrears";

  const loadOverviewData = useCallback(async () => {
    try {
      setOverviewLoading(true);
      setOverviewError("");

      const [
        overviewRes,
        revenueRes,
        paymentStatusRes,
        utilityUsageRes,
        expiringContractsRes,
      ] = await Promise.all([
        dashboardService.getOverview({ month }),
        dashboardService.getRevenueTrend({ months: 6 }),
        dashboardService.getPaymentStatus({ month }),
        dashboardService.getUtilityUsageTrend({ months: 6 }),
        dashboardService.getExpiringContracts({ days: 30 }),
      ]);

      setOverview(overviewRes);
      setRevenueTrend(revenueRes);
      setPaymentStatus(paymentStatusRes);
      setUtilityUsageTrend(utilityUsageRes);
      setExpiringContracts(expiringContractsRes);
    } catch (error) {
      setOverviewError(
        error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลภาพรวมได้"
      );
    } finally {
      setOverviewLoading(false);
    }
  }, [month]);

  const loadReportData = useCallback(async () => {
    try {
      setReportLoading(true);
      setReportError("");

      if (reportType === "invoices") {
        const rows = await dashboardService.getInvoiceReport({
          month,
          buildingId: buildingId || undefined,
          status: statusFilter,
        });
        setInvoiceRows(rows);
        return;
      }

      if (reportType === "payments") {
        const rows = await dashboardService.getPaymentReport({
          month,
          buildingId: buildingId || undefined,
          status: statusFilter,
        });
        setPaymentRows(rows);
        return;
      }

      if (reportType === "arrears") {
        const rows = await dashboardService.getArrearsReport({
          month,
          buildingId: buildingId || undefined,
        });
        setArrearsRows(rows);
        return;
      }

      const rows = await dashboardService.getMonthlyRevenueSummaryReport({
        months: 6,
      });
      setRevenueSummaryRows(rows);
    } catch (error) {
      setReportError(
        error instanceof Error ? error.message : "ไม่สามารถโหลดรายงานได้"
      );
    } finally {
      setReportLoading(false);
    }
  }, [reportType, month, buildingId, statusFilter]);

  useEffect(() => {
    loadOverviewData();
  }, [loadOverviewData]);

  useEffect(() => {
    if (tab === "excel") {
      loadReportData();
    }
  }, [tab, loadReportData]);

  useEffect(() => {
    if (reportType === "arrears" || reportType === "revenue_summary") {
      setStatusFilter("all");
    }
  }, [reportType]);

  const reportStatusOptions = useMemo(() => {
    if (reportType === "payments") {
      return [
        { value: "all", label: "ทั้งหมด" },
        { value: "submitted", label: "ส่งตรวจสอบ" },
        { value: "approved", label: "อนุมัติแล้ว" },
        { value: "rejected", label: "ตีกลับ" },
      ];
    }

    if (reportType === "arrears" || reportType === "revenue_summary") {
      return [{ value: "all", label: "ทั้งหมด" }];
    }

    return [
      { value: "all", label: "ทั้งหมด" },
      { value: "paid", label: "ชำระแล้ว" },
      { value: "pending_review", label: "รอตรวจสอบ" },
      { value: "unpaid", label: "ยังไม่ชำระ" },
      { value: "overdue", label: "ค้างชำระ" },
      { value: "cancelled", label: "ยกเลิก" },
    ];
  }, [reportType]);

  const exportRows = useMemo(() => {
    if (reportType === "payments") {
      return paymentRows.map((row) => ({
        ตึก: row.buildingName,
        ห้อง: row.roomNumber,
        ผู้เช่า: row.tenantName,
        เดือนบิล: formatDate(row.billingMonth),
        ครบกำหนด: formatDate(row.dueDate),
        ยอดบิล: row.invoiceTotalAmount,
        ยอดที่ส่งชำระ: row.submittedAmount,
        วิธีชำระ: getPaymentMethodText(row.paymentMethod),
        สถานะการชำระ: getStatusText(row.paymentStatus),
        เลขอ้างอิง: row.referenceNo || "",
        วันที่ชำระ: formatDateTime(row.paidAt),
        เวลาส่งหลักฐาน: formatDateTime(row.createdAt),
        เวลารีวิว: formatDateTime(row.reviewedAt),
        หมายเหตุการรีวิว: row.reviewNote || "",
        "URL สลิป": row.slipImageUrl || "",
      }));
    }

    if (reportType === "arrears") {
      return arrearsRows.map((row) => ({
        ตึก: row.buildingName,
        ห้อง: row.roomNumber,
        ผู้เช่า: row.tenantName,
        เดือนบิล: formatDate(row.billingMonth),
        ครบกำหนด: formatDate(row.dueDate),
        สถานะ: getStatusText(row.invoiceStatus),
        ค่าเช่า: row.baseRentAmount,
        ค่าน้ำ: row.waterAmount,
        ค่าไฟ: row.electricAmount,
        ค่าอื่น: row.otherAmount,
        ส่วนลด: row.discountAmount,
        ยอดรวม: row.totalAmount,
        ค้างมาแล้ว: row.daysOverdue,
      }));
    }

    if (reportType === "revenue_summary") {
      return revenueSummaryRows.map((row) => ({
        เดือน: formatMonthLabel(row.month),
        จำนวนบิล: row.totalInvoices,
        ยอดออกบิล: row.totalBilledAmount,
        รับเงินจริง: row.approvedPaymentAmount,
        รอตรวจสอบ: row.pendingReviewAmount,
        ค้างชำระ: row.outstandingAmount,
        ค้างชำระเกินกำหนด: row.overdueAmount,
        อนุมัติแล้ว_จำนวนรายการ: row.approvedPaymentCount,
        รอตรวจสอบ_จำนวนรายการ: row.submittedPaymentCount,
        ตีกลับ_จำนวนรายการ: row.rejectedPaymentCount,
        CollectionRateเปอร์เซ็นต์: row.collectionRate,
      }));
    }

    return invoiceRows.map((row) => ({
      ตึก: row.buildingName,
      ห้อง: row.roomNumber,
      ผู้เช่า: row.tenantName,
      เดือนบิล: formatDate(row.billingMonth),
      ครบกำหนด: formatDate(row.dueDate),
      สถานะ: getStatusText(row.invoiceStatus),
      ค่าเช่า: row.baseRentAmount,
      หน่วยน้ำ: row.waterUnits,
      เรทน้ำ: row.waterRate,
      ค่าน้ำ: row.waterAmount,
      หน่วยไฟ: row.electricUnits,
      เรทไฟ: row.electricRate,
      ค่าไฟ: row.electricAmount,
      ค่าอื่น: row.otherAmount,
      ส่วนลด: row.discountAmount,
      ยอดรวม: row.totalAmount,
      สร้างเมื่อ: formatDateTime(row.generatedAt),
      อัปเดตล่าสุด: formatDateTime(row.updatedAt),
    }));
  }, [reportType, invoiceRows, paymentRows, arrearsRows, revenueSummaryRows]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-white p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-rose-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-rose-500">Roomie / เมนูภาพรวม</p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">
                ภาพรวมและรายงาน
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                แยกหน้าสำหรับดูสถานะรวม กับหน้าสำหรับเตรียมข้อมูลลง Excel
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <div className="inline-flex rounded-2xl border border-rose-200 bg-rose-50 p-1">
                <button
                  onClick={() => setTab("overview")}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    tab === "overview"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-white text-slate-600"
                  }`}
                >
                  ภาพรวม
                </button>
                <button
                  onClick={() => setTab("excel")}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    tab === "excel"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-white text-slate-600"
                  }`}
                >
                  รายงาน Excel
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none"
                />
                <button
                  onClick={() => {
                    loadOverviewData();
                    if (tab === "excel") loadReportData();
                  }}
                  className="rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  รีเฟรชข้อมูล
                </button>
              </div>
            </div>
          </div>
        </div>

        {tab === "overview" ? (
          overviewLoading ? (
            <LoadingBlock text="กำลังโหลดข้อมูลภาพรวม..." />
          ) : overviewError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
              {overviewError}
            </div>
          ) : (
            <>
              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <StatCard
                  title="ยอดออกบิลเดือนนี้"
                  value={formatCurrency(overview?.invoices.totalBilledAmount || 0)}
                  subtitle={`${formatNumber(
                    overview?.invoices.totalInvoices || 0
                  )} บิล`}
                />
                <StatCard
                  title="รับเงินจริง"
                  value={formatCurrency(
                    overview?.payments.approvedPaymentAmount || 0
                  )}
                  subtitle={`Collection Rate ${formatNumber(
                    overview?.payments.collectionRate || 0
                  )}%`}
                  tone="emerald"
                />
                <StatCard
                  title="รอตรวจสอบ"
                  value={formatCurrency(
                    overview?.payments.submittedPaymentAmount || 0
                  )}
                  subtitle={`${formatNumber(
                    overview?.payments.submittedPaymentCount || 0
                  )} รายการ`}
                  tone="amber"
                />
                <StatCard
                  title="ค้างชำระ"
                  value={formatCurrency(
                    overview?.invoices.outstandingInvoiceAmount || 0
                  )}
                  subtitle={`${formatNumber(
                    overview?.invoices.outstandingInvoiceCount || 0
                  )} บิล`}
                  tone="rose"
                />
                <StatCard
                  title="อัตราเข้าพัก"
                  value={`${formatNumber(overview?.rooms.occupancyRate || 0)}%`}
                  subtitle={`${formatNumber(
                    overview?.rooms.occupied || 0
                  )}/${formatNumber(overview?.rooms.total || 0)} ห้อง`}
                />
              </section>

              <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr,0.95fr]">
                <AlertsPanel overview={overview} expiringContracts={expiringContracts} />
                <RevenueTrendChart rows={revenueTrend} />
              </section>

              <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <PaymentStatusCard data={paymentStatus} />
                <UtilityUsageChart rows={utilityUsageTrend} />
                <BuildingSummaryCard overview={overview} />
              </section>
            </>
          )
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    รายงานสำหรับ Excel
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    ใช้ค้นหา กรอง และส่งออกข้อมูลรายงานในรูปแบบ Excel (.xlsx)
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <ExportButton
                    rows={exportRows}
                    filename={`roomie-${reportType}-${month}.xlsx`}
                    sheetName={
                      reportType === "payments"
                        ? "Payments"
                        : reportType === "arrears"
                        ? "Arrears"
                        : reportType === "revenue_summary"
                        ? "RevenueSummary"
                        : "Invoices"
                    }
                  />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="mb-1 block text-sm text-slate-500">
                    ประเภทรายงาน
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as ReportType)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none"
                  >
                    <option value="invoices">ใบแจ้งหนี้</option>
                    <option value="payments">การชำระเงิน</option>
                    <option value="arrears">ค้างชำระ</option>
                    <option value="revenue_summary">สรุปรายรับประจำเดือน</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-500">ตึก</label>
                  <select
                    value={buildingId}
                    onChange={(e) => setBuildingId(e.target.value)}
                    disabled={isRevenueSummaryReport}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none disabled:bg-slate-50"
                  >
                    <option value="">ทั้งหมด</option>
                    {buildingOptions.map((item) => (
                      <option key={item.buildingId} value={item.buildingId}>
                        {item.buildingName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-500">สถานะ</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    disabled={isArrearsReport || isRevenueSummaryReport}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none disabled:bg-slate-50"
                  >
                    {reportStatusOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={loadReportData}
                    className="w-full rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    โหลดรายงาน
                  </button>
                </div>
              </div>

              {isRevenueSummaryReport ? (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  รายงานนี้แสดงสรุปรายรับย้อนหลัง 6 เดือนล่าสุด
                </div>
              ) : null}
            </section>

            <ReportSummaryCards
              reportType={reportType}
              invoiceRows={invoiceRows}
              paymentRows={paymentRows}
              arrearsRows={arrearsRows}
              revenueSummaryRows={revenueSummaryRows}
            />

            {reportLoading ? (
              <LoadingBlock text="กำลังโหลดรายงาน..." />
            ) : reportError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
                {reportError}
              </div>
            ) : reportType === "payments" ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-[1550px] text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">ตึก</th>
                        <th className="px-4 py-3 font-medium">ห้อง</th>
                        <th className="px-4 py-3 font-medium">ผู้เช่า</th>
                        <th className="px-4 py-3 font-medium">เดือนบิล</th>
                        <th className="px-4 py-3 font-medium">ครบกำหนด</th>
                        <th className="px-4 py-3 font-medium">ยอดบิล</th>
                        <th className="px-4 py-3 font-medium">ยอดที่ส่งชำระ</th>
                        <th className="px-4 py-3 font-medium">วิธีชำระ</th>
                        <th className="px-4 py-3 font-medium">สถานะ</th>
                        <th className="px-4 py-3 font-medium">เลขอ้างอิง</th>
                        <th className="px-4 py-3 font-medium">วันที่ชำระ</th>
                        <th className="px-4 py-3 font-medium">เวลาส่งหลักฐาน</th>
                        <th className="px-4 py-3 font-medium">เวลารีวิว</th>
                        <th className="px-4 py-3 font-medium">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={14}
                            className="px-4 py-10 text-center text-slate-500"
                          >
                            ไม่มีข้อมูล
                          </td>
                        </tr>
                      ) : (
                        paymentRows.map((row) => (
                          <tr key={row.paymentId} className="border-t border-slate-100">
                            <td className="px-4 py-4">{row.buildingName}</td>
                            <td className="px-4 py-4">{row.roomNumber}</td>
                            <td className="px-4 py-4">{row.tenantName}</td>
                            <td className="px-4 py-4">{formatDate(row.billingMonth)}</td>
                            <td className="px-4 py-4">{formatDate(row.dueDate)}</td>
                            <td className="px-4 py-4">
                              {formatCurrency(row.invoiceTotalAmount)}
                            </td>
                            <td className="px-4 py-4">
                              {formatCurrency(row.submittedAmount)}
                            </td>
                            <td className="px-4 py-4">
                              {getPaymentMethodText(row.paymentMethod)}
                            </td>
                            <td className="px-4 py-4">
                              <StatusPill status={row.paymentStatus} />
                            </td>
                            <td className="px-4 py-4">{row.referenceNo || "-"}</td>
                            <td className="px-4 py-4">{formatDateTime(row.paidAt)}</td>
                            <td className="px-4 py-4">{formatDateTime(row.createdAt)}</td>
                            <td className="px-4 py-4">{formatDateTime(row.reviewedAt)}</td>
                            <td className="px-4 py-4">{row.reviewNote || "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : reportType === "arrears" ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-[1350px] text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">ตึก</th>
                        <th className="px-4 py-3 font-medium">ห้อง</th>
                        <th className="px-4 py-3 font-medium">ผู้เช่า</th>
                        <th className="px-4 py-3 font-medium">เดือนบิล</th>
                        <th className="px-4 py-3 font-medium">ครบกำหนด</th>
                        <th className="px-4 py-3 font-medium">ค่าเช่า</th>
                        <th className="px-4 py-3 font-medium">ค่าน้ำ</th>
                        <th className="px-4 py-3 font-medium">ค่าไฟ</th>
                        <th className="px-4 py-3 font-medium">ค่าอื่น</th>
                        <th className="px-4 py-3 font-medium">ส่วนลด</th>
                        <th className="px-4 py-3 font-medium">ยอดรวม</th>
                        <th className="px-4 py-3 font-medium">สถานะ</th>
                        <th className="px-4 py-3 font-medium">ค้างมาแล้ว</th>
                      </tr>
                    </thead>
                    <tbody>
                      {arrearsRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={13}
                            className="px-4 py-10 text-center text-slate-500"
                          >
                            ไม่มีข้อมูล
                          </td>
                        </tr>
                      ) : (
                        arrearsRows.map((row) => (
                          <tr key={row.invoiceId} className="border-t border-slate-100">
                            <td className="px-4 py-4">{row.buildingName}</td>
                            <td className="px-4 py-4">{row.roomNumber}</td>
                            <td className="px-4 py-4">{row.tenantName}</td>
                            <td className="px-4 py-4">{formatDate(row.billingMonth)}</td>
                            <td className="px-4 py-4">{formatDate(row.dueDate)}</td>
                            <td className="px-4 py-4">
                              {formatCurrency(row.baseRentAmount)}
                            </td>
                            <td className="px-4 py-4">
                              {formatCurrency(row.waterAmount)}
                            </td>
                            <td className="px-4 py-4">
                              {formatCurrency(row.electricAmount)}
                            </td>
                            <td className="px-4 py-4">
                              {formatCurrency(row.otherAmount)}
                            </td>
                            <td className="px-4 py-4">
                              {formatCurrency(row.discountAmount)}
                            </td>
                            <td className="px-4 py-4">{formatCurrency(row.totalAmount)}</td>
                            <td className="px-4 py-4">
                              <StatusPill status={row.invoiceStatus} />
                            </td>
                            <td className="px-4 py-4">
                              {formatNumber(row.daysOverdue)} วัน
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : reportType === "revenue_summary" ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-[1600px] text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">เดือน</th>
                        <th className="px-4 py-3 font-medium">จำนวนบิล</th>
                        <th className="px-4 py-3 font-medium">ยอดออกบิล</th>
                        <th className="px-4 py-3 font-medium">รับเงินจริง</th>
                        <th className="px-4 py-3 font-medium">รอตรวจสอบ</th>
                        <th className="px-4 py-3 font-medium">ค้างชำระ</th>
                        <th className="px-4 py-3 font-medium">ค้างเกินกำหนด</th>
                        <th className="px-4 py-3 font-medium">บิลชำระแล้ว</th>
                        <th className="px-4 py-3 font-medium">บิลรอตรวจสอบ</th>
                        <th className="px-4 py-3 font-medium">บิลค้างชำระ</th>
                        <th className="px-4 py-3 font-medium">รายการอนุมัติ</th>
                        <th className="px-4 py-3 font-medium">รายการรอตรวจ</th>
                        <th className="px-4 py-3 font-medium">รายการตีกลับ</th>
                        <th className="px-4 py-3 font-medium">Collection Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueSummaryRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={14}
                            className="px-4 py-10 text-center text-slate-500"
                          >
                            ไม่มีข้อมูล
                          </td>
                        </tr>
                      ) : (
                        revenueSummaryRows.map((row) => (
                          <tr key={row.month} className="border-t border-slate-100">
                            <td className="px-4 py-4">{formatMonthLabel(row.month)}</td>
                            <td className="px-4 py-4">{formatNumber(row.totalInvoices)}</td>
                            <td className="px-4 py-4">
                              {formatCurrency(row.totalBilledAmount)}
                            </td>
                            <td className="px-4 py-4">
                              {formatCurrency(row.approvedPaymentAmount)}
                            </td>
                            <td className="px-4 py-4">
                              {formatCurrency(row.pendingReviewAmount)}
                            </td>
                            <td className="px-4 py-4">
                              {formatCurrency(row.outstandingAmount)}
                            </td>
                            <td className="px-4 py-4">
                              {formatCurrency(row.overdueAmount)}
                            </td>
                            <td className="px-4 py-4">
                              {formatNumber(row.paidInvoiceCount)}
                            </td>
                            <td className="px-4 py-4">
                              {formatNumber(row.pendingReviewCount)}
                            </td>
                            <td className="px-4 py-4">
                              {formatNumber(row.outstandingCount)}
                            </td>
                            <td className="px-4 py-4">
                              {formatNumber(row.approvedPaymentCount)}
                            </td>
                            <td className="px-4 py-4">
                              {formatNumber(row.submittedPaymentCount)}
                            </td>
                            <td className="px-4 py-4">
                              {formatNumber(row.rejectedPaymentCount)}
                            </td>
                            <td className="px-4 py-4 font-semibold text-slate-900">
                              {formatNumber(row.collectionRate)}%
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-[1650px] text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">ตึก</th>
                        <th className="px-4 py-3 font-medium">ห้อง</th>
                        <th className="px-4 py-3 font-medium">ผู้เช่า</th>
                        <th className="px-4 py-3 font-medium">เดือนบิล</th>
                        <th className="px-4 py-3 font-medium">ครบกำหนด</th>
                        <th className="px-4 py-3 font-medium">ค่าเช่า</th>
                        <th className="px-4 py-3 font-medium">หน่วยน้ำ</th>
                        <th className="px-4 py-3 font-medium">เรทน้ำ</th>
                        <th className="px-4 py-3 font-medium">ค่าน้ำ</th>
                        <th className="px-4 py-3 font-medium">หน่วยไฟ</th>
                        <th className="px-4 py-3 font-medium">เรทไฟ</th>
                        <th className="px-4 py-3 font-medium">ค่าไฟ</th>
                        <th className="px-4 py-3 font-medium">ค่าอื่น</th>
                        <th className="px-4 py-3 font-medium">ส่วนลด</th>
                        <th className="px-4 py-3 font-medium">ยอดรวม</th>
                        <th className="px-4 py-3 font-medium">สถานะ</th>
                        <th className="px-4 py-3 font-medium">สร้างเมื่อ</th>
                        <th className="px-4 py-3 font-medium">อัปเดตล่าสุด</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={18}
                            className="px-4 py-10 text-center text-slate-500"
                          >
                            ไม่มีข้อมูล
                          </td>
                        </tr>
                      ) : (
                        invoiceRows.map((row) => (
                          <tr key={row.invoiceId} className="border-t border-slate-100">
                            <td className="px-4 py-4">{row.buildingName}</td>
                            <td className="px-4 py-4">{row.roomNumber}</td>
                            <td className="px-4 py-4">{row.tenantName}</td>
                            <td className="px-4 py-4">{formatDate(row.billingMonth)}</td>
                            <td className="px-4 py-4">{formatDate(row.dueDate)}</td>
                            <td className="px-4 py-4">
                              {formatCurrency(row.baseRentAmount)}
                            </td>
                            <td className="px-4 py-4">{formatNumber(row.waterUnits)}</td>
                            <td className="px-4 py-4">{formatNumber(row.waterRate)}</td>
                            <td className="px-4 py-4">
                              {formatCurrency(row.waterAmount)}
                            </td>
                            <td className="px-4 py-4">
                              {formatNumber(row.electricUnits)}
                            </td>
                            <td className="px-4 py-4">
                              {formatNumber(row.electricRate)}
                            </td>
                            <td className="px-4 py-4">
                              {formatCurrency(row.electricAmount)}
                            </td>
                            <td className="px-4 py-4">{formatCurrency(row.otherAmount)}</td>
                            <td className="px-4 py-4">
                              {formatCurrency(row.discountAmount)}
                            </td>
                            <td className="px-4 py-4">{formatCurrency(row.totalAmount)}</td>
                            <td className="px-4 py-4">
                              <StatusPill status={row.invoiceStatus} />
                            </td>
                            <td className="px-4 py-4">{formatDateTime(row.generatedAt)}</td>
                            <td className="px-4 py-4">{formatDateTime(row.updatedAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}