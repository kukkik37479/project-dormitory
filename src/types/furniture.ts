export type FurnitureConditionStatus = "new" | "good" | "fair" | "damaged";
export type FurnitureUsageStatus =
  | "active"
  | "under_repair"
  | "disposed"
  | "missing";

export type FurnitureRepairStatus =
  | "pending"
  | "in_progress"
  | "waiting_parts"
  | "completed"
  | "cancelled";

export type FurnitureRepairCategory =
  | "electrical"
  | "water"
  | "furniture"
  | "room"
  | "other";

export type FurnitureBuilding = {
  id: string;
  dormId: string;
  buildingCode: string;
  displayName: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type FurnitureRoom = {
  id: string;
  dormId: string;
  buildingId: string;
  buildingCode: string;
  buildingName: string;
  roomNumber: string;
  floorNo: number;
  status: string;
  tenantName: string | null;
  furnitureCount: number;
  hasFurniture: boolean;
  roomLabel: string;
};

export type FurnitureCategory = {
  id: string;
  dormId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type FurnitureRepairSummary = {
  totalRepairs: number;
  openRepairs: number;
  completedRepairs: number;
  cancelledRepairs: number;
  hasOpenRepair: boolean;
  lastReportedAt: string | null;
  lastCompletedAt: string | null;
  latestStatus: FurnitureRepairStatus | null;
};

export type FurnitureRepairHistoryItem = {
  id: string;
  furnitureItemId: string;
  title: string;
  description: string;
  category: FurnitureRepairCategory;
  priority: "low" | "medium" | "high" | "urgent";
  status: FurnitureRepairStatus;
  ownerNote: string | null;
  requestedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
};

export type FurnitureItem = {
  id: string;
  dormId: string;
  roomId: string;
  categoryId: string;
  categoryName: string | null;
  itemName: string;
  quantity: number;
  brand: string | null;
  model: string | null;
  color: string | null;
  sizeDetail: string | null;
  conditionStatus: FurnitureConditionStatus;
  usageStatus: FurnitureUsageStatus;
  purchaseDate: string | null;
  warrantyExpiry: string | null;
  price: number | null;
  note: string | null;
  imageUrl: string | null;
  imagePath: string | null;
  imageFileName: string | null;
  lifespanMonths: number | null;
  monthsUsed: number | null;
  remainingLifespanMonths: number | null;
  createdAt: string;
  updatedAt: string;
  repairSummary: FurnitureRepairSummary;
  repairHistory: FurnitureRepairHistoryItem[];
};

export type FurnitureRoomsResponse = {
  message: string;
  filters: {
    buildings: FurnitureBuilding[];
    floors: number[];
  };
  rooms: FurnitureRoom[];
};

export type FurnitureRoomItemsResponse = {
  message: string;
  room: {
    id: string;
    dormId: string;
    buildingId: string;
    buildingCode: string;
    buildingName: string;
    roomNumber: string;
    floorNo: number;
    status: string;
    tenantName: string | null;
    roomLabel: string;
  };
  summary: {
    totalFurnitureItems: number;
    totalRepairRequests: number;
    openRepairRequests: number;
    completedRepairRequests: number;
  };
  items: FurnitureItem[];
  roomRepairHistory: FurnitureRepairHistoryItem[];
  roomCompletedRepairHistory: FurnitureRepairHistoryItem[];
  roomOpenRepairHistory: FurnitureRepairHistoryItem[];
};

export type FurnitureCategoriesResponse = {
  message: string;
  categories: FurnitureCategory[];
};

export type CreateFurnitureCategoryPayload = {
  name: string;
};

export type CreateFurnitureCategoryResponse = {
  message: string;
  category: FurnitureCategory;
};

export type CreateFurnitureItemPayload = {
  room_id: string;
  category_id: string;
  item_name: string;
  quantity?: number;
  brand?: string | null;
  model?: string | null;
  color?: string | null;
  size_detail?: string | null;
  condition_status?: FurnitureConditionStatus;
  usage_status?: FurnitureUsageStatus;
  purchase_date?: string | null;
  warranty_expiry?: string | null;
  price?: number | null;
  note?: string | null;
  image_url?: string | null;
  image_path?: string | null;
  image_file_name?: string | null;
  lifespan_months?: number | null;
};

export type UpdateFurnitureItemPayload = Partial<CreateFurnitureItemPayload>;

export type CreateFurnitureItemResponse = {
  message: string;
  item: FurnitureItem;
};

export type UpdateFurnitureItemResponse = {
  message: string;
  item: FurnitureItem;
};

export type DeleteFurnitureItemResponse = {
  message: string;
  item: FurnitureItem;
};

export type FurnitureRoomsQuery = {
  search?: string;
  building_id?: string;
  floor_no?: number;
};