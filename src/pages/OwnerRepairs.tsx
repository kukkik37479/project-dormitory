import { useEffect, useMemo, useState } from "react";
import {
  getOwnerRepairRequestDetail,
  getOwnerRepairRequests,
  updateOwnerRepairRequestStatus,
} from "../service/repair.service";
import { uploadRepairImages } from "../service/repairUpload.service";
import type { RepairRequestItem, RepairStatusValue } from "../service/repair.service";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1180;

function formatThaiDate(date?: string | null) {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatThaiDateTime(date?: string | null) {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function getStatusLabel(status: RepairStatusValue) {
  switch (status) {
    case "pending":
      return "รอรับเรื่อง";
    case "in_progress":
      return "กำลังดำเนินการ";
    case "waiting_parts":
      return "รออะไหล่";
    case "completed":
      return "เสร็จสิ้น";
    case "cancelled":
      return "ยกเลิก";
    default:
      return status;
  }
}

function getStatusColor(status: RepairStatusValue) {
  switch (status) {
    case "pending":
      return { background: "#FFF3CD", color: "#8A6D1D" };
    case "in_progress":
      return { background: "#D1F3D8", color: "#1C7C35" };
    case "waiting_parts":
      return { background: "#E5E7EB", color: "#4B5563" };
    case "completed":
      return { background: "#D9F7E8", color: "#0F8F4F" };
    case "cancelled":
      return { background: "#FDE2E2", color: "#C0392B" };
    default:
      return { background: "#E5E7EB", color: "#374151" };
  }
}

function getCategoryLabel(value: string) {
  switch (value) {
    case "electrical":
      return "เครื่องใช้ไฟฟ้า";
    case "water":
      return "ระบบน้ำ";
    case "furniture":
      return "เฟอร์นิเจอร์";
    case "room":
      return "ภายในห้อง";
    case "other":
      return "อื่น ๆ";
    default:
      return value;
  }
}

function getPriorityLabel(value: string) {
  switch (value) {
    case "low":
      return "ต่ำ";
    case "medium":
      return "ปานกลาง";
    case "high":
      return "สูง";
    case "urgent":
      return "เร่งด่วน";
    default:
      return value;
  }
}

const statusOptions: Array<{ value: RepairStatusValue; label: string }> = [
  { value: "pending", label: "รอรับเรื่อง" },
  { value: "in_progress", label: "กำลังดำเนินการ" },
  { value: "waiting_parts", label: "รออะไหล่" },
  { value: "completed", label: "เสร็จสิ้น" },
  { value: "cancelled", label: "ยกเลิก" },
];

export default function OwnerRepairs() {
  const [viewportWidth, setViewportWidth] = useState<number>(() => {
    if (typeof window === "undefined") return 1440;
    return window.innerWidth;
  });

  const isMobile = viewportWidth <= MOBILE_BREAKPOINT;
  const isTablet = viewportWidth <= TABLET_BREAKPOINT;

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [repairList, setRepairList] = useState<RepairRequestItem[]>([]);
  const [selectedRepairId, setSelectedRepairId] = useState("");
  const [selectedRepair, setSelectedRepair] = useState<RepairRequestItem | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [statusFilter, setStatusFilter] = useState<RepairStatusValue | "">("");
  const [searchText, setSearchText] = useState("");

  const [status, setStatus] = useState<RepairStatusValue>("pending");
  const [note, setNote] = useState("");
  const [ownerNote, setOwnerNote] = useState("");
  const [afterFiles, setAfterFiles] = useState<File[]>([]);
  const [afterPreviewUrls, setAfterPreviewUrls] = useState<string[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);

  const selectedStatusStyle = useMemo(() => {
    if (!selectedRepair) {
      return { background: "#E5E7EB", color: "#374151" };
    }
    return getStatusColor(selectedRepair.status);
  }, [selectedRepair]);

  const isClosed = selectedRepair
    ? selectedRepair.status === "completed" || selectedRepair.status === "cancelled"
    : false;

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (afterFiles.length === 0) {
      setAfterPreviewUrls([]);
      return;
    }

    const nextUrls = afterFiles.map((file) => URL.createObjectURL(file));
    setAfterPreviewUrls(nextUrls);

    return () => {
      nextUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [afterFiles]);

  async function loadRepairList(options?: {
    keepSelected?: boolean;
    nextSelectedId?: string;
  }) {
    try {
      setLoadingPage(true);
      setErrorMessage("");

      const result = await getOwnerRepairRequests({
        page: 1,
        limit: 100,
        status: statusFilter,
        search: searchText.trim(),
      });

      const items = result.data || [];
      setRepairList(items);

      const preferredId = options?.nextSelectedId;
      const keepSelected = options?.keepSelected !== false;

      if (preferredId && items.some((item) => item.id === preferredId)) {
        setSelectedRepairId(preferredId);
      } else if (
        keepSelected &&
        selectedRepairId &&
        items.some((item) => item.id === selectedRepairId)
      ) {
        setSelectedRepairId(selectedRepairId);
      } else if (items.length > 0) {
        setSelectedRepairId(items[0].id);
      } else {
        setSelectedRepairId("");
        setSelectedRepair(null);
      }
    } catch (error: any) {
      setErrorMessage(error?.message || "โหลดรายการแจ้งซ่อมไม่สำเร็จ");
    } finally {
      setLoadingPage(false);
    }
  }

  async function loadRepairDetail(repairRequestId: string) {
    try {
      setLoadingDetail(true);
      setErrorMessage("");

      const detail = await getOwnerRepairRequestDetail(repairRequestId);
      setSelectedRepair(detail);
      setStatus(detail.status);
      setOwnerNote(detail.ownerNote || "");
      setNote("");
      setAfterFiles([]);
      setAfterPreviewUrls([]);
      setFileInputKey((prev) => prev + 1);
    } catch (error: any) {
      setErrorMessage(error?.message || "โหลดรายละเอียดแจ้งซ่อมไม่สำเร็จ");
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => {
    loadRepairList({ keepSelected: false });
  }, []);

  useEffect(() => {
    if (!selectedRepairId) {
      setSelectedRepair(null);
      return;
    }

    loadRepairDetail(selectedRepairId);
  }, [selectedRepairId]);

  async function handleSearch() {
    await loadRepairList({ keepSelected: false });
  }

  async function handleUpdateRepair() {
    if (!selectedRepair) return;

    try {
      setSubmitting(true);
      setErrorMessage("");

      const afterImageUrls = await uploadRepairImages(afterFiles, "after");

      const updated = await updateOwnerRepairRequestStatus(selectedRepair.id, {
        status,
        note: note.trim() || undefined,
        owner_note: ownerNote.trim() || "",
        after_image_urls: afterImageUrls,
      });

      setSelectedRepair(updated);
      setRepairList((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
      );
      setNote("");
      setAfterFiles([]);
      setAfterPreviewUrls([]);
      setFileInputKey((prev) => prev + 1);

      window.alert("บันทึกการอัปเดตสำเร็จ");
    } catch (error: any) {
      window.alert(error?.message || "อัปเดตรายการแจ้งซ่อมไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  const cardStyle = {
    background: "#FFFFFF",
    borderRadius: isMobile ? 16 : 20,
    padding: isMobile ? 14 : isTablet ? 16 : 18,
    boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
    minWidth: 0,
  } as const;

  const fieldHeight = isMobile ? 42 : 44;
  const compactTextAreaRows = isMobile ? 3 : 3;

  return (
    <div
      style={{
        padding: isMobile ? "14px 10px 20px" : isTablet ? 16 : 20,
        background: "#F7F7F8",
        minHeight: "100vh",
        overflowX: "hidden",
      }}
    >
      <div style={{ maxWidth: 1380, margin: "0 auto" }}>
        <h1
          style={{
            fontSize: isMobile ? 24 : isTablet ? 30 : 34,
            fontWeight: 700,
            marginBottom: isMobile ? 14 : 18,
            lineHeight: 1.2,
            wordBreak: "break-word",
          }}
        >
          จัดการรายการแจ้งซ่อม
        </h1>

        {errorMessage ? (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 12,
              background: "#FDE2E2",
              color: "#C0392B",
              wordBreak: "break-word",
            }}
          >
            {errorMessage}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : isTablet
                ? "300px minmax(0, 1fr)"
                : "280px minmax(0, 1fr) 260px",
            gap: isMobile ? 14 : 16,
            alignItems: "start",
          }}
        >
          <div
            style={{
              ...cardStyle,
              padding: isMobile ? 14 : 16,
              maxHeight: isMobile ? undefined : "calc(100vh - 120px)",
              overflowY: isMobile ? "visible" : "auto",
            }}
          >
            <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
              <div>
                <label
                  htmlFor="repair-search"
                  style={{ display: "block", marginBottom: 8, fontWeight: 600 }}
                >
                  ค้นหารายการ
                </label>
                <input
                  id="repair-search"
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="ค้นหาห้อง ผู้เช่า หรือรายการ"
                  style={{
                    width: "100%",
                    height: fieldHeight,
                    borderRadius: 12,
                    border: "1px solid #E5E7EB",
                    padding: "0 14px",
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="repair-status-filter"
                  style={{ display: "block", marginBottom: 8, fontWeight: 600 }}
                >
                  สถานะ
                </label>
                <select
                  id="repair-status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as RepairStatusValue | "")}
                  style={{
                    width: "100%",
                    height: fieldHeight,
                    borderRadius: 12,
                    border: "1px solid #E5E7EB",
                    padding: "0 14px",
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">ทั้งหมด</option>
                  {statusOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleSearch}
                style={{
                  border: "none",
                  borderRadius: 12,
                  background: "#F63D7A",
                  color: "#FFFFFF",
                  height: fieldHeight,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                ค้นหา
              </button>
            </div>

            <h2
              style={{
                fontSize: isMobile ? 20 : 22,
                fontWeight: 700,
                marginBottom: 12,
                lineHeight: 1.25,
                wordBreak: "break-word",
              }}
            >
              รายการทั้งหมด
            </h2>

            {loadingPage ? (
              <div style={{ color: "#6B7280" }}>กำลังโหลดรายการ...</div>
            ) : repairList.length === 0 ? (
              <div style={{ color: "#6B7280" }}>ยังไม่มีรายการแจ้งซ่อม</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {repairList.map((item) => {
                  const style = getStatusColor(item.status);
                  const active = item.id === selectedRepairId;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedRepairId(item.id)}
                      style={{
                        textAlign: "left",
                        border: active
                          ? "2px solid #F63D7A"
                          : "1px solid rgba(0,0,0,0.08)",
                        borderRadius: 16,
                        background: active ? "#FFF5F8" : "#FFFFFF",
                        padding: isMobile ? 12 : 14,
                        cursor: "pointer",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          marginBottom: 6,
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {item.room.buildingName || item.room.buildingCode
                          ? `ตึก ${item.room.buildingName || item.room.buildingCode} ห้อง ${item.room.roomNumber}`
                          : `ห้อง ${item.room.roomNumber}`}
                      </div>

                      <div
                        style={{
                          color: "#4B5563",
                          marginBottom: 6,
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                          overflowWrap: "anywhere",
                        }}
                      >
                        ผู้เช่า: {item.tenant.fullName || "-"}
                      </div>

                      <div
                        style={{
                          color: "#4B5563",
                          marginBottom: 8,
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {item.description}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ color: "#6B7280", fontSize: 14 }}>
                          {formatThaiDate(item.requestedAt)}
                        </span>

                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "5px 10px",
                            borderRadius: 999,
                            fontWeight: 700,
                            fontSize: 13,
                            ...style,
                          }}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: isMobile ? 14 : 16, minWidth: 0 }}>
            <div
              style={{
                ...cardStyle,
                minHeight: isMobile ? undefined : 280,
              }}
            >
              <h2
                style={{
                  fontSize: isMobile ? 20 : 24,
                  fontWeight: 700,
                  marginBottom: 14,
                  lineHeight: 1.25,
                  wordBreak: "break-word",
                }}
              >
                อัปเดตสถานะการซ่อม
              </h2>

              {loadingDetail ? (
                <div style={{ color: "#6B7280" }}>กำลังโหลดรายละเอียด...</div>
              ) : selectedRepair ? (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "1fr"
                        : "repeat(2, minmax(0, 1fr))",
                      gap: 12,
                      marginBottom: 14,
                    }}
                  >
                    <div>
                      <div style={{ color: "#6B7280", marginBottom: 4 }}>ห้อง</div>
                      <div
                        style={{
                          fontWeight: 700,
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {selectedRepair.room.buildingName || selectedRepair.room.buildingCode
                          ? `ตึก ${selectedRepair.room.buildingName || selectedRepair.room.buildingCode} ห้อง ${selectedRepair.room.roomNumber}`
                          : `ห้อง ${selectedRepair.room.roomNumber}`}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: "#6B7280", marginBottom: 4 }}>ผู้เช่า</div>
                      <div
                        style={{
                          fontWeight: 700,
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {selectedRepair.tenant.fullName || "-"}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: "#6B7280", marginBottom: 4 }}>เฟอร์นิเจอร์</div>
                      <div
                        style={{
                          fontWeight: 700,
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {selectedRepair.furniture?.itemName || "-"}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: "#6B7280", marginBottom: 4 }}>หมวดหมู่</div>
                      <div
                        style={{
                          fontWeight: 700,
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {getCategoryLabel(selectedRepair.category)}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: "#6B7280", marginBottom: 4 }}>
                        ความเร่งด่วน
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {getPriorityLabel(selectedRepair.priority)}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: "#6B7280", marginBottom: 4 }}>
                        สถานะปัจจุบัน
                      </div>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "8px 14px",
                          borderRadius: 999,
                          fontWeight: 700,
                          ...selectedStatusStyle,
                        }}
                      >
                        {getStatusLabel(selectedRepair.status)}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ color: "#6B7280", marginBottom: 6 }}>ปัญหา</div>
                    <div
                      style={{
                        fontWeight: 700,
                        lineHeight: 1.55,
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {selectedRepair.description}
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label
                      htmlFor="owner-repair-status"
                      style={{ display: "block", marginBottom: 8, fontWeight: 600 }}
                    >
                      เลือกสถานะ
                    </label>
                    <select
                      id="owner-repair-status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as RepairStatusValue)}
                      disabled={isClosed}
                      style={{
                        width: "100%",
                        height: fieldHeight,
                        borderRadius: 12,
                        border: "1px solid #E5E7EB",
                        padding: "0 14px",
                        fontSize: 14,
                        background: isClosed ? "#F3F4F6" : "#FFFFFF",
                        boxSizing: "border-box",
                      }}
                    >
                      {statusOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label
                      htmlFor="owner-repair-note"
                      style={{ display: "block", marginBottom: 8, fontWeight: 600 }}
                    >
                      หมายเหตุเพิ่มเติม
                    </label>
                    <textarea
                      id="owner-repair-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      disabled={isClosed}
                      placeholder="เช่น ติดต่อช่างแล้ว รอเข้าซ่อมช่วงบ่าย"
                      rows={compactTextAreaRows}
                      style={{
                        width: "100%",
                        borderRadius: 12,
                        border: "1px solid #E5E7EB",
                        padding: 12,
                        fontSize: 15,
                        resize: "vertical",
                        background: isClosed ? "#F3F4F6" : "#FFFFFF",
                        boxSizing: "border-box",
                        fontFamily: "inherit",
                        lineHeight: 1.5,
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label
                      htmlFor="owner-repair-owner-note"
                      style={{ display: "block", marginBottom: 8, fontWeight: 600 }}
                    >
                      บันทึกสำหรับเจ้าของหอ
                    </label>
                    <textarea
                      id="owner-repair-owner-note"
                      value={ownerNote}
                      onChange={(e) => setOwnerNote(e.target.value)}
                      disabled={isClosed}
                      placeholder="เช่น ตรวจเบื้องต้นพบว่าต้องซ่อมบานพับ"
                      rows={compactTextAreaRows}
                      style={{
                        width: "100%",
                        borderRadius: 12,
                        border: "1px solid #E5E7EB",
                        padding: 12,
                        fontSize: 15,
                        resize: "vertical",
                        background: isClosed ? "#F3F4F6" : "#FFFFFF",
                        boxSizing: "border-box",
                        fontFamily: "inherit",
                        lineHeight: 1.5,
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label
                      htmlFor="owner-repair-after-images"
                      style={{ display: "block", marginBottom: 8, fontWeight: 600 }}
                    >
                      แนบรูปหลังซ่อม (ถ้ามี)
                    </label>

                    <input
                      key={fileInputKey}
                      id="owner-repair-after-images"
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={isClosed}
                      onChange={(e) => setAfterFiles(Array.from(e.target.files || []))}
                      style={{
                        width: "100%",
                        borderRadius: 12,
                        border: "1px solid #E5E7EB",
                        padding: 10,
                        fontSize: 13,
                        background: isClosed ? "#F3F4F6" : "#FFFFFF",
                        boxSizing: "border-box",
                      }}
                    />

                    <div
                      style={{
                        marginTop: 8,
                        color: "#6B7280",
                        fontSize: 13,
                        lineHeight: 1.5,
                      }}
                    >
                      อัปโหลดได้หลายรูป รองรับเฉพาะไฟล์รูปภาพ
                    </div>

                    {afterPreviewUrls.length > 0 ? (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile
                            ? "repeat(2, minmax(0, 1fr))"
                            : "repeat(3, minmax(0, 1fr))",
                          gap: 10,
                          marginTop: 12,
                        }}
                      >
                        {afterPreviewUrls.map((url, index) => (
                          <img
                            key={`${url}-${index}`}
                            src={url}
                            alt={`after-preview-${index + 1}`}
                            style={{
                              width: "100%",
                              height: isMobile ? 88 : isTablet ? 96 : 110,
                              objectFit: "cover",
                              borderRadius: 14,
                              border: "1px solid #E5E7EB",
                              display: "block",
                            }}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: isMobile ? "stretch" : "flex-end",
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleUpdateRepair}
                      disabled={submitting || isClosed}
                      style={{
                        border: "none",
                        borderRadius: 12,
                        background: "#F63D7A",
                        color: "#FFFFFF",
                        padding: isMobile ? "12px 16px" : "10px 18px",
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: submitting || isClosed ? "not-allowed" : "pointer",
                        opacity: submitting || isClosed ? 0.7 : 1,
                        width: isMobile ? "100%" : "auto",
                      }}
                    >
                      {submitting ? "กำลังบันทึก..." : "บันทึกการอัปเดต"}
                    </button>
                  </div>

                  {isClosed ? (
                    <div
                      style={{
                        marginTop: 12,
                        color: "#6B7280",
                        fontSize: 14,
                        textAlign: isMobile ? "left" : "right",
                        lineHeight: 1.5,
                      }}
                    >
                      รายการนี้ปิดงานแล้ว ไม่สามารถอัปเดตต่อได้
                    </div>
                  ) : null}
                </>
              ) : (
                <div style={{ color: "#6B7280" }}>ยังไม่มีรายการที่เลือก</div>
              )}
            </div>

            <div
              style={{
                ...cardStyle,
              }}
            >
              <h2
                style={{
                  fontSize: isMobile ? 20 : 22,
                  fontWeight: 700,
                  marginBottom: 12,
                  lineHeight: 1.25,
                  wordBreak: "break-word",
                }}
              >
                รายละเอียดการแจ้งซ่อม
              </h2>

              {selectedRepair ? (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "1fr"
                        : "repeat(2, minmax(0, 1fr))",
                      gap: 12,
                      marginBottom: 14,
                    }}
                  >
                    <div>
                      <div style={{ color: "#6B7280", marginBottom: 4 }}>วันที่แจ้ง</div>
                      <div
                        style={{
                          fontWeight: 700,
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                        }}
                      >
                        {formatThaiDateTime(selectedRepair.requestedAt)}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: "#6B7280", marginBottom: 4 }}>
                        อัปเดตล่าสุด
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                        }}
                      >
                        {formatThaiDateTime(selectedRepair.updatedAt)}
                      </div>
                    </div>
                  </div>

                  {selectedRepair.beforeImages && selectedRepair.beforeImages.length > 0 ? (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontWeight: 700, marginBottom: 10 }}>รูปก่อนซ่อม</div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile
                            ? "1fr"
                            : "repeat(2, minmax(0, 1fr))",
                          gap: 12,
                        }}
                      >
                        {selectedRepair.beforeImages.map((image) => (
                          <img
                            key={image.id}
                            src={image.fileUrl}
                            alt="before-repair"
                            style={{
                              width: "100%",
                              height: isMobile ? 140 : 150,
                              objectFit: "cover",
                              borderRadius: 14,
                              display: "block",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {selectedRepair.afterImages && selectedRepair.afterImages.length > 0 ? (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontWeight: 700, marginBottom: 10 }}>รูปหลังซ่อม</div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile
                            ? "1fr"
                            : "repeat(2, minmax(0, 1fr))",
                          gap: 12,
                        }}
                      >
                        {selectedRepair.afterImages.map((image) => (
                          <img
                            key={image.id}
                            src={image.fileUrl}
                            alt="after-repair"
                            style={{
                              width: "100%",
                              height: isMobile ? 140 : 150,
                              objectFit: "cover",
                              borderRadius: 14,
                              display: "block",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <div style={{ color: "#6B7280" }}>ยังไม่มีรายละเอียดให้แสดง</div>
              )}
            </div>
          </div>

          <div
            style={{
              ...cardStyle,
              gridColumn: isMobile ? "auto" : isTablet ? "1 / -1" : "auto",
              minHeight: isMobile ? undefined : 0,
            }}
          >
            <h2
              style={{
                fontSize: isMobile ? 20 : 24,
                fontWeight: 700,
                marginBottom: 12,
                lineHeight: 1.25,
                wordBreak: "break-word",
              }}
            >
              สถานะงาน
            </h2>

            {selectedRepair ? (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ color: "#6B7280", marginBottom: 4 }}>รายการที่เลือก</div>
                  <div
                    style={{
                      fontWeight: 700,
                      lineHeight: 1.7,
                      wordBreak: "break-word",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {selectedRepair.room.buildingName || selectedRepair.room.buildingCode
                      ? `ตึก ${selectedRepair.room.buildingName || selectedRepair.room.buildingCode} ห้อง ${selectedRepair.room.roomNumber}`
                      : `ห้อง ${selectedRepair.room.roomNumber}`}
                    <br />
                    ผู้เช่า: {selectedRepair.tenant.fullName || "-"}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {(selectedRepair.statusLogs || []).map((log) => {
                    const style = getStatusColor(log.newStatus);
                    return (
                      <div key={log.id} style={{ lineHeight: 1.5 }}>
                        <div style={{ color: "#6B7280", fontSize: 14 }}>
                          {formatThaiDate(log.changedAt)}
                        </div>
                        <div
                          style={{
                            fontWeight: 700,
                            color: style.color,
                            wordBreak: "break-word",
                          }}
                        >
                          • {getStatusLabel(log.newStatus)}
                        </div>
                        <div
                          style={{
                            color: "#4B5563",
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {log.note || "-"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ color: "#6B7280" }}>ยังไม่มีรายการที่เลือก</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}