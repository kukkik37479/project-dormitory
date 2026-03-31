import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiArrowLeft,
  FiMessageCircle,
  FiPlus,
  FiSearch,
  FiSend,
  FiTrash2,
  FiVolume2,
} from "react-icons/fi";
import { supabase } from "../supabase";
import type { Announcement } from "../types/announcement";
import type { ChatConversation, ChatMessage } from "../types/chat";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
} from "../service/announcement.service";
import {
  getChatConversations,
  getChatMessages,
  markChatAsRead,
  sendChatMessage,
} from "../service/chat.service";

const MOBILE_BREAKPOINT = 768;
const REALTIME_REFRESH_DELAY = 250;
const CHAT_PANEL_HEIGHT_DESKTOP = "calc(100vh - 250px)";
const CHAT_PANEL_HEIGHT_MOBILE = "calc(100vh - 210px)";
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);

function getStoredToken(): string | null {
  const candidateKeys = [
    "token",
    "accessToken",
    "authToken",
    "roomie_token",
    "jwt",
    "auth",
    "user",
    "currentUser",
  ];

  const storages = [localStorage, sessionStorage];

  for (const storage of storages) {
    for (const key of candidateKeys) {
      const raw = storage.getItem(key);
      if (!raw) continue;

      if (raw.startsWith("eyJ") || raw.startsWith("Bearer ")) {
        return raw.replace(/^Bearer\s+/i, "");
      }

      try {
        const parsed = JSON.parse(raw);

        const nestedToken =
          parsed?.token ||
          parsed?.accessToken ||
          parsed?.authToken ||
          parsed?.jwt ||
          parsed?.data?.token ||
          parsed?.user?.token ||
          parsed?.user?.accessToken;

        if (typeof nestedToken === "string" && nestedToken.trim()) {
          return nestedToken.replace(/^Bearer\s+/i, "");
        }
      } catch {
        // ignore
      }
    }
  }

  return null;
}

async function markAnnouncementsSeenRequest(dormId?: string | null) {
  const token = getStoredToken();

  if (!token) {
    throw new Error("ไม่พบ token สำหรับอัปเดตการอ่านประกาศ");
  }

  const response = await fetch(`${API_URL}/api/announcements/mark-seen`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dormId ? { dorm_id: dormId } : {}),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(json?.message || "อัปเดตสถานะอ่านประกาศไม่สำเร็จ");
  }

  return json;
}

