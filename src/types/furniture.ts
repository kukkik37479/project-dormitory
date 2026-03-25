export type FurnitureConditionStatus = "new" | "good" | "fair" | "damaged";
export type FurnitureUsageStatus =
  | "active"
  | "under_repair"
  | "disposed"
  | "missing";

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
  items: FurnitureItem[];
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