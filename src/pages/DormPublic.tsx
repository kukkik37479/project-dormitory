import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import {
  getPublicDormDetail,
  type PublicDormAmenity,
  type PublicDormDetail,
  type PublicDormImage,
  type PublicReview,
  type PublicRoomType,
  type PublicVacantRoom,
} from "../service/public.service";

type DormLocationState = {
  fromList?: string;
};

type StoredUser = {
  id?: string;
  userId?: string;
  role?: string;
};

type MyDormReviewData = {
  canReview: boolean;
  room_id: string | null;
  review: {
    id: string;
    rating: number;
    comment: string;
  } | null;
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "http://localhost:3000";

const defaultMarkerIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function getAuthToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
}

function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

function formatPrice(price?: number | null) {
  if (price === null || price === undefined) return "-";
  return new Intl.NumberFormat("th-TH").format(price);
}

function formatSize(size?: number | null) {
  if (size === null || size === undefined) return "-";
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 2,
  }).format(size);
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatCoordinate(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }

  return Number(value).toFixed(6);
}

function buildAddress(dorm: PublicDormDetail) {
  return (
    dorm.full_address ||
    [
      dorm.house_no,
      dorm.alley,
      dorm.road,
      dorm.subdistrict,
      dorm.district,
      dorm.province,
    ]
      .filter(Boolean)
      .join(" ") ||
    "-"
  );
}

function getDisplayImages(dorm: PublicDormDetail | null): PublicDormImage[] {
  if (!dorm) return [];
  if (dorm.images && dorm.images.length > 0) return dorm.images;

  if (dorm.cover_image) {
    return [
      {
        id: "cover-image",
        dorm_id: dorm.id,
        image_url: dorm.cover_image,
        public_id: null,
        sort_order: 0,
        is_cover: true,
      },
    ];
  }

  return [];
}

function renderStars(rating: number) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function getDefaultListPath() {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token") || "";
  return token ? "/home" : "/explore";
}

function getRoomDetailPath(roomId: string) {
  return `/public/rooms/${roomId}`;
}

function hasValidCoordinates(
  latitude?: number | null,
  longitude?: number | null
) {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude)
  );
}

function buildGoogleMapUrl(dorm: PublicDormDetail) {
  if (dorm.google_map_url) return dorm.google_map_url;

  if (hasValidCoordinates(dorm.latitude, dorm.longitude)) {
    return `https://www.google.com/maps?q=${dorm.latitude},${dorm.longitude}`;
  }

  return "";
}

function ReadonlyMap({
  latitude,
  longitude,
  dormName,
}: {
  latitude: number;
  longitude: number;
  dormName: string;
}) {
  return (
    <div className="relative mt-5 overflow-hidden rounded-2xl border border-rose-100">
      <MapContainer
        key={`${latitude}-${longitude}`}
        center={[latitude, longitude]}
        zoom={16}
        dragging={false}
        touchZoom={false}
        doubleClickZoom={false}
        scrollWheelZoom={false}
        boxZoom={false}
        keyboard={false}
        zoomControl={false}
        attributionControl={true}
        className="h-[320px] w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} icon={defaultMarkerIcon} />
      </MapContainer>

      <div className="absolute inset-0 z-[400] cursor-default bg-transparent" />

      <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-600 shadow-sm">
        แผนที่ตัวอย่างของ {dormName}
      </div>
    </div>
  );
}

