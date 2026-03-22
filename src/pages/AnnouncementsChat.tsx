import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiMessageCircle,
  FiPlus,
  FiSearch,
  FiSend,
  FiTrash2,
  FiVolume2,
} from "react-icons/fi";
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

export default function AnnouncementsChat() {
  const [activeTab, setActiveTab] = useState<"announcement" | "chat">("chat");

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
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

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const currentUserId = useMemo(() => getCurrentUserId(), []);
  const currentUserRole = useMemo(() => getCurrentUserRole(), []);
  const currentDormId = useMemo(() => getCurrentDormId(), []);

  const isOwner = currentUserRole === "owner";

  const totalUnread = useMemo(
    () => conversations.reduce((sum, item) => sum + item.unread_count, 0),
    [conversations]
  );

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

  function scrollMessagesToBottom(behavior: ScrollBehavior = "smooth") {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior,
        block: "end",
      });
    });
  }

  async function loadConversations(keepSelected = true) {
    try {
      setLoadingConversations(true);
      setError("");

      const data = await getChatConversations();
      setConversations(data);

      if (data.length === 0) {
        setSelectedConversationId(null);
        setMessages([]);
        return;
      }

      if (keepSelected && selectedConversationId) {
        const stillExists = data.some((item) => item.id === selectedConversationId);
        if (stillExists) return;
      }

      setSelectedConversationId(data[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดรายการแชทไม่สำเร็จ");
    } finally {
      setLoadingConversations(false);
    }
  }

  async function loadMessages(conversationId: string, shouldMarkAsRead = true) {
    try {
      setLoadingMessages(true);
      setError("");

      const data = await getChatMessages(conversationId);
      setMessages(data);

      if (shouldMarkAsRead) {
        await markChatAsRead(conversationId);
        const latestConversations = await getChatConversations();
        setConversations(latestConversations);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดข้อความไม่สำเร็จ");
    } finally {
      setLoadingMessages(false);
    }
  }

  async function loadAnnouncements() {
    try {
      if (!currentDormId) {
        throw new Error("ไม่พบ dormId สำหรับโหลดประกาศ");
      }

      setLoadingAnnouncements(true);
      setError("");

      const data = await getAnnouncements(currentDormId);
      setAnnouncements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดประกาศไม่สำเร็จ");
    } finally {
      setLoadingAnnouncements(false);
    }
  }

  useEffect(() => {
    loadConversations(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "announcement") {
      loadAnnouncements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (!selectedConversationId || activeTab !== "chat") return;
    loadMessages(selectedConversationId, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId, activeTab]);

  useEffect(() => {
    if (activeTab !== "chat") return;
    scrollMessagesToBottom(messages.length <= 1 ? "auto" : "smooth");
  }, [messages, activeTab]);

  async function handleSendMessage() {
    if (!selectedConversationId || !messageText.trim() || sending) return;

    try {
      setSending(true);
      setError("");

      await sendChatMessage(selectedConversationId, messageText.trim());
      setMessageText("");

      await loadMessages(selectedConversationId, false);
      await loadConversations(true);
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

      await loadAnnouncements();
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
      await loadAnnouncements();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบประกาศไม่สำเร็จ");
    }
  }

  return (
    <div style={{ padding: "28px 28px 24px" }}>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 800,
          marginBottom: 18,
          color: "#111",
        }}
      >
        ประกาศและช่องแชท
      </h1>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 18,
        }}
      >
        <button
          onClick={() => setActiveTab("announcement")}
          style={{
            border: "1px solid #f2c8d6",
            background: activeTab === "announcement" ? "#f9dce7" : "#fff",
            color: activeTab === "announcement" ? "#ea4f8b" : "#555",
            borderRadius: 12,
            padding: "12px 18px",
            cursor: "pointer",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <FiVolume2 size={16} />
          ประกาศข่าวสาร
        </button>

        <button
          onClick={() => setActiveTab("chat")}
          style={{
            border: "1px solid #f2c8d6",
            background: activeTab === "chat" ? "#f9dce7" : "#fff",
            color: activeTab === "chat" ? "#ea4f8b" : "#555",
            borderRadius: 12,
            padding: "12px 18px",
            cursor: "pointer",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
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
              borderRadius: 24,
              minHeight: 560,
              border: "1px solid #ececec",
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                marginBottom: 22,
              }}
            >
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
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
                    gap: 8,
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
                padding: 18,
                background: "#fff",
              }}
            >
              <div
                style={{
                  fontSize: 18,
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
                      padding: "14px 16px",
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
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 24,
                            fontWeight: 500,
                            color: "#333",
                            marginBottom: 4,
                            lineHeight: 1.3,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {announcement.content}
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            color: "#666",
                            lineHeight: 1.5,
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
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
                zIndex: 1000,
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  maxWidth: 760,
                  background: "#fff",
                  borderRadius: 28,
                  padding: "42px 52px 36px",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "#ea4f8b",
                    marginBottom: 34,
                  }}
                >
                  เพิ่มประกาศ
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
                    ข้อความของคุณ
                  </div>

                  <textarea
                    placeholder="กรุณาเขียนข้อความ"
                    value={announcementContent}
                    onChange={(e) => setAnnouncementContent(e.target.value)}
                    rows={8}
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
                    }}
                  />
                </div>

                <div style={{ marginBottom: 40 }}>
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
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 12,
                  }}
                >
                  <button
                    onClick={() => setShowAnnouncementModal(false)}
                    disabled={creatingAnnouncement}
                    style={{
                      minWidth: 92,
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
            display: "grid",
            gridTemplateColumns: "360px 1fr",
            minHeight: 640,
            background: "#fff",
            borderRadius: 28,
            border: "1px solid #ececec",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              borderRight: "1px solid #ececec",
              display: "flex",
              flexDirection: "column",
              background: "#fff",
            }}
          >
            <div
              style={{
                padding: "22px 20px 16px",
                borderBottom: "1px solid #f1f1f1",
              }}
            >
              <div
                style={{
                  fontSize: 18,
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
                overflowY: "auto",
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
                    onClick={() => setSelectedConversationId(conversation.id)}
                    style={{
                      width: "100%",
                      border: "none",
                      background: isActive ? "#fbe3ec" : "#fff",
                      textAlign: "left",
                      padding: "16px 18px",
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
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 20,
                            fontWeight: 800,
                            color: "#ea4f8b",
                            lineHeight: 1.2,
                            marginBottom: 4,
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
                            }}
                        >
                            {getConversationMainTitle(conversation, currentUserRole)}
                        </div>
                        ) : null}

                        <div
                          style={{
                            color: "#666",
                            fontSize: 13,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 220,
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
                        <div style={{ color: "#999", fontSize: 12 }}>
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

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: "#fff",
              minWidth: 0,
            }}
          >
            <div
              style={{
                padding: "24px 24px 18px",
                borderBottom: "1px solid #ececec",
                minHeight: 96,
              }}
            >
              {selectedConversation ? (
                <>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: "#ea4f8b",
                      marginBottom: 6,
                    }}
                  >
                    {getConversationPersonName(selectedConversation)}
                  </div>

                  {getConversationMainTitle(selectedConversation, currentUserRole) ? (
                    <div
                        style={{
                        color: "#555",
                        fontWeight: 600,
                        }}
                    >
                        {getConversationMainTitle(selectedConversation, currentUserRole)}
                    </div>
                    ) : null}
                </>
              ) : (
                <div style={{ color: "#777" }}>เลือกบทสนทนาที่ต้องการดู</div>
              )}
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px 18px",
                background: "#fbfbfb",
              }}
            >
              {loadingMessages ? (
                <div style={{ color: "#777" }}>กำลังโหลดข้อความ...</div>
              ) : null}

              {!loadingMessages && selectedConversation && messages.length === 0 ? (
                <div style={{ color: "#777" }}>ยังไม่มีข้อความในบทสนทนานี้</div>
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
                          maxWidth: "62%",
                          background: isMine ? "#ea4f8b" : "#efefef",
                          color: isMine ? "#fff" : "#222",
                          borderRadius: 18,
                          padding: "12px 16px",
                          boxShadow: isMine
                            ? "0 6px 18px rgba(234,79,139,0.18)"
                            : "none",
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
                padding: 16,
                borderTop: "1px solid #ececec",
                background: "#fff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 10,
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
                    height: 50,
                    borderRadius: 14,
                    border: "1px solid #dfdfdf",
                    padding: "0 16px",
                    outline: "none",
                    fontSize: 14,
                    background: "#fff",
                  }}
                />

                <button
                  onClick={handleSendMessage}
                  disabled={!selectedConversation || !messageText.trim() || sending}
                  style={{
                    minWidth: 92,
                    height: 50,
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
                  }}
                >
                  <FiSend size={15} />
                  {sending ? "ส่ง..." : "ส่ง"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}