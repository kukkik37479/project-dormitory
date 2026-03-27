import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  createOwnerReviewReply,
  deleteOwnerReview,
  deleteOwnerReviewReply,
  getOwnerReviews,
  getOwnerReviewStats,
  type OwnerReview,
  type OwnerReviewStats,
  updateOwnerReviewReply,
  updateOwnerReviewStatus,
} from "../service/review.service";

type StatusFilter = "all" | "visible" | "hidden" | "pending";
type ReplyStatusFilter = "all" | "replied" | "waiting";
type SortFilter = "newest" | "oldest" | "highest" | "lowest";
type RatingFilter = "all" | "1" | "2" | "3" | "4" | "5";

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "numeric",
    year: "2-digit",
  }).format(date);
}

function renderStars(rating: number) {
  const full = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function getRoomLabel(review: OwnerReview) {
  const roomText = review.room_number ? `ห้อง ${review.room_number}` : "ไม่ระบุห้อง";
  const buildingText = review.building_name ? ` ตึก ${review.building_name}` : "";
  return `${roomText}${buildingText}`;
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-gradient-to-b from-rose-300 to-rose-500 p-5 text-white shadow-sm">
      <div className="text-lg font-bold">{title}</div>
      <div className="mt-4 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

export default function Reviews() {
  const [stats, setStats] = useState<OwnerReviewStats | null>(null);
  const [reviews, setReviews] = useState<OwnerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [replyStatus, setReplyStatus] = useState<ReplyStatusFilter>("all");
  const [rating, setRating] = useState<RatingFilter>("all");
  const [sort, setSort] = useState<SortFilter>("newest");

  const [activeReplyReviewId, setActiveReplyReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [savingReply, setSavingReply] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await getOwnerReviewStats();
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await getOwnerReviews({
        page,
        limit,
        search,
        status,
        replyStatus,
        rating,
        sort,
      });

      setReviews(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
      setTotalItems(res.meta?.total || 0);
    } catch (err) {
      console.error(err);
      setReviews([]);
      setTotalPages(1);
      setTotalItems(0);
      setError(err instanceof Error ? err.message : "โหลดรายการรีวิวไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [limit, page, rating, replyStatus, search, sort, status]);

  const reloadAll = useCallback(async () => {
    await Promise.all([loadStats(), loadReviews()]);
  }, [loadReviews, loadStats]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  useEffect(() => {
    setSuccessMessage("");
    setActionError("");
  }, [page, search, status, replyStatus, rating, sort]);

  const averageDisplay = useMemo(() => {
    const value = Number(stats?.average_rating || 0);
    return value > 0 ? value.toFixed(1) : "0.0";
  }, [stats]);

  const openReplyBox = (review: OwnerReview) => {
    setActionError("");
    setSuccessMessage("");
    setActiveReplyReviewId(review.id);
    setReplyText(review.reply?.reply_text || "");
  };

  const closeReplyBox = () => {
    setActiveReplyReviewId(null);
    setReplyText("");
  };

  const onApplyFilters = (e?: FormEvent) => {
    e?.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const onClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("all");
    setReplyStatus("all");
    setRating("all");
    setSort("newest");
    setPage(1);
  };

  const onSubmitReply = async (review: OwnerReview) => {
    const text = replyText.trim();

    if (!text) {
      setActionError("กรุณากรอกข้อความตอบกลับ");
      return;
    }

    try {
      setSavingReply(true);
      setActionError("");
      setSuccessMessage("");

      if (review.reply) {
        await updateOwnerReviewReply(review.id, text);
        setSuccessMessage("แก้ไขการตอบกลับสำเร็จ");
      } else {
        await createOwnerReviewReply(review.id, text);
        setSuccessMessage("ตอบกลับรีวิวสำเร็จ");
      }

      closeReplyBox();
      await reloadAll();
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : "บันทึกการตอบกลับไม่สำเร็จ");
    } finally {
      setSavingReply(false);
    }
  };

  const onToggleStatus = async (review: OwnerReview) => {
    const nextStatus = review.status === "hidden" ? "visible" : "hidden";
    const confirmText =
      nextStatus === "hidden"
        ? "ต้องการซ่อนรีวิวนี้ใช่ไหม"
        : "ต้องการแสดงรีวิวนี้อีกครั้งใช่ไหม";

    if (!window.confirm(confirmText)) return;

    try {
      setActionLoadingId(review.id);
      setActionError("");
      setSuccessMessage("");

      await updateOwnerReviewStatus(review.id, nextStatus);
      setSuccessMessage(
        nextStatus === "hidden" ? "ซ่อนรีวิวสำเร็จ" : "แสดงรีวิวสำเร็จ"
      );

      await reloadAll();
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : "อัปเดตสถานะรีวิวไม่สำเร็จ");
    } finally {
      setActionLoadingId(null);
    }
  };

  const onDeleteReply = async (review: OwnerReview) => {
    if (!window.confirm("ต้องการลบการตอบกลับนี้ใช่ไหม")) return;

    try {
      setActionLoadingId(review.id);
      setActionError("");
      setSuccessMessage("");

      await deleteOwnerReviewReply(review.id);
      setSuccessMessage("ลบการตอบกลับสำเร็จ");

      if (activeReplyReviewId === review.id) {
        closeReplyBox();
      }

      await reloadAll();
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : "ลบการตอบกลับไม่สำเร็จ");
    } finally {
      setActionLoadingId(null);
    }
  };

  const onDeleteReview = async (review: OwnerReview) => {
    if (!window.confirm("ต้องการลบรีวิวนี้ใช่ไหม")) return;

    try {
      setActionLoadingId(review.id);
      setActionError("");
      setSuccessMessage("");

      await deleteOwnerReview(review.id);
      setSuccessMessage("ลบรีวิวสำเร็จ");

      if (activeReplyReviewId === review.id) {
        closeReplyBox();
      }

      const nextPage =
        reviews.length === 1 && page > 1 ? Math.max(page - 1, 1) : page;

      if (nextPage !== page) {
        setPage(nextPage);
      } else {
        await reloadAll();
      }
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : "ลบรีวิวไม่สำเร็จ");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="min-h-full bg-[#f7f7f8]">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            title="จำนวนรีวิวทั้งหมด"
            value={statsLoading ? "..." : stats?.total_reviews || 0}
          />
          <StatCard
            title="คะแนนเฉลี่ย"
            value={statsLoading ? "..." : averageDisplay}
          />
          <StatCard
            title="รอการตอบกลับ"
            value={statsLoading ? "..." : stats?.waiting_reply_count || 0}
          />
        </div>

        <form
          onSubmit={onApplyFilters}
          className="mt-6 rounded-2xl bg-white p-4 shadow-sm"
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.6fr)_180px_180px_180px_180px_110px]">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ค้นหาชื่อผู้เช่า ข้อความรีวิว เลขห้อง หรือตึก"
              className="h-11 rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-rose-300"
            />

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-rose-300"
            >
              <option value="all">แสดงทั้งหมด</option>
              <option value="visible">แสดงอยู่</option>
              <option value="hidden">ซ่อนอยู่</option>
              <option value="pending">รอตรวจสอบ</option>
            </select>

            <select
              value={replyStatus}
              onChange={(e) =>
                setReplyStatus(e.target.value as ReplyStatusFilter)
              }
              className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-rose-300"
            >
              <option value="all">สถานะตอบกลับ</option>
              <option value="waiting">รอการตอบกลับ</option>
              <option value="replied">ตอบกลับแล้ว</option>
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortFilter)}
              className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-rose-300"
            >
              <option value="newest">เรียงลำดับ: ใหม่สุด</option>
              <option value="oldest">เก่าสุด</option>
              <option value="highest">คะแนนมากสุด</option>
              <option value="lowest">คะแนนน้อยสุด</option>
            </select>

            <select
              value={rating}
              onChange={(e) => setRating(e.target.value as RatingFilter)}
              className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-rose-300"
            >
              <option value="all">เรตติ้งทั้งหมด</option>
              <option value="5">5 ดาว</option>
              <option value="4">4 ดาว</option>
              <option value="3">3 ดาว</option>
              <option value="2">2 ดาว</option>
              <option value="1">1 ดาว</option>
            </select>

            <button
              type="submit"
              className="h-11 rounded-xl bg-rose-500 px-4 text-sm font-semibold text-white hover:bg-rose-600"
            >
              กรอง
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-500">ทั้งหมด {totalItems} รีวิว</div>

            <button
              type="button"
              onClick={onClearFilters}
              className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
            >
              ล้างตัวกรอง
            </button>
          </div>
        </form>

        {(error || actionError || successMessage) && (
          <div className="mt-4 space-y-2">
            {error ? (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            {actionError ? (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {actionError}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
                {successMessage}
              </div>
            ) : null}
          </div>
        )}

        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">รีวิว ({totalItems})</h1>
              <p className="mt-1 text-sm text-gray-500">
                ดู จัดการ ตอบกลับ ซ่อน หรือ ลบรีวิวของผู้เช่า
              </p>
            </div>

            <button
              type="button"
              onClick={() => reloadAll()}
              className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
            >
              รีเฟรช
            </button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-rose-100 bg-[#fffafb] p-8 text-center text-gray-500">
              กำลังโหลดรายการรีวิว...
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-rose-200 bg-[#fffafb] p-8 text-center">
              <p className="text-base font-medium text-gray-700">ยังไม่พบรีวิว</p>
              <p className="mt-2 text-sm text-gray-500">
                ลองเปลี่ยนคำค้นหาหรือตัวกรองอีกครั้ง
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {reviews.map((review) => {
                const isReplyOpen = activeReplyReviewId === review.id;
                const isBusy = actionLoadingId === review.id;

                return (
                  <div
                    key={review.id}
                    className={`rounded-2xl border p-5 transition ${
                      review.status === "hidden"
                        ? "border-gray-200 bg-gray-50 opacity-90"
                        : "border-rose-100 bg-[#fffafb]"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="text-lg font-bold text-gray-900">
                            {review.reviewer_name || "ผู้เช่า"}
                          </div>

                          <span className="rounded-full border border-rose-100 bg-white px-3 py-1 text-xs font-semibold text-gray-600">
                            {getRoomLabel(review)}
                          </span>

                          {review.status === "hidden" ? (
                            <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700">
                              ซ่อนอยู่
                            </span>
                          ) : null}

                          {!review.reply ? (
                            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                              รอการตอบกลับ
                            </span>
                          ) : (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                              ตอบกลับแล้ว
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                          <div className="font-semibold text-yellow-500">
                            {renderStars(review.rating)}
                          </div>
                          <div className="font-medium text-rose-600">
                            {review.rating} / 5
                          </div>
                        </div>

                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">
                          {review.comment}
                        </p>

                        <div className="mt-3 text-sm text-gray-500">
                          รีวิวเมื่อวันที่ {formatDate(review.created_at)}
                        </div>

                        {review.reply ? (
                          <div className="mt-4 rounded-2xl border border-rose-100 bg-white p-4">
                            <div className="text-sm font-bold text-gray-900">เจ้าของ</div>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-700">
                              {review.reply.reply_text}
                            </p>
                            <div className="mt-2 text-sm text-gray-500">
                              ตอบกลับเมื่อวันที่{" "}
                              {formatDate(review.reply.updated_at || review.reply.created_at)}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2 lg:w-[290px] lg:justify-end">
                        <button
                          type="button"
                          onClick={() => openReplyBox(review)}
                          className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          {review.reply ? "แก้ไขตอบกลับ" : "ตอบกลับ"}
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => onToggleStatus(review)}
                          className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                        >
                          {review.status === "hidden" ? "แสดง" : "ซ่อน"}
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => onDeleteReview(review)}
                          className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>

                    {isReplyOpen ? (
                      <div className="mt-4 rounded-2xl border border-rose-100 bg-white p-4">
                        <div className="mb-2 text-sm font-semibold text-gray-800">
                          {review.reply ? "แก้ไขการตอบกลับ" : "ตอบกลับรีวิว"}
                        </div>

                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={4}
                          placeholder="พิมพ์ข้อความตอบกลับผู้เช่า"
                          className="w-full rounded-xl border border-rose-200 px-4 py-3 text-sm outline-none focus:border-rose-300"
                        />

                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                          {review.reply ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => onDeleteReply(review)}
                              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                            >
                              ลบตอบกลับ
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={closeReplyBox}
                            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            ยกเลิก
                          </button>

                          <button
                            type="button"
                            disabled={savingReply}
                            onClick={() => onSubmitReply(review)}
                            className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
                          >
                            {savingReply ? "กำลังบันทึก..." : "บันทึกการตอบกลับ"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-500">
              หน้า {page} / {totalPages}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                ก่อนหน้า
              </button>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                ถัดไป
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}