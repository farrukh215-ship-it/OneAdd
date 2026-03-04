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
import type { ChatMessage, ChatThread } from "../types";

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

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatScreen({ navigation }: any) {
  const enterStyle = useScreenEnterAnimation({ distance: 12, duration: 300 });
  const [token, setToken] = useState(getAuthToken());
  const currentUserId = useMemo(() => getUserIdFromToken(token), [token]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string>("");
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
    loadThreads();
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

    loadMessages();
    const timer = setInterval(loadMessages, 5000);
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
            ? `Product: ${activeThread.listing.title} | Uploaded by ${(
                activeThread.seller?.fullName || "Seller"
              ).split(" ")[0]}`
            : "Asli buyers aur sellers ke sath direct baat karein."}
        </Text>
      </View>

      <View style={styles.threadRail}>
        {threadsLoading ? (
          <View style={styles.threadLoadingRow}>
            <ActivityIndicator size="small" color="#C8603A" />
            <Text style={styles.threadLoadingText}>Loading threads...</Text>
          </View>
        ) : null}

        {!threadsLoading && threads.length === 0 ? (
          <Text style={styles.emptyText}>No conversations yet</Text>
        ) : null}

        {!threadsLoading ? (
          <FlatList
            horizontal
            data={threads}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.threadRailList}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  item.id === activeThreadId ? styles.threadActive : styles.thread,
                  pressed && styles.pressed
                ]}
                onPress={() => setActiveThreadId(item.id)}
              >
                <Text style={styles.threadTitle} numberOfLines={1}>
                  {item.listing?.title ?? "Conversation"}
                </Text>
                <Text style={styles.threadSub} numberOfLines={1}>
                  Uploaded by {(item.seller?.fullName || "Seller").split(" ")[0]} |{" "}
                  {item.status === "CLOSED" ? "Closed" : "Active"}
                </Text>
              </Pressable>
            )}
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
              <Text style={mine ? styles.timeMine : styles.timeOther}>
                {mine ? "You" : activePeerName.split(" ")[0]}
              </Text>
              <Text style={mine ? styles.bubbleTextMine : styles.bubbleTextOther}>
                {item.content}
              </Text>
              <Text style={mine ? styles.timeMine : styles.timeOther}>
                {formatTime(item.createdAt)}
              </Text>
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
          placeholder={isClosed ? "Chat closed" : "Message likho... (Offer: 120000)"}
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
          <Text style={styles.sendText}>{sending ? "..." : "Bhejo"}</Text>
        </Pressable>
      </View>
      {sendError ? <Text style={styles.error}>{sendError}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FDF6ED"
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 4
  },
  headerTitle: {
    fontSize: 26,
    lineHeight: 30,
    color: "#5C3D2E",
    fontWeight: "800"
  },
  headerSub: {
    color: "#9B8070",
    fontSize: 13
  },
  threadRail: {
    minHeight: 78
  },
  threadRailList: {
    paddingHorizontal: 10,
    paddingBottom: 8
  },
  thread: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginHorizontal: 4,
    minWidth: 132,
    borderWidth: 1,
    borderColor: "#E8D5B7"
  },
  threadActive: {
    backgroundColor: "#F5EAD8",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginHorizontal: 4,
    minWidth: 132,
    borderWidth: 1,
    borderColor: "#D4B896"
  },
  threadTitle: {
    color: "#5C3D2E",
    fontWeight: "700"
  },
  threadSub: {
    marginTop: 2,
    color: "#9B8070",
    fontSize: 12
  },
  threadLoadingRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  threadLoadingText: {
    color: "#9B8070"
  },
  messages: {
    flex: 1
  },
  messagesContent: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8
  },
  bubbleMine: {
    alignSelf: "flex-end",
    maxWidth: "82%",
    backgroundColor: "#C8603A",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6
  },
  bubbleOther: {
    alignSelf: "flex-start",
    maxWidth: "82%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: "#E8D5B7"
  },
  bubbleTextMine: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 20
  },
  bubbleTextOther: {
    color: "#5C3D2E",
    fontSize: 15,
    lineHeight: 20
  },
  timeMine: {
    marginTop: 4,
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    alignSelf: "flex-end"
  },
  timeOther: {
    marginTop: 4,
    color: "#9B8070",
    fontSize: 11,
    alignSelf: "flex-end"
  },
  chatBox: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E8D5B7",
    backgroundColor: "rgba(253,246,237,0.95)"
  },
  input: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E8D5B7",
    color: "#5C3D2E"
  },
  sendButton: {
    backgroundColor: "#C8603A",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    minWidth: 58
  },
  sendButtonDisabled: {
    opacity: 0.5
  },
  sendText: {
    color: "#fff",
    fontWeight: "700"
  },
  systemBanner: {
    marginHorizontal: 10,
    marginBottom: 8,
    backgroundColor: "#F5EAD8",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignSelf: "center"
  },
  systemText: {
    color: "#7A5544",
    fontSize: 12
  },
  emptyText: {
    color: "#9B8070",
    textAlign: "center",
    marginTop: 8
  },
  error: {
    color: "#B83A2A",
    marginTop: 4,
    marginHorizontal: 12
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }]
  }
});
