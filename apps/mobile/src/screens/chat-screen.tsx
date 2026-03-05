import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { AuthRequiredCard } from "../components/auth-required-card";
import { useScreenEnterAnimation } from "../hooks/use-screen-enter-animation";
import {
  getAuthToken,
  getChatMessages,
  getChatThreads,
  sendChatMessage,
  subscribeAuthToken
} from "../services/api";
import { ChatMessage, ChatThread } from "../types";
import { displayCategoryPath } from "../theme/ui-contract";
import { uiTheme } from "../theme/tokens";

function getUserIdFromToken(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return "";
    }
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized)) as { sub?: string };
    return decoded.sub ?? "";
  } catch {
    return "";
  }
}

function formatDateTime(value?: string) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function ChatScreen({ navigation }: any) {
  const enterStyle = useScreenEnterAnimation({ distance: 12, duration: 300 });
  const [token, setToken] = useState(getAuthToken());
  const currentUserId = useMemo(() => getUserIdFromToken(token), [token]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage> | null>(null);

  const activeThread = useMemo(
    () => threads.find((item) => item.id === activeThreadId) ?? null,
    [threads, activeThreadId]
  );
  const activePeerName = useMemo(() => {
    if (!activeThread) {
      return "Buyer/Seller";
    }
    return (
      (activeThread.buyer?.id === currentUserId
        ? activeThread.seller?.fullName
        : activeThread.buyer?.fullName) || "Buyer/Seller"
    );
  }, [activeThread, currentUserId]);
  const isClosed = activeThread?.status === "CLOSED" || activeThread?.listing?.status === "SOLD";

  useEffect(() => {
    return subscribeAuthToken((nextToken) => {
      setToken(nextToken);
    });
  }, []);

  async function loadThreads() {
    setThreadsLoading(true);
    setError("");
    try {
      const data = await getChatThreads();
      setThreads(data);
      if (!activeThreadId && data[0]) {
        setActiveThreadId(data[0].id);
      }
    } catch {
      setError("Chats load nahi ho sakin.");
      setThreads([]);
    } finally {
      setThreadsLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      setThreads([]);
      setMessages([]);
      setActiveThreadId("");
      setThreadsLoading(false);
      return;
    }
    void loadThreads();
  }, [token]);

  useEffect(() => {
    if (!activeThreadId || !token) {
      setMessages([]);
      return;
    }

    let alive = true;
    async function loadMessages() {
      setMessagesLoading(true);
      try {
        const data = await getChatMessages(activeThreadId);
        if (alive) {
          setMessages(data);
          setError("");
          requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
        }
      } catch {
        if (alive) {
          setError("Messages load nahi ho sakay.");
          setMessages([]);
        }
      } finally {
        if (alive) {
          setMessagesLoading(false);
        }
      }
    }

    void loadMessages();
    const timer = setInterval(() => {
      void loadMessages();
    }, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [activeThreadId, token]);

  async function onSend() {
    if (!token || !activeThreadId || !text.trim() || isClosed) {
      return;
    }

    setSending(true);
    setSendError("");
    try {
      await sendChatMessage(activeThreadId, text.trim());
      setText("");
      const updated = await getChatMessages(activeThreadId);
      setMessages(updated);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch {
      setSendError("Message send nahi hua.");
    } finally {
      setSending(false);
    }
  }

  if (!token) {
    return (
      <AuthRequiredCard
        navigation={navigation}
        title="Chat karne ke liye account zaroori hai"
        subtitle="Asli buyers aur sellers se direct baat karne ke liye pehle login ya create account karein."
      />
    );
  }

  return (
    <Animated.View style={[styles.screen, enterStyle]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TGMG Chats</Text>
        <Text style={styles.headerSub}>
          {activeThread?.listing?.title
            ? `Product: ${activeThread.listing.title}`
            : "Asli buyers aur sellers ke sath direct baat karein."}
        </Text>
        {displayCategoryPath(
          activeThread?.listing?.mainCategoryName,
          activeThread?.listing?.subCategoryName
        ) ? (
          <Text style={styles.headerSub}>
            Category:{" "}
            {displayCategoryPath(
              activeThread?.listing?.mainCategoryName,
              activeThread?.listing?.subCategoryName
            )}
          </Text>
        ) : null}
      </View>

      <View style={styles.threadRail}>
        {threadsLoading ? (
          <View style={styles.threadLoadingRow}>
            <ActivityIndicator size="small" color={uiTheme.colors.primary} />
            <Text style={styles.threadLoadingText}>Loading threads...</Text>
          </View>
        ) : null}

        {!threadsLoading && threads.length === 0 ? (
          <Text style={styles.emptyText}>No conversations yet</Text>
        ) : null}

        {!threadsLoading ? (
          <FlatList
            data={threads}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.threadRailList}
            renderItem={({ item }) => {
              const active = item.id === activeThreadId;
              return (
                <Pressable
                  style={({ pressed }) => [active ? styles.threadActive : styles.thread, pressed && styles.pressed]}
                  onPress={() => setActiveThreadId(item.id)}
                >
                  <View style={styles.threadHeadRow}>
                    <Text style={styles.threadTitle} numberOfLines={1}>
                      {item.listing?.title ?? "Conversation"}
                    </Text>
                    <Text style={styles.threadTime}>{formatDateTime(item.lastMessageAt)}</Text>
                  </View>
                  <Text style={styles.threadSub} numberOfLines={1}>
                    Uploaded by {(item.seller?.fullName || "Seller").split(" ")[0]} |{" "}
                    {item.status === "CLOSED" ? "Closed" : "Active"}
                  </Text>
                  {displayCategoryPath(item.listing?.mainCategoryName, item.listing?.subCategoryName) ? (
                    <Text style={styles.threadSub} numberOfLines={1}>
                      {displayCategoryPath(item.listing?.mainCategoryName, item.listing?.subCategoryName)}
                    </Text>
                  ) : null}
                </Pressable>
              );
            }}
          />
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        ref={listRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        data={messages}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          activeThreadId && !messagesLoading ? (
            <Text style={styles.emptyText}>Start your conversation.</Text>
          ) : null
        }
        renderItem={({ item }) => {
          const mine = item.senderId === currentUserId;
          return (
            <View style={mine ? styles.bubbleMine : styles.bubbleOther}>
              <Text style={mine ? styles.senderMine : styles.senderOther}>
                {mine ? "You" : activePeerName.split(" ")[0]}
              </Text>
              <Text style={mine ? styles.bubbleTextMine : styles.bubbleTextOther}>{item.content}</Text>
              <Text style={mine ? styles.timeMine : styles.timeOther}>{formatDateTime(item.createdAt)}</Text>
            </View>
          );
        }}
      />

      {isClosed ? (
        <View style={styles.systemBanner}>
          <Text style={styles.systemText}>Chat closed. Listing sold/expired hai.</Text>
        </View>
      ) : null}

      <View style={styles.chatBox}>
        <TextInput
          style={styles.input}
          placeholder={isClosed ? "Chat closed" : "Type a message"}
          placeholderTextColor={uiTheme.colors.textMuted}
          value={text}
          onChangeText={setText}
          editable={!isClosed && !sending && Boolean(activeThreadId)}
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            (!activeThreadId || isClosed || sending) && styles.sendButtonDisabled,
            pressed && styles.pressed
          ]}
          onPress={onSend}
          disabled={!activeThreadId || isClosed || sending}
        >
          <Text style={styles.sendText}>{sending ? "..." : "Send"}</Text>
        </Pressable>
      </View>
      {sendError ? <Text style={styles.error}>{sendError}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: uiTheme.colors.surfaceAlt
  },
  header: {
    paddingHorizontal: uiTheme.spacing.lg,
    paddingTop: uiTheme.spacing.md,
    paddingBottom: uiTheme.spacing.sm,
    gap: 4
  },
  headerTitle: {
    fontSize: 26,
    lineHeight: 30,
    color: uiTheme.colors.textStrong,
    fontWeight: "800"
  },
  headerSub: {
    color: uiTheme.colors.textMuted,
    fontSize: 13
  },
  threadRail: {
    maxHeight: 220
  },
  threadRailList: {
    paddingHorizontal: uiTheme.spacing.md,
    gap: uiTheme.spacing.sm,
    paddingBottom: uiTheme.spacing.sm
  },
  thread: {
    backgroundColor: uiTheme.colors.surface,
    paddingHorizontal: uiTheme.spacing.md,
    paddingVertical: uiTheme.spacing.sm,
    borderRadius: uiTheme.radius.md,
    borderWidth: 1,
    borderColor: uiTheme.colors.border
  },
  threadActive: {
    backgroundColor: uiTheme.colors.surfaceSoft,
    paddingHorizontal: uiTheme.spacing.md,
    paddingVertical: uiTheme.spacing.sm,
    borderRadius: uiTheme.radius.md,
    borderWidth: 1,
    borderColor: uiTheme.colors.borderStrong
  },
  threadHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: uiTheme.spacing.sm
  },
  threadTitle: {
    color: uiTheme.colors.textStrong,
    fontWeight: "700",
    flexShrink: 1
  },
  threadTime: {
    color: uiTheme.colors.textMuted,
    fontSize: 11
  },
  threadSub: {
    marginTop: 2,
    color: uiTheme.colors.textMuted,
    fontSize: 12
  },
  threadLoadingRow: {
    paddingHorizontal: uiTheme.spacing.lg,
    paddingVertical: uiTheme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: uiTheme.spacing.sm
  },
  threadLoadingText: {
    color: uiTheme.colors.textMuted
  },
  messages: {
    flex: 1
  },
  messagesContent: {
    paddingHorizontal: uiTheme.spacing.md,
    paddingVertical: uiTheme.spacing.md,
    gap: uiTheme.spacing.sm
  },
  bubbleMine: {
    alignSelf: "flex-end",
    maxWidth: "84%",
    backgroundColor: uiTheme.colors.primary,
    borderRadius: uiTheme.radius.md,
    paddingHorizontal: uiTheme.spacing.md,
    paddingVertical: uiTheme.spacing.sm
  },
  bubbleOther: {
    alignSelf: "flex-start",
    maxWidth: "84%",
    backgroundColor: uiTheme.colors.surface,
    borderRadius: uiTheme.radius.md,
    paddingHorizontal: uiTheme.spacing.md,
    paddingVertical: uiTheme.spacing.sm,
    borderWidth: 1,
    borderColor: uiTheme.colors.border
  },
  senderMine: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontWeight: "700"
  },
  senderOther: {
    color: uiTheme.colors.textSoft,
    fontSize: 11,
    fontWeight: "700"
  },
  bubbleTextMine: {
    marginTop: 4,
    color: uiTheme.colors.white,
    fontSize: 15,
    lineHeight: 20
  },
  bubbleTextOther: {
    marginTop: 4,
    color: uiTheme.colors.textStrong,
    fontSize: 15,
    lineHeight: 20
  },
  timeMine: {
    marginTop: 4,
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    alignSelf: "flex-end"
  },
  timeOther: {
    marginTop: 4,
    color: uiTheme.colors.textMuted,
    fontSize: 11,
    alignSelf: "flex-end"
  },
  chatBox: {
    flexDirection: "row",
    gap: uiTheme.spacing.sm,
    paddingHorizontal: uiTheme.spacing.md,
    paddingVertical: uiTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: uiTheme.colors.border,
    backgroundColor: "rgba(253,246,237,0.96)"
  },
  input: {
    flex: 1,
    backgroundColor: uiTheme.colors.surface,
    borderRadius: uiTheme.radius.md,
    paddingHorizontal: uiTheme.spacing.md,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    color: uiTheme.colors.textStrong
  },
  sendButton: {
    backgroundColor: uiTheme.colors.primary,
    borderRadius: uiTheme.radius.md,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    minWidth: 64
  },
  sendButtonDisabled: {
    opacity: 0.5
  },
  sendText: {
    color: uiTheme.colors.white,
    fontWeight: "700"
  },
  systemBanner: {
    marginHorizontal: uiTheme.spacing.md,
    marginBottom: uiTheme.spacing.sm,
    backgroundColor: uiTheme.colors.surfaceSoft,
    borderRadius: uiTheme.radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignSelf: "center"
  },
  systemText: {
    color: uiTheme.colors.textSoft,
    fontSize: 12
  },
  emptyText: {
    color: uiTheme.colors.textMuted,
    textAlign: "center",
    marginTop: uiTheme.spacing.sm
  },
  error: {
    color: uiTheme.colors.danger,
    marginTop: 4,
    marginHorizontal: uiTheme.spacing.md
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }]
  }
});
