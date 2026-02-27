"use client";

import { FormEvent, useState } from "react";
import { OtpLoginCard } from "../../components/otp-login-card";
import { createListing, getToken } from "../../lib/api";

type SellFormState = {
  categoryId: string;
  title: string;
  description: string;
  price: string;
  imageUrl: string;
  videoUrl: string;
  videoDurationSec: string;
  showPhone: boolean;
  allowChat: boolean;
  allowCall: boolean;
  allowSMS: boolean;
};

const initialState: SellFormState = {
  categoryId: "",
  title: "",
  description: "",
  price: "",
  imageUrl: "",
  videoUrl: "",
  videoDurationSec: "",
  showPhone: true,
  allowChat: true,
  allowCall: true,
  allowSMS: true
};

export default function SellPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<SellFormState>(initialState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const token = getToken();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      const media = [];
      if (form.imageUrl) {
        media.push({ type: "IMAGE", url: form.imageUrl });
      }
      if (form.videoUrl) {
        media.push({
          type: "VIDEO",
          url: form.videoUrl,
          durationSec: Number(form.videoDurationSec || 0)
        });
      }

      await createListing({
        categoryId: form.categoryId,
        title: form.title,
        description: form.description,
        price: Number(form.price),
        showPhone: form.showPhone,
        allowChat: form.allowChat,
        allowCall: form.allowCall,
        allowSMS: form.allowSMS,
        media
      });

      setSuccess("Listing created successfully.");
      setForm(initialState);
      setStep(1);
    } catch {
      setError("Failed to create listing.");
    }
  }

  if (!token) {
    return (
      <main className="screen">
        <OtpLoginCard />
      </main>
    );
  }

  return (
    <main className="screen">
      <form className="panel" onSubmit={onSubmit}>
        <p className="kicker">Sell Wizard</p>
        <h1>Create Listing</h1>
        <p>Step {step} of 3</p>

        {step === 1 && (
          <div className="stack">
            <input
              className="input"
              placeholder="Category ID"
              value={form.categoryId}
              onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
            />
            <input
              className="input"
              placeholder="Title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
            <textarea
              className="input"
              placeholder="Description"
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
            <input
              className="input"
              type="number"
              placeholder="Price"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
            />
          </div>
        )}

        {step === 2 && (
          <div className="stack">
            <input
              className="input"
              placeholder="Image URL"
              value={form.imageUrl}
              onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
            />
            <input
              className="input"
              placeholder="Video URL (optional)"
              value={form.videoUrl}
              onChange={(event) => setForm({ ...form, videoUrl: event.target.value })}
            />
            <input
              className="input"
              type="number"
              max={30}
              placeholder="Video duration (sec <= 30)"
              value={form.videoDurationSec}
              onChange={(event) =>
                setForm({ ...form, videoDurationSec: event.target.value })
              }
            />
          </div>
        )}

        {step === 3 && (
          <div className="stack">
            <label className="toggle">
              <input
                type="checkbox"
                checked={form.showPhone}
                onChange={(event) =>
                  setForm({ ...form, showPhone: event.target.checked })
                }
              />
              Show Phone
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={form.allowChat}
                onChange={(event) =>
                  setForm({ ...form, allowChat: event.target.checked })
                }
              />
              Allow Chat
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={form.allowCall}
                onChange={(event) =>
                  setForm({ ...form, allowCall: event.target.checked })
                }
              />
              Allow Call
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={form.allowSMS}
                onChange={(event) =>
                  setForm({ ...form, allowSMS: event.target.checked })
                }
              />
              Allow SMS
            </label>
          </div>
        )}

        <div className="actions">
          {step > 1 && (
            <button type="button" className="btn secondary" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          {step < 3 ? (
            <button type="button" className="btn" onClick={() => setStep(step + 1)}>
              Next
            </button>
          ) : (
            <button className="btn" type="submit">
              Publish
            </button>
          )}
        </div>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </form>
    </main>
  );
}
