import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { getVacantRooms } from "../service/rooms.service";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  deleteDormImagesFromSupabase,
  getMyDormProfile,
  updateMyDormProfile,
  createDormAmenity,
  deleteDormAmenity,
  getVacancyAnnouncements,
  createVacancyAnnouncement,
  deleteVacancyAnnouncement,
} from "../service/myDorm.service";

function getMyDormCacheKey() {
  try {
    const rawUser =
      localStorage.getItem("user") || sessionStorage.getItem("user");

    if (!rawUser) {
      return "my_dorm_local_cache_v2_guest";
    }

    const user = JSON.parse(rawUser);
    const userId = user?.id || "unknown-user";
    const dormId =
      user?.dorm_id || user?.login_dorm_id || user?.dormId || "unknown-dorm";

    return `my_dorm_local_cache_v2:${userId}:${dormId}`;
  } catch {
    return "my_dorm_local_cache_v2_fallback";
  }
}

type AmenityValue = string;

type AmenityOption = {
  code: string;
  label_th: string;
  sort_order?: number;
  is_active?: boolean;
};

type RoomTypeItem = {
  id?: string;
  type_name: string;
  room_layout: string;
  size_sqm: string;
  price_min: string;
  price_max: string;
};

type PhoneItem = {
  id?: string;
  label: string;
  phone: string;
  sort_order: number;
};

type ImageItem = {
  id?: string;
  image_url: string;
  filename: string;
  is_cover: boolean;
  sort_order: number;
  public_id?: string | null;
  file?: File;
};

type AnnouncementItem = {
  id: string;
  room_id: string;
  room_no: string;
  room_type: string;
  floor: string;
  building: string;
  size_sqm: string;
  price: string;
  status: "draft" | "published";
  note: string | null;
  published_at: string | null;
  created_at: string;
};

type VacancyAnnouncementApiItem = {
  id: string;
  dorm_id: string;
  room_id: string;
  created_by: string;
  status: "draft" | "published" | "archived";
  note?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  room_number: string;
  floor_no: number | string;
  monthly_rent: number | string;
  room_type: string;
  room_status: string;
  building_code?: string | null;
  building_display_name?: string | null;
  size_sqm?: number | string | null;
  room_layout?: string | null;
  created_by_name?: string | null;
};

type DormProfile = {
  id?: string | number;
  name?: string;
  name_en?: string;
  phone?: string;
  full_address?: string;
  road?: string;
  alley?: string;
  subdistrict?: string;
  district?: string;
  province?: string;
  postal_code?: string;
  description?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  water_rate?: string | number | null;
  electric_rate?: string | number | null;
  contact_name?: string;
  contact_email?: string;
  line_id?: string;
  dorm_slug?: string;
  status?: string;
  room_types?: RoomTypeItem[];
  amenities?: AmenityValue[];
  amenity_options?: AmenityOption[];
  contact_phones?: PhoneItem[];
  images?: ImageItem[];
};

type DormForm = {
  name: string;
  name_en: string;
  phone: string;
  full_address: string;
  road: string;
  alley: string;
  subdistrict: string;
  district: string;
  province: string;
  postal_code: string;
  description: string;
  latitude: string;
  longitude: string;
  water_rate: string;
  electric_rate: string;
  contact_name: string;
  contact_email: string;
  line_id: string;
};

type LocalCache = {
  amenities: AmenityValue[];
  roomTypes: RoomTypeItem[];
  phones: PhoneItem[];
  images: ImageItem[];
};

type MyDormResponse = {
  message?: string;
  dorm?: DormProfile;
};

type MapPickerProps = {
  latitude: string;
  longitude: string;
  onPick: (lat: number, lng: number) => void;
};

type VacantRoomItem = {
  id: string;
  room_number: string;
  floor_no: number | string;
  monthly_rent: number | string;
  room_type: string;
  status: string;
  building_code?: string | null;
  building_display_name?: string | null;
  size_sqm?: number | string | null;
  room_layout?: string | null;
};

const initialForm: DormForm = {
  name: "",
  name_en: "",
  phone: "",
  full_address: "",
  road: "",
  alley: "",
  subdistrict: "",
  district: "",
  province: "",
  postal_code: "",
  description: "",
  latitude: "",
  longitude: "",
  water_rate: "",
  electric_rate: "",
  contact_name: "",
  contact_email: "",
  line_id: "",
};

const emptyRoomType: RoomTypeItem = {
  type_name: "",
  room_layout: "",
  size_sqm: "",
  price_min: "",
  price_max: "",
};

function parseNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) return null;

  return parsed;
}

function formatMoney(value: string) {
  const parsed = Number(value || 0);
  if (Number.isNaN(parsed)) return "0";
  return new Intl.NumberFormat("th-TH").format(parsed);
}

function loadLocalCache() {
  try {
    const raw = localStorage.getItem(getMyDormCacheKey());
    return raw ? (JSON.parse(raw) as LocalCache) : null;
  } catch {
    return null;
  }
}

