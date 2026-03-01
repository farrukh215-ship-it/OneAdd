"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { OtpLoginCard } from "../../components/otp-login-card";
import {
  ApiError,
  getChatMessages,
  getChatThreads,
  sendChatMessage
} from "../../lib/api";
import { useAuthToken } from "../../lib/use-auth-token";
import { ChatMessage, ChatThread } from "../../lib/types";

function getUserIdFromToken(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return "";
    }
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as {
      sub?: string;
    };
    return decoded.sub ?? "";
  } catch {
    return "";
  }
}

function formatTime(value?: string) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPage() {
  const { mounted, token } = useAuthToken();
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

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [threads, activeThreadId]
  );
  const isClosedThread =
    activeThread?.status === "CLOSED" || activeThread?.listing?.status === "SOLD";

  useEffect(() => {
    if (!token) {
      return;
    }

    setThreadsLoading(true);
    setError("");
    getChatThreads()
      .then((data) => {
        setThreads(data);
        if (data[0]) {
          setActiveThreadId(data[0].id);
        }
      })
      .catch(() => setError("Threads load nahi ho sakin."))
      .finally(() => setThreadsLoading(false));
  }, [token]);

  useEffect(() => {
    if (!activeThreadId || !token) {
      return;
    }

    let alive = true;
    async function loadThreadMessages() {
      setMessagesLoading(true);
      try {
        const data = await getChatMessages(activeThreadId);
        if (alive) {
          setMessages(data);
          setError("");
        }
      } catch {
        if (alive) {
          setError("Messages load nahi ho sakay.");
        }
      } finally {
        if (alive) {
          setMessagesLoading(false);
        }
      }
    }

    loadThreadMessages();
    const timer = setInterval(loadThreadMessages, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [activeThreadId, token]);

  async function onSend(event: FormEvent) {
    event.preventDefault();
    if (!activeThreadId || !text.trim() || isClosedThread) {
      return;
    }

    setSendError("");
    setSending(true);
    try {
      await sendChatMessage(activeThreadId, text.trim());
      setText("");
      const updated = await getChatMessages(activeThreadId);
      setMessages(updated);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setSendError("Thread closed hai. Message send nahi hoga.");
      } else {
        setSendError("Message send nahi hua.");
      }
    } finally {
      setSending(false);
    }
  }

  if (!mounted) {
    return <main className="screen" />;
  }

  if (!token) {
    return (
      <main className="screen">
        <OtpLoginCard />
      </main>
    );
  }

  return (
    <main className="chatInboxScreen">
      <section className="chatInboxLayout">
        <aside className="chatThreadsPanel">
          <header className="chatPanelHeader">
            <h1>Inbox</h1>
          </header>

          {threadsLoading ? (
            <div className="chatThreadSkeletonList" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, index) => (
                <div className="chatThreadSkeleton shimmer" key={index} />
              ))}
            </div>
          ) : null}

          {!threadsLoading && threads.length === 0 ? (
            <div className="chatEmptyState">
              <p>No conversations yet</p>
            </div>
          ) : null}

          {!threadsLoading && threads.length > 0 ? (
            <div className="chatThreadList">
              {threads.map((thread) => {
                const isActive = thread.id === activeThreadId;
                const peerName =
                  (thread.buyer?.id === currentUserId ? thread.seller?.fullName : thread.buyer?.fullName) ||
                  "Conversation";
                return (
                  <button
                    key={thread.id}
                    className={`chatThreadItem ${isActive ? "active" : ""}`}
                    onClick={() => setActiveThreadId(thread.id)}
                    type="button"
                  >
                    <p className="chatThreadTitle">{thread.listing?.title || "Direct Chat"}</p>
                    <p className="chatThreadMeta">{peerName}</p>
                    <p className="chatThreadTime">{formatTime(thread.lastMessageAt)}</p>
                  </button>
                );
              })}
            </div>
          ) : null}
        </aside>

        <section className="chatConversationPanel">
          {error ? <div className="searchErrorBanner">{error}</div> : null}

          {activeThread ? (
            <header className="chatPanelHeader">
              <h2>{activeThread.listing?.title || "Conversation"}</h2>
            </header>
          ) : null}

          {messagesLoading ? (
            <div className="chatMessageSkeletonList" aria-hidden="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <div className="chatMessageSkeleton shimmer" key={index} />
              ))}
            </div>
          ) : null}

          {!messagesLoading && activeThreadId && (
            <div className="chatMessagesList">
              {messages.map((message) => {
                const mine = message.senderId === currentUserId;
                return (
                  <article
                    key={message.id}
                    className={`chatBubble ${mine ? "mine" : "theirs"}`}
                  >
                    <p className="chatBubbleSender">{mine ? "You" : "Seller"}</p>
                    <p className="chatBubbleText">{message.content}</p>
                    <time className="chatBubbleTime">{formatTime(message.createdAt)}</time>
                  </article>
                );
              })}

              {isClosedThread ? (
                <article className="chatSystemMessage">
                  Chat closed. Listing sold/expired ya thread close ho chuki hai.
                </article>
              ) : null}
            </div>
          )}

          <form className="chatComposer" onSubmit={onSend}>
            <input
              className="input"
              value={text}
              placeholder={isClosedThread ? "Chat closed" : "Type a message"}
              onChange={(event) => setText(event.target.value)}
              disabled={!activeThreadId || isClosedThread || sending}
            />
            <button className="searchSubmitBtn" disabled={!activeThreadId || isClosedThread || sending} type="submit">
              {sending ? "Sending..." : "Send"}
            </button>
          </form>
          {sendError ? <p className="error">{sendError}</p> : null}
        </section>
      </section>
    </main>
  );
}
