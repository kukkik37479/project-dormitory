import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  cancelMyRepairRequest,
  createRepairRequest,
  getMyRepairRequestDetail,
  getMyRepairRequests,
  getTenantRepairFormOptions,
} from "../service/repair.service";
import { uploadRepairImages } from "../service/repairUpload.service";
import type {
  RepairCategoryValue,
  RepairPriorityValue,
  RepairRequestItem,
  RepairStatusValue,
  TenantRepairFormOptions,
} from "../service/repair.service";

const MOBILE_BREAKPOINT = 768;

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

function getCategoryLabel(value: RepairCategoryValue) {
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

function getPriorityLabel(value: RepairPriorityValue) {
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

function getFormFurnitureCategoryName(
  item?: TenantRepairFormOptions["furniture"][number] | null
) {
  return item?.category?.name?.trim() || "ไม่ระบุหมวดหมู่";
}

function getRepairFurnitureCategoryName(
  item?: RepairRequestItem["furniture"] | null
) {
  return item?.categoryName?.trim() || "";
}

export default function TenantRepair() {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= MOBILE_BREAKPOINT;
  });

  const [loadingPage, setLoadingPage] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [formOptions, setFormOptions] = useState<TenantRepairFormOptions | null>(null);
  const [repairList, setRepairList] = useState<RepairRequestItem[]>([]);
  const [selectedRepairId, setSelectedRepairId] = useState<string>("");
  const [selectedRepair, setSelectedRepair] = useState<RepairRequestItem | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [priority, setPriority] = useState<RepairPriorityValue>("medium");
  const [selectedFurnitureCategory, setSelectedFurnitureCategory] = useState("");
  const [furnitureItemId, setFurnitureItemId] = useState("");
  const [description, setDescription] = useState("");
  const [beforeFiles, setBeforeFiles] = useState<File[]>([]);
  const [beforePreviewUrls, setBeforePreviewUrls] = useState<string[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);

  const selectedStatusStyle = useMemo(() => {
    if (!selectedRepair) {
      return { background: "#E5E7EB", color: "#374151" };
    }
    return getStatusColor(selectedRepair.status);
  }, [selectedRepair]);

  const furnitureCategoryOptions = useMemo(() => {
    const items = formOptions?.furniture || [];
    const seen = new Set<string>();
    const categories: string[] = [];

    items.forEach((item) => {
      const categoryName = getFormFurnitureCategoryName(item);
      if (!seen.has(categoryName)) {
        seen.add(categoryName);
        categories.push(categoryName);
      }
    });

    return categories;
  }, [formOptions]);

  const filteredFurnitureOptions = useMemo(() => {
    const items = formOptions?.furniture || [];
    if (!selectedFurnitureCategory) return items;

    return items.filter(
      (item) => getFormFurnitureCategoryName(item) === selectedFurnitureCategory
    );
  }, [formOptions, selectedFurnitureCategory]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (beforeFiles.length === 0) {
      setBeforePreviewUrls([]);
      return;
    }

    const nextUrls = beforeFiles.map((file) => URL.createObjectURL(file));
    setBeforePreviewUrls(nextUrls);

    return () => {
      nextUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [beforeFiles]);

  async function loadInitialData() {
    try {
      setLoadingPage(true);
      setErrorMessage("");

      const [options, repairs] = await Promise.all([
        getTenantRepairFormOptions(),
        getMyRepairRequests({ page: 1, limit: 50 }),
      ]);

      setFormOptions(options);
      setRepairList(repairs.data || []);

      if ((options.priorities || []).length > 0) {
        setPriority(options.priorities[1]?.value || options.priorities[0].value);
      }

      const firstFurniture = (options.furniture || [])[0];
      if (firstFurniture) {
        const firstCategory = getFormFurnitureCategoryName(firstFurniture);
        setSelectedFurnitureCategory(firstCategory);

        const firstMatchedFurniture = (options.furniture || []).find(
          (item) => getFormFurnitureCategoryName(item) === firstCategory
        );

        setFurnitureItemId(firstMatchedFurniture?.id || firstFurniture.id);
      } else {
        setSelectedFurnitureCategory("");
        setFurnitureItemId("");
      }

      if ((repairs.data || []).length > 0) {
        setSelectedRepairId(repairs.data[0].id);
      }
    } catch (error: any) {
      setErrorMessage(error?.message || "โหลดข้อมูลแจ้งซ่อมไม่สำเร็จ");
    } finally {
      setLoadingPage(false);
    }
  }

  async function loadRepairDetail(repairRequestId: string) {
    try {
      setLoadingDetail(true);
      const detail = await getMyRepairRequestDetail(repairRequestId);
      setSelectedRepair(detail);
    } catch (error: any) {
      setErrorMessage(error?.message || "โหลดรายละเอียดแจ้งซ่อมไม่สำเร็จ");
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!selectedRepairId) {
      setSelectedRepair(null);
      return;
    }

    loadRepairDetail(selectedRepairId);
  }, [selectedRepairId]);

  useEffect(() => {
    const items = formOptions?.furniture || [];

    if (items.length === 0) {
      if (furnitureItemId !== "") setFurnitureItemId("");
      return;
    }

    if (!selectedFurnitureCategory) {
      const firstCategory = getFormFurnitureCategoryName(items[0]);
      setSelectedFurnitureCategory(firstCategory);
      return;
    }

    const matchedItems = items.filter(
      (item) => getFormFurnitureCategoryName(item) === selectedFurnitureCategory
    );

    if (matchedItems.length === 0) {
      if (furnitureItemId !== "") setFurnitureItemId("");
      return;
    }

    const hasSelectedFurniture = matchedItems.some((item) => item.id === furnitureItemId);

    if (!hasSelectedFurniture) {
      setFurnitureItemId(matchedItems[0].id);
    }
  }, [formOptions, selectedFurnitureCategory, furnitureItemId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!description.trim()) {
      window.alert("กรุณาระบุปัญหาที่ต้องการแจ้งซ่อม");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      const beforeImageUrls = await uploadRepairImages(beforeFiles, "before");

      const created = await createRepairRequest({
        category: "furniture",
        priority,
        description: description.trim(),
        furniture_item_id: furnitureItemId || null,
        before_image_urls: beforeImageUrls,
      });

      setDescription("");
      setBeforeFiles([]);
      setBeforePreviewUrls([]);
      setFileInputKey((prev) => prev + 1);

      const nextList = [created, ...repairList];
      setRepairList(nextList);
      setSelectedRepairId(created.id);
      setSelectedRepair(created);

      window.alert("สร้างรายการแจ้งซ่อมสำเร็จ");
    } catch (error: any) {
      window.alert(error?.message || "สร้างรายการแจ้งซ่อมไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelSelectedRepair() {
    if (!selectedRepair) return;
    if (selectedRepair.status !== "pending") return;

    const note = window.prompt("ระบุเหตุผลที่ต้องการยกเลิก", "ผู้เช่ายกเลิกรายการแจ้งซ่อม");
    if (note === null) return;

    try {
      setCancelling(true);
      const updated = await cancelMyRepairRequest(selectedRepair.id, { note });

      setSelectedRepair(updated);
      setRepairList((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
      );

      window.alert("ยกเลิกรายการแจ้งซ่อมสำเร็จ");
    } catch (error: any) {
      window.alert(error?.message || "ยกเลิกรายการแจ้งซ่อมไม่สำเร็จ");
    } finally {
      setCancelling(false);
    }
  }

  const roomLabel = useMemo(() => {
    if (!formOptions?.room) return "-";
    const building = formOptions.room.buildingName || formOptions.room.buildingCode;
    return `${building ? `ตึก ${building} ` : ""}ห้อง ${formOptions.room.roomNumber}`;
  }, [formOptions]);

  const sectionCardStyle: React.CSSProperties = {
    background: "#FFFFFF",
    borderRadius: isMobile ? 20 : 24,
    padding: isMobile ? 16 : 24,
    boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
    minWidth: 0,
  };

  return (
    <div
      style={{
        padding: isMobile ? "18px 12px 24px" : 24,
        background: "#F7F7F8",
        minHeight: "100vh",
        overflowX: "hidden",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <h1
          style={{
            fontSize: isMobile ? 26 : 38,
            fontWeight: 700,
            marginBottom: 8,
            lineHeight: 1.2,
            wordBreak: "break-word",
          }}
        >
          แจ้งซ่อม
        </h1>

        <p
          style={{
            color: "#6B7280",
            marginBottom: isMobile ? 18 : 24,
            fontSize: isMobile ? 14 : 16,
            lineHeight: 1.5,
            wordBreak: "break-word",
          }}
        >
          ห้องปัจจุบัน: {roomLabel}
        </p>

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

        {loadingPage ? (
          <div
            style={{
              padding: isMobile ? 16 : 24,
              borderRadius: isMobile ? 16 : 20,
              background: "#FFFFFF",
              boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
            }}
          >
            กำลังโหลดข้อมูล...
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr",
              gap: isMobile ? 16 : 24,
              alignItems: "start",
            }}
          >
            <div style={sectionCardStyle}>
              <h2
                style={{
                  fontSize: isMobile ? 22 : 30,
                  fontWeight: 700,
                  marginBottom: 18,
                  lineHeight: 1.25,
                  wordBreak: "break-word",
                }}
              >
                รายละเอียดการแจ้งซ่อม
              </h2>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label
                    htmlFor="repair-category"
                    style={{ display: "block", marginBottom: 8, fontWeight: 600 }}
                  >
                    หมวดหมู่
                  </label>
                  <select
                    id="repair-category"
                    value={selectedFurnitureCategory}
                    onChange={(e) => setSelectedFurnitureCategory(e.target.value)}
                    disabled={furnitureCategoryOptions.length === 0}
                    style={{
                      width: "100%",
                      height: 48,
                      borderRadius: 12,
                      border: "1px solid #E5E7EB",
                      padding: "0 14px",
                      fontSize: 15,
                      boxSizing: "border-box",
                      background: "#FFFFFF",
                    }}
                  >
                    {furnitureCategoryOptions.length === 0 ? (
                      <option value="">ยังไม่มีหมวดหมู่เฟอร์นิเจอร์</option>
                    ) : (
                      furnitureCategoryOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label
                    htmlFor="repair-priority"
                    style={{ display: "block", marginBottom: 8, fontWeight: 600 }}
                  >
                    ระดับความเร่งด่วน
                  </label>
                  <select
                    id="repair-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as RepairPriorityValue)}
                    style={{
                      width: "100%",
                      height: 48,
                      borderRadius: 12,
                      border: "1px solid #E5E7EB",
                      padding: "0 14px",
                      fontSize: 15,
                      boxSizing: "border-box",
                      background: "#FFFFFF",
                    }}
                  >
                    {(formOptions?.priorities || []).map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label
                    htmlFor="repair-furniture"
                    style={{ display: "block", marginBottom: 8, fontWeight: 600 }}
                  >
                    เฟอร์นิเจอร์ในห้อง
                  </label>
                  <select
                    id="repair-furniture"
                    value={furnitureItemId}
                    onChange={(e) => setFurnitureItemId(e.target.value)}
                    disabled={filteredFurnitureOptions.length === 0}
                    style={{
                      width: "100%",
                      height: 48,
                      borderRadius: 12,
                      border: "1px solid #E5E7EB",
                      padding: "0 14px",
                      fontSize: 15,
                      boxSizing: "border-box",
                      background: "#FFFFFF",
                    }}
                  >
                    {filteredFurnitureOptions.length === 0 ? (
                      <option value="">ยังไม่มีรายการเฟอร์นิเจอร์ในหมวดนี้</option>
                    ) : (
                      filteredFurnitureOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.itemName}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label
                    htmlFor="repair-description"
                    style={{ display: "block", marginBottom: 8, fontWeight: 600 }}
                  >
                    ระบุปัญหา
                  </label>
                  <textarea
                    id="repair-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="เช่น ตู้บานพับหลวม เตียงโยก โต๊ะขาหัก"
                    rows={isMobile ? 4 : 5}
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      border: "1px solid #E5E7EB",
                      padding: 14,
                      fontSize: 15,
                      resize: "vertical",
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                      lineHeight: 1.5,
                    }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label
                    htmlFor="repair-before-images"
                    style={{ display: "block", marginBottom: 8, fontWeight: 600 }}
                  >
                    แนบรูปก่อนซ่อม (ถ้ามี)
                  </label>

                  <input
                    key={fileInputKey}
                    id="repair-before-images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setBeforeFiles(Array.from(e.target.files || []))}
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      border: "1px solid #E5E7EB",
                      padding: 12,
                      fontSize: 14,
                      background: "#FFFFFF",
                      boxSizing: "border-box",
                    }}
                  />

                  <div style={{ marginTop: 8, color: "#6B7280", fontSize: 13, lineHeight: 1.5 }}>
                    อัปโหลดได้หลายรูป รองรับเฉพาะไฟล์รูปภาพ
                  </div>

                  {beforePreviewUrls.length > 0 ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile
                          ? "repeat(2, minmax(0, 1fr))"
                          : "repeat(3, minmax(0, 1fr))",
                        gap: 12,
                        marginTop: 14,
                      }}
                    >
                      {beforePreviewUrls.map((url, index) => (
                        <img
                          key={`${url}-${index}`}
                          src={url}
                          alt={`before-preview-${index + 1}`}
                          style={{
                            width: "100%",
                            height: isMobile ? 110 : 140,
                            objectFit: "cover",
                            borderRadius: 16,
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
                    type="submit"
                    disabled={submitting}
                    style={{
                      border: "none",
                      borderRadius: 12,
                      background: "#F63D7A",
                      color: "#FFFFFF",
                      padding: isMobile ? "13px 18px" : "12px 20px",
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: submitting ? "not-allowed" : "pointer",
                      opacity: submitting ? 0.7 : 1,
                      width: isMobile ? "100%" : "auto",
                    }}
                  >
                    {submitting ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                </div>
              </form>
            </div>

            <div style={{ display: "grid", gap: isMobile ? 16 : 24 }}>
              <div
                style={{
                  ...sectionCardStyle,
                  minHeight: isMobile ? undefined : 320,
                }}
              >
                <h2
                  style={{
                    fontSize: isMobile ? 22 : 30,
                    fontWeight: 700,
                    marginBottom: 16,
                    lineHeight: 1.25,
                    wordBreak: "break-word",
                  }}
                >
                  สถานะงาน
                </h2>

                {loadingDetail ? (
                  <div>กำลังโหลดรายละเอียด...</div>
                ) : selectedRepair ? (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                        gap: 14,
                        marginBottom: 16,
                      }}
                    >
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
                        <div
                          style={{
                            color: "#6B7280",
                            marginTop: 4,
                            fontSize: 14,
                            lineHeight: 1.5,
                          }}
                        >
                          หมวดหมู่:{" "}
                          {getRepairFurnitureCategoryName(selectedRepair.furniture) ||
                            getCategoryLabel(selectedRepair.category)}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: "#6B7280", marginBottom: 4 }}>ปัญหา</div>
                        <div
                          style={{
                            fontWeight: 700,
                            lineHeight: 1.5,
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {selectedRepair.description}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "8px 14px",
                          borderRadius: 999,
                          fontWeight: 700,
                          fontSize: isMobile ? 13 : 14,
                          ...selectedStatusStyle,
                        }}
                      >
                        {getStatusLabel(selectedRepair.status)}
                      </span>
                    </div>

                    <div
                      style={{
                        marginBottom: 16,
                        color: "#6B7280",
                        lineHeight: 1.5,
                        wordBreak: "break-word",
                      }}
                    >
                      แจ้งเมื่อ {formatThaiDateTime(selectedRepair.requestedAt)}
                    </div>

                    <div style={{ display: "grid", gap: 12 }}>
                      {(selectedRepair.statusLogs || []).map((log) => {
                        const style = getStatusColor(log.newStatus);
                        return (
                          <div key={log.id} style={{ lineHeight: 1.7 }}>
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

                    {(selectedRepair.afterImages || []).length > 0 ? (
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>รูปหลังซ่อม</div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobile
                              ? "1fr"
                              : "repeat(2, minmax(0, 1fr))",
                            gap: 12,
                          }}
                        >
                          {(selectedRepair.afterImages || []).map((image) => (
                            <img
                              key={image.id}
                              src={image.fileUrl}
                              alt="after-repair"
                              style={{
                                width: "100%",
                                height: isMobile ? 180 : 160,
                                objectFit: "cover",
                                borderRadius: 16,
                                display: "block",
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div style={{ color: "#6B7280" }}>ยังไม่มีรายการที่เลือก</div>
                )}
              </div>

              <div style={sectionCardStyle}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: isMobile ? "stretch" : "center",
                    flexDirection: isMobile ? "column" : "row",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <h2
                    style={{
                      fontSize: isMobile ? 22 : 28,
                      fontWeight: 700,
                      lineHeight: 1.25,
                      margin: 0,
                      wordBreak: "break-word",
                    }}
                  >
                    ประวัติการแจ้งซ่อม
                  </h2>

                  {selectedRepair?.status === "pending" ? (
                    <button
                      type="button"
                      onClick={handleCancelSelectedRepair}
                      disabled={cancelling}
                      style={{
                        border: "none",
                        borderRadius: 12,
                        background: "#FDE2E2",
                        color: "#C0392B",
                        padding: "10px 14px",
                        fontWeight: 700,
                        cursor: cancelling ? "not-allowed" : "pointer",
                        opacity: cancelling ? 0.7 : 1,
                        width: isMobile ? "100%" : "auto",
                      }}
                    >
                      {cancelling ? "กำลังยกเลิก..." : "ยกเลิกรายการที่เลือก"}
                    </button>
                  ) : null}
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  {repairList.length === 0 ? (
                    <div style={{ color: "#6B7280" }}>ยังไม่มีประวัติการแจ้งซ่อม</div>
                  ) : (
                    repairList.map((item) => {
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
                            padding: isMobile ? 14 : 16,
                            cursor: "pointer",
                            width: "100%",
                            boxSizing: "border-box",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              flexDirection: isMobile ? "column" : "row",
                              alignItems: isMobile ? "flex-start" : "center",
                              gap: 10,
                              marginBottom: 8,
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 700,
                                lineHeight: 1.45,
                                wordBreak: "break-word",
                                overflowWrap: "anywhere",
                              }}
                            >
                              {item.furniture?.itemName || item.title}
                            </div>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "6px 12px",
                                borderRadius: 999,
                                fontWeight: 700,
                                fontSize: 13,
                                whiteSpace: "nowrap",
                                ...style,
                              }}
                            >
                              {getStatusLabel(item.status)}
                            </span>
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
                              flexDirection: isMobile ? "column" : "row",
                              flexWrap: "wrap",
                              gap: 8,
                              color: "#6B7280",
                              fontSize: 14,
                              lineHeight: 1.5,
                            }}
                          >
                            <span>{formatThaiDate(item.requestedAt)}</span>
                            <span>
                              {getRepairFurnitureCategoryName(item.furniture) ||
                                getCategoryLabel(item.category)}{" "}
                              · {getPriorityLabel(item.priority)}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}