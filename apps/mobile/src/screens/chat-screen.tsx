import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import {
  getAuthToken,
  getChatMessages,
  getChatThreads,
  sendChatMessage
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

export function ChatScreen() {
  const currentUserId = useMemo(() => getUserIdFromToken(getAuthToken()), []);
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
  const isClosed = activeThread?.status === "CLOSED" || activeThread?.listing?.status === "SOLD";

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
    loadThreads();
  }, []);

  useEffect(() => {
    if (!activeThreadId) {
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
  }, [activeThreadId]);

  async function onSend() {
    if (!activeThreadId || !text.trim() || isClosed) {
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

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
      </View>

      <View style={styles.threadRail}>
        {threadsLoading ? (
          <View style={styles.threadLoadingRow}>
            <ActivityIndicator size="small" color="#0f8e66" />
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
                  {item.status === "CLOSED" ? "Closed" : "Open"}
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
          placeholder={isClosed ? "Chat closed" : "Type message"}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#eef3f0"
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8
  },
  headerTitle: {
    fontSize: 26,
    lineHeight: 30,
    color: "#1b2420",
    fontWeight: "800"
  },
  threadRail: {
    minHeight: 78
  },
  threadRailList: {
    paddingHorizontal: 10,
    paddingBottom: 8
  },
  thread: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginHorizontal: 4,
    minWidth: 132,
    borderWidth: 1,
    borderColor: "#dde6e1"
  },
  threadActive: {
    backgroundColor: "#e7f4ee",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginHorizontal: 4,
    minWidth: 132,
    borderWidth: 1,
    borderColor: "#8fcfb6"
  },
  threadTitle: {
    color: "#1f2b26",
    fontWeight: "700"
  },
  threadSub: {
    marginTop: 2,
    color: "#67736e",
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
    color: "#5f6b66"
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
    backgroundColor: "#0f8e66",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6
  },
  bubbleOther: {
    alignSelf: "flex-start",
    maxWidth: "82%",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: "#dfe8e3"
  },
  bubbleTextMine: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 20
  },
  bubbleTextOther: {
    color: "#1f2b26",
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
    color: "#7b8781",
    fontSize: 11,
    alignSelf: "flex-end"
  },
  chatBox: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#dce5e0",
    backgroundColor: "rgba(255,255,255,0.95)"
  },
  input: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#d7e2dd"
  },
  sendButton: {
    backgroundColor: "#0f8e66",
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
    backgroundColor: "#f0f2f1",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignSelf: "center"
  },
  systemText: {
    color: "#607069",
    fontSize: 12
  },
  emptyText: {
    color: "#68756f",
    textAlign: "center",
    marginTop: 8
  },
  error: {
    color: "#b42040",
    marginTop: 4,
    marginHorizontal: 12
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }]
  }
});