function saveLocalCache(cache: LocalCache) {
  localStorage.setItem(getMyDormCacheKey(), JSON.stringify(cache));
}
async function reverseGeocode(lat: number, lng: number) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
  );

  if (!res.ok) {
    throw new Error("ไม่สามารถดึงข้อมูลที่อยู่ได้");
  }

  return res.json();
}

function MapCenterUpdater({
  latitude,
  longitude,
}: {
  latitude: string;
  longitude: string;
}) {
  const map = useMap();
  const lat = Number(latitude) || 13.7563;
  const lng = Number(longitude) || 100.5018;

  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);

  return null;
}

function MapClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

function DormMapPicker({ latitude, longitude, onPick }: MapPickerProps) {
  const lat = Number(latitude) || 13.7563;
  const lng = Number(longitude) || 100.5018;

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      style={{ height: "320px", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapCenterUpdater latitude={latitude} longitude={longitude} />
      <MapClickHandler onPick={onPick} />
      <Marker position={[lat, lng]} />
    </MapContainer>
  );
}

function normalizeRoomTypes(roomTypes?: RoomTypeItem[]) {
  if (!roomTypes?.length) return [{ ...emptyRoomType }];

  return roomTypes.map((item) => ({
    id: item.id,
    type_name: item.type_name || "",
    room_layout: item.room_layout || "",
    size_sqm: item.size_sqm == null ? "" : String(item.size_sqm),
    price_min: item.price_min == null ? "" : String(item.price_min),
    price_max: item.price_max == null ? "" : String(item.price_max),
  }));
}

function normalizePhones(phones?: PhoneItem[], dormPhone?: string) {
  if (!phones?.length) {
    return [{ label: "เบอร์หลัก", phone: dormPhone || "", sort_order: 0 }];
  }

  return phones.map((item, index) => ({
    id: item.id,
    label: item.label || "",
    phone: item.phone || "",
    sort_order:
      item.sort_order !== undefined && item.sort_order !== null
        ? item.sort_order
        : index,
  }));
}

function normalizeImages(images?: ImageItem[]) {
  if (!images?.length) return [];

  return images.map((item, index) => ({
    id: item.id ? String(item.id) : `image-${index}`,
    image_url: item.image_url || "",
    filename:
      item.filename ||
      item.image_url?.split("/").pop() ||
      `รูปภาพ-${index + 1}`,
    is_cover: Boolean(item.is_cover),
    sort_order:
      item.sort_order !== undefined && item.sort_order !== null
        ? item.sort_order
        : index,
    public_id: item.public_id ?? null,
  }));
}

function getRoomStatusLabel(status: string) {
  if (status === "vacant") return "ว่าง";
  if (status === "occupied") return "มีผู้เช่า";
  if (status === "maintenance") return "ซ่อมบำรุง";
  return status || "-";
}

function getAnnouncementStatusLabel(status: "draft" | "published") {
  if (status === "draft") return "แบบร่าง";
  return "พร้อมแสดง";
}

function getAnnouncementStatusClass(status: "draft" | "published") {
  if (status === "draft") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-green-100 text-green-700";
}

function mapVacancyAnnouncementToUi(
  item: VacancyAnnouncementApiItem
): AnnouncementItem {
  return {
    id: item.id,
    room_id: item.room_id,
    room_no: item.room_number || "",
    room_type: item.room_type || "",
    floor: String(item.floor_no ?? ""),
    building:
      item.building_display_name ||
      (item.building_code ? `อาคาร ${item.building_code}` : ""),
    size_sqm:
      item.size_sqm == null || item.size_sqm === ""
        ? "-"
        : String(item.size_sqm),
    price: String(item.monthly_rent ?? 0),
    status: item.status === "draft" ? "draft" : "published",
    note: item.note ?? null,
    published_at: item.published_at ?? null,
    created_at: item.created_at,
  };
}

function getVacantRoomOptionLabel(room: VacantRoomItem) {
  const building =
    room.building_display_name ||
    (room.building_code ? `อาคาร ${room.building_code}` : "อาคาร");

  return `ห้อง ${room.room_number} ${building} ชั้น ${room.floor_no}`;
}

export default function MyDorm() {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  const [activeTab, setActiveTab] = useState<"info" | "announce">("info");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [vacantRooms, setVacantRooms] = useState<VacantRoomItem[]>([]);
  const [loadingVacantRooms, setLoadingVacantRooms] = useState(false);
  const [loadingVacancyAnnouncements, setLoadingVacancyAnnouncements] =
    useState(false);
  const [selectedVacantRoomId, setSelectedVacantRoomId] = useState("");
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false);
  const [removingAnnouncementId, setRemovingAnnouncementId] = useState<
    string | null
  >(null);

  const [form, setForm] = useState<DormForm>(initialForm);
  const [amenities, setAmenities] = useState<AmenityValue[]>([]);
  const [amenityOptions, setAmenityOptions] = useState<AmenityOption[]>([]);
  const [newAmenityLabel, setNewAmenityLabel] = useState("");
  const [savingAmenity, setSavingAmenity] = useState(false);
  const [roomTypes, setRoomTypes] = useState<RoomTypeItem[]>([
    { ...emptyRoomType },
  ]);
  const [phones, setPhones] = useState<PhoneItem[]>([
    { label: "เบอร์หลัก", phone: "", sort_order: 0 },
  ]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [removedImagePaths, setRemovedImagePaths] = useState<string[]>([]);

  const announcedRoomIds = useMemo(
    () => new Set(announcements.map((item) => item.room_id)),
    [announcements]
  );

  const selectedVacantRoom = useMemo(
    () => vacantRooms.find((item) => item.id === selectedVacantRoomId) || null,
    [vacantRooms, selectedVacantRoomId]
  );

  const loadVacancyAnnouncements = async () => {
    try {
      setLoadingVacancyAnnouncements(true);
      const data = await getVacancyAnnouncements();
      const rows = Array.isArray(data?.data) ? data.data : [];
      setAnnouncements(rows.map(mapVacancyAnnouncementToUi));
    } catch (err) {
      console.error("loadVacancyAnnouncements error:", err);
      setAnnouncements([]);
    } finally {
      setLoadingVacancyAnnouncements(false);
    }
  };

  const loadVacantRooms = async () => {
    try {
      setLoadingVacantRooms(true);
      const data = await getVacantRooms();
      setVacantRooms(data.rooms || []);
    } catch (err) {
      console.error("loadVacantRooms error:", err);
      setVacantRooms([]);
    } finally {
      setLoadingVacantRooms(false);
    }
  };

  const handleCreateAnnouncementFromRoom = async (room: VacantRoomItem) => {
    try {
      setMessage("");
      setError("");
      setSubmittingAnnouncement(true);

      await createVacancyAnnouncement({
        room_id: room.id,
        status: "published",
      });

      await Promise.all([loadVacancyAnnouncements(), loadVacantRooms()]);
      setMessage(`สร้างประกาศห้อง ${room.room_number} เรียบร้อยแล้ว`);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "สร้างประกาศห้องว่างไม่สำเร็จ"
      );
    } finally {
      setSubmittingAnnouncement(false);
    }
  };

  const handleHideAnnouncement = async (announcementId: string) => {
    try {
      setMessage("");
      setError("");
      setRemovingAnnouncementId(announcementId);

      await deleteVacancyAnnouncement(announcementId);
      await Promise.all([loadVacancyAnnouncements(), loadVacantRooms()]);

      setMessage("นำประกาศออกจากรายการแล้ว");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "ลบประกาศห้องว่างไม่สำเร็จ"
      );
    } finally {
      setRemovingAnnouncementId(null);
    }
  };

  const handlePickLocation = async (lat: number, lng: number) => {
    setForm((prev) => ({
      ...prev,
      latitude: String(lat),
      longitude: String(lng),
    }));

    try {
      const data = await reverseGeocode(lat, lng);
      const address = data.address || {};

      setForm((prev) => ({
        ...prev,
        latitude: String(lat),
        longitude: String(lng),
        full_address: data.display_name || prev.full_address,
        subdistrict:
          address.suburb ||
          address.neighbourhood ||
          address.village ||
          address.hamlet ||
          prev.subdistrict,
        district:
          address.county ||
          address.city_district ||
          address.district ||
          address.town ||
          address.city ||
          prev.district,
        province: address.state || address.province || prev.province,
        postal_code: address.postcode || prev.postal_code,
      }));
    } catch (geoError) {
      console.error("reverse geocode error:", geoError);
    }
  };

  useEffect(() => {
    const fetchDormProfile = async () => {
      if (!token) {
        setError("ไม่พบ token สำหรับเข้าสู่ระบบ");
        setLoading(false);
        return;
      }

      try {
        const data: MyDormResponse = await getMyDormProfile();
        const dorm = data.dorm || {};
        const cached = loadLocalCache();

        setAmenityOptions(
          dorm.amenity_options && dorm.amenity_options.length
            ? dorm.amenity_options
            : []
        );

        setForm({
          name: dorm.name || "",
          name_en: dorm.name_en || "",
          phone: dorm.phone || "",
          full_address: dorm.full_address || "",
          road: dorm.road || "",
          alley: dorm.alley || "",
          subdistrict: dorm.subdistrict || "",
          district: dorm.district || "",
          province: dorm.province || "",
          postal_code: dorm.postal_code || "",
          description: dorm.description || "",
          latitude: dorm.latitude == null ? "" : String(dorm.latitude),
          longitude: dorm.longitude == null ? "" : String(dorm.longitude),
          water_rate: dorm.water_rate == null ? "" : String(dorm.water_rate),
          electric_rate:
            dorm.electric_rate == null ? "" : String(dorm.electric_rate),
          contact_name: dorm.contact_name || "",
          contact_email: dorm.contact_email || "",
          line_id: dorm.line_id || "",
        });

        setRoomTypes(
          dorm.room_types?.length
            ? normalizeRoomTypes(dorm.room_types)
            : cached?.roomTypes?.length
            ? cached.roomTypes
            : [{ ...emptyRoomType }]
        );

        setAmenities(
          dorm.amenities?.length
            ? dorm.amenities
            : cached?.amenities?.length
            ? cached.amenities
            : []
        );

        setPhones(
          dorm.contact_phones?.length
            ? normalizePhones(dorm.contact_phones, dorm.phone)
            : cached?.phones?.length
            ? cached.phones
            : [{ label: "เบอร์หลัก", phone: dorm.phone || "", sort_order: 0 }]
        );

        setImages(
          dorm.images?.length
            ? normalizeImages(dorm.images)
            : cached?.images?.length
            ? cached.images
            : []
        );

        setRemovedImagePaths([]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDormProfile();
  }, [token]);

  useEffect(() => {
    if (loading) return;

    saveLocalCache({
      amenities,
      roomTypes,
      phones,
      images: images
        .filter((item) => /^https?:\/\//i.test(item.image_url))
        .map((item) => ({
          id: item.id,
          image_url: item.image_url,
          filename: item.filename,
          is_cover: item.is_cover,
          sort_order: item.sort_order,
          public_id: item.public_id ?? null,
        })),
    });
  }, [amenities, roomTypes, phones, images, loading]);

  useEffect(() => {
    if (!token) return;

    loadVacantRooms();
    loadVacancyAnnouncements();
  }, [token]);

  useEffect(() => {
    if (!vacantRooms.length) {
      setSelectedVacantRoomId("");
      return;
    }

    setSelectedVacantRoomId((prev) => {
      if (prev && vacantRooms.some((item) => item.id === prev)) {
        return prev;
      }
      return vacantRooms[0].id;
    });
  }, [vacantRooms]);

  const handleFormChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAmenityChange = (code: string) => {
    setAmenities((prev) =>
      prev.includes(code)
        ? prev.filter((item) => item !== code)
        : [...prev, code]
    );
  };

  const handleCreateAmenity = async () => {
    const label = newAmenityLabel.trim();
    if (!label) return;

    try {
      setError("");
      setSavingAmenity(true);

      const created = await createDormAmenity(label);

      const newOption: AmenityOption = {
        code: created.code,
        label_th: created.label_th,
        sort_order: 999,
        is_active: true,
      };

      setAmenityOptions((prev) => [...prev, newOption]);
      setAmenities((prev) =>
        prev.includes(newOption.code) ? prev : [...prev, newOption.code]
      );
      setNewAmenityLabel("");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "เพิ่มสิ่งอำนวยความสะดวกไม่สำเร็จ"
      );
    } finally {
      setSavingAmenity(false);
    }
  };

  const handleDeleteAmenityOption = async (code: string) => {
    const confirmed = window.confirm("ต้องการลบสิ่งอำนวยความสะดวกนี้ใช่ไหม");
    if (!confirmed) return;

    try {
      setError("");
      await deleteDormAmenity(code);

      setAmenityOptions((prev) => prev.filter((item) => item.code !== code));
      setAmenities((prev) => prev.filter((item) => item !== code));
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "ลบสิ่งอำนวยความสะดวกไม่สำเร็จ"
      );
    }
  };

  const handleRoomTypeChange = (
    index: number,
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setRoomTypes((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [name]: value } : item))
    );
  };

  const handlePhoneChange = (
    index: number,
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setPhones((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [name]: value } : item))
    );
  };

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newImages = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      image_url: URL.createObjectURL(file),
      filename: file.name,
      is_cover: images.length === 0 && index === 0,
      sort_order: images.length + index,
      public_id: null,
      file,
    }));

    setImages((prev) => [...prev, ...newImages]);
    e.target.value = "";
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const target = prev[index];

      if (target?.public_id) {
        setRemovedImagePaths((old) => [...old, target.public_id as string]);
      }

      const next = prev.filter((_, i) => i !== index);

      if (next.length > 0 && !next.some((img) => img.is_cover)) {
        next[0] = { ...next[0], is_cover: true };
      }

      return next.map((img, i) => ({
        ...img,
        sort_order: i,
      }));
    });
  };

  const handleSaveDorm = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!form.name.trim()) {
      setError("กรุณากรอกชื่อหอพัก");
      return;
    }

    if (!form.name_en.trim()) {
      setError("กรุณากรอกชื่อหอพักภาษาอังกฤษ");
      return;
    }

    if (!form.full_address.trim()) {
      setError("กรุณากรอกที่อยู่");
      return;
    }

    if (!token) {
      setError("ไม่พบ token สำหรับเข้าสู่ระบบ");
      return;
    }

    try {
      setSaving(true);

      const mainPhone =
        phones.find((item) => item.phone.trim())?.phone.trim() ||
        form.phone.trim();

      const data: MyDormResponse = await updateMyDormProfile({
        name: form.name.trim(),
        name_en: form.name_en.trim(),
        phone: mainPhone,
        full_address: form.full_address.trim(),
        road: form.road.trim(),
        alley: form.alley.trim(),
        subdistrict: form.subdistrict.trim(),
        district: form.district.trim(),
        province: form.province.trim(),
        postal_code: form.postal_code.trim(),
        description: form.description.trim(),
        latitude: parseNullableNumber(form.latitude),
        longitude: parseNullableNumber(form.longitude),
        water_rate: parseNullableNumber(form.water_rate),
        electric_rate: parseNullableNumber(form.electric_rate),
        contact_name: form.contact_name.trim(),
        contact_email: form.contact_email.trim(),
        line_id: form.line_id.trim(),
        room_types: roomTypes.map((item, index) => ({
          type_name: item.type_name.trim(),
          room_layout: item.room_layout.trim(),
          size_sqm: parseNullableNumber(item.size_sqm),
          price_min: parseNullableNumber(item.price_min) ?? 0,
          price_max: parseNullableNumber(item.price_max) ?? 0,
          sort_order: index,
          is_active: true,
        })),
        amenities,
        contact_phones: phones
          .filter((item) => item.phone.trim())
          .map((item, index) => ({
            phone: item.phone.trim(),
            label: item.label.trim() || null,
            sort_order: index,
          })),
        images: images.map((item, index) => ({
          image_url: item.image_url,
          public_id: item.public_id ?? null,
          sort_order: index,
          is_cover: item.is_cover,
          file: item.file,
        })),
      });

      const savedDorm = data.dorm;

      if (removedImagePaths.length > 0) {
        try {
          await deleteDormImagesFromSupabase(removedImagePaths);
        } catch (deleteErr) {
          console.error("delete supabase image error:", deleteErr);
        }
      }

      const normalizedRoomTypes = normalizeRoomTypes(savedDorm?.room_types);
      const normalizedAmenities = savedDorm?.amenities || amenities;
      const normalizedPhones = normalizePhones(
        savedDorm?.contact_phones,
        savedDorm?.phone || form.phone
      );
      const normalizedImages = normalizeImages(savedDorm?.images);

      setRoomTypes(normalizedRoomTypes);
      setAmenities(normalizedAmenities);
      setPhones(normalizedPhones);
      setImages(normalizedImages);
      setRemovedImagePaths([]);

      saveLocalCache({
        amenities: normalizedAmenities,
        roomTypes: normalizedRoomTypes,
        phones: normalizedPhones,
        images: normalizedImages,
      });

      setMessage(
        "บันทึกข้อมูลหอพัก ประเภทห้อง สิ่งอำนวยความสะดวก เบอร์ติดต่อ และรูปภาพเรียบร้อยแล้ว"
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] p-6">
        <div className="rounded-[28px] bg-white p-6 text-lg font-semibold shadow-sm">
          กำลังโหลดข้อมูลหอพัก...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-3xl font-extrabold text-gray-900">
          หอของฉัน
        </h1>

        <div className="rounded-[28px] bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center gap-3 border-b pb-4">
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`rounded-xl px-5 py-2.5 font-semibold transition ${
                activeTab === "info"
                  ? "bg-[#ff4f8b] text-white"
                  : "bg-[#f1f2f4] text-gray-700"
              }`}
            >
              ข้อมูลหอพัก
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("announce")}
              className={`rounded-xl px-5 py-2.5 font-semibold transition ${
                activeTab === "announce"
                  ? "bg-[#ff4f8b] text-white"
                  : "bg-[#f1f2f4] text-gray-700"
              }`}
            >
              ประกาศห้องว่าง
            </button>
          </div>

          {activeTab === "info" && (
            <form onSubmit={handleSaveDorm} className="space-y-8">
              <div>
                <h2 className="mb-4 text-xl font-extrabold text-gray-900">
                  1. ข้อมูลที่พัก
                </h2>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      ชื่อหอพัก
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleFormChange}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                      placeholder="กรอกชื่อหอพัก"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      ชื่อหอพักภาษาอังกฤษ
                    </label>
                    <input
                      name="name_en"
                      value={form.name_en}
                      onChange={handleFormChange}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                      placeholder="กรอกชื่อหอพักภาษาอังกฤษ"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      ที่อยู่
                    </label>
                    <input
                      name="full_address"
                      value={form.full_address}
                      onChange={handleFormChange}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                      placeholder="กรอกที่อยู่"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      ถนน
                    </label>
                    <input
                      name="road"
                      value={form.road}
                      onChange={handleFormChange}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                      placeholder="กรอกถนน"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      ซอย
                    </label>
                    <input
                      name="alley"
                      value={form.alley}
                      onChange={handleFormChange}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                      placeholder="กรอกซอย"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      ตำบล
                    </label>
                    <input
                      name="subdistrict"
                      value={form.subdistrict}
                      onChange={handleFormChange}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                      placeholder="กรอกตำบล"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      อำเภอ / เขต
                    </label>
                    <input
                      name="district"
                      value={form.district}
                      onChange={handleFormChange}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                      placeholder="กรอกอำเภอ / เขต"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      จังหวัด
                    </label>
                    <input
                      name="province"
                      value={form.province}
                      onChange={handleFormChange}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                      placeholder="กรอกจังหวัด"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      รหัสไปรษณีย์
                    </label>
                    <input
                      name="postal_code"
                      value={form.postal_code}
                      onChange={handleFormChange}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                      placeholder="กรอกรหัสไปรษณีย์"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Latitude
                    </label>
                    <input
                      name="latitude"
                      value={form.latitude}
                      onChange={handleFormChange}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                      placeholder="13.7563317"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Longitude
                    </label>
                    <input
                      name="longitude"
                      value={form.longitude}
                      onChange={handleFormChange}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                      placeholder="100.5017651"
                    />
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-3xl border border-gray-200 bg-[#f8f8fb]">
                  <DormMapPicker
                    latitude={form.latitude}
                    longitude={form.longitude}
                    onPick={handlePickLocation}
                  />
                </div>
              </div>

              <div>
                <h2 className="mb-4 text-xl font-extrabold text-gray-900">
                  2. สิ่งอำนวยความสะดวก
                </h2>

                <div className="mb-4 flex flex-col gap-3 md:flex-row">
                  <input
                    value={newAmenityLabel}
                    onChange={(e) => setNewAmenityLabel(e.target.value)}
                    className="h-12 flex-1 rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                    placeholder="เพิ่มสิ่งอำนวยความสะดวกใหม่ เช่น อินเทอร์เน็ต Wi-Fi"
                  />

                  <button
                    type="button"
                    onClick={handleCreateAmenity}
                    disabled={savingAmenity || !newAmenityLabel.trim()}
                    className="h-12 rounded-xl bg-[#ff4f8b] px-6 font-semibold text-white shadow hover:opacity-95 disabled:opacity-60"
                  >
                    {savingAmenity ? "กำลังเพิ่ม..." : "เพิ่มรายการ"}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {amenityOptions.map((item) => (
                    <div
                      key={item.code}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 py-3"
                    >
                      <label className="flex flex-1 items-center gap-3">
                        <input
                          type="checkbox"
                          checked={amenities.includes(item.code)}
                          onChange={() => handleAmenityChange(item.code)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {item.label_th}
                        </span>
                      </label>

                      {item.code.startsWith("custom_") && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAmenityOption(item.code)}
                          className="rounded-lg bg-[#ef4444] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
                        >
                          ลบ
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {amenityOptions.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
                    ยังไม่มีรายการสิ่งอำนวยความสะดวก
                  </div>
                )}
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-extrabold text-gray-900">
                    3. ประเภทห้อง
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      setRoomTypes((prev) => [...prev, { ...emptyRoomType }])
                    }
                    className="rounded-xl bg-[#ff4f8b] px-5 py-2.5 font-semibold text-white shadow hover:opacity-95"
                  >
                    เพิ่มประเภทห้อง
                  </button>
                </div>

                <div className="space-y-4">
                  {roomTypes.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-gray-200 bg-[#fcfcfd] p-5"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div className="font-bold text-gray-900">
                          ประเภทห้องที่ {index + 1}
                        </div>
                        {roomTypes.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setRoomTypes((prev) =>
                                prev.filter((_, i) => i !== index)
                              )
                            }
                            className="rounded-xl bg-[#ef4444] px-4 py-2 text-sm font-semibold text-white"
                          >
                            ลบ
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">
                            ประเภทห้อง
                          </label>
                          <input
                            name="type_name"
                            value={item.type_name}
                            onChange={(e) => handleRoomTypeChange(index, e)}
                            className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">
                            รูปแบบห้อง
                          </label>
                          <input
                            name="room_layout"
                            value={item.room_layout}
                            onChange={(e) => handleRoomTypeChange(index, e)}
                            className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">
                            ขนาดห้อง (ตร.ม.)
                          </label>
                          <input
                            name="size_sqm"
                            value={item.size_sqm}
                            onChange={(e) => handleRoomTypeChange(index, e)}
                            className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">
                            ราคาเริ่มต้น
                          </label>
                          <input
                            name="price_min"
                            value={item.price_min}
                            onChange={(e) => handleRoomTypeChange(index, e)}
                            className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">
                            ราคาสูงสุด
                          </label>
                          <input
                            name="price_max"
                            value={item.price_max}
                            onChange={(e) => handleRoomTypeChange(index, e)}
                            className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="mb-4 text-xl font-extrabold text-gray-900">
                  4. ค่าใช้จ่าย
                </h2>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      ค่าน้ำ (บาท/ยูนิต)
                    </label>
                    <input
                      name="water_rate"
                      value={form.water_rate}
                      onChange={handleFormChange}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      ค่าไฟ (บาท/ยูนิต)
                    </label>
                    <input
                      name="electric_rate"
                      value={form.electric_rate}
                      onChange={handleFormChange}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="mb-4 text-xl font-extrabold text-gray-900">
                  5. รายละเอียด
                </h2>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  rows={5}
                  className="w-full rounded-2xl border border-gray-200 bg-[#f8f8fb] px-4 py-3 outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="กรอกรายละเอียดหอพัก"
                />
              </div>

              <div>
                <h2 className="mb-4 text-xl font-extrabold text-gray-900">
                  6. รูปภาพ
                </h2>
                <label className="flex h-40 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-[#f8f8fb] text-sm font-medium text-gray-500">
                  อัพโหลดรูปภาพ (อัพได้หลายรูป)
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </label>

                {images.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                    {images.map((item, index) => (
                      <div
                        key={item.id || `${item.sort_order}-${index}`}
                        className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
                      >
                        <img
                          src={item.image_url}
                          alt={item.filename}
                          className="h-36 w-full object-cover"
                        />
                        <div className="space-y-2 p-3">
                          <div className="truncate text-xs text-gray-500">
                            {item.filename}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setImages((prev) =>
                                  prev.map((img, i) => ({
                                    ...img,
                                    is_cover: i === index,
                                  }))
                                )
                              }
                              className="rounded-lg bg-[#84cc16] px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              ตั้งเป็นปก
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="rounded-lg bg-[#ef4444] px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              ลบ
                            </button>
                          </div>
                          {item.is_cover && (
                            <div className="text-xs font-bold text-pink-600">
                              รูปปกหลัก
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="mb-4 text-xl font-extrabold text-gray-900">
                  7. ข้อมูลสำหรับติดต่อ
                </h2>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      ชื่อผู้ดูแล
                    </label>
                    <input
                      name="contact_name"
                      value={form.contact_name}
                      onChange={handleFormChange}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      อีเมลติดต่อ
                    </label>
                    <input
                      name="contact_email"
                      value={form.contact_email}
                      onChange={handleFormChange}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Line ID
                    </label>
                    <input
                      name="line_id"
                      value={form.line_id}
                      onChange={handleFormChange}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-gray-900">
                      เบอร์ติดต่อเพิ่มเติม
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        setPhones((prev) => [
                          ...prev,
                          { label: "", phone: "", sort_order: prev.length },
                        ])
                      }
                      className="rounded-xl bg-[#ff4f8b] px-5 py-2.5 font-semibold text-white shadow hover:opacity-95"
                    >
                      เพิ่มเบอร์
                    </button>
                  </div>

                  <div className="space-y-3">
                    {phones.map((item, index) => (
                      <div
                        key={item.id || index}
                        className="grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr_90px]"
                      >
                        <input
                          name="label"
                          value={item.label}
                          onChange={(e) => handlePhoneChange(index, e)}
                          className="h-12 rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                          placeholder="ป้ายกำกับ"
                        />
                        <input
                          name="phone"
                          value={item.phone}
                          onChange={(e) => handlePhoneChange(index, e)}
                          className="h-12 rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none focus:ring-2 focus:ring-pink-300"
                          placeholder="เบอร์โทรศัพท์"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setPhones((prev) =>
                              prev.length === 1
                                ? prev
                                : prev.filter((_, i) => i !== index)
                            )
                          }
                          className="h-12 rounded-xl bg-[#ef4444] px-4 font-bold text-white shadow hover:opacity-95"
                        >
                          ลบ
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
                  {message}
                </div>
              )}

              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={saving}
                  className="h-12 rounded-xl bg-[#ff4f8b] px-10 font-bold text-white shadow hover:opacity-95 disabled:opacity-70"
                >
                  {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          )}

          {activeTab === "announce" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-extrabold text-gray-900">
                  ประกาศห้องว่าง
                </h2>

                <div className="rounded-xl bg-[#fff1f6] px-4 py-2 text-sm font-semibold text-[#ff4f8b]">
                  เลือกสร้างประกาศจากห้องที่สถานะเป็น “vacant”
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-pink-200 bg-[#fff8fb] p-4 text-sm text-gray-600">
                ห้องที่เป็น <span className="font-semibold text-[#ff4f8b]">vacant</span>{" "}
                จะเป็นเพียงห้องที่เลือกมาประกาศได้ และเมื่อสร้างประกาศแล้ว
                รายการจะถูกบันทึกลงฐานข้อมูลจริง
              </div>

              <section className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900">
                  เลือกห้องที่จะประกาศ
                </h3>

                {loadingVacantRooms ? (
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500">
                    กำลังโหลดรายการห้องว่าง...
                  </div>
                ) : vacantRooms.length === 0 ? (
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500">
                    ยังไม่มีห้องว่างในระบบ
                  </div>
                ) : (
                  <>
                    <div className="max-w-md">
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        เลือกห้อง
                      </label>
                      <select
                        value={selectedVacantRoomId}
                        onChange={(e) => setSelectedVacantRoomId(e.target.value)}
                        className="h-12 w-full rounded-2xl border border-gray-200 bg-[#f8f8fb] px-4 text-base font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-pink-300"
                      >
                        {vacantRooms.map((room) => (
                          <option key={room.id} value={room.id}>
                            {getVacantRoomOptionLabel(room)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedVacantRoom && (
                      <div className="rounded-2xl border border-gray-200 bg-[#fcfcfd] p-5">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div className="font-bold text-gray-900">
                            {getVacantRoomOptionLabel(selectedVacantRoom)}
                          </div>
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            {getRoomStatusLabel(selectedVacantRoom.status)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                              ประเภทห้อง
                            </label>
                            <input
                              value={selectedVacantRoom.room_type || ""}
                              readOnly
                              className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                              อาคาร
                            </label>
                            <input
                              value={
                                selectedVacantRoom.building_display_name ||
                                (selectedVacantRoom.building_code
                                  ? `อาคาร ${selectedVacantRoom.building_code}`
                                  : "")
                              }
                              readOnly
                              className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                              ชั้น
                            </label>
                            <input
                              value={String(selectedVacantRoom.floor_no ?? "")}
                              readOnly
                              className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                              ขนาดห้อง (ตร.ม.)
                            </label>
                            <input
                              value={
                                selectedVacantRoom.size_sqm == null ||
                                selectedVacantRoom.size_sqm === ""
                                  ? "-"
                                  : String(selectedVacantRoom.size_sqm)
                              }
                              readOnly
                              className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                              ราคา / เดือน
                            </label>
                            <input
                              value={`฿${formatMoney(
                                String(selectedVacantRoom.monthly_rent ?? 0)
                              )}`}
                              readOnly
                              className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8f8fb] px-4 outline-none"
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              handleCreateAnnouncementFromRoom(selectedVacantRoom)
                            }
                            disabled={
                              announcedRoomIds.has(selectedVacantRoom.id) ||
                              submittingAnnouncement
                            }
                            className="rounded-xl bg-[#ff4f8b] px-5 py-2.5 text-sm font-semibold text-white shadow hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {announcedRoomIds.has(selectedVacantRoom.id)
                              ? "อยู่ในรายการประกาศแล้ว"
                              : submittingAnnouncement
                              ? "กำลังสร้างประกาศ..."
                              : "สร้างประกาศจากห้องนี้"}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-bold text-gray-900">
                    รายการประกาศที่เลือกไว้
                  </h3>
                  <div className="text-sm text-gray-500">
                    ทั้งหมด {announcements.length} รายการ
                  </div>
                </div>

                {loadingVacancyAnnouncements ? (
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500">
                    กำลังโหลดประกาศห้องว่าง...
                  </div>
                ) : announcements.length === 0 ? (
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500">
                    ยังไม่มีรายการประกาศที่บันทึกไว้
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-[#f8f8fb] text-left text-gray-700">
                          <tr>
                            <th className="px-4 py-4 font-semibold">ห้องพัก</th>
                            <th className="px-4 py-4 font-semibold">ประเภทห้อง</th>
                            <th className="px-4 py-4 font-semibold">อาคาร / ชั้น</th>
                            <th className="px-4 py-4 font-semibold">ราคา / เดือน</th>
                            <th className="px-4 py-4 font-semibold">สถานะประกาศ</th>
                            <th className="px-4 py-4 font-semibold">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {announcements.map((item) => (
                            <tr key={item.id}>
                              <td className="px-4 py-4 font-semibold text-gray-900">
                                {item.room_no}
                              </td>
                              <td className="px-4 py-4 text-gray-700">
                                {item.room_type || "-"}
                              </td>
                              <td className="px-4 py-4 text-gray-700">
                                {item.building || "-"} / ชั้น {item.floor || "-"}
                              </td>
                              <td className="px-4 py-4 text-gray-700">
                                ฿{formatMoney(item.price)}
                              </td>
                              <td className="px-4 py-4">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getAnnouncementStatusClass(
                                    item.status
                                  )}`}
                                >
                                  {getAnnouncementStatusLabel(item.status)}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <button
                                  type="button"
                                  onClick={() => handleHideAnnouncement(item.id)}
                                  disabled={removingAnnouncementId === item.id}
                                  className="rounded-lg bg-[#ef4444] px-3 py-2 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-60"
                                >
                                  {removingAnnouncementId === item.id
                                    ? "กำลังนำออก..."
                                    : "เอาออกจากรายการ"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}