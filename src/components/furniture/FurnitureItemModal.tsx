import { useEffect, useMemo, useState } from "react";
import {
  createFurnitureCategory,
  createFurnitureItem,
  getFurnitureCategories,
  updateFurnitureItem,
} from "../../service/furniture";
import type {
  CreateFurnitureItemPayload,
  FurnitureCategory,
  FurnitureConditionStatus,
  FurnitureItem,
  FurnitureUsageStatus,
} from "../../types/furniture";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  roomId: string;
  item?: FurnitureItem | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

type FormState = {
  item_name: string;
  category_id: string;
  quantity: string;
  brand: string;
  model: string;
  color: string;
  size_detail: string;
  condition_status: FurnitureConditionStatus;
  usage_status: FurnitureUsageStatus;
  purchase_date: string;
  warranty_expiry: string;
  price: string;
  note: string;
  image_url: string;
  image_path: string;
  image_file_name: string;
  lifespan_months: string;
};

const DEFAULT_FORM: FormState = {
  item_name: "",
  category_id: "",
  quantity: "1",
  brand: "",
  model: "",
  color: "",
  size_detail: "",
  condition_status: "good",
  usage_status: "active",
  purchase_date: "",
  warranty_expiry: "",
  price: "",
  note: "",
  image_url: "",
  image_path: "",
  image_file_name: "",
  lifespan_months: "",
};

function toInputString(value: string | number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function mapItemToForm(item: FurnitureItem): FormState {
  return {
    item_name: item.itemName || "",
    category_id: item.categoryId || "",
    quantity: toInputString(item.quantity || 1),
    brand: item.brand || "",
    model: item.model || "",
    color: item.color || "",
    size_detail: item.sizeDetail || "",
    condition_status: item.conditionStatus || "good",
    usage_status: item.usageStatus || "active",
    purchase_date: item.purchaseDate ? item.purchaseDate.slice(0, 10) : "",
    warranty_expiry: item.warrantyExpiry ? item.warrantyExpiry.slice(0, 10) : "",
    price: toInputString(item.price),
    note: item.note || "",
    image_url: item.imageUrl || "",
    image_path: item.imagePath || "",
    image_file_name: item.imageFileName || "",
    lifespan_months: toInputString(item.lifespanMonths),
  };
}

function toNullableString(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isNaN(num) ? null : num;
}

function toNullableInt(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isInteger(num) ? num : null;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-slate-700">
      {children}
    </label>
  );
}

function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }
) {
  const { className = "", error, ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition ${
        error
          ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
          : "border-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
      } ${className}`}
    />
  );
}

function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }
) {
  const { className = "", error, children, ...rest } = props;
  return (
    <select
      {...rest}
      className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition ${
        error
          ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
          : "border-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
      } ${className}`}
    >
      {children}
    </select>
  );
}

