export type ChatConversation = {
  id: string;
  dorm_id: string;
  owner_user_id: string;
  tenant_user_id: string;
  room_id: string | null;
  rental_contract_id: string | null;

  last_message_text: string | null;
  last_message_at: string | null;
  last_sender_user_id: string | null;

  created_at: string;
  updated_at: string;

  unread_count: number;

  tenant_name?: string | null;
  tenant_avatar_url?: string | null;
  tenant_phone?: string | null;

  owner_name?: string | null;
  owner_avatar_url?: string | null;
  owner_phone?: string | null;

  dorm_name?: string | null;
  room_number?: string | null;
  building_name?: string | null;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  message_text: string;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  sender_name: string | null;
  sender_avatar_url: string | null;
};

export type ChatConversationsResponse = {
  message: string;
  data: ChatConversation[];
};

export type ChatMessagesResponse = {
  message: string;
  data: ChatMessage[];
};

export type SendMessageResponse = {
  message: string;
  data: {
    id: string;
    conversation_id: string;
    sender_user_id: string;
    message_text: string;
    read_at: string | null;
    created_at: string;
    updated_at: string;
  };
};

export type MarkAsReadResponse = {
  message: string;
  data: {
    success: boolean;
  };
};