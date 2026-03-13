'use client';

import type { ListingThreadResponse } from '@tgmg/types';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../../lib/api';

export function ListingPublicChat({ listingId, askingPrice }: { listingId: string; askingPrice: number }) {
  const [thread, setThread] = useState<ListingThreadResponse | null>(null);
  const [message, setMessage] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [pendingImage, setPendingImage] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchThread = async () => {
    try {
      const response = await api.get<ListingThreadResponse>(`/listings/${listingId}/chat`);
      setThread(response.data);
    } catch {
      setStatus('Chat load nahi ho saki.');
    }
  };

  useEffect(() => {
    void fetchThread();
  }, [listingId]);

  const closestText = useMemo(() => {
    if (!thread?.nearestOffer) return null;
    return `Closest offer: PKR ${thread.nearestOffer.amount.toLocaleString()}`;
  }, [thread?.nearestOffer]);

  const bestText = useMemo(() => {
    if (!thread?.bestOffer) return null;
    return `Best offer: PKR ${thread.bestOffer.amount.toLocaleString()}`;
  }, [thread?.bestOffer]);

  const postMessage = async () => {
    if (!message.trim() && !pendingImage) return;
    setLoading(true);
    setStatus(null);
    try {
      await api.post(`/listings/${listingId}/chat/messages`, {
        message: message.trim() || undefined,
        imageUrl: pendingImage || undefined,
      });
      setMessage('');
      setPendingImage('');
      await fetchThread();
    } catch (error: any) {
      const m = error?.response?.data?.message;
      setStatus(Array.isArray(m) ? m[0] : m || 'Message send nahi hui');
    } finally {
      setLoading(false);
    }
  };

  const postOffer = async () => {
    const amount = Number(offerAmount);
    if (!Number.isFinite(amount) || amount < 100) {
      setStatus('Sahi offer amount dalo');
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      await api.post(`/listings/${listingId}/offers`, { amount });
      setOfferAmount('');
      await fetchThread();
    } catch (error: any) {
      const m = error?.response?.data?.message;
      setStatus(Array.isArray(m) ? m[0] : m || 'Offer submit nahi hui');
    } finally {
      setLoading(false);
    }
  };

  const uploadChatImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setStatus(null);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('kind', 'chat');
      const response = await api.post<{ url: string }>('/uploads/proxy', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPendingImage(response.data.url);
      setStatus('Chat image ready hai. Send dabao.');
    } catch (error: any) {
      const m = error?.response?.data?.message;
      setStatus(Array.isArray(m) ? m[0] : m || 'Image upload nahi hui');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <section className="surface mt-6 p-4">
      <div className="mb-2 text-lg font-extrabold text-ink">Public Chat & Offers</div>
      <div className="text-xs text-ink2">
        Yeh public thread hai. Is listing ki chat sab users dekh sakte hain.
      </div>
      <div className="mt-2 rounded-xl bg-[#F8F9FB] px-3 py-2 text-sm text-ink2">
        Asking price: PKR {askingPrice.toLocaleString()}
      </div>

      {closestText || bestText ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {closestText ? <span className="badge-soft-gray">{closestText}</span> : null}
          {bestText ? <span className="badge-soft-green">{bestText}</span> : null}
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="field-input"
          placeholder="Public message likhein..."
        />
        <input
          value={offerAmount}
          onChange={(event) => setOfferAmount(event.target.value.replace(/\D/g, ''))}
          className="field-input"
          placeholder="Offer amount"
        />
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-white !px-4"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            Add image
          </button>
          <button type="button" className="btn-white !px-4" onClick={postMessage} disabled={loading}>
            Send
          </button>
          <button type="button" className="btn-red !px-4" onClick={postOffer} disabled={loading}>
            Offer
          </button>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={uploadChatImage}
      />

      {pendingImage ? (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-[#F8F9FB] p-3">
          <img src={pendingImage} alt="Chat upload preview" className="h-16 w-16 rounded-xl object-cover" />
          <div className="text-sm text-ink2">
            Image attach ho gayi. Message optional hai, send dabao.
          </div>
        </div>
      ) : null}

      {status ? <div className="mt-3 text-sm text-ink2">{status}</div> : null}

      <div className="mt-4 max-h-72 space-y-2 overflow-y-auto rounded-xl border border-border p-3">
        {thread?.messages?.length ? (
          thread.messages.map((entry) => (
            <div key={entry.id} className="rounded-xl bg-[#F8F9FB] p-3">
              <div className="flex items-center justify-between gap-2 text-xs text-ink3">
                <span>{entry.user?.name || 'User'}</span>
                <span>{new Date(entry.createdAt).toLocaleString()}</span>
              </div>
              {entry.message.startsWith('[image]') ? (
                <div className="mt-2 space-y-2">
                  <img
                    src={entry.message.replace('[image]', '').split('\n')[0]}
                    alt="Chat attachment"
                    className="max-h-64 w-full rounded-2xl object-cover"
                  />
                  {entry.message.split('\n').slice(1).join('\n').trim() ? (
                    <div className="text-sm text-ink2">
                      {entry.message.split('\n').slice(1).join('\n').trim()}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-1 text-sm text-ink2">{entry.message}</div>
              )}
              {typeof entry.offerAmount === 'number' ? (
                <div className="mt-1 text-xs font-bold text-red">
                  Offer: PKR {entry.offerAmount.toLocaleString()}
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <div className="text-sm text-ink2">Abhi tak koi public chat nahi hui.</div>
        )}
      </div>
    </section>
  );
}