function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }
) {
  const { className = "", error, ...rest } = props;
  return (
    <textarea
      {...rest}
      className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition ${
        error
          ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
          : "border-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
      } ${className}`}
    />
  );
}

export default function FurnitureItemModal({
  open,
  mode,
  roomId,
  item,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [categories, setCategories] = useState<FurnitureCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [error, setError] = useState("");

  const title = mode === "create" ? "เพิ่มเฟอร์นิเจอร์" : "แก้ไขเฟอร์นิเจอร์";

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && item) {
      setForm(mapItemToForm(item));
    } else {
      setForm(DEFAULT_FORM);
    }

    setError("");
    setNewCategoryName("");
  }, [open, mode, item]);

  useEffect(() => {
    if (!open) return;

    async function loadCategories() {
      try {
        setLoadingCategories(true);
        const data = await getFurnitureCategories();
        setCategories(data.categories || []);
      } catch (err: any) {
        setError(err?.message || "โหลดหมวดหมู่ไม่สำเร็จ");
      } finally {
        setLoadingCategories(false);
      }
    }

    loadCategories();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, saving, onClose]);

  const previewImage = useMemo(() => {
    return form.image_url.trim() || "";
  }, [form.image_url]);

  if (!open) return null;

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreateCategory() {
    const name = newCategoryName.trim();
    if (!name) return;

    try {
      setCreatingCategory(true);
      setError("");

      const created = await createFurnitureCategory({ name });
      const nextCategories = [...categories, created.category].sort((a, b) =>
        a.name.localeCompare(b.name, "th")
      );

      setCategories(nextCategories);
      setField("category_id", created.category.id);
      setNewCategoryName("");
    } catch (err: any) {
      setError(err?.message || "สร้างหมวดหมู่ไม่สำเร็จ");
    } finally {
      setCreatingCategory(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.item_name.trim()) {
      setError("กรุณากรอกชื่อเฟอร์นิเจอร์");
      return;
    }

    if (!form.category_id) {
      setError("กรุณาเลือกหมวดหมู่");
      return;
    }

    const quantity = toNullableInt(form.quantity);
    if (quantity === null || quantity <= 0) {
      setError("จำนวนต้องมากกว่า 0");
      return;
    }

    const payload: CreateFurnitureItemPayload = {
      room_id: roomId,
      category_id: form.category_id,
      item_name: form.item_name.trim(),
      quantity,
      brand: toNullableString(form.brand),
      model: toNullableString(form.model),
      color: toNullableString(form.color),
      size_detail: toNullableString(form.size_detail),
      condition_status: form.condition_status,
      usage_status: form.usage_status,
      purchase_date: toNullableString(form.purchase_date),
      warranty_expiry: toNullableString(form.warranty_expiry),
      price: toNullableNumber(form.price),
      note: toNullableString(form.note),
      image_url: toNullableString(form.image_url),
      image_path: toNullableString(form.image_path),
      image_file_name: toNullableString(form.image_file_name),
      lifespan_months: toNullableInt(form.lifespan_months),
    };

    try {
      setSaving(true);
      setError("");

      if (mode === "create") {
        await createFurnitureItem(payload);
      } else if (item?.id) {
        await updateFurnitureItem(item.id, payload);
      }

      await onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[95vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-5xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              กรอกข้อมูลเฟอร์นิเจอร์ของห้องนี้
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
          >
            ปิด
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[calc(95vh-80px)] overflow-y-auto">
          <div className="space-y-6 p-4 sm:p-6">
            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <section className="rounded-2xl border border-slate-200 p-4 sm:p-5">
              <h3 className="text-lg font-bold text-slate-900">ข้อมูลทั่วไป</h3>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="xl:col-span-1">
                  <FieldLabel>ชื่อ</FieldLabel>
                  <Input
                    value={form.item_name}
                    onChange={(e) => setField("item_name", e.target.value)}
                    placeholder="เช่น เตียง 5 ฟุต"
                  />
                </div>

                <div className="xl:col-span-1">
                  <FieldLabel>หมวดหมู่</FieldLabel>
                  <Select
                    value={form.category_id}
                    onChange={(e) => setField("category_id", e.target.value)}
                    disabled={loadingCategories}
                  >
                    <option value="">
                      {loadingCategories ? "กำลังโหลด..." : "เลือกหมวดหมู่"}
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="xl:col-span-1">
                  <FieldLabel>จำนวน</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={(e) => setField("quantity", e.target.value)}
                  />
                </div>

                <div className="md:col-span-2 xl:col-span-3">
                  <FieldLabel>เพิ่มหมวดหมู่ใหม่</FieldLabel>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="เช่น เตียง, โต๊ะ, เครื่องใช้ไฟฟ้า"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={creatingCategory || !newCategoryName.trim()}
                      className="inline-flex shrink-0 items-center justify-center rounded-xl bg-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creatingCategory ? "กำลังเพิ่ม..." : "เพิ่มหมวดหมู่"}
                    </button>
                  </div>
                </div>

                <div>
                  <FieldLabel>ยี่ห้อ</FieldLabel>
                  <Input
                    value={form.brand}
                    onChange={(e) => setField("brand", e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>รุ่น</FieldLabel>
                  <Input
                    value={form.model}
                    onChange={(e) => setField("model", e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>ขนาด</FieldLabel>
                  <Input
                    value={form.size_detail}
                    onChange={(e) => setField("size_detail", e.target.value)}
                    placeholder="เช่น 5 ฟุต"
                  />
                </div>

                <div>
                  <FieldLabel>สี</FieldLabel>
                  <Input
                    value={form.color}
                    onChange={(e) => setField("color", e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4 sm:p-5">
              <h3 className="text-lg font-bold text-slate-900">การใช้งาน</h3>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <FieldLabel>สภาพ</FieldLabel>
                  <Select
                    value={form.condition_status}
                    onChange={(e) =>
                      setField(
                        "condition_status",
                        e.target.value as FurnitureConditionStatus
                      )
                    }
                  >
                    <option value="new">ใหม่</option>
                    <option value="good">ดี</option>
                    <option value="fair">พอใช้</option>
                    <option value="damaged">ชำรุด</option>
                  </Select>
                </div>

                <div>
                  <FieldLabel>สถานะ</FieldLabel>
                  <Select
                    value={form.usage_status}
                    onChange={(e) =>
                      setField(
                        "usage_status",
                        e.target.value as FurnitureUsageStatus
                      )
                    }
                  >
                    <option value="active">ใช้งานอยู่</option>
                    <option value="under_repair">ซ่อมอยู่</option>
                    <option value="disposed">จำหน่ายแล้ว</option>
                    <option value="missing">สูญหาย</option>
                  </Select>
                </div>

                <div>
                  <FieldLabel>อายุการใช้งาน (เดือน)</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    value={form.lifespan_months}
                    onChange={(e) =>
                      setField("lifespan_months", e.target.value)
                    }
                  />
                </div>

                <div>
                  <FieldLabel>วันที่ได้มา</FieldLabel>
                  <Input
                    type="date"
                    value={form.purchase_date}
                    onChange={(e) => setField("purchase_date", e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>วันหมดประกัน</FieldLabel>
                  <Input
                    type="date"
                    value={form.warranty_expiry}
                    onChange={(e) =>
                      setField("warranty_expiry", e.target.value)
                    }
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4 sm:p-5">
              <h3 className="text-lg font-bold text-slate-900">รายละเอียดเพิ่มเติม</h3>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <FieldLabel>ราคา</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={(e) => setField("price", e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <FieldLabel>หมายเหตุ</FieldLabel>
                  <Textarea
                    rows={4}
                    value={form.note}
                    onChange={(e) => setField("note", e.target.value)}
                    placeholder="รายละเอียดเพิ่มเติม"
                  />
                </div>

                <div className="md:col-span-2 xl:col-span-3">
                  <FieldLabel>URL รูปภาพ</FieldLabel>
                  <Input
                    value={form.image_url}
                    onChange={(e) => setField("image_url", e.target.value)}
                    placeholder="ใส่ URL รูปภาพชั่วคราวก่อน"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    ตอนนี้ใช้ URL รูปภาพชั่วคราวก่อน เดี๋ยวขั้นถัดไปค่อยต่ออัปโหลด Supabase Storage
                  </p>
                </div>

                <div className="md:col-span-2 xl:col-span-3">
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                    <div className="mb-3 text-sm font-medium text-slate-700">
                      ตัวอย่างรูปภาพ
                    </div>

                    {previewImage ? (
                      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
                        <img
                          src={previewImage}
                          alt="preview"
                          className="h-56 w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-40 items-center justify-center rounded-2xl bg-white text-sm text-slate-400 ring-1 ring-slate-200">
                        ยังไม่มีรูปภาพ
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}