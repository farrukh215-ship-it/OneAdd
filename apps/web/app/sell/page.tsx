"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "firebase/auth";
import { OtpLoginCard } from "../../components/otp-login-card";
import { SignupCard } from "../../components/signup-card";
import {
  activateListing,
  ApiError,
  createListing,
  getCategoryCatalog,
  requestListingPublishOtp,
  uploadListingMedia,
  verifyListingPublishOtp
} from "../../lib/api";
import { getFirebaseAuth, isFirebaseConfigured } from "../../lib/firebase";
import { MarketplaceCategory } from "../../lib/types";
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
  isNegotiable: boolean;
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
  isNegotiable: false,
  media: [],
  showPhone: true,
  allowChat: true,
  allowCall: true,
  allowSMS: true
};

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
  const [catalog, setCatalog] = useState<MarketplaceCategory[]>([]);
  const [imageInput, setImageInput] = useState("");
  const [videoInput, setVideoInput] = useState("");
  const [videoDuration, setVideoDuration] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [stepLoading, setStepLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishOtpModalOpen, setPublishOtpModalOpen] = useState(false);
  const [publishOtpCode, setPublishOtpCode] = useState("");
  const [publishOtpPhone, setPublishOtpPhone] = useState("");
  const [publishOtpResendIn, setPublishOtpResendIn] = useState(0);

  const recaptchaElementRef = useRef<HTMLDivElement | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const publishConfirmationRef = useRef<ConfirmationResult | null>(null);

  useEffect(() => {
    void getCategoryCatalog().then(setCatalog).catch(() => setCatalog([]));
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured() || !recaptchaElementRef.current) {
      return;
    }

    const auth = getFirebaseAuth();
    recaptchaVerifierRef.current = new RecaptchaVerifier(
      auth,
      recaptchaElementRef.current,
      { size: "invisible" }
    );

    return () => {
      recaptchaVerifierRef.current?.clear();
      recaptchaVerifierRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (publishOtpResendIn <= 0) return;
    const timer = window.setTimeout(() => {
      setPublishOtpResendIn((prev) => prev - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [publishOtpResendIn]);

  const images = form.media.filter((item) => item.type === "IMAGE");
  const video = form.media.find((item) => item.type === "VIDEO");
  const progress = (step / 4) * 100;
  const selectedCategory = useMemo(
    () =>
      catalog
        .flatMap((root) => root.subcategories)
        .find((subcategory) => subcategory.id === form.categoryId),
    [catalog, form.categoryId]
  );

  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (!form.categoryId.trim()) errs.push("Category required hai.");
    if (!form.title.trim()) errs.push("Title required hai.");
    if (!form.price.trim() || Number(form.price) <= 0) errs.push("Price valid numeric honi chahiye.");
    if (images.length > 6) errs.push("Max 6 images allow hain.");
    if (video && (video.durationSec ?? 0) > 30) errs.push("Video duration 30 sec se kam honi chahiye.");
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

  async function requestPublishOtp() {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase config missing hai. apps/web/.env.local set karein.");
    }
    if (!recaptchaVerifierRef.current) {
      throw new Error("reCAPTCHA initialize nahi hua. Page refresh karein.");
    }

    const otpRequest = await requestListingPublishOtp();
    const auth = getFirebaseAuth();
    const confirmation = await signInWithPhoneNumber(
      auth,
      otpRequest.phone,
      recaptchaVerifierRef.current
    );

    publishConfirmationRef.current = confirmation;
    setPublishOtpPhone(otpRequest.phone);
    setPublishOtpCode("");
    setPublishOtpResendIn(60);
    setPublishOtpModalOpen(true);
  }

  async function publishWithOtpToken(publishOtpVerificationToken: string) {
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
        isNegotiable: form.isNegotiable,
        publishOtpVerificationToken,
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
      }

      await activateListing(created.id);
      setSuccess("Listing successfully publish ho gayi.");
      setForm(initialState);
      setStep(1);
      setPublishOtpModalOpen(false);
      setPublishOtpCode("");
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

  async function onPublish(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      return;
    }

    try {
      await requestPublishOtp();
      setSuccess("OTP send ho gaya. Verify karke listing post karein.");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("OTP request fail ho gaya. Dobara try karein.");
      }
    }
  }

  async function onResendPublishOtp() {
    if (publishOtpResendIn > 0 || publishing) {
      return;
    }
    setError("");
    setSuccess("");
    try {
      await requestPublishOtp();
      setSuccess("Naya OTP send kar diya gaya.");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("OTP resend fail ho gaya.");
      }
    }
  }

  async function onVerifyPublishOtp(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!publishConfirmationRef.current) {
      setError("Pehle OTP request karein.");
      return;
    }
    if (publishOtpCode.trim().length !== 6) {
      setError("6-digit OTP required hai.");
      return;
    }

    setPublishing(true);
    try {
      const credential = await publishConfirmationRef.current.confirm(publishOtpCode.trim());
      const idToken = await credential.user.getIdToken(true);
      const verification = await verifyListingPublishOtp({ idToken });
      await publishWithOtpToken(verification.publishOtpVerificationToken);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("OTP verify fail ho gaya.");
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
      <main className="screen accountScreen">
        <section className="accountGrid">
          <OtpLoginCard />
          <SignupCard />
        </section>
      </main>
    );
  }

  return (
    <main className="sellWizardScreen">
      <form className="sellWizardCard" onSubmit={onPublish}>
        <header className="sellWizardHeader">
          <p className="feedKicker">TGMG Sell Wizard</p>
          <h1>Apna Saaman Becho</h1>
          <p>Ek ADD - seedha asli kharedaar tak</p>
          <p className="helperText">
            Shopkeepers/showroom owners ke duplicate ADDs marketplace ko flood karte hain.
            TGMG par real sellers ko priority milti hai.
          </p>
          <p>
            Step {step} of 4: {stepLabels[step - 1]}
          </p>
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
                Kis cheez ka hai? (subcategory select karein)
                <select
                  className="input"
                  value={form.categoryId}
                  onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                >
                  <option value="">Subcategory select karo</option>
                  {catalog.map((root) => (
                    <optgroup key={root.id} label={root.name}>
                      {root.subcategories.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {!stepLoading && step === 2 ? (
            <div className="stack">
              <label className="filterLabel">
                Kya bech rahe ho?
                <input
                  className="input"
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                />
              </label>
              <label className="filterLabel">
                Daam (PKR)
                <input
                  className="input"
                  inputMode="numeric"
                  value={form.price}
                  onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
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
                Aap kahan hain?
                <input
                  className="input"
                  value={form.city}
                  onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                />
              </label>
              <label className="filterLabel">
                Apni cheez ke baare mein batao
                <textarea
                  className="input"
                  rows={5}
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
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
                <p>
                  <strong>Category:</strong>{" "}
                  {selectedCategory
                    ? `${selectedCategory.parentName} / ${selectedCategory.name}`
                    : "-"}
                </p>
                <p>
                  <strong>Title:</strong> {form.title || "-"}
                </p>
                <p>
                  <strong>Price:</strong> {form.price || "-"}
                </p>
                <p>
                  <strong>Condition:</strong> {form.condition}
                </p>
                <p>
                  <strong>Negotiable:</strong> {form.isNegotiable ? "Yes" : "No"}
                </p>
                <p>
                  <strong>Media:</strong> {images.length} images, {video ? "1 video" : "0 video"}
                </p>
              </div>
              <div className="toggleRow">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.showPhone}
                    onChange={(event) => setForm((prev) => ({ ...prev, showPhone: event.target.checked }))}
                  />
                  Show Phone
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.allowChat}
                    onChange={(event) => setForm((prev) => ({ ...prev, allowChat: event.target.checked }))}
                  />
                  Allow Chat
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.allowCall}
                    onChange={(event) => setForm((prev) => ({ ...prev, allowCall: event.target.checked }))}
                  />
                  Allow Call
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.allowSMS}
                    onChange={(event) => setForm((prev) => ({ ...prev, allowSMS: event.target.checked }))}
                  />
                  Allow SMS
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.isNegotiable}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, isNegotiable: event.target.checked }))
                    }
                  />
                  Price Negotiable
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
              {publishing ? "Please wait..." : "Post Karo (OTP Verify)"}
            </button>
          )}
        </footer>

        {validationErrors.length > 0 && step === 4 ? (
          <div className="searchErrorBanner" role="alert">
            {validationErrors[0]}
          </div>
        ) : null}
        {error ? (
          <div className="searchErrorBanner" role="alert">
            {error}
          </div>
        ) : null}
        {success ? <p className="success">{success}</p> : null}
      </form>

      {publishOtpModalOpen ? (
        <div className="modalBackdrop" role="dialog" aria-modal="true">
          <div className="modalCard">
            <h3>Publish OTP Verification</h3>
            <p className="shareHint">
              Product post karne ke liye OTP verify zaroori hai. OTP: {publishOtpPhone}
            </p>
            <form className="stack" onSubmit={onVerifyPublishOtp}>
              <input
                className="input"
                placeholder="6-digit OTP"
                value={publishOtpCode}
                onChange={(event) => setPublishOtpCode(event.target.value)}
                maxLength={6}
                autoComplete="one-time-code"
                required
              />
              <div className="modalActions">
                <button
                  className="btn secondary"
                  type="button"
                  onClick={onResendPublishOtp}
                  disabled={publishOtpResendIn > 0 || publishing}
                >
                  {publishOtpResendIn > 0
                    ? `Resend in ${publishOtpResendIn}s`
                    : "Resend OTP"}
                </button>
                <button className="btn" type="submit" disabled={publishing}>
                  {publishing ? "Verifying..." : "Verify OTP & Post"}
                </button>
              </div>
            </form>
            <button
              className="btn secondary"
              type="button"
              onClick={() => setPublishOtpModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      <div ref={recaptchaElementRef} />
    </main>
  );
}