export default function DormPublic() {
  const { dormId } = useParams();
  const location = useLocation();
  const locationState = (location.state as DormLocationState | null) ?? null;
  const backToList = locationState?.fromList || getDefaultListPath();

  const storedUser = getStoredUser();
  const authToken = getAuthToken();
  const isTenant = storedUser?.role === "tenant";

  const [dorm, setDorm] = useState<PublicDormDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [myReviewLoading, setMyReviewLoading] = useState(false);
  const [myReviewData, setMyReviewData] = useState<MyDormReviewData | null>(
    null
  );
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  const loadDorm = useCallback(async () => {
    if (!dormId) {
      setError("ไม่พบรหัสหอพัก");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await getPublicDormDetail(dormId);
      setDorm(data.dorm);
      setActiveImageIndex(0);
    } catch (err) {
      console.error(err);
      setDorm(null);
      setError("ไม่พบข้อมูลหอพักนี้");
    } finally {
      setLoading(false);
    }
  }, [dormId]);

  const loadMyReview = useCallback(async () => {
    if (!dormId || !isTenant || !authToken) {
      setMyReviewData(null);
      return;
    }

    try {
      setMyReviewLoading(true);
      setReviewError("");

      const res = await fetch(
        `${API_BASE_URL}/api/tenants/dorms/${encodeURIComponent(dormId)}/my-review`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "โหลดรีวิวของฉันไม่สำเร็จ");
      }

      const payload = data?.data as MyDormReviewData;
      setMyReviewData(payload || null);

      if (payload?.review) {
        setRating(String(payload.review.rating || 5));
        setComment(payload.review.comment || "");
      } else {
        setRating("5");
        setComment("");
      }
    } catch (err) {
      console.error(err);
      setMyReviewData(null);
      setReviewError("โหลดข้อมูลรีวิวของฉันไม่สำเร็จ");
    } finally {
      setMyReviewLoading(false);
    }
  }, [authToken, dormId, isTenant]);

  useEffect(() => {
    loadDorm();
  }, [loadDorm]);

  useEffect(() => {
    loadMyReview();
  }, [loadMyReview]);

  const images = useMemo(() => getDisplayImages(dorm), [dorm]);
  const activeImage = images[activeImageIndex] || null;
  const addressText = dorm ? buildAddress(dorm) : "-";

  const onSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dormId) return;

    try {
      setSavingReview(true);
      setReviewError("");
      setReviewSuccess("");

      const res = await fetch(
        `${API_BASE_URL}/api/tenants/dorms/${encodeURIComponent(dormId)}/my-review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            rating: Number(rating),
            comment: comment.trim(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "บันทึกรีวิวไม่สำเร็จ");
      }

      setReviewSuccess(data?.message || "บันทึกรีวิวสำเร็จ");
      await Promise.all([loadDorm(), loadMyReview()]);
    } catch (err) {
      console.error(err);
      setReviewError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกรีวิว"
      );
    } finally {
      setSavingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-[#fff7fa] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-rose-100 bg-white p-8 text-center text-gray-500 shadow-sm">
          กำลังโหลดรายละเอียดหอพัก...
        </div>
      </div>
    );
  }

  if (error || !dorm) {
    return (
      <div className="min-h-full bg-[#fff7fa] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-800">
            {error || "ไม่พบข้อมูลหอพัก"}
          </p>
          <div className="mt-4">
            <Link
              to={backToList}
              className="inline-flex items-center rounded-2xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white"
            >
              กลับไปหน้ารายการหอพัก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const hasCoordinates = hasValidCoordinates(dorm.latitude, dorm.longitude);
  const mapLink = buildGoogleMapUrl(dorm);

  return (
    <div className="min-h-full bg-[#fff7fa]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5">
          <Link
            to={backToList}
            className="inline-flex items-center rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600"
          >
            ← กลับไปหน้ารายการหอพัก
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm">
            <div className="h-[260px] w-full bg-rose-100 sm:h-[360px]">
              {activeImage ? (
                <img
                  src={activeImage.image_url}
                  alt={dorm.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  ไม่มีรูปภาพหอพัก
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-3 p-4 sm:grid-cols-5">
                {images.slice(0, 10).map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={`overflow-hidden rounded-2xl border ${
                      index === activeImageIndex
                        ? "border-rose-400 ring-2 ring-rose-200"
                        : "border-rose-100"
                    }`}
                  >
                    <img
                      src={image.image_url}
                      alt={`${dorm.name}-${index + 1}`}
                      className="h-20 w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
                หอพักเปิดให้เข้าชม
              </span>
              <span className="rounded-full border border-rose-100 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                ห้องทั้งหมด {dorm.total_rooms} ห้อง
              </span>
              <span className="rounded-full border border-rose-100 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                ห้องว่าง{" "}
                {Array.isArray(dorm.vacant_rooms) ? dorm.vacant_rooms.length : 0} ห้อง
              </span>
            </div>

            <h1 className="mt-4 text-2xl font-bold text-gray-900 sm:text-3xl">
              {dorm.name}
            </h1>

            {dorm.name_en ? (
              <p className="mt-1 text-sm text-gray-500">{dorm.name_en}</p>
            ) : null}

            <p className="mt-4 text-sm leading-6 text-gray-600">{addressText}</p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoCard label="เบอร์โทร" value={dorm.phone || "-"} />
              <InfoCard label="ผู้ติดต่อ" value={dorm.contact_name || "-"} />
              <InfoCard
                label="ค่าน้ำ"
                value={`${formatPrice(dorm.water_rate)} บาท/หน่วย`}
              />
              <InfoCard
                label="ค่าไฟ"
                value={`${formatPrice(dorm.electric_rate)} บาท/หน่วย`}
              />
            </div>

            {dorm.price_min !== null || dorm.price_max !== null ? (
              <div className="mt-5 rounded-2xl bg-rose-50 p-4">
                <div className="text-sm text-gray-500">ช่วงราคาโดยประมาณ</div>
                <div className="mt-1 text-xl font-bold text-rose-600">
                  {formatPrice(dorm.price_min)} - {formatPrice(dorm.price_max)} บาท/เดือน
                </div>
              </div>
            ) : null}

            {dorm.description ? (
              <div className="mt-5">
                <h2 className="text-lg font-semibold text-gray-900">
                  รายละเอียดหอพัก
                </h2>
                <p className="mt-2 text-sm leading-7 text-gray-600">
                  {dorm.description}
                </p>
              </div>
            ) : null}
          </section>
        </div>

        {(hasCoordinates || mapLink) && (
          <section className="mt-6 rounded-3xl border border-rose-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">ตำแหน่งที่ตั้ง</h2>
                <p className="mt-1 text-sm text-gray-500">
                  ดูตำแหน่งของหอพักบนแผนที่
                </p>
              </div>

              {mapLink ? (
                <a
                  href={mapLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                >
                  เปิดใน Google Maps
                </a>
              ) : null}
            </div>

            <p className="text-sm leading-6 text-gray-600">{addressText}</p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoCard
                label="Latitude"
                value={formatCoordinate(dorm.latitude)}
              />
              <InfoCard
                label="Longitude"
                value={formatCoordinate(dorm.longitude)}
              />
            </div>

            {hasCoordinates ? (
              <ReadonlyMap
                latitude={Number(dorm.latitude)}
                longitude={Number(dorm.longitude)}
                dormName={dorm.name}
              />
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-rose-200 bg-[#fffafb] p-5 text-sm text-gray-500">
                มีลิงก์แผนที่ แต่ยังไม่มีพิกัด latitude / longitude สำหรับแสดงแผนที่ในหน้า
              </div>
            )}
          </section>
        )}

        <section className="mt-6 rounded-3xl border border-rose-100 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-2xl font-bold text-gray-900">สิ่งอำนวยความสะดวก</h2>

          {dorm.amenities?.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              ยังไม่มีข้อมูลสิ่งอำนวยความสะดวก
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-3">
              {dorm.amenities.map((amenity: PublicDormAmenity) => (
                <span
                  key={amenity.code}
                  className="rounded-full bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700"
                >
                  {amenity.label_th}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-rose-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900">ประเภทห้อง</h2>
            <p className="mt-1 text-sm text-gray-500">
              ข้อมูลประเภทห้องและช่วงราคาในหอพักนี้
            </p>
          </div>

          {dorm.room_types?.length === 0 ? (
            <p className="text-sm text-gray-500">ยังไม่มีข้อมูลประเภทห้อง</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {dorm.room_types.map((roomType: PublicRoomType) => (
                <div
                  key={roomType.id}
                  className="rounded-2xl border border-rose-100 bg-[#fffafb] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {roomType.type_name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {roomType.room_layout || "ไม่ระบุ layout"}
                      </p>
                    </div>

                    <div className="rounded-full border border-rose-100 bg-white px-3 py-1 text-xs font-semibold text-rose-600">
                      {formatPrice(roomType.price_min)} - {formatPrice(roomType.price_max)} บาท
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-gray-600">
                    <span className="rounded-full border border-rose-100 bg-white px-3 py-1">
                      ขนาด {formatSize(roomType.size_sqm)} ตร.ม.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-rose-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900">ห้องว่าง</h2>
            <p className="mt-1 text-sm text-gray-500">
              ห้องที่พร้อมให้เข้าพักในหอพักนี้
            </p>
          </div>

          {dorm.vacant_rooms?.length === 0 ? (
            <p className="text-sm text-gray-500">ตอนนี้ยังไม่มีห้องว่าง</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {dorm.vacant_rooms.map((room: PublicVacantRoom) => (
                <Link
                  key={room.id}
                  to={getRoomDetailPath(room.id)}
                  state={{
                    fromList: backToList,
                    dormPath: location.pathname,
                  }}
                  className="block rounded-2xl border border-rose-100 bg-[#fffafb] p-4 transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        ห้อง {room.room_number}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {room.room_type || "ไม่ระบุประเภทห้อง"}
                      </p>
                    </div>

                    <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
                      ว่าง
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    {room.building_name ? <p>ตึก: {room.building_name}</p> : null}
                    <p>ชั้น: {room.floor_no}</p>
                    <p>ราคา: {formatPrice(room.monthly_rent)} บาท/เดือน</p>
                    {room.note ? <p>หมายเหตุ: {room.note}</p> : null}
                  </div>

                  <div className="mt-4 flex justify-end">
                    <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
                      ดูรายละเอียดห้อง
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-rose-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">รีวิวจากผู้เช่า</h2>
              <p className="mt-1 text-sm text-gray-500">
                ความคิดเห็นจากผู้เข้าพักจริง
              </p>
            </div>

            <div className="text-right">
              <div className="text-xl font-bold text-rose-600">
                {dorm.review_average > 0 ? `${dorm.review_average} / 5` : "-"}
              </div>
              <div className="text-sm text-gray-500">
                ทั้งหมด {dorm.review_count || 0} รีวิว
              </div>
            </div>
          </div>

          {isTenant && (
            <div className="mb-6 rounded-2xl border border-rose-100 bg-[#fffafb] p-5">
              <h3 className="text-lg font-semibold text-gray-900">
                {myReviewData?.review ? "แก้ไขรีวิวของคุณ" : "เขียนรีวิว"}
              </h3>

              {myReviewLoading ? (
                <p className="mt-3 text-sm text-gray-500">
                  กำลังตรวจสอบสิทธิ์รีวิว...
                </p>
              ) : myReviewData?.canReview ? (
                <form onSubmit={onSubmitReview} className="mt-4 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      คะแนน
                    </label>

                    <div className="flex flex-wrap items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const active = star <= Number(rating);

                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(String(star))}
                            className={`text-3xl leading-none transition ${
                              active ? "text-yellow-400" : "text-gray-300"
                            } hover:scale-110`}
                            aria-label={`${star} ดาว`}
                            title={`${star} ดาว`}
                          >
                            ★
                          </button>
                        );
                      })}

                      <span className="ml-2 text-sm font-medium text-gray-600">
                        {rating} ดาว
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      รีวิวของคุณ
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={4}
                      placeholder="พิมพ์ความคิดเห็นเกี่ยวกับหอพักนี้"
                      className="w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm outline-none"
                    />
                  </div>

                  {reviewError ? (
                    <div className="text-sm text-red-500">{reviewError}</div>
                  ) : null}

                  {reviewSuccess ? (
                    <div className="text-sm text-green-600">{reviewSuccess}</div>
                  ) : null}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={savingReview || !comment.trim()}
                      className="rounded-xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {savingReview
                        ? "กำลังบันทึก..."
                        : myReviewData?.review
                        ? "อัปเดตรีวิว"
                        : "ส่งรีวิว"}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="mt-3 text-sm text-gray-500">
                  เฉพาะผู้เช่าที่พักอยู่ในหอนี้เท่านั้นจึงจะรีวิวได้
                </p>
              )}
            </div>
          )}

          {dorm.reviews?.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-rose-200 bg-[#fffafb] p-6 text-center">
              <p className="text-sm font-medium text-gray-700">ยังไม่มีข้อมูลรีวิว</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dorm.reviews.map((review: PublicReview) => (
                <div
                  key={review.id}
                  className="rounded-2xl border border-rose-100 bg-[#fffafb] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-gray-900">
                        {review.reviewer_name}
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        {formatDate(review.created_at)}
                        {review.room_number ? ` • ห้อง ${review.room_number}` : ""}
                        {review.building_name ? ` • ตึก ${review.building_name}` : ""}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-semibold text-rose-600">
                        {review.rating} / 5
                      </div>
                      <div className="text-base tracking-wide text-yellow-500">
                        {renderStars(review.rating)}
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-gray-700">
                    {review.comment}
                  </p>

                  {review.reply ? (
                    <div className="mt-4 rounded-2xl border border-rose-100 bg-white p-4">
                      <div className="text-sm font-semibold text-rose-600">
                        การตอบกลับจากหอพัก
                      </div>
                      <p className="mt-2 text-sm leading-7 text-gray-700">
                        {review.reply.reply_text}
                      </p>
                      <div className="mt-2 text-xs text-gray-400">
                        {formatDate(review.reply.created_at)}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-[#fffafb] p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-gray-900">
        {value}
      </div>
    </div>
  );
}