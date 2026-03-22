export type Announcement = {
  id: string;
  dorm_id: string;
  created_by: string;
  title: string | null;
  content: string;
  publish_date: string;
  is_pinned: boolean;
  status: "draft" | "published" | "archived";
  created_at: string;
  updated_at: string;
  created_by_name?: string | null;
};

export type AnnouncementsResponse = {
  message: string;
  data: Announcement[];
};

export type AnnouncementResponse = {
  message: string;
  data: Announcement;
};

export type DeleteAnnouncementResponse = {
  message: string;
  data: {
    success: boolean;
  };
};

export type CreateAnnouncementPayload = {
  dorm_id: string;
  title?: string;
  content: string;
  publish_date?: string;
  is_pinned?: boolean;
  status?: "draft" | "published" | "archived";
};

export type UpdateAnnouncementPayload = {
  dorm_id: string;
  title?: string;
  content?: string;
  publish_date?: string;
  is_pinned?: boolean;
  status?: "draft" | "published" | "archived";
};