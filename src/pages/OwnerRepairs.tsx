import { useEffect, useMemo, useState } from "react";
import {
  getOwnerRepairRequestDetail,
  getOwnerRepairRequests,
  updateOwnerRepairRequestStatus,
} from "../service/repair.service";
import { uploadRepairImages } from "../service/repairUpload.service";
import type { RepairRequestItem, RepairStatusValue } from "../service/repair.service";

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

  return (
    <div style={{ padding: 24, background: "#F7F7F8", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>
        <h1 style={{ fontSize: 38, fontWeight: 700, marginBottom: 24 }}>
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
            }}
          >
            {errorMessage}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "340px 1fr 380px",
            gap: 24,
            alignItems: "start",
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 24,
              padding: 20,
              boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
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
                    height: 44,
                    borderRadius: 12,
                    border: "1px solid #E5E7EB",
                    padding: "0 14px",
                    fontSize: 14,
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
                    height: 44,
                    borderRadius: 12,
                    border: "1px solid #E5E7EB",
                    padding: "0 14px",
                    fontSize: 14,
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
                  height: 44,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ค้นหา
              </button>
            </div>

            <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 14 }}>
              รายการทั้งหมด
            </h2>

            {loadingPage ? (
              <div style={{ color: "#6B7280" }}>กำลังโหลดรายการ...</div>
            ) : repairList.length === 0 ? (
              <div style={{ color: "#6B7280" }}>ยังไม่มีรายการแจ้งซ่อม</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
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
                        borderRadius: 18,
                        background: active ? "#FFF5F8" : "#FFFFFF",
                        padding: 16,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>
                        {item.room.buildingName || item.room.buildingCode
                          ? `ตึก ${item.room.buildingName || item.room.buildingCode} ห้อง ${item.room.roomNumber}`
                          : `ห้อง ${item.room.roomNumber}`}
                      </div>

                      <div style={{ color: "#4B5563", marginBottom: 6 }}>
                        ผู้เช่า: {item.tenant.fullName || "-"}
                      </div>

                      <div style={{ color: "#4B5563", marginBottom: 10 }}>
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
                            padding: "6px 12px",
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

          <div style={{ display: "grid", gap: 24 }}>
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 24,
                padding: 24,
                boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
                minHeight: 340,
              }}
            >
              <h2 style={{ fontSize: 30, fontWeight: 700, marginBottom: 18 }}>
                อัปเดตสถานะการซ่อม
              </h2>

              {loadingDetail ? (
                <div style={{ color: "#6B7280" }}>กำลังโหลดรายละเอียด...</div>
              ) : selectedRepair ? (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 16,
                      marginBottom: 18,
                    }}
                  >
                    <div>
                      <div style={{ color: "#6B7280", marginBottom: 4 }}>ห้อง</div>
                      <div style={{ fontWeight: 700 }}>
                        {selectedRepair.room.buildingName || selectedRepair.room.buildingCode
                          ? `ตึก ${selectedRepair.room.buildingName || selectedRepair.room.buildingCode} ห้อง ${selectedRepair.room.roomNumber}`
                          : `ห้อง ${selectedRepair.room.roomNumber}`}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: "#6B7280", marginBottom: 4 }}>ผู้เช่า</div>
                      <div style={{ fontWeight: 700 }}>
                        {selectedRepair.tenant.fullName || "-"}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: "#6B7280", marginBottom: 4 }}>เฟอร์นิเจอร์</div>
                      <div style={{ fontWeight: 700 }}>
                        {selectedRepair.furniture?.itemName || "-"}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: "#6B7280", marginBottom: 4 }}>หมวดหมู่</div>
                      <div style={{ fontWeight: 700 }}>
                        {getCategoryLabel(selectedRepair.category)}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: "#6B7280", marginBottom: 4 }}>
                        ความเร่งด่วน
                      </div>
                      <div style={{ fontWeight: 700 }}>
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

                  <div style={{ marginBottom: 18 }}>
                    <div style={{ color: "#6B7280", marginBottom: 6 }}>ปัญหา</div>
                    <div style={{ fontWeight: 700, lineHeight: 1.7 }}>
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
                        height: 48,
                        borderRadius: 12,
                        border: "1px solid #E5E7EB",
                        padding: "0 14px",
                        fontSize: 15,
                        background: isClosed ? "#F3F4F6" : "#FFFFFF",
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
                      rows={4}
                      style={{
                        width: "100%",
                        borderRadius: 12,
                        border: "1px solid #E5E7EB",
                        padding: 14,
                        fontSize: 15,
                        resize: "vertical",
                        background: isClosed ? "#F3F4F6" : "#FFFFFF",
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
                      rows={4}
                      style={{
                        width: "100%",
                        borderRadius: 12,
                        border: "1px solid #E5E7EB",
                        padding: 14,
                        fontSize: 15,
                        resize: "vertical",
                        background: isClosed ? "#F3F4F6" : "#FFFFFF",
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
                        padding: 12,
                        fontSize: 14,
                        background: isClosed ? "#F3F4F6" : "#FFFFFF",
                      }}
                    />

                    <div style={{ marginTop: 8, color: "#6B7280", fontSize: 13 }}>
                      อัปโหลดได้หลายรูป รองรับเฉพาะไฟล์รูปภาพ
                    </div>

                    {afterPreviewUrls.length > 0 ? (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                          gap: 12,
                          marginTop: 14,
                        }}
                      >
                        {afterPreviewUrls.map((url, index) => (
                          <img
                            key={`${url}-${index}`}
                            src={url}
                            alt={`after-preview-${index + 1}`}
                            style={{
                              width: "100%",
                              height: 140,
                              objectFit: "cover",
                              borderRadius: 16,
                              border: "1px solid #E5E7EB",
                            }}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={handleUpdateRepair}
                      disabled={submitting || isClosed}
                      style={{
                        border: "none",
                        borderRadius: 12,
                        background: "#F63D7A",
                        color: "#FFFFFF",
                        padding: "12px 20px",
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: submitting || isClosed ? "not-allowed" : "pointer",
                        opacity: submitting || isClosed ? 0.7 : 1,
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
                        textAlign: "right",
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
                background: "#FFFFFF",
                borderRadius: 24,
                padding: 24,
                boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
              }}
            >
              <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>
                รายละเอียดการแจ้งซ่อม
              </h2>

              {selectedRepair ? (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 16,
                      marginBottom: 18,
                    }}
                  >
                    <div>
                      <div style={{ color: "#6B7280", marginBottom: 4 }}>วันที่แจ้ง</div>
                      <div style={{ fontWeight: 700 }}>
                        {formatThaiDateTime(selectedRepair.requestedAt)}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: "#6B7280", marginBottom: 4 }}>อัปเดตล่าสุด</div>
                      <div style={{ fontWeight: 700 }}>
                        {formatThaiDateTime(selectedRepair.updatedAt)}
                      </div>
                    </div>
                  </div>

                  {selectedRepair.beforeImages && selectedRepair.beforeImages.length > 0 ? (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontWeight: 700, marginBottom: 10 }}>รูปก่อนซ่อม</div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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
                              height: 180,
                              objectFit: "cover",
                              borderRadius: 16,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {selectedRepair.afterImages && selectedRepair.afterImages.length > 0 ? (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontWeight: 700, marginBottom: 10 }}>รูปหลังซ่อม</div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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
                              height: 180,
                              objectFit: "cover",
                              borderRadius: 16,
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
              background: "#FFFFFF",
              borderRadius: 24,
              padding: 24,
              boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
              minHeight: 640,
            }}
          >
            <h2 style={{ fontSize: 30, fontWeight: 700, marginBottom: 16 }}>
              สถานะงาน
            </h2>

            {selectedRepair ? (
              <>
                <div style={{ marginBottom: 18 }}>
                  <div style={{ color: "#6B7280", marginBottom: 4 }}>
                    รายการที่เลือก
                  </div>
                  <div style={{ fontWeight: 700, lineHeight: 1.7 }}>
                    {selectedRepair.room.buildingName || selectedRepair.room.buildingCode
                      ? `ตึก ${selectedRepair.room.buildingName || selectedRepair.room.buildingCode} ห้อง ${selectedRepair.room.roomNumber}`
                      : `ห้อง ${selectedRepair.room.roomNumber}`}
                    <br />
                    ผู้เช่า: {selectedRepair.tenant.fullName || "-"}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 14 }}>
                  {(selectedRepair.statusLogs || []).map((log) => {
                    const style = getStatusColor(log.newStatus);
                    return (
                      <div key={log.id} style={{ lineHeight: 1.7 }}>
                        <div style={{ color: "#6B7280", fontSize: 14 }}>
                          {formatThaiDate(log.changedAt)}
                        </div>
                        <div style={{ fontWeight: 700, color: style.color }}>
                          • {getStatusLabel(log.newStatus)}
                        </div>
                        <div style={{ color: "#4B5563" }}>{log.note || "-"}</div>
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