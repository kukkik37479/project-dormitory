// src/pages/Bills.tsx
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  createInvoice,
  getDefaultBankAccount,
  getInvoiceFormOptions,
  saveDefaultBankAccount,
  uploadPaymentQrToSupabase,
} from "../service/billing";
import type {
  BillingBuilding,
  BillingFormOptionsResponse,
  BillingRoom,
  BillingSelectedRoomContract,
} from "../types/billing";

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "เกิดข้อผิดพลาด";
}

function getCurrentMonth() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function getToday() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMonthThai(monthValue: string) {
  if (!monthValue) return "-";
  const date = new Date(`${monthValue}-01`);
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateThai(dateValue?: string | null) {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString("th-TH");
}

export default function Bills() {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingBankAccount, setSavingBankAccount] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [response, setResponse] = useState<BillingFormOptionsResponse | null>(
    null
  );

  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [selectedFloorNo, setSelectedFloorNo] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");

  const [billingMonth, setBillingMonth] = useState(getCurrentMonth());
  const [dueDate, setDueDate] = useState(getToday());

  const [tenantName, setTenantName] = useState("");
  const [rentAmount, setRentAmount] = useState(0);
  const [waterUnits, setWaterUnits] = useState(0);
  const [waterRate, setWaterRate] = useState(0);
  const [electricUnits, setElectricUnits] = useState(0);
  const [electricRate, setElectricRate] = useState(0);
  const [otherAmount, setOtherAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);

  const [paymentBankName, setPaymentBankName] = useState("");
  const [paymentAccountName, setPaymentAccountName] = useState("");
  const [paymentAccountNumber, setPaymentAccountNumber] = useState("");
  const [paymentPromptpayId, setPaymentPromptpayId] = useState("");
  const [paymentQrPublicId, setPaymentQrPublicId] = useState("");
  const [qrPreviewUrl, setQrPreviewUrl] = useState("");
  const [qrFile, setQrFile] = useState<File | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const data = await getInvoiceFormOptions({
          building_id: selectedBuildingId || undefined,
          floor_no: selectedFloorNo ? Number(selectedFloorNo) : undefined,
          room_id: selectedRoomId || undefined,
          billing_month: `${billingMonth}-01`,
        });

        if (cancelled) return;

        setResponse(data);

        if (!selectedBuildingId && data.buildings.length > 0) {
          setSelectedBuildingId(data.buildings[0].id);
        }

        if (selectedBuildingId && !selectedFloorNo && data.floors.length > 0) {
          setSelectedFloorNo(String(data.floors[0]));
        }

        if (
          selectedBuildingId &&
          selectedFloorNo &&
          !selectedRoomId &&
          data.rooms.length > 0
        ) {
          setSelectedRoomId(data.rooms[0].id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [selectedBuildingId, selectedFloorNo, selectedRoomId, billingMonth]);

  useEffect(() => {
    let cancelled = false;

    async function loadDefaultBankAccount() {
      try {
        const data = await getDefaultBankAccount();
        if (cancelled || !data.bank_account) return;

        setPaymentBankName(data.bank_account.bank_name || "");
        setPaymentAccountName(data.bank_account.account_name || "");
        setPaymentAccountNumber(data.bank_account.account_number || "");
        setPaymentPromptpayId(data.bank_account.promptpay_id || "");
        setPaymentQrPublicId(data.bank_account.qr_public_id || "");
        setQrPreviewUrl(data.bank_account.qr_image_url || "");
      } catch {
        // เงียบไว้ได้
      }
    }

    loadDefaultBankAccount();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const selected = response?.selected_room_contract;

    if (!selected) {
      setTenantName("");
      return;
    }

    setTenantName(selected.tenant_name || "");
    setRentAmount(Number(selected.base_rent_amount || 0));
    setWaterRate(Number(selected.water_rate || 0));
    setElectricRate(Number(selected.electric_rate || 0));

    if (selected.suggested_due_date) {
      setDueDate(selected.suggested_due_date);
    }

    if (selected.bank_account) {
      setPaymentBankName(selected.bank_account.bank_name || "");
      setPaymentAccountName(selected.bank_account.account_name || "");
      setPaymentAccountNumber(selected.bank_account.account_number || "");
      setPaymentPromptpayId(selected.bank_account.promptpay_id || "");
      setPaymentQrPublicId(selected.bank_account.qr_public_id || "");
      setQrPreviewUrl(selected.bank_account.qr_image_url || "");
    }
  }, [response?.selected_room_contract]);

  const buildings: BillingBuilding[] = response?.buildings ?? [];
  const floors = response?.floors ?? [];
  const rooms: BillingRoom[] = response?.rooms ?? [];
  const selectedRoomContract: BillingSelectedRoomContract | null =
    response?.selected_room_contract ?? null;

  const selectedBuilding =
    buildings.find((building) => building.id === selectedBuildingId) || null;

  const selectedRoom =
    rooms.find((room) => room.id === selectedRoomId) || null;

  const waterAmount = useMemo(() => {
    return Number(waterUnits || 0) * Number(waterRate || 0);
  }, [waterUnits, waterRate]);

  const electricAmount = useMemo(() => {
    return Number(electricUnits || 0) * Number(electricRate || 0);
  }, [electricUnits, electricRate]);

  const grandTotal = useMemo(() => {
    return (
      Number(rentAmount || 0) +
      Number(waterAmount || 0) +
      Number(electricAmount || 0) +
      Number(otherAmount || 0) -
      Number(discountAmount || 0)
    );
  }, [rentAmount, waterAmount, electricAmount, otherAmount, discountAmount]);

  function handleQrFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setQrFile(file);
    setQrPreviewUrl(URL.createObjectURL(file));
    setSuccess("");
  }

  async function handleSaveBankAccount() {
    try {
      setError("");
      setSuccess("");

      if (!paymentBankName.trim()) {
        throw new Error("กรุณากรอกชื่อธนาคาร");
      }

      if (!paymentAccountName.trim()) {
        throw new Error("กรุณากรอกชื่อบัญชี");
      }

      if (!paymentAccountNumber.trim()) {
        throw new Error("กรุณากรอกเลขบัญชี");
      }

      if (!selectedRoomContract?.dorm_id) {
        throw new Error("ไม่พบ dorm id สำหรับอัปโหลด QR");
      }

      setSavingBankAccount(true);

      let qrImageUrl: string | null = qrPreviewUrl || null;
      let qrPublicId: string | null = paymentQrPublicId || null;

      if (qrFile) {
        const uploaded = await uploadPaymentQrToSupabase(
          selectedRoomContract.dorm_id,
          qrFile
        );

        qrImageUrl = uploaded.publicUrl;
        qrPublicId = uploaded.path;
      }

      const result = await saveDefaultBankAccount({
        bank_name: paymentBankName,
        account_name: paymentAccountName,
        account_number: paymentAccountNumber,
        promptpay_id: paymentPromptpayId || "",
        qr_image_url: qrImageUrl,
        qr_public_id: qrPublicId,
      });

      setPaymentBankName(result.bank_account?.bank_name || "");
      setPaymentAccountName(result.bank_account?.account_name || "");
      setPaymentAccountNumber(result.bank_account?.account_number || "");
      setPaymentPromptpayId(result.bank_account?.promptpay_id || "");
      setPaymentQrPublicId(result.bank_account?.qr_public_id || "");
      setQrPreviewUrl(result.bank_account?.qr_image_url || "");
      setQrFile(null);

      setSuccess("บันทึกบัญชีรับเงินของหอสำเร็จ");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingBankAccount(false);
    }
  }

  async function handleCreateInvoice() {
    try {
      setError("");
      setSuccess("");

      if (!selectedBuildingId) {
        throw new Error("กรุณาเลือกตึก");
      }

      if (!selectedFloorNo) {
        throw new Error("กรุณาเลือกชั้น");
      }

      if (!selectedRoomId) {
        throw new Error("กรุณาเลือกห้อง");
      }

      if (!selectedRoomContract?.contract_id) {
        throw new Error("ห้องนี้ยังไม่มีสัญญาเช่าที่ใช้งานอยู่");
      }

      setCreating(true);

      const result = await createInvoice({
        room_id: selectedRoomId,
        billing_month: `${billingMonth}-01`,
        due_date: dueDate,
        base_rent_amount: Number(rentAmount),
        water_units: Number(waterUnits),
        water_rate: Number(waterRate),
        electric_units: Number(electricUnits),
        electric_rate: Number(electricRate),
        other_amount: Number(otherAmount),
        discount_amount: Number(discountAmount),
        status: "unpaid",
      });

      setSuccess(`สร้างบิลสำเร็จ (id: ${result.invoice.id})`);

      setWaterUnits(0);
      setElectricUnits(0);
      setOtherAmount(0);
      setDiscountAmount(0);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          บิลและการชำระเงิน
        </h1>
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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="mb-5">
            <h2 className="text-[28px] font-bold text-slate-900">สร้าง บิล</h2>
            <p className="mt-1 text-sm text-slate-500">
              เลือกตึก ชั้น ห้อง และกรอกข้อมูลค่าน้ำค่าไฟก่อนสร้างบิล
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                ตึก
              </label>
              <select
                value={selectedBuildingId}
                onChange={(e) => {
                  setSelectedBuildingId(e.target.value);
                  setSelectedFloorNo("");
                  setSelectedRoomId("");
                  setSuccess("");
                }}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              >
                <option value="">เลือกตึก</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                ชั้น
              </label>
              <select
                value={selectedFloorNo}
                onChange={(e) => {
                  setSelectedFloorNo(e.target.value);
                  setSelectedRoomId("");
                  setSuccess("");
                }}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              >
                <option value="">เลือกชั้น</option>
                {floors.map((floor) => (
                  <option key={floor} value={floor}>
                    ชั้น {floor}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                ห้อง
              </label>
              <select
                value={selectedRoomId}
                onChange={(e) => {
                  setSelectedRoomId(e.target.value);
                  setSuccess("");
                }}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              >
                <option value="">เลือกห้อง</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    ห้อง {room.room_number}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                ผู้เช่า
              </label>
              <input
                type="text"
                value={tenantName}
                readOnly
                placeholder="ระบบดึงอัตโนมัติ"
                className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-sm outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                รอบเดือน
              </label>
              <input
                type="month"
                value={billingMonth}
                onChange={(e) => {
                  setBillingMonth(e.target.value);
                  setSuccess("");
                }}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                วันครบกำหนดชำระ
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                ค่าเช่า
              </label>
              <input
                type="number"
                value={rentAmount}
                onChange={(e) => setRentAmount(Number(e.target.value))}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                ค่าน้ำ (หน่วย)
              </label>
              <input
                type="number"
                value={waterUnits}
                onChange={(e) => setWaterUnits(Number(e.target.value))}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                ราคาต่อหน่วยน้ำ
              </label>
              <input
                type="number"
                value={waterRate}
                onChange={(e) => setWaterRate(Number(e.target.value))}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                ค่าไฟ (หน่วย)
              </label>
              <input
                type="number"
                value={electricUnits}
                onChange={(e) => setElectricUnits(Number(e.target.value))}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                ราคาต่อหน่วยไฟ
              </label>
              <input
                type="number"
                value={electricRate}
                onChange={(e) => setElectricRate(Number(e.target.value))}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                ค่าอื่น ๆ
              </label>
              <input
                type="number"
                value={otherAmount}
                onChange={(e) => setOtherAmount(Number(e.target.value))}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                ส่วนลด
              </label>
              <input
                type="number"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value))}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 text-sm font-medium text-slate-700">
              ชำระเงินผ่าน QR Code
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center text-sm text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 lg:w-40">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleQrFileChange}
                />
                <span className="mb-1 text-2xl">⬆</span>
                <span>อัปโหลดรูปภาพ</span>
              </label>

              <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    ธนาคาร
                  </label>
                  <input
                    type="text"
                    value={paymentBankName}
                    onChange={(e) => setPaymentBankName(e.target.value)}
                    placeholder="ชื่อธนาคาร"
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    ชื่อบัญชี
                  </label>
                  <input
                    type="text"
                    value={paymentAccountName}
                    onChange={(e) => setPaymentAccountName(e.target.value)}
                    placeholder="ชื่อบัญชี"
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    เลขบัญชี
                  </label>
                  <input
                    type="text"
                    value={paymentAccountNumber}
                    onChange={(e) => setPaymentAccountNumber(e.target.value)}
                    placeholder="เลขบัญชี"
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    พร้อมเพย์
                  </label>
                  <input
                    type="text"
                    value={paymentPromptpayId}
                    onChange={(e) => setPaymentPromptpayId(e.target.value)}
                    placeholder="พร้อมเพย์"
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={handleSaveBankAccount}
                disabled={savingBankAccount}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingBankAccount ? "กำลังบันทึก..." : "บันทึกบัญชีรับเงิน"}
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm text-slate-500">รวมทั้งหมด</div>
              <div className="text-3xl font-bold text-slate-900">
                {formatMoney(grandTotal)} บาท
              </div>
            </div>

            <button
              onClick={handleCreateInvoice}
              disabled={creating || loading || !selectedRoomContract?.contract_id}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-rose-600 px-6 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? "กำลังสร้างบิล..." : "สร้างบิล"}
            </button>
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="mb-5">
            <h2 className="text-[28px] font-bold text-slate-900">
              บิลเดือน {formatMonthThai(billingMonth)} (พรีวิว)
            </h2>
          </div>

          {loading ? (
            <div className="py-10 text-sm text-slate-500">กำลังโหลดข้อมูล...</div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-700">
                <div>
                  ห้อง: <b>{selectedRoom?.room_number || "-"}</b>
                </div>
                <div>
                  ตึก: <b>{selectedBuilding?.display_name || "-"}</b>
                </div>
                <div>
                  ชั้น: <b>{selectedFloorNo || "-"}</b>
                </div>
                <div>
                  ผู้เช่า: <b>{tenantName || "-"}</b>
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <div>
                  วันออกบิล: <b>{formatDateThai(getToday())}</b>
                </div>
                <div>
                  ครบกำหนดชำระ: <b>{formatDateThai(dueDate)}</b>
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-200 pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">ค่าเช่าห้อง</span>
                  <span className="font-semibold text-slate-900">
                    {formatMoney(rentAmount)} บาท
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">ค่าน้ำ</span>
                  <span className="font-semibold text-slate-900">
                    {formatMoney(waterAmount)} บาท
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">ค่าไฟ</span>
                  <span className="font-semibold text-slate-900">
                    {formatMoney(electricAmount)} บาท
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">ค่าอื่น ๆ</span>
                  <span className="font-semibold text-slate-900">
                    {formatMoney(otherAmount)} บาท
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">ส่วนลด</span>
                  <span className="font-semibold text-slate-900">
                    {formatMoney(discountAmount)} บาท
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-base">
                  <span className="font-semibold text-slate-900">รวมทั้งหมด</span>
                  <span className="text-2xl font-bold text-slate-900">
                    {formatMoney(grandTotal)} บาท
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <div className="mb-3 text-lg font-semibold text-slate-900">
                  ชำระเงินผ่าน QR Code
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {qrPreviewUrl ? (
                    <img
                      src={qrPreviewUrl}
                      alt="QR Code"
                      className="h-36 w-36 rounded-2xl border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-36 w-36 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
                      ยังไม่มี QR
                    </div>
                  )}

                  <div className="space-y-2 text-sm text-slate-700">
                    <div>
                      ธนาคาร: <b>{paymentBankName || "-"}</b>
                    </div>
                    <div>
                      ชื่อบัญชี: <b>{paymentAccountName || "-"}</b>
                    </div>
                    <div>
                      เลขบัญชี: <b>{paymentAccountNumber || "-"}</b>
                    </div>
                    <div>
                      พร้อมเพย์: <b>{paymentPromptpayId || "-"}</b>
                    </div>
                  </div>
                </div>

                <div className="mt-5 text-lg font-semibold text-slate-900">
                  กรุณาชำระเงิน: {formatMoney(grandTotal)} บาท
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}