function getTokenPayload(): Record<string, unknown> | null {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

function getCurrentUserId(): string | null {
  const payload = getTokenPayload();
  return (
    (payload?.id as string) ||
    (payload?.userId as string) ||
    (payload?.user_id as string) ||
    (payload?.sub as string) ||
    null
  );
}

function getCurrentUserRole(): string | null {
  const payload = getTokenPayload();
  return (payload?.role as string) || null;
}

function getCurrentDormId(): string | null {
  const payload = getTokenPayload();
  return (
    (payload?.dormId as string) ||
    (payload?.dorm_id as string) ||
    (payload?.login_dorm_id as string) ||
    null
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAnnouncementDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getConversationMainTitle(
  conversation: ChatConversation,
  role?: string | null
) {
  if (role === "tenant") return "";

  const building = conversation.building_name
    ? `ตึก ${conversation.building_name}`
    : "";
  const room = conversation.room_number ? `ห้อง ${conversation.room_number}` : "";

  const text = [building, room].filter(Boolean).join(" • ");
  return text || conversation.dorm_name || "บทสนทนา";
}

function getConversationPersonName(conversation: ChatConversation) {
  return conversation.tenant_name || conversation.owner_name || "ผู้ใช้งาน";
}

function getConversationPreview(conversation: ChatConversation) {
  return conversation.last_message_text || "ยังไม่มีข้อความ";
}

function sortMessagesByCreatedAt(list: ChatMessage[]) {
  return [...list].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeA - timeB;
  });
}

type LoadOptions = {
  silent?: boolean;
};

type NotificationSummary = {
  chat: number;
  chat_messages?: number;
  announcements?: number;
  payments?: number;
  repairs?: number;
  reviews?: number;
  total?: number;
};

const EMPTY_NOTIFICATION_SUMMARY: NotificationSummary = {
  chat: 0,
  chat_messages: 0,
  announcements: 0,
  payments: 0,
  repairs: 0,
  reviews: 0,
  total: 0,
};

function normalizeCount(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

async function fetchNotificationSummaryRequest() {
  const token = getStoredToken();

  if (!token) {
    return EMPTY_NOTIFICATION_SUMMARY;
  }

  const response = await fetch(`${API_URL}/api/notifications/summary`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(json?.message || "โหลดข้อมูลแจ้งเตือนไม่สำเร็จ");
  }

  const data = json?.data || {};

  return {
    chat: normalizeCount(data.chat),
    chat_messages: normalizeCount(data.chat_messages),
    announcements: normalizeCount(data.announcements),
    payments: normalizeCount(data.payments),
    repairs: normalizeCount(data.repairs),
    reviews: normalizeCount(data.reviews),
    total: normalizeCount(data.total),
  };
}

export default function AnnouncementsChat() {
  const [activeTab, setActiveTab] = useState<"announcement" | "chat">("chat");
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= MOBILE_BREAKPOINT;
  });
  const [mobileChatView, setMobileChatView] = useState<"list" | "detail">(
    "list"
  );

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementDate, setAnnouncementDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );

  const [error, setError] = useState("");
  const [notificationSummary, setNotificationSummary] =
    useState<NotificationSummary>(EMPTY_NOTIFICATION_SUMMARY);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const selectedConversationIdRef = useRef<string | null>(null);
  const isChatDetailVisibleRef = useRef(false);
  const shouldStickToBottomRef = useRef(true);
  const announcementsRefreshTimerRef = useRef<number | null>(null);
  const conversationsRefreshTimerRef = useRef<number | null>(null);
  const markingAnnouncementsSeenRef = useRef(false);

  const currentUserId = useMemo(() => getCurrentUserId(), []);
  const currentUserRole = useMemo(() => getCurrentUserRole(), []);
  const currentDormId = useMemo(() => getCurrentDormId(), []);

  const isOwner = currentUserRole === "owner";
  const isTenant = currentUserRole === "tenant";
  const isChatDetailVisible = !isMobile || mobileChatView === "detail";
  const chatPanelHeight = isMobile
    ? CHAT_PANEL_HEIGHT_MOBILE
    : CHAT_PANEL_HEIGHT_DESKTOP;

  const totalUnread = useMemo(
    () => conversations.reduce((sum, item) => sum + item.unread_count, 0),
    [conversations]
  );

  const announcementUnread = normalizeCount(notificationSummary.announcements);

  const filteredConversations = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return conversations;

    return conversations.filter((conversation) => {
      const pool = [
        conversation.tenant_name,
        conversation.owner_name,
        conversation.room_number,
        conversation.dorm_name,
        conversation.building_name,
        conversation.last_message_text,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return pool.includes(keyword);
    });
  }, [conversations, searchText]);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const showChatList = !isMobile || mobileChatView === "list";
  const showChatDetail = !isMobile || mobileChatView === "detail";

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    isChatDetailVisibleRef.current = isChatDetailVisible;
  }, [isChatDetailVisible]);

  useEffect(() => {
    return () => {
      if (announcementsRefreshTimerRef.current) {
        window.clearTimeout(announcementsRefreshTimerRef.current);
      }
      if (conversationsRefreshTimerRef.current) {
        window.clearTimeout(conversationsRefreshTimerRef.current);
      }
    };
  }, []);

  function isNearBottom() {
    const container = messagesContainerRef.current;
    if (!container) return true;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    return distanceFromBottom < 120;
  }

  function scrollMessagesToBottom(behavior: ScrollBehavior = "smooth") {
    requestAnimationFrame(() => {
      const container = messagesContainerRef.current;
      if (!container) return;

      if (behavior === "auto") {
        container.scrollTop = container.scrollHeight;
        return;
      }

      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    });
  }

  async function loadNotificationSummary(options: LoadOptions = {}) {
    const { silent = false } = options;

    try {
      if (!silent) {
        setError("");
      }

      const data = await fetchNotificationSummaryRequest();
      setNotificationSummary(data);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "โหลดข้อมูลแจ้งเตือนไม่สำเร็จ");
      }
    }
  }

  async function loadConversations(
    keepSelected = true,
    options: LoadOptions = {}
  ) {
    const { silent = false } = options;

    try {
      if (!silent) {
        setLoadingConversations(true);
      }
      setError("");

      const data = await getChatConversations();
      setConversations(data);
      loadNotificationSummary({ silent: true });

      if (data.length === 0) {
        setSelectedConversationId(null);
        setMessages([]);
        return;
      }

      if (keepSelected && selectedConversationIdRef.current) {
        const stillExists = data.some(
          (item) => item.id === selectedConversationIdRef.current
        );
        if (stillExists) return;
      }

      setSelectedConversationId(data[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดรายการแชทไม่สำเร็จ");
    } finally {
      if (!silent) {
        setLoadingConversations(false);
      }
    }
  }

  async function loadMessages(
    conversationId: string,
    shouldMarkAsRead = true,
    options: LoadOptions = {}
  ) {
    const { silent = false } = options;

    try {
      if (!silent) {
        setLoadingMessages(true);
      }
      setError("");

      const data = await getChatMessages(conversationId);
      setMessages(sortMessagesByCreatedAt(data));

      if (shouldMarkAsRead) {
        await markChatAsRead(conversationId);
        const latestConversations = await getChatConversations();
        setConversations(latestConversations);
        loadNotificationSummary({ silent: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดข้อความไม่สำเร็จ");
    } finally {
      if (!silent) {
        setLoadingMessages(false);
      }
    }
  }

  async function markAnnouncementsSeen() {
    if (!isTenant || !currentDormId) return;
    if (markingAnnouncementsSeenRef.current) return;

    try {
      markingAnnouncementsSeenRef.current = true;
      await markAnnouncementsSeenRequest(currentDormId);
      await loadNotificationSummary({ silent: true });
      window.dispatchEvent(new CustomEvent("roomie:notifications-refresh"));
    } catch (err) {
      console.error("markAnnouncementsSeen error:", err);
    } finally {
      markingAnnouncementsSeenRef.current = false;
    }
  }

  async function loadAnnouncements(options: LoadOptions = {}) {
    const { silent = false } = options;

    try {
      if (!currentDormId) {
        throw new Error("ไม่พบ dormId สำหรับโหลดประกาศ");
      }

      if (!silent) {
        setLoadingAnnouncements(true);
      }
      setError("");

      const data = await getAnnouncements(currentDormId);
      setAnnouncements(data);

      await markAnnouncementsSeen();
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดประกาศไม่สำเร็จ");
    } finally {
      if (!silent) {
        setLoadingAnnouncements(false);
      }
    }
  }

  function scheduleAnnouncementsRefresh() {
    if (announcementsRefreshTimerRef.current) {
      window.clearTimeout(announcementsRefreshTimerRef.current);
    }

    announcementsRefreshTimerRef.current = window.setTimeout(() => {
      loadAnnouncements({ silent: true });
    }, REALTIME_REFRESH_DELAY);
  }

  function scheduleConversationsRefresh() {
    if (conversationsRefreshTimerRef.current) {
      window.clearTimeout(conversationsRefreshTimerRef.current);
    }

    conversationsRefreshTimerRef.current = window.setTimeout(() => {
      loadConversations(true, { silent: true });
    }, REALTIME_REFRESH_DELAY);
  }

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobile(nextIsMobile);

      if (!nextIsMobile) {
        setMobileChatView("list");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    loadConversations(false);
    loadNotificationSummary({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleNotificationsRefresh = () => {
      loadNotificationSummary({ silent: true });
    };

    const handleFocus = () => {
      loadNotificationSummary({ silent: true });
    };

    window.addEventListener(
      "roomie:notifications-refresh",
      handleNotificationsRefresh as EventListener
    );
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener(
        "roomie:notifications-refresh",
        handleNotificationsRefresh as EventListener
      );
      window.removeEventListener("focus", handleFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "announcement") {
      loadAnnouncements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (!currentDormId) return;

    const channel = supabase
      .channel(`announcements-badge-realtime-${currentDormId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcements",
          filter: `dorm_id=eq.${currentDormId}`,
        },
        () => {
          loadNotificationSummary({ silent: true });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDormId]);

  useEffect(() => {
    if (activeTab !== "announcement") return;
    if (!currentDormId) return;

    const channel = supabase
      .channel(`announcements-realtime-${currentDormId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcements",
          filter: `dorm_id=eq.${currentDormId}`,
        },
        () => {
          scheduleAnnouncementsRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentDormId]);

  useEffect(() => {
    if (activeTab !== "chat") return;
    if (!currentDormId) return;

    const channel = supabase
      .channel(`chat-conversations-realtime-${currentDormId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_conversations",
          filter: `dorm_id=eq.${currentDormId}`,
        },
        () => {
          scheduleConversationsRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentDormId]);

  useEffect(() => {
    if (activeTab !== "chat") return;
    if (!selectedConversationId) return;
    if (!isChatDetailVisible) return;

    const channel = supabase
      .channel(`chat-messages-realtime-${selectedConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        async (payload) => {
          const eventType = payload.eventType;
          const newRow = payload.new as ChatMessage;
          const oldRow = payload.old as ChatMessage;

          if (eventType === "INSERT" && newRow?.id) {
            setMessages((prev) => {
              if (prev.some((item) => item.id === newRow.id)) return prev;
              return sortMessagesByCreatedAt([...prev, newRow]);
            });

            if (newRow.sender_user_id === currentUserId) {
              shouldStickToBottomRef.current = true;
            }

            if (
              newRow.sender_user_id &&
              currentUserId &&
              newRow.sender_user_id !== currentUserId
            ) {
              markChatAsRead(selectedConversationId).catch(() => undefined);
            }

            scheduleConversationsRefresh();
            return;
          }

          if (eventType === "UPDATE" && newRow?.id) {
            setMessages((prev) =>
              sortMessagesByCreatedAt(
                prev.map((item) => (item.id === newRow.id ? newRow : item))
              )
            );
            scheduleConversationsRefresh();
            return;
          }

          if (eventType === "DELETE" && oldRow?.id) {
            setMessages((prev) => prev.filter((item) => item.id !== oldRow.id));
            scheduleConversationsRefresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, selectedConversationId, isChatDetailVisible, currentUserId]);

  useEffect(() => {
    if (!selectedConversationId || activeTab !== "chat") return;
    if (isMobile && mobileChatView !== "detail") return;

    shouldStickToBottomRef.current = true;
    loadMessages(selectedConversationId, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId, activeTab, isMobile, mobileChatView]);

  useEffect(() => {
    if (activeTab !== "chat") return;
    if (!isChatDetailVisible) return;
    if (!shouldStickToBottomRef.current) return;

    scrollMessagesToBottom(messages.length <= 1 ? "auto" : "smooth");
  }, [messages, activeTab, isChatDetailVisible]);

  async function handleSendMessage() {
    if (!selectedConversationId || !messageText.trim() || sending) return;

    try {
      setSending(true);
      setError("");
      shouldStickToBottomRef.current = true;

      await sendChatMessage(selectedConversationId, messageText.trim());
      setMessageText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ส่งข้อความไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  }

  async function handleCreateAnnouncement() {
    if (!currentDormId || !announcementContent.trim() || creatingAnnouncement) {
      return;
    }

    try {
      setCreatingAnnouncement(true);
      setError("");

      await createAnnouncement({
        dorm_id: currentDormId,
        content: announcementContent.trim(),
        publish_date: announcementDate,
        is_pinned: false,
        status: "published",
      });

      setAnnouncementContent("");
      setAnnouncementDate(new Date().toISOString().slice(0, 10));
      setShowAnnouncementModal(false);
      scheduleAnnouncementsRefresh();
      loadNotificationSummary({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "สร้างประกาศไม่สำเร็จ");
    } finally {
      setCreatingAnnouncement(false);
    }
  }

  async function handleDeleteAnnouncement(announcementId: string) {
    if (!currentDormId) return;

    const confirmed = window.confirm("ต้องการลบประกาศนี้ใช่ไหม");
    if (!confirmed) return;

    try {
      setError("");
      await deleteAnnouncement(announcementId, currentDormId);
      scheduleAnnouncementsRefresh();
      loadNotificationSummary({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบประกาศไม่สำเร็จ");
    }
  }

  function handleSelectConversation(conversationId: string) {
    shouldStickToBottomRef.current = true;
    setSelectedConversationId(conversationId);
    if (isMobile) {
      setMobileChatView("detail");
    }
  }

  return (
    <div
      style={{
        padding: isMobile ? "20px 16px 12px" : "28px 28px 12px",
        width: "100%",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      <h1
        style={{
          fontSize: isMobile ? 22 : 28,
          fontWeight: 800,
          marginBottom: 18,
          color: "#111",
          lineHeight: 1.25,
        }}
      >
        ประกาศและช่องแชท
      </h1>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setActiveTab("announcement")}
          style={{
            border: "1px solid #f2c8d6",
            background: activeTab === "announcement" ? "#f9dce7" : "#fff",
            color: activeTab === "announcement" ? "#ea4f8b" : "#555",
            borderRadius: 12,
            padding: isMobile ? "12px 14px" : "12px 18px",
            cursor: "pointer",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            flex: isMobile ? "1 1 160px" : "0 0 auto",
          }}
        >
          <FiVolume2 size={16} />
          ประกาศข่าวสาร
          {announcementUnread > 0 ? (
            <span
              style={{
                minWidth: 22,
                height: 22,
                padding: "0 6px",
                borderRadius: 999,
                background: "#ea4f8b",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {announcementUnread > 99 ? "99+" : announcementUnread}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveTab("chat")}
          style={{
            border: "1px solid #f2c8d6",
            background: activeTab === "chat" ? "#f9dce7" : "#fff",
            color: activeTab === "chat" ? "#ea4f8b" : "#555",
            borderRadius: 12,
            padding: isMobile ? "12px 14px" : "12px 18px",
            cursor: "pointer",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            flex: isMobile ? "1 1 120px" : "0 0 auto",
          }}
        >
          <FiMessageCircle size={16} />
          แชท
        </button>
      </div>

      {error ? (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 12,
            background: "#ffe5e7",
            color: "#b42318",
            border: "1px solid #f2b8c0",
            fontWeight: 600,
            wordBreak: "break-word",
          }}
        >
          {error}
        </div>
      ) : null}

      {activeTab === "announcement" ? (
        <>
          <div
            style={{
              background: "#fff",
              borderRadius: isMobile ? 18 : 24,
              minHeight: isMobile ? undefined : 560,
              border: "1px solid #ececec",
              padding: isMobile ? 16 : 24,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: isMobile ? "stretch" : "center",
                flexDirection: isMobile ? "column" : "row",
                gap: 16,
                marginBottom: 22,
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: isMobile ? 20 : 24,
                    fontWeight: 800,
                    marginBottom: 8,
                    lineHeight: 1.25,
                  }}
                >
                  กระดานข่าวสาร
                </h2>
              </div>

              {isOwner ? (
                <button
                  onClick={() => setShowAnnouncementModal(true)}
                  style={{
                    height: 42,
                    borderRadius: 10,
                    border: "none",
                    background: "#ea4f8b",
                    color: "#fff",
                    padding: "0 16px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    width: isMobile ? "100%" : "auto",
                  }}
                >
                  <FiPlus size={16} />
                  เพิ่มประกาศ
                </button>
              ) : null}
            </div>

            <div
              style={{
                border: "1px solid #ececec",
                borderRadius: 18,
                padding: isMobile ? 14 : 18,
                background: "#fff",
              }}
            >
              <div
                style={{
                  fontSize: isMobile ? 16 : 18,
                  fontWeight: 800,
                  marginBottom: 14,
                  color: "#223",
                }}
              >
                Announcement
              </div>

              {loadingAnnouncements ? (
                <div style={{ color: "#666" }}>กำลังโหลดประกาศ...</div>
              ) : null}

              {!loadingAnnouncements && announcements.length === 0 ? (
                <div
                  style={{
                    border: "1px dashed #ddd",
                    borderRadius: 14,
                    padding: 20,
                    color: "#777",
                    background: "#fafafa",
                  }}
                >
                  ยังไม่มีประกาศ
                </div>
              ) : null}

              <div style={{ display: "grid", gap: 12 }}>
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    style={{
                      border: "1px solid #ececec",
                      borderRadius: 12,
                      padding: isMobile ? "12px 12px" : "14px 16px",
                      background: "#fff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: isMobile ? 18 : 24,
                            fontWeight: 500,
                            color: "#333",
                            marginBottom: 6,
                            lineHeight: 1.4,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {announcement.content}
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            color: "#666",
                            lineHeight: 1.5,
                            wordBreak: "break-word",
                          }}
                        >
                          {formatAnnouncementDate(announcement.publish_date)} • โดย{" "}
                          {announcement.created_by_name || "ผู้ดูแล"}
                        </div>
                      </div>

                      {isOwner ? (
                        <button
                          onClick={() => handleDeleteAnnouncement(announcement.id)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#666",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            flexShrink: 0,
                          }}
                          title="ลบประกาศ"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {showAnnouncementModal ? (
            <div
              onClick={() => {
                if (!creatingAnnouncement) {
                  setShowAnnouncementModal(false);
                }
              }}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.18)",
                display: "flex",
                alignItems: isMobile ? "flex-end" : "center",
                justifyContent: "center",
                padding: isMobile ? 12 : 24,
                zIndex: 1000,
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  maxWidth: 760,
                  background: "#fff",
                  borderRadius: isMobile ? 20 : 28,
                  padding: isMobile ? "22px 16px 18px" : "42px 52px 36px",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
                  maxHeight: isMobile ? "90vh" : "auto",
                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    fontSize: isMobile ? 22 : 28,
                    fontWeight: 800,
                    color: "#ea4f8b",
                    marginBottom: isMobile ? 20 : 34,
                  }}
                >
                  เพิ่มประกาศ
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      marginBottom: 10,
                      color: "#222",
                    }}
                  >
                    ข้อความของคุณ
                  </div>

                  <textarea
                    placeholder="กรุณาเขียนข้อความ"
                    value={announcementContent}
                    onChange={(e) => setAnnouncementContent(e.target.value)}
                    rows={isMobile ? 6 : 8}
                    style={{
                      width: "100%",
                      borderRadius: 10,
                      border: "1px solid #d9d9d9",
                      padding: 14,
                      outline: "none",
                      resize: "none",
                      fontSize: 15,
                      fontFamily: "inherit",
                      lineHeight: 1.6,
                      background: "#fff",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ marginBottom: 28 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      marginBottom: 10,
                      color: "#222",
                    }}
                  >
                    วันที่ประกาศ
                  </div>

                  <input
                    type="date"
                    value={announcementDate}
                    onChange={(e) => setAnnouncementDate(e.target.value)}
                    style={{
                      width: "100%",
                      height: 46,
                      borderRadius: 8,
                      border: "1px solid #d9d9d9",
                      padding: "0 14px",
                      outline: "none",
                      fontSize: 15,
                      fontFamily: "inherit",
                      background: "#fff",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 12,
                    flexDirection: isMobile ? "column-reverse" : "row",
                  }}
                >
                  <button
                    onClick={() => setShowAnnouncementModal(false)}
                    disabled={creatingAnnouncement}
                    style={{
                      minWidth: 92,
                      width: isMobile ? "100%" : "auto",
                      height: 46,
                      borderRadius: 10,
                      border: "none",
                      background: "#ef4444",
                      color: "#fff",
                      fontWeight: 700,
                      cursor: creatingAnnouncement ? "not-allowed" : "pointer",
                    }}
                  >
                    ยกเลิก
                  </button>

                  <button
                    onClick={handleCreateAnnouncement}
                    disabled={!announcementContent.trim() || creatingAnnouncement}
                    style={{
                      minWidth: 92,
                      width: isMobile ? "100%" : "auto",
                      height: 46,
                      borderRadius: 10,
                      border: "none",
                      background:
                        !announcementContent.trim() || creatingAnnouncement
                          ? "#9adf95"
                          : "#6fcf70",
                      color: "#fff",
                      fontWeight: 700,
                      cursor:
                        !announcementContent.trim() || creatingAnnouncement
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {creatingAnnouncement ? "กำลังเพิ่ม..." : "Post"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div
          style={{
            display: !isMobile ? "grid" : "block",
            gridTemplateColumns: !isMobile ? "360px minmax(0, 1fr)" : undefined,
            height: chatPanelHeight,
            minHeight: 0,
            background: "#fff",
            borderRadius: isMobile ? 20 : 28,
            border: "1px solid #ececec",
            overflow: "hidden",
          }}
        >
          {showChatList ? (
            <div
              style={{
                borderRight: !isMobile ? "1px solid #ececec" : "none",
                borderBottom: isMobile && showChatDetail ? "1px solid #ececec" : "none",
                display: "flex",
                flexDirection: "column",
                background: "#fff",
                minWidth: 0,
                minHeight: 0,
                height: "100%",
              }}
            >
              <div
                style={{
                  padding: isMobile ? "16px 14px 14px" : "22px 20px 16px",
                  borderBottom: "1px solid #f1f1f1",
                }}
              >
                <div
                  style={{
                    fontSize: isMobile ? 16 : 18,
                    fontWeight: 800,
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  Messages
                  {totalUnread > 0 ? (
                    <span
                      style={{
                        minWidth: 22,
                        height: 22,
                        padding: "0 6px",
                        borderRadius: 999,
                        background: "#ea4f8b",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {totalUnread}
                    </span>
                  ) : null}
                </div>

                <div style={{ position: "relative" }}>
                  <FiSearch
                    size={16}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#999",
                    }}
                  />
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search messages"
                    style={{
                      width: "100%",
                      height: 42,
                      borderRadius: 12,
                      border: "1px solid #e6e6e6",
                      background: "#fafafa",
                      padding: "0 14px 0 38px",
                      outline: "none",
                      fontSize: 14,
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ marginTop: 10, color: "#777", fontSize: 13 }}>
                  {loadingConversations
                    ? "กำลังโหลดรายการแชท..."
                    : `ทั้งหมด ${filteredConversations.length} รายการ`}
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  overscrollBehavior: "contain",
                  background: "#fff",
                }}
              >
                {!loadingConversations && filteredConversations.length === 0 ? (
                  <div style={{ padding: 20, color: "#777" }}>ยังไม่มีแชท</div>
                ) : null}

                {filteredConversations.map((conversation) => {
                  const isActive = selectedConversationId === conversation.id;

                  return (
                    <button
                      key={conversation.id}
                      onClick={() => handleSelectConversation(conversation.id)}
                      style={{
                        width: "100%",
                        border: "none",
                        background: isActive ? "#fbe3ec" : "#fff",
                        textAlign: "left",
                        padding: isMobile ? "14px 14px" : "16px 18px",
                        cursor: "pointer",
                        borderBottom: "1px solid #f3f3f3",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "flex-start",
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: isMobile ? 17 : 20,
                              fontWeight: 800,
                              color: "#ea4f8b",
                              lineHeight: 1.25,
                              marginBottom: 4,
                              wordBreak: "break-word",
                            }}
                          >
                            {getConversationPersonName(conversation)}
                          </div>

                          {getConversationMainTitle(conversation, currentUserRole) ? (
                            <div
                              style={{
                                color: "#555",
                                fontSize: 14,
                                marginBottom: 6,
                                fontWeight: 600,
                                lineHeight: 1.35,
                                wordBreak: "break-word",
                              }}
                            >
                              {getConversationMainTitle(
                                conversation,
                                currentUserRole
                              )}
                            </div>
                          ) : null}

                          <div
                            style={{
                              color: "#666",
                              fontSize: 13,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: isMobile ? "100%" : 220,
                            }}
                          >
                            {getConversationPreview(conversation)}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: 6,
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              color: "#999",
                              fontSize: 12,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatDateTime(conversation.last_message_at)}
                          </div>

                          {conversation.unread_count > 0 ? (
                            <span
                              style={{
                                minWidth: 20,
                                height: 20,
                                borderRadius: 999,
                                background: "#ea4f8b",
                                color: "#fff",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 11,
                                fontWeight: 800,
                                padding: "0 6px",
                              }}
                            >
                              {conversation.unread_count}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {showChatDetail ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "#fff",
                minWidth: 0,
                minHeight: 0,
                height: "100%",
              }}
            >
              <div
                style={{
                  padding: isMobile ? "14px 14px 12px" : "24px 24px 18px",
                  borderBottom: "1px solid #ececec",
                  minHeight: isMobile ? 78 : 96,
                }}
              >
                {isMobile ? (
                  <button
                    onClick={() => setMobileChatView("list")}
                    style={{
                      border: "none",
                      background: "transparent",
                      padding: 0,
                      marginBottom: 10,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      color: "#555",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    <FiArrowLeft size={16} />
                    กลับไปที่รายการแชท
                  </button>
                ) : null}

                {selectedConversation ? (
                  <>
                    <div
                      style={{
                        fontSize: isMobile ? 20 : 24,
                        fontWeight: 800,
                        color: "#ea4f8b",
                        marginBottom: 6,
                        lineHeight: 1.25,
                        wordBreak: "break-word",
                      }}
                    >
                      {getConversationPersonName(selectedConversation)}
                    </div>

                    {getConversationMainTitle(
                      selectedConversation,
                      currentUserRole
                    ) ? (
                      <div
                        style={{
                          color: "#555",
                          fontWeight: 600,
                          lineHeight: 1.4,
                          wordBreak: "break-word",
                        }}
                      >
                        {getConversationMainTitle(
                          selectedConversation,
                          currentUserRole
                        )}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div style={{ color: "#777" }}>เลือกบทสนทนาที่ต้องการดู</div>
                )}
              </div>

              <div
                ref={messagesContainerRef}
                onScroll={() => {
                  shouldStickToBottomRef.current = isNearBottom();
                }}
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  overscrollBehavior: "contain",
                  padding: isMobile ? "14px 12px" : "20px 18px",
                  background: "#fbfbfb",
                }}
              >
                {loadingMessages ? (
                  <div style={{ color: "#777" }}>กำลังโหลดข้อความ...</div>
                ) : null}

                {!loadingMessages && selectedConversation && messages.length === 0 ? (
                  <div style={{ color: "#777" }}>ยังไม่มีข้อความในบทสนทนานี้</div>
                ) : null}

                {!selectedConversation ? (
                  <div style={{ color: "#777" }}>ยังไม่ได้เลือกบทสนทนา</div>
                ) : null}

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {messages.map((message) => {
                    const isMine = currentUserId
                      ? message.sender_user_id === currentUserId
                      : false;

                    return (
                      <div
                        key={message.id}
                        style={{
                          display: "flex",
                          justifyContent: isMine ? "flex-end" : "flex-start",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: isMobile ? "84%" : "62%",
                            background: isMine ? "#ea4f8b" : "#efefef",
                            color: isMine ? "#fff" : "#222",
                            borderRadius: 18,
                            padding: "12px 16px",
                            boxShadow: isMine
                              ? "0 6px 18px rgba(234,79,139,0.18)"
                              : "none",
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                          }}
                        >
                          <div
                            style={{
                              whiteSpace: "pre-wrap",
                              lineHeight: 1.55,
                              fontSize: 15,
                              fontWeight: 500,
                            }}
                          >
                            {message.message_text}
                          </div>

                          <div
                            style={{
                              fontSize: 12,
                              marginTop: 6,
                              textAlign: "right",
                              opacity: isMine ? 0.9 : 0.65,
                            }}
                          >
                            {formatDateTime(message.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div
                style={{
                  padding: isMobile ? 12 : 16,
                  borderTop: "1px solid #ececec",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Type a message"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSendMessage();
                      }
                    }}
                    disabled={!selectedConversation || sending}
                    style={{
                      flex: 1,
                      height: 48,
                      borderRadius: 14,
                      border: "1px solid #dfdfdf",
                      padding: "0 14px",
                      outline: "none",
                      fontSize: 14,
                      background: "#fff",
                      minWidth: 0,
                    }}
                  />

                  <button
                    onClick={handleSendMessage}
                    disabled={!selectedConversation || !messageText.trim() || sending}
                    style={{
                      minWidth: isMobile ? 52 : 92,
                      width: isMobile ? 52 : "auto",
                      height: 48,
                      borderRadius: 14,
                      border: "none",
                      background:
                        !selectedConversation || !messageText.trim() || sending
                          ? "#f1bfd0"
                          : "#ea4f8b",
                      color: "#fff",
                      fontWeight: 800,
                      cursor:
                        !selectedConversation || !messageText.trim() || sending
                          ? "not-allowed"
                          : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      flexShrink: 0,
                    }}
                  >
                    <FiSend size={15} />
                    {!isMobile ? (sending ? "ส่ง..." : "ส่ง") : null}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}