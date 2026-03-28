import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  deleteFurnitureItem,
  getRoomFurnitureItems,
} from "../service/furniture";
import type {
  FurnitureItem,
  FurnitureRepairHistoryItem,
  FurnitureRepairStatus,
  FurnitureRoomItemsResponse,
} from "../types/furniture";
import FurnitureItemModal from "../components/furniture/FurnitureItemModal";

function formatDate(date?: string | null) {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH");
}

function formatDateTime(date?: string | null) {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("th-TH");
}

function formatPrice(price?: number | null) {
  if (price === null || price === undefined) return "-";
  return new Intl.NumberFormat("th-TH").format(price);
}

function getConditionLabel(value: FurnitureItem["conditionStatus"]) {
  switch (value) {
    case "new":
      return "ใหม่";
    case "good":
      return "ดี";
    case "fair":
      return "พอใช้";
    case "damaged":
      return "ชำรุด";
    default:
      return value;
  }
}

function getUsageLabel(value: FurnitureItem["usageStatus"]) {
  switch (value) {
    case "active":
      return "ใช้งานอยู่";
    case "under_repair":
      return "ซ่อมอยู่";
    case "disposed":
      return "เลิกใช้งาน";
    case "missing":
      return "สูญหาย";
    default:
      return value;
  }
}

function getConditionBadgeClass(value: FurnitureItem["conditionStatus"]) {
  switch (value) {
    case "new":
      return "bg-emerald-100 text-emerald-700";
    case "good":
      return "bg-sky-100 text-sky-700";
    case "fair":
      return "bg-amber-100 text-amber-700";
    case "damaged":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getUsageBadgeClass(value: FurnitureItem["usageStatus"]) {
  switch (value) {
    case "active":
      return "bg-emerald-100 text-emerald-700";
    case "under_repair":
      return "bg-amber-100 text-amber-700";
    case "disposed":
      return "bg-slate-200 text-slate-700";
    case "missing":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getRepairStatusLabel(value?: FurnitureRepairStatus | null) {
  switch (value) {
    case "pending":
      return "รอดำเนินการ";
    case "in_progress":
      return "กำลังดำเนินการ";
    case "waiting_parts":
      return "รออะไหล่";
    case "completed":
      return "ซ่อมเสร็จแล้ว";
    case "cancelled":
      return "ยกเลิก";
    default:
      return "-";
  }
}

function getRepairStatusBadgeClass(value?: FurnitureRepairStatus | null) {
  switch (value) {
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "in_progress":
      return "bg-sky-100 text-sky-700";
    case "waiting_parts":
      return "bg-violet-100 text-violet-700";
    case "completed":
      return "bg-emerald-100 text-emerald-700";
    case "cancelled":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getRemainingMonthsText(item: FurnitureItem) {
  if (item.lifespanMonths === null || item.lifespanMonths === undefined) {
    return "-";
  }

  const used = item.monthsUsed ?? 0;
  const remaining = Math.max(0, item.lifespanMonths - used);
  return `${remaining} เดือน`;
}

function RepairTable({
  rows,
  emptyMessage,
}: {
  rows: FurnitureRepairHistoryItem[];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-slate-500">{emptyMessage}</div>
    );
  }

  return (
    <>
      <div className="hidden grid-cols-6 bg-slate-50 text-sm font-semibold text-slate-700 md:grid">
        <div className="px-4 py-3">วันที่แจ้ง</div>
        <div className="px-4 py-3">เฟอร์นิเจอร์</div>
        <div className="px-4 py-3">รายการ</div>
        <div className="px-4 py-3">รายละเอียด</div>
        <div className="px-4 py-3">สถานะ</div>
        <div className="px-4 py-3">วันที่เสร็จ</div>
      </div>

      <div className="divide-y divide-slate-200">
        {rows.map((repair) => (
          <div key={repair.id} className="p-4">
            <div className="grid gap-3 md:grid-cols-6 md:items-start">
              <div>
                <div className="text-xs font-semibold text-slate-400 md:hidden">
                  วันที่แจ้ง
                </div>
                <div className="text-sm text-slate-700">
                  {formatDate(repair.requestedAt || repair.createdAt)}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-400 md:hidden">
                  เฟอร์นิเจอร์
                </div>
                <div className="text-sm font-medium text-slate-900">
                  {repair.title?.replace(/^แจ้งซ่อม/, "") || "-"}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-400 md:hidden">
                  รายการ
                </div>
                <div className="text-sm font-medium text-slate-900">
                  {repair.title || "-"}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-400 md:hidden">
                  รายละเอียด
                </div>
                <div className="whitespace-pre-line text-sm text-slate-700">
                  {repair.description || "-"}
                </div>
                {repair.ownerNote ? (
                  <div className="mt-2 text-xs text-slate-500">
                    หมายเหตุเจ้าของ: {repair.ownerNote}
                  </div>
                ) : null}
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-400 md:hidden">
                  สถานะ
                </div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRepairStatusBadgeClass(
                    repair.status
                  )}`}
                >
                  {getRepairStatusLabel(repair.status)}
                </span>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-400 md:hidden">
                  วันที่เสร็จ
                </div>
                <div className="text-sm text-slate-700">
                  {formatDate(repair.completedAt)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function FurnitureRoomDetail() {
  const { roomId = "" } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<FurnitureRoomItemsResponse | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedItem, setSelectedItem] = useState<FurnitureItem | null>(null);

  const [expandedItemIds, setExpandedItemIds] = useState<string[]>([]);

  const room = response?.room ?? null;
  const items = response?.items ?? [];
  const summary = response?.summary ?? null;
  const roomRepairHistory = response?.roomRepairHistory ?? [];
  const roomCompletedRepairHistory = response?.roomCompletedRepairHistory ?? [];
  const roomOpenRepairHistory = response?.roomOpenRepairHistory ?? [];

  async function loadData() {
    if (!roomId) return;

    try {
      setLoading(true);
      setError("");
      const data = await getRoomFurnitureItems(roomId);
      setResponse(data);
    } catch (err: any) {
      setError(err?.message || "โหลดข้อมูลเฟอร์นิเจอร์ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [roomId]);

  useEffect(() => {
    const currentIds = items.map((item) => item.id);
    setExpandedItemIds((prev) => prev.filter((id) => currentIds.includes(id)));
  }, [items]);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + (item.quantity || 0), 0),
    [items]
  );

  function toggleExpanded(itemId: string) {
    setExpandedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  }

  function openCreateModal() {
    setSelectedItem(null);
    setModalMode("create");
    setModalOpen(true);
  }

  function openEditModal(item: FurnitureItem) {
    setSelectedItem(item);
    setModalMode("edit");
    setModalOpen(true);
  }

  async function handleDelete(item: FurnitureItem) {
    const confirmed = window.confirm(
      `ต้องการลบ "${item.itemName}" ใช่หรือไม่?`
    );
    if (!confirmed) return;

    try {
      setDeletingItemId(item.id);
      await deleteFurnitureItem(item.id);
      await loadData();
    } catch (err: any) {
      window.alert(err?.message || "ลบเฟอร์นิเจอร์ไม่สำเร็จ");
    } finally {
      setDeletingItemId(null);
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => navigate("/furniture")}
              className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
            >
              ← กลับ
            </button>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                ข้อมูลเฟอร์นิเจอร์
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                จัดการรายการเฟอร์นิเจอร์ภายในห้อง
              </p>
            </div>

            {room && (
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
                <div className="font-semibold text-slate-900">{room.roomLabel}</div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 sm:text-sm">
                  <span>รายการทั้งหมด {items.length} รายการ</span>
                  <span>จำนวนรวม {totalItems} ชิ้น</span>
                  <span>งานซ่อมทั้งหมด {summary?.totalRepairRequests ?? 0} รายการ</span>
                  <span>งานค้าง {summary?.openRepairRequests ?? 0} รายการ</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              + เพิ่มเฟอร์นิเจอร์
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
          กำลังโหลดข้อมูล...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="text-sm text-slate-500">เฟอร์นิเจอร์ทั้งหมด</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {summary?.totalFurnitureItems ?? items.length}
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="text-sm text-slate-500">งานซ่อมทั้งหมด</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {summary?.totalRepairRequests ?? 0}
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="text-sm text-slate-500">งานซ่อมค้าง</div>
              <div className="mt-2 text-2xl font-bold text-amber-600">
                {summary?.openRepairRequests ?? 0}
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="text-sm text-slate-500">ซ่อมเสร็จแล้ว</div>
              <div className="mt-2 text-2xl font-bold text-emerald-600">
                {summary?.completedRepairRequests ?? 0}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            {items.length === 0 ? (
              <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200 sm:p-10">
                <div className="mx-auto max-w-md">
                  <h2 className="text-lg font-semibold text-slate-900">
                    ยังไม่มีข้อมูลเฟอร์นิเจอร์
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    คุณสามารถเพิ่มรายการเฟอร์นิเจอร์ของห้องนี้ได้จากปุ่มด้านบน
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
                {items.map((item) => {
                  const isExpanded = expandedItemIds.includes(item.id);

                  return (
                    <article
                      key={item.id}
                      className="self-start overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200"
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpanded(item.id)}
                        className="block w-full text-left transition hover:bg-slate-50"
                      >
                        <div className="p-4 sm:p-5">
                          <div className="flex gap-4">
                            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-slate-100 sm:h-32 sm:w-32">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.itemName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                                  ไม่มีรูปภาพ
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h2 className="truncate text-xl font-bold text-slate-900 sm:text-2xl">
                                    {item.itemName}
                                  </h2>

                                  <p className="mt-2 text-sm text-slate-500 sm:text-base">
                                    {item.categoryName || "เฟอร์นิเจอร์"}
                                    {item.color ? ` • ${item.color}` : ""}
                                    {item.quantity ? ` • x${item.quantity}` : ""}
                                  </p>

                                  <p className="mt-1 text-sm text-slate-500 sm:text-base">
                                    {room?.roomLabel || "-"}
                                  </p>
                                </div>

                                <div className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                  {isExpanded ? "ยุบ ▲" : "ขยาย ▼"}
                                </div>
                              </div>

                              <div className="mt-4 space-y-1 text-sm text-slate-600 sm:text-base">
                                <div>
                                  ใช้งาน: {item.monthsUsed ?? 0} เดือน
                                  {item.warrantyExpiry
                                    ? ` หมดอายุ: ${formatDate(item.warrantyExpiry)}`
                                    : ""}
                                </div>
                                <div>• อายุคงเหลือ ~ {getRemainingMonthsText(item)}</div>
                                <div>
                                  • เคยแจ้งซ่อม: {item.repairSummary?.totalRepairs ?? 0} ครั้ง
                                </div>
                                <div>
                                  • งานค้าง: {item.repairSummary?.openRepairs ?? 0} งาน
                                </div>
                                <div>
                                  • ล่าสุด:{" "}
                                  {formatDate(item.repairSummary?.lastReportedAt || null)}
                                </div>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <span
                                  className={`inline-flex rounded-full px-3 py-1.5 text-sm font-semibold ${getUsageBadgeClass(
                                    item.usageStatus
                                  )}`}
                                >
                                  สถานะ : {getUsageLabel(item.usageStatus)}
                                </span>

                                {item.repairSummary?.hasOpenRepair ? (
                                  <span className="inline-flex rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-700">
                                    มีงานซ่อมค้าง
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-100 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                              <div className="text-sm text-slate-500">จำนวน</div>
                              <div className="mt-1 text-xl font-semibold text-slate-900">
                                {item.quantity || 0}
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                              <div className="text-sm text-slate-500">ราคา</div>
                              <div className="mt-1 text-xl font-semibold text-slate-900">
                                {formatPrice(item.price)} บาท
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                              <div className="text-sm text-slate-500">ยี่ห้อ</div>
                              <div className="mt-1 font-medium text-slate-900">
                                {item.brand || "-"}
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                              <div className="text-sm text-slate-500">รุ่น</div>
                              <div className="mt-1 font-medium text-slate-900">
                                {item.model || "-"}
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                              <div className="text-sm text-slate-500">สี</div>
                              <div className="mt-1 font-medium text-slate-900">
                                {item.color || "-"}
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                              <div className="text-sm text-slate-500">ขนาด</div>
                              <div className="mt-1 font-medium text-slate-900">
                                {item.sizeDetail || "-"}
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                              <div className="text-sm text-slate-500">วันที่ได้มา</div>
                              <div className="mt-1 font-medium text-slate-900">
                                {formatDate(item.purchaseDate)}
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                              <div className="text-sm text-slate-500">วันหมดประกัน</div>
                              <div className="mt-1 font-medium text-slate-900">
                                {formatDate(item.warrantyExpiry)}
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                              <div className="text-sm text-slate-500">
                                อายุการใช้งาน (เดือน)
                              </div>
                              <div className="mt-1 font-medium text-slate-900">
                                {item.lifespanMonths ?? "-"}
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                              <div className="text-sm text-slate-500">
                                ใช้งานแล้ว (เดือน)
                              </div>
                              <div className="mt-1 font-medium text-slate-900">
                                {item.monthsUsed ?? "-"}
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                              <div className="text-sm text-slate-500">
                                แจ้งซ่อมทั้งหมด
                              </div>
                              <div className="mt-1 text-xl font-semibold text-slate-900">
                                {item.repairSummary?.totalRepairs ?? 0}
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                              <div className="text-sm text-slate-500">งานค้าง</div>
                              <div className="mt-1 text-xl font-semibold text-amber-600">
                                {item.repairSummary?.openRepairs ?? 0}
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                              <div className="text-sm text-slate-500">
                                ซ่อมเสร็จแล้ว
                              </div>
                              <div className="mt-1 text-xl font-semibold text-emerald-600">
                                {item.repairSummary?.completedRepairs ?? 0}
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                              <div className="text-sm text-slate-500">
                                แจ้งล่าสุด
                              </div>
                              <div className="mt-1 font-medium text-slate-900">
                                {formatDateTime(item.repairSummary?.lastReportedAt)}
                              </div>
                            </div>

                            <div className="sm:col-span-2 rounded-xl bg-slate-50 px-4 py-3">
                              <div className="text-sm text-slate-500">สภาพ</div>
                              <div className="mt-2">
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getConditionBadgeClass(
                                    item.conditionStatus
                                  )}`}
                                >
                                  {getConditionLabel(item.conditionStatus)}
                                </span>
                              </div>
                            </div>

                            <div className="sm:col-span-2 rounded-xl bg-slate-50 px-4 py-3">
                              <div className="text-sm text-slate-500">หมายเหตุ</div>
                              <div className="mt-1 whitespace-pre-line font-medium text-slate-900">
                                {item.note || "-"}
                              </div>
                            </div>
                          </div>

                          <div className="mt-5 rounded-2xl border border-slate-200">
                            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                              <h3 className="text-sm font-bold text-slate-900">
                                ประวัติแจ้งซ่อมของ {item.itemName}
                              </h3>
                              <p className="mt-1 text-xs text-slate-500">
                                แสดงรายการซ่อมทั้งหมดที่ผูกกับเฟอร์นิเจอร์ชิ้นนี้
                              </p>
                            </div>

                            <RepairTable
                              rows={item.repairHistory || []}
                              emptyMessage="ยังไม่มีประวัติแจ้งซ่อมของเฟอร์นิเจอร์ชิ้นนี้"
                            />
                          </div>

                          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              แก้ไข
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              disabled={deletingItemId === item.id}
                              className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingItemId === item.id ? "กำลังลบ..." : "ลบ"}
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  งานซ่อมที่กำลังดำเนินการในห้องนี้
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  รวมงานซ่อมของเฟอร์นิเจอร์ในห้องที่ยังไม่ปิดงาน
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <RepairTable
                rows={roomOpenRepairHistory}
                emptyMessage="ยังไม่มีงานซ่อมค้างในห้องนี้"
              />
            </div>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  ประวัติการแจ้งซ่อมที่ซ่อมเสร็จแล้ว
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  แสดงรายการซ่อมของเฟอร์นิเจอร์ในห้องนี้ที่ปิดงานแล้ว
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <RepairTable
                rows={roomCompletedRepairHistory}
                emptyMessage="ยังไม่มีประวัติการแจ้งซ่อมที่ซ่อมเสร็จแล้ว"
              />
            </div>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  ประวัติแจ้งซ่อมทั้งหมดในห้องนี้
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  รวมทั้งงานค้าง งานซ่อมเสร็จ และงานที่ยกเลิก
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <RepairTable
                rows={roomRepairHistory}
                emptyMessage="ยังไม่มีประวัติแจ้งซ่อมในห้องนี้"
              />
            </div>
          </section>
        </>
      )}

      <FurnitureItemModal
        open={modalOpen}
        mode={modalMode}
        roomId={roomId}
        item={selectedItem}
        onClose={() => {
          setModalOpen(false);
          setSelectedItem(null);
        }}
        onSaved={loadData}
      />
    </div>
  );
}