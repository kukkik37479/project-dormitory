export type FurnitureCondition = "new" | "good" | "damaged" | "needs_repair";
export type FurnitureStatus = "in_use" | "stored" | "lost" | "disposed";

export type FurnitureInput = {
  name: string;
  category: "bed" | "wardrobe" | "desk" | "chair" | "appliance" | "other";
  condition: FurnitureCondition;
  status: FurnitureStatus;
  quantity: number;
  price?: number | null;
  imageUrl?: string | null;
  acquiredAt?: Date | null;
  notes?: string | null;
};

export type Furniture = FurnitureInput & {
  id: string;
  dormId: string;
  roomId: string;
  createdAt: any; // Firebase Timestamp
  updatedAt: any; // Firebase Timestamp
  createdBy?: string | null;
  updatedBy?: string | null;
};
