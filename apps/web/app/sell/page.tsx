"use client";

import { FormEvent, useMemo, useState } from "react";
import { OtpLoginCard } from "../../components/otp-login-card";
import {
  activateListing,
  ApiError,
  createListing,
  uploadListingMedia
} from "../../lib/api";
import { useAuthToken } from "../../lib/use-auth-token";

type WizardStep = 1 | 2 | 3 | 4;
type Condition = "NEW" | "USED" | "LIKE_NEW";

type MediaItem = {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  durationSec?: number;
};

type SellFormState = {
  categoryId: string;
  title: string;
  description: string;
  price: string;
  condition: Condition;
  city: string;
  media: MediaItem[];
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
  condition: "USED",
  city: "",
  media: [],
  showPhone: true,
  allowChat: true,
  allowCall: true,
  allowSMS: true
};

const categories = [
  { id: "mobiles", label: "Mobiles" },
  { id: "vehicles", label: "Vehicles" },
  { id: "property", label: "Property" },
  { id: "electronics", label: "Electronics" },
  { id: "fashion", label: "Fashion" },
  { id: "home", label: "Home" }
];

const stepLabels = ["Category", "Details", "Media", "Review"];

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export default function SellPage() {
  const { mounted, token } = useAuthToken();
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<SellFormState>(initialState);
  const [imageInput, setImageInput] = useState("");
  const [videoInput, setVideoInput] = useState("");
  const [videoDuration, setVideoDuration] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [stepLoading, setStepLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const images = form.media.filter((item) => item.type === "IMAGE");
  const video = form.media.find((item) => item.type === "VIDEO");
  const progress = (step / 4) * 100;

  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (!form.categoryId.trim()) {
      errs.push("Category required hai.");
    }
    if (!form.title.trim()) {
      errs.push("Title required hai.");
    }
    if (!form.price.trim() || Number(form.price) <= 0) {
      errs.push("Price valid numeric honi chahiye.");
    }
    if (images.length > 6) {
      errs.push("Max 6 images allow hain.");
    }
    if (video && (video.durationSec ?? 0) > 30) {
      errs.push("Video duration 30 sec se kam honi chahiye.");
    }
    return errs;
  }, [form.categoryId, form.price, form.title, images.length, video]);

  function goNextStep() {
    setError("");
    setSuccess("");
    if (step === 1 && !form.categoryId.trim()) {
      setError("Category select karna zaroori hai.");
      return;
    }
    if (step === 2) {
      if (!form.title.trim()) {
        setError("Title required hai.");
        return;
      }
      if (!form.price.trim() || Number(form.price) <= 0) {
        setError("Price valid numeric honi chahiye.");
        return;
      }
    }
    if (step === 3) {
      if (images.length > 6) {
        setError("Max 6 images allow hain.");
        return;
      }
      if (video && (video.durationSec ?? 0) > 30) {
        setError("Video duration max 30 sec.");
        return;
      }
    }

    setStepLoading(true);
    setTimeout(() => {
      setStep((prev) => (prev < 4 ? ((prev + 1) as WizardStep) : prev));
      setStepLoading(false);
    }, 220);
  }

  function goBackStep() {
    setError("");
    setSuccess("");
    setStep((prev) => (prev > 1 ? ((prev - 1) as WizardStep) : prev));
  }

  function addImage() {
    setError("");
    if (!imageInput.trim()) {
      setError("Image URL add karein.");
      return;
    }
    if (!isValidHttpUrl(imageInput.trim())) {
      setError("Image URL valid http/https hona chahiye.");
      return;
    }
    if (images.length >= 6) {
      setError("Max 6 images allow hain.");
      return;
    }
    setForm((prev) => ({
      ...prev,
      media: [...prev.media, { id: uid(), type: "IMAGE", url: imageInput.trim() }]
    }));
    setImageInput("");
  }

  function setOrReplaceVideo() {
    setError("");
    if (!videoInput.trim()) {
      setError("Video URL add karein.");
      return;
    }
    if (!isValidHttpUrl(videoInput.trim())) {
      setError("Video URL valid http/https hona chahiye.");
      return;
    }
    const duration = Number(videoDuration || 0);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 30) {
      setError("Video duration 1 se 30 sec ke darmiyan honi chahiye.");
      return;
    }
    setForm((prev) => {
      const withoutVideo = prev.media.filter((item) => item.type !== "VIDEO");
      return {
        ...prev,
        media: [
          ...withoutVideo,
          { id: uid(), type: "VIDEO", url: videoInput.trim(), durationSec: duration }
        ]
      };
    });
    setVideoInput("");
    setVideoDuration("");
  }

  function removeMedia(id: string) {
    setForm((prev) => ({
      ...prev,
      media: prev.media.filter((item) => item.id !== id)
    }));
  }

  async function onPublish(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      return;
    }

    setPublishing(true);
    try {
      const created = await createListing({
        categoryId: form.categoryId,
        title: form.title,
        description: `${form.description}\n\nCondition: ${form.condition}\nCity: ${form.city}`,
        price: Number(form.price),
        showPhone: form.showPhone,
        allowChat: form.allowChat,
        allowCall: form.allowCall,
        allowSMS: form.allowSMS,
        media: form.media.map((item) => ({
          type: item.type,
          url: item.url,
          durationSec: item.durationSec
        }))
      });

      try {
        await uploadListingMedia(
          created.id,
          form.media.map((item) => ({
            type: item.type,
            url: item.url,
            durationSec: item.durationSec
          }))
        );
      } catch {
        // Older API variants may not expose /listings/:id/media.
        // Listing is already created with media in POST /listings payload.
      }

      await activateListing(created.id);
      setSuccess("Listing successfully publish ho gayi.");
      setForm(initialState);
      setStep(1);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("Fairness rule block: is category me pehle se active listing hai.");
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Publish fail ho gaya. Dobara try karein.");
      }
    } finally {
      setPublishing(false);
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
    <main className="sellWizardScreen">
      <form className="sellWizardCard" onSubmit={onPublish}>
        <header className="sellWizardHeader">
          <p className="feedKicker">Sell Wizard</p>
          <h1>List your product with confidence</h1>
          <p>Step {step} of 4: {stepLabels[step - 1]}</p>
          <div className="wizardProgressTrack" aria-hidden="true">
            <div className="wizardProgressBar" style={{ width: `${progress}%` }} />
          </div>
        </header>

        <section className="wizardBody">
          {stepLoading ? (
            <div className="wizardStepLoading">
              <div className="skeletonLine shimmer w40" />
              <div className="skeletonLine shimmer w90" />
              <div className="skeletonLine shimmer w60" />
            </div>
          ) : null}

          {!stepLoading && step === 1 ? (
            <div className="stack">
              <label className="filterLabel">
                Category
                <select
                  className="input"
                  value={form.categoryId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, categoryId: event.target.value }))
                  }
                >
                  <option value="">Select category</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {!stepLoading && step === 2 ? (
            <div className="stack">
              <label className="filterLabel">
                Title
                <input
                  className="input"
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </label>
              <label className="filterLabel">
                Price
                <input
                  className="input"
                  inputMode="numeric"
                  value={form.price}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, price: event.target.value }))
                  }
                />
              </label>
              <label className="filterLabel">
                Condition
                <select
                  className="input"
                  value={form.condition}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, condition: event.target.value as Condition }))
                  }
                >
                  <option value="NEW">NEW</option>
                  <option value="LIKE_NEW">LIKE_NEW</option>
                  <option value="USED">USED</option>
                </select>
              </label>
              <label className="filterLabel">
                City
                <input
                  className="input"
                  value={form.city}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, city: event.target.value }))
                  }
                />
              </label>
              <label className="filterLabel">
                Description
                <textarea
                  className="input"
                  rows={5}
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </label>
            </div>
          ) : null}

          {!stepLoading && step === 3 ? (
            <div className="stack">
              <div className="mediaComposer">
                <label className="filterLabel">
                  Image URL (max 6)
                  <input
                    className="input"
                    value={imageInput}
                    onChange={(event) => setImageInput(event.target.value)}
                    placeholder="https://cdn.example.com/image.jpg"
                  />
                </label>
                <button type="button" className="searchSubmitBtn" onClick={addImage}>
                  Add Image
                </button>
              </div>

              <div className="mediaComposer">
                <label className="filterLabel">
                  Video URL (optional)
                  <input
                    className="input"
                    value={videoInput}
                    onChange={(event) => setVideoInput(event.target.value)}
                    placeholder="https://cdn.example.com/video.mp4"
                  />
                </label>
                <label className="filterLabel">
                  Duration (sec max 30)
                  <input
                    className="input"
                    inputMode="numeric"
                    value={videoDuration}
                    onChange={(event) => setVideoDuration(event.target.value)}
                  />
                </label>
                <button type="button" className="searchSubmitBtn" onClick={setOrReplaceVideo}>
                  Save Video
                </button>
              </div>

              <div className="wizardMediaGrid">
                {form.media.map((item) => (
                  <article key={item.id} className="wizardMediaCard">
                    <p className="pill">{item.type}</p>
                    <p className="searchResultMeta">{item.url}</p>
                    {item.type === "VIDEO" ? (
                      <p className="searchResultMeta">Duration: {item.durationSec}s</p>
                    ) : null}
                    <button
                      type="button"
                      className="searchSubmitBtn ghost"
                      onClick={() => removeMedia(item.id)}
                    >
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {!stepLoading && step === 4 ? (
            <div className="stack">
              <div className="reviewCard">
                <p><strong>Category:</strong> {form.categoryId || "-"}</p>
                <p><strong>Title:</strong> {form.title || "-"}</p>
                <p><strong>Price:</strong> {form.price || "-"}</p>
                <p><strong>Condition:</strong> {form.condition}</p>
                <p><strong>Media:</strong> {images.length} images, {video ? "1 video" : "0 video"}</p>
              </div>
              <div className="toggleRow">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.showPhone}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, showPhone: event.target.checked }))
                    }
                  />
                  Show Phone
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.allowChat}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, allowChat: event.target.checked }))
                    }
                  />
                  Allow Chat
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.allowCall}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, allowCall: event.target.checked }))
                    }
                  />
                  Allow Call
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.allowSMS}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, allowSMS: event.target.checked }))
                    }
                  />
                  Allow SMS
                </label>
              </div>
            </div>
          ) : null}
        </section>

        <footer className="wizardFooter">
          {step > 1 ? (
            <button type="button" className="searchSubmitBtn ghost" onClick={goBackStep}>
              Back
            </button>
          ) : (
            <span />
          )}
          {step < 4 ? (
            <button type="button" className="searchSubmitBtn" onClick={goNextStep}>
              Next
            </button>
          ) : (
            <button className="searchSubmitBtn" disabled={publishing} type="submit">
              {publishing ? "Publishing..." : "Publish Listing"}
            </button>
          )}
        </footer>

        {validationErrors.length > 0 && step === 4 ? (
          <div className="searchErrorBanner" role="alert">
            {validationErrors[0]}
          </div>
        ) : null}
        {error ? <div className="searchErrorBanner" role="alert">{error}</div> : null}
        {success ? <p className="success">{success}</p> : null}
      </form>
    </main>
  );
}
