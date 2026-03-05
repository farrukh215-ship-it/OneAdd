"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { OtpLoginCard } from "../../components/otp-login-card";
import { SignupCard } from "../../components/signup-card";
import { pakistanCities } from "@aikad/shared";
import {
  activateListing,
  ApiError,
  createListing,
  getCategoryCatalog,
  getMyListings,
  uploadMediaFile,
  uploadListingMedia
} from "../../lib/api";
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
const SELL_DRAFT_KEY = "tgmg_sell_draft_v1";

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function suggestPriceFromText(text: string) {
  const normalized = text.toLowerCase();
  if (normalized.includes("iphone") || normalized.includes("samsung")) return 85000;
  if (normalized.includes("sofa") || normalized.includes("bed")) return 30000;
  if (normalized.includes("laptop")) return 95000;
  if (normalized.includes("bike") || normalized.includes("motorcycle")) return 180000;
  return 12000;
}

function countWords(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export default function SellPage() {
  const { mounted, token } = useAuthToken();
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<SellFormState>(initialState);
  const [mainCategoryId, setMainCategoryId] = useState("");
  const [catalog, setCatalog] = useState<MarketplaceCategory[]>([]);
  const [activeCategoryIds, setActiveCategoryIds] = useState<string[]>([]);
  const [coverImageId, setCoverImageId] = useState("");
  const [videoDuration, setVideoDuration] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [aiHint, setAiHint] = useState("");
  const [stepLoading, setStepLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");

  const draftHydratedRef = useRef(false);

  useEffect(() => {
    void getCategoryCatalog().then(setCatalog).catch(() => setCatalog([]));
  }, []);

  useEffect(() => {
    if (!token) {
      setActiveCategoryIds([]);
      return;
    }
    getMyListings()
      .then((listings) => {
        const ids = listings
          .filter((listing) => listing.status === "ACTIVE" && listing.categoryId)
          .map((listing) => String(listing.categoryId));
        setActiveCategoryIds(Array.from(new Set(ids)));
      })
      .catch(() => setActiveCategoryIds([]));
  }, [token]);

  useEffect(() => {
    if (!mounted || draftHydratedRef.current) {
      return;
    }
    try {
      const raw = localStorage.getItem(SELL_DRAFT_KEY);
      if (!raw) {
        draftHydratedRef.current = true;
        return;
      }
      const parsed = JSON.parse(raw) as {
        step?: WizardStep;
        form?: SellFormState;
        mainCategoryId?: string;
      };
      if (parsed.form) {
        setForm(parsed.form);
      }
      if (parsed.step && parsed.step >= 1 && parsed.step <= 4) {
        setStep(parsed.step);
      }
      if (parsed.mainCategoryId) {
        setMainCategoryId(parsed.mainCategoryId);
      }
      setDraftStatus("Draft restore ho gaya.");
    } catch {
      // Ignore corrupt draft.
    } finally {
      draftHydratedRef.current = true;
    }
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !draftHydratedRef.current) {
      return;
    }
    const payload = JSON.stringify({
      step,
      form,
      mainCategoryId
    });
    localStorage.setItem(SELL_DRAFT_KEY, payload);
    setDraftStatus("Draft auto-saved");
  }, [form, mainCategoryId, mounted, step]);

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
  const selectedMainCategory = useMemo(
    () => catalog.find((root) => root.id === mainCategoryId) ?? null,
    [catalog, mainCategoryId]
  );
  const selectedSubcategories = useMemo(
    () => selectedMainCategory?.subcategories ?? [],
    [selectedMainCategory]
  );
  const hasActiveCategoryLock = useMemo(
    () => Boolean(form.categoryId && activeCategoryIds.includes(form.categoryId)),
    [activeCategoryIds, form.categoryId]
  );
  const descriptionWordCount = useMemo(() => countWords(form.description), [form.description]);
  const priceSuggestions = useMemo(() => {
    const base = suggestPriceFromText(`${form.title} ${form.description}`);
    return [Math.max(500, Math.floor(base * 0.9)), base, Math.floor(base * 1.1)];
  }, [form.description, form.title]);

  useEffect(() => {
    if (!form.categoryId || catalog.length === 0) {
      return;
    }
    const parent = catalog.find((root) =>
      root.subcategories.some((subcategory) => subcategory.id === form.categoryId)
    );
    if (parent && parent.id !== mainCategoryId) {
      setMainCategoryId(parent.id);
    }
  }, [catalog, form.categoryId, mainCategoryId]);

  useEffect(() => {
    if (images.length === 0) {
      setCoverImageId("");
      return;
    }

    if (!coverImageId || !images.some((item) => item.id === coverImageId)) {
      setCoverImageId(images[0].id);
    }
  }, [coverImageId, images]);

  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (!mainCategoryId.trim()) errs.push("Main category required hai.");
    if (!form.categoryId.trim()) errs.push("Category required hai.");
    if (!form.title.trim()) errs.push("Title required hai.");
    if (!form.price.trim() || Number(form.price) <= 0) errs.push("Price valid numeric honi chahiye.");
    if (!form.city.trim()) errs.push("Location select karna zaroori hai.");
    if (images.length < 2) errs.push("Kam az kam 2 images upload karni zaroori hain.");
    if (images.length > 6) errs.push("Max 6 images allow hain.");
    if (video && (video.durationSec ?? 0) > 30) errs.push("Video duration 30 sec se kam honi chahiye.");
    return errs;
  }, [form.categoryId, form.city, form.description, form.price, form.title, images.length, mainCategoryId, video]);

  function goNextStep() {
    setError("");
    setSuccess("");
    if (step === 1) {
      if (!mainCategoryId.trim()) {
        setError("Main category select karna zaroori hai.");
        return;
      }
      if (!form.categoryId.trim()) {
        setError("Subcategory select karna zaroori hai.");
        return;
      }
      if (hasActiveCategoryLock) {
        setError("Is subcategory me aap ka ek active ADD already mojood hai.");
        return;
      }
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
      if (!form.city.trim()) {
        setError("Location select karna zaroori hai.");
        return;
      }
    }
    if (step === 3) {
      if (images.length < 2) {
        setError("Kam az kam 2 images upload karni zaroori hain.");
        return;
      }
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

  function saveDraftManually() {
    const payload = JSON.stringify({ step, form, mainCategoryId });
    localStorage.setItem(SELL_DRAFT_KEY, payload);
    setDraftStatus("Draft save ho gaya.");
  }

  function clearDraftAndReset() {
    localStorage.removeItem(SELL_DRAFT_KEY);
    setForm(initialState);
    setMainCategoryId("");
    setStep(1);
    setDraftStatus("Draft clear ho gaya.");
    setError("");
    setSuccess("");
  }

  async function onImageFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    setError("");
    if (images.length + files.length > 6) {
      setError("Max 6 images allow hain.");
      event.target.value = "";
      return;
    }

    setUploadingImage(true);
    try {
      for (const file of files) {
        const uploaded = await uploadMediaFile({
          file,
          mediaType: "IMAGE"
        });
        setForm((prev) => ({
          ...prev,
          media: [...prev.media, { id: uid(), type: "IMAGE", url: uploaded.url }]
        }));
      }
      setSuccess("Images upload ho gayin.");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Image upload fail ho gayi.");
      }
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  }

  async function onVideoFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError("");
    const duration = Number(videoDuration || 0);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 30) {
      setError("Video duration 1 se 30 sec ke darmiyan honi chahiye.");
      event.target.value = "";
      return;
    }

    setUploadingVideo(true);
    try {
      const uploaded = await uploadMediaFile({
        file,
        mediaType: "VIDEO",
        durationSec: duration
      });
      setForm((prev) => {
        const withoutVideo = prev.media.filter((item) => item.type !== "VIDEO");
        return {
          ...prev,
          media: [
            ...withoutVideo,
            {
              id: uid(),
              type: "VIDEO",
              url: uploaded.url,
              durationSec: uploaded.durationSec ?? duration
            }
          ]
        };
      });
      setSuccess("Video upload ho gayi.");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Video upload fail ho gayi.");
      }
    } finally {
      setUploadingVideo(false);
      event.target.value = "";
    }
  }

  function removeMedia(id: string) {
    setForm((prev) => ({
      ...prev,
      media: prev.media.filter((item) => item.id !== id)
    }));
    if (coverImageId === id) {
      setCoverImageId("");
    }
  }

  function setCoverImage(id: string) {
    setCoverImageId(id);
    setSuccess("Cover image set ho gayi.");
    setError("");
  }

  function runAiAssist(
    action: "TITLE" | "DESCRIPTION" | "PRICE" | "CATEGORY" | "SAFETY"
  ) {
    if (action === "TITLE") {
      const nextTitle = form.title.trim() || `${selectedCategory?.name ?? "Used Item"} - Asli Condition`;
      setForm((prev) => ({ ...prev, title: nextTitle }));
      setAiHint("AI Title Assist: clean title set ho gaya.");
      return;
    }
    if (action === "DESCRIPTION") {
      const base = form.description.trim() || "Asli condition item, carefully used.";
      const enriched = `${base}\n\nAI Note:\n- Original photos attached\n- Demo available for serious buyer\n- No spam offers please`;
      setForm((prev) => ({ ...prev, description: enriched }));
      setAiHint("AI Description Assist: detailed copy generate ho gayi.");
      return;
    }
    if (action === "PRICE") {
      const computed = suggestPriceFromText(`${form.title} ${form.description}`);
      setForm((prev) => ({ ...prev, price: String(computed) }));
      setAiHint(`AI Price Assist: suggested price PKR ${computed.toLocaleString()}`);
      return;
    }
    if (action === "CATEGORY") {
      const terms = `${form.title} ${form.description}`.toLowerCase();
      const match = catalog.find((root) =>
        root.subcategories.some((item) =>
          terms.includes(item.name.toLowerCase().split(" ")[0])
        )
      );
      const sub = match?.subcategories.find((item) =>
        terms.includes(item.name.toLowerCase().split(" ")[0])
      );
      if (sub && match) {
        setMainCategoryId(match.id);
        setForm((prev) => ({ ...prev, categoryId: sub.id }));
        setAiHint(`AI Category Assist: ${sub.parentName} / ${sub.name} suggest kiya gaya.`);
      } else {
        setAiHint("AI Category Assist: clear match nahi mila, manual selection better hai.");
      }
      return;
    }
    const suspicious = /(advance payment|only bank|urgent deal|gift card)/i.test(
      `${form.title} ${form.description}`
    );
    setAiHint(
      suspicious
        ? "AI Safety Scan: wording me risk signals hain. Description ko transparent banayein."
        : "AI Safety Scan: listing wording clean lag rahi hai."
    );
  }

  async function publishListing() {
    setPublishing(true);
    try {
      const orderedMedia = (() => {
        const imageList = form.media.filter((item) => item.type === "IMAGE");
        const videoList = form.media.filter((item) => item.type === "VIDEO");
        if (!coverImageId || imageList.length === 0) {
          return [...imageList, ...videoList];
        }
        const cover = imageList.find((item) => item.id === coverImageId);
        const rest = imageList.filter((item) => item.id !== coverImageId);
        return cover ? [cover, ...rest, ...videoList] : [...imageList, ...videoList];
      })();

      const created = await createListing({
        categoryId: form.categoryId,
        title: form.title,
        description: `${form.description}\n\nCondition: ${form.condition}`,
        city: form.city,
        price: Number(form.price),
        showPhone: form.showPhone,
        allowChat: form.allowChat,
        allowCall: form.allowCall,
        allowSMS: form.allowSMS,
        isNegotiable: form.isNegotiable,
        media: orderedMedia.map((item) => ({
          type: item.type,
          url: item.url,
          durationSec: item.durationSec
        }))
      });

      try {
        await uploadListingMedia(
          created.id,
          orderedMedia.map((item) => ({
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
      setMainCategoryId("");
      setCoverImageId("");
      setStep(1);
      localStorage.removeItem(SELL_DRAFT_KEY);
      setDraftStatus("Draft clear ho gaya.");
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
      await publishListing();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Publish fail ho gaya. Dobara try karein.");
      }
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
          <div className="wizardHelperActions">
            <button type="button" className="searchSubmitBtn ghost" onClick={saveDraftManually}>
              Save Draft
            </button>
            <button type="button" className="searchSubmitBtn ghost" onClick={clearDraftAndReset}>
              Clear Draft
            </button>
            {draftStatus ? <span className="draftStatusText">{draftStatus}</span> : null}
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
                Main Category
                <select
                  className="input"
                  value={mainCategoryId}
                  onChange={(event) => {
                    const nextRootId = event.target.value;
                    setMainCategoryId(nextRootId);
                    setForm((prev) => ({ ...prev, categoryId: "" }));
                  }}
                >
                  <option value="">Main category select karo</option>
                  {catalog.map((root) => (
                    <option key={root.id} value={root.id}>
                      {root.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filterLabel">
                Sub Category
                <select
                  className="input"
                  value={form.categoryId}
                  onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                  disabled={!mainCategoryId}
                >
                  <option value="">Subcategory select karo</option>
                  {selectedSubcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </label>
              {selectedMainCategory ? (
                <p className="shareHint">
                  Live demand: {selectedMainCategory.listingCount} active listings in this main category.
                </p>
              ) : null}
              {hasActiveCategoryLock ? (
                <div className="searchErrorBanner" role="alert">
                  Is subcategory me aap ka ek active ADD already mojood hai. Pehle purana ADD sold/deactivate karein.
                </div>
              ) : null}
            </div>
          ) : null}

          {!stepLoading && step === 2 ? (
            <div className="stack">
              <label className="filterLabel">
                Kya bech rahe ho? (Title)
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
                Aap kahan hain? (Location)
                <input
                  className="input"
                  list="pakistan-city-options"
                  placeholder="City select ya search karein"
                  value={form.city}
                  onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                />
                <datalist id="pakistan-city-options">
                  {pakistanCities.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
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
              <p className="shareHint">Word count: {descriptionWordCount}</p>
              <div className="priceSuggestionRow">
                {priceSuggestions.map((price) => (
                  <button
                    key={price}
                    type="button"
                    className="searchSubmitBtn ghost"
                    onClick={() => setForm((prev) => ({ ...prev, price: String(price) }))}
                  >
                    PKR {price.toLocaleString()}
                  </button>
                ))}
              </div>
              <div className="toggleRow">
                <button className="searchSubmitBtn ghost" type="button" onClick={() => runAiAssist("TITLE")}>
                  AI Title
                </button>
                <button className="searchSubmitBtn ghost" type="button" onClick={() => runAiAssist("DESCRIPTION")}>
                  AI Description
                </button>
                <button className="searchSubmitBtn ghost" type="button" onClick={() => runAiAssist("PRICE")}>
                  AI Price
                </button>
                <button className="searchSubmitBtn ghost" type="button" onClick={() => runAiAssist("CATEGORY")}>
                  AI Category
                </button>
                <button className="searchSubmitBtn ghost" type="button" onClick={() => runAiAssist("SAFETY")}>
                  AI Safety
                </button>
              </div>
              {aiHint ? <p className="shareHint">{aiHint}</p> : null}
            </div>
          ) : null}

          {!stepLoading && step === 3 ? (
            <div className="stack">
              <div className="mediaComposer">
                <label className="filterLabel">
                  Upload Images (minimum 2, max 6)
                  <input
                    className="input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={onImageFilesSelected}
                    disabled={uploadingImage || publishing}
                  />
                </label>
                <button type="button" className="searchSubmitBtn ghost" disabled>
                  {uploadingImage ? "Uploading..." : "Auto Upload Enabled"}
                </button>
              </div>
              <p className="shareHint">Required: kam az kam 2 images upload karna zaroori hai.</p>

              <div className="mediaComposer">
                <label className="filterLabel">
                  Video Duration (sec max 30)
                  <input
                    className="input"
                    inputMode="numeric"
                    value={videoDuration}
                    onChange={(event) => setVideoDuration(event.target.value)}
                  />
                </label>
                <label className="filterLabel">
                  Upload Video (optional, &lt;=30 sec)
                  <input
                    className="input"
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={onVideoFileSelected}
                    disabled={uploadingVideo || publishing}
                  />
                </label>
                <button type="button" className="searchSubmitBtn ghost" disabled>
                  {uploadingVideo ? "Uploading..." : "Video Upload Ready"}
                </button>
              </div>

              <div className="wizardMediaGrid">
                {form.media.map((item, index) => (
                  <article key={item.id} className="wizardMediaCard">
                    <p className="pill">{item.type}</p>
                    {item.type === "IMAGE" ? (
                      <img className="wizardMediaPreview" src={item.url} alt={`Upload ${index + 1}`} />
                    ) : (
                      <video className="wizardMediaPreview" src={item.url} controls preload="metadata" />
                    )}
                    {item.type === "VIDEO" ? (
                      <p className="searchResultMeta">Duration: {item.durationSec}s</p>
                    ) : null}
                    {item.type === "IMAGE" ? (
                      <button
                        type="button"
                        className={`searchSubmitBtn ghost ${coverImageId === item.id ? "isCoverBtn" : ""}`}
                        onClick={() => setCoverImage(item.id)}
                      >
                        {coverImageId === item.id ? "Cover Selected" : "Set as Cover"}
                      </button>
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
                <p>
                  <strong>Cover image:</strong>{" "}
                  {coverImageId ? `Selected (${images.findIndex((item) => item.id === coverImageId) + 1})` : "Auto first image"}
                </p>
                <p>
                  <strong>Description words:</strong> {descriptionWordCount}
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
              {publishing ? "Please wait..." : "Post Karo"}
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
    </main>
  );
}
