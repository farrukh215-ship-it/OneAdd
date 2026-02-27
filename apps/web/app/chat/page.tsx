"use client";

import { FormEvent, useEffect, useState } from "react";
import { OtpLoginCard } from "../../components/otp-login-card";
import { getChatMessages, getChatThreads, getToken, sendChatMessage } from "../../lib/api";
import { ChatMessage, ChatThread } from "../../lib/types";

export default function ChatPage() {
  const token = getToken();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }
    getChatThreads()
      .then((data) => {
        setThreads(data);
        if (data[0]) {
          setActiveThreadId(data[0].id);
        }
      })
      .catch(() => setError("Failed to load chats."));
  }, [token]);

  useEffect(() => {
    if (!activeThreadId || !token) {
      return;
    }
    getChatMessages(activeThreadId).then(setMessages).catch(() => {
      setError("Failed to load messages.");
    });
  }, [activeThreadId, token]);

  async function onSend(event: FormEvent) {
    event.preventDefault();
    if (!activeThreadId || !text.trim()) {
      return;
    }
    await sendChatMessage(activeThreadId, text.trim());
    setText("");
    const updated = await getChatMessages(activeThreadId);
    setMessages(updated);
  }

  if (!token) {
    return (
      <main className="screen">
        <OtpLoginCard />
      </main>
    );
  }

  return (
    <main className="screen chatScreen">
      <section className="chatThreads">
        <h2>Threads</h2>
        {threads.map((thread) => (
          <button
            key={thread.id}
            className={thread.id === activeThreadId ? "thread active" : "thread"}
            onClick={() => setActiveThreadId(thread.id)}
            type="button"
          >
            {thread.listing?.title ?? "Direct Thread"}
          </button>
        ))}
      </section>
      <section className="chatWindow">
        <h2>Messages</h2>
        {error && <p className="error">{error}</p>}
        <div className="messages">
          {messages.map((message) => (
            <article key={message.id} className="bubble">
              <p>{message.content}</p>
            </article>
          ))}
        </div>
        <form className="chatForm" onSubmit={onSend}>
          <input
            className="input"
            value={text}
            placeholder="Type a message"
            onChange={(event) => setText(event.target.value)}
          />
          <button className="btn" type="submit">
            Send
          </button>
        </form>
      </section>
    </main>
  );
}
