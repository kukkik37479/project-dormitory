import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  deleteFurnitureItem,
  getRoomFurnitureItems,
} from "../service/furniture";
import type {
  FurnitureItem,
  FurnitureRoomItemsResponse,
} from "../types/furniture";
import FurnitureItemModal from "../components/furniture/FurnitureItemModal";

function formatDate(date?: string | null) {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH");
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
      return "จำหน่ายแล้ว";
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

  const room = response?.room ?? null;
  const items = response?.items ?? [];

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

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + (item.quantity || 0), 0),
    [items]
  );

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
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
                  >
                    <div className="flex flex-col gap-4 p-4 sm:p-5">
                      <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="h-40 w-full shrink-0 overflow-hidden rounded-2xl bg-slate-100 sm:h-36 sm:w-40">
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

                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h2 className="truncate text-lg font-bold text-slate-900">
                                {item.itemName}
                              </h2>
                              <p className="mt-1 text-sm text-slate-500">
                                หมวดหมู่: {item.categoryName || "-"}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${getConditionBadgeClass(
                                  item.conditionStatus
                                )}`}
                              >
                                {getConditionLabel(item.conditionStatus)}
                              </span>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${getUsageBadgeClass(
                                  item.usageStatus
                                )}`}
                              >
                                {getUsageLabel(item.usageStatus)}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2">
                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <div className="text-xs text-slate-400">จำนวน</div>
                              <div className="font-medium text-slate-800">
                                {item.quantity}
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <div className="text-xs text-slate-400">ราคา</div>
                              <div className="font-medium text-slate-800">
                                {formatPrice(item.price)} บาท
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <div className="text-xs text-slate-400">ยี่ห้อ</div>
                              <div className="font-medium text-slate-800">
                                {item.brand || "-"}
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <div className="text-xs text-slate-400">รุ่น</div>
                              <div className="font-medium text-slate-800">
                                {item.model || "-"}
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <div className="text-xs text-slate-400">สี</div>
                              <div className="font-medium text-slate-800">
                                {item.color || "-"}
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <div className="text-xs text-slate-400">ขนาด</div>
                              <div className="font-medium text-slate-800">
                                {item.sizeDetail || "-"}
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <div className="text-xs text-slate-400">วันที่ได้มา</div>
                              <div className="font-medium text-slate-800">
                                {formatDate(item.purchaseDate)}
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <div className="text-xs text-slate-400">วันหมดประกัน</div>
                              <div className="font-medium text-slate-800">
                                {formatDate(item.warrantyExpiry)}
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <div className="text-xs text-slate-400">
                                อายุการใช้งาน (เดือน)
                              </div>
                              <div className="font-medium text-slate-800">
                                {item.lifespanMonths ?? "-"}
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <div className="text-xs text-slate-400">
                                ใช้งานแล้ว (เดือน)
                              </div>
                              <div className="font-medium text-slate-800">
                                {item.monthsUsed ?? "-"}
                              </div>
                            </div>
                          </div>

                          <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
                            <div className="text-xs text-slate-400">หมายเหตุ</div>
                            <div className="mt-1 whitespace-pre-line">
                              {item.note || "-"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end">
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
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  ประวัติการแจ้งซ่อมที่ซ่อมเสร็จแล้ว
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  เดี๋ยวขั้นถัดไปค่อยเชื่อม API ประวัติซ่อม
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <div className="hidden grid-cols-4 bg-slate-50 text-sm font-semibold text-slate-700 md:grid">
                <div className="px-4 py-3">วันที่แจ้ง</div>
                <div className="px-4 py-3">รายการ</div>
                <div className="px-4 py-3">รายละเอียด</div>
                <div className="px-4 py-3">สถานะ</div>
              </div>

              <div className="p-6 text-center text-sm text-slate-500">
                ยังไม่ได้เชื่อมข้อมูลประวัติซ่อม
              </div>
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