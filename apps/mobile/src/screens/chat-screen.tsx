import { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { getChatMessages, getChatThreads, sendChatMessage } from "../services/api";
import type { ChatMessage, ChatThread } from "../types";

export function ChatScreen() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    getChatThreads()
      .then((data) => {
        setThreads(data);
        if (data[0]) {
          setActiveThreadId(data[0].id);
        }
      })
      .catch(() => setThreads([]));
  }, []);

  useEffect(() => {
    if (!activeThreadId) {
      return;
    }

    getChatMessages(activeThreadId).then(setMessages).catch(() => setMessages([]));
  }, [activeThreadId]);

  async function onSend() {
    if (!activeThreadId || !text.trim()) {
      return;
    }

    await sendChatMessage(activeThreadId, text.trim());
    setText("");
    const updated = await getChatMessages(activeThreadId);
    setMessages(updated);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.threadList}>
        <FlatList
          horizontal
          data={threads}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={item.id === activeThreadId ? styles.threadActive : styles.thread}
              onPress={() => setActiveThreadId(item.id)}
            >
              <Text style={styles.threadText}>{item.listing?.title ?? "Thread"}</Text>
            </Pressable>
          )}
        />
      </View>
      <FlatList
        style={styles.messages}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.messageBubble}>
            <Text>{item.content}</Text>
          </View>
        )}
      />
      <View style={styles.chatBox}>
        <TextInput
          style={styles.input}
          placeholder="Type message"
          value={text}
          onChangeText={setText}
        />
        <Pressable style={styles.sendButton} onPress={onSend}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f6f8ff"
  },
  threadList: {
    paddingVertical: 10,
    paddingHorizontal: 8
  },
  thread: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4
  },
  threadActive: {
    backgroundColor: "#ffe3d9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4
  },
  threadText: {
    color: "#1e2c4e"
  },
  messages: {
    flex: 1,
    paddingHorizontal: 10
  },
  messageBubble: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8
  },
  chatBox: {
    flexDirection: "row",
    gap: 8,
    padding: 10
  },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12
  },
  sendButton: {
    backgroundColor: "#ff5e32",
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 14
  },
  sendText: {
    color: "#fff",
    fontWeight: "700"
  }
});
