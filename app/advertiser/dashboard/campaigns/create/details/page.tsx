"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardList,
  ImageIcon,
  Info,
  Link2,
  Loader2,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";

const MINIMUM_REWARD = 50;
const MINIMUM_WORKERS = 10;

/** Keys – use the same keys on category + review pages */
const STORAGE_SELECTION = "campaignSelection";
const STORAGE_DRAFT = "gigplace_campaign_draft";

type CampaignSelection = {
  advertiserId: string;
  category: {
    id: string;
    name: string;
    slug: string | null;
  };
  subcategory: {
    id: string;
    name: string;
    slug: string | null;
  };
};

type CampaignDraft = {
  advertiserId?: string;
  categoryId: string;
  categoryName: string;
  categorySlug?: string | null;
  subcategoryId: string;
  subcategoryName: string;
  subcategorySlug?: string | null;
  title: string;
  description: string;
  targetUrl: string;
  instructions: string;
  coverImageUrl: string;
  rewardPerWorker: number;
  totalWorkers: number;
  totalBudget: number;
  proofRequired: boolean;
  startDate: string | null;
  endDate: string | null;
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export default function CampaignDetailsPage() {
  const router = useRouter();

  const [selection, setSelection] =
    useState<CampaignSelection | null>(null);
  const [loadingSelection, setLoadingSelection] =
    useState(true);
  const [draftRestored, setDraftRestored] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [rewardPerWorker, setRewardPerWorker] =
    useState(MINIMUM_REWARD);
  const [totalWorkers, setTotalWorkers] =
    useState(MINIMUM_WORKERS);
  const [proofRequired, setProofRequired] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [formError, setFormError] = useState("");
  const [saveHint, setSaveHint] = useState("");

  const totalBudget = useMemo(() => {
    const reward = Number(rewardPerWorker) || 0;
    const workers = Number(totalWorkers) || 0;
    return reward * workers;
  }, [rewardPerWorker, totalWorkers]);

  const formatNaira = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount);

  /* =========================================
     LOAD SELECTION + RESTORE DRAFT
  ========================================= */

  useEffect(() => {
    // Prefer localStorage; migrate from sessionStorage if needed
    let parsed = readJson<CampaignSelection>(STORAGE_SELECTION);

    if (!parsed) {
      try {
        const sessionRaw = sessionStorage.getItem(STORAGE_SELECTION);
        if (sessionRaw) {
          parsed = JSON.parse(sessionRaw) as CampaignSelection;
          writeJson(STORAGE_SELECTION, parsed);
          sessionStorage.removeItem(STORAGE_SELECTION);
        }
      } catch {
        // ignore
      }
    }

    if (
      !parsed?.advertiserId ||
      !parsed?.category?.id ||
      !parsed?.subcategory?.id ||
      !parsed?.category?.name ||
      !parsed?.subcategory?.name
    ) {
      setLoadingSelection(false);
      return;
    }

    setSelection(parsed);

    // Restore form fields from saved draft (if same category/subcategory)
    const draft = readJson<CampaignDraft>(STORAGE_DRAFT);

    // Migrate old session draft once
    if (!draft) {
      try {
        const sessionDraft = sessionStorage.getItem(STORAGE_DRAFT);
        if (sessionDraft) {
          const migrated = JSON.parse(sessionDraft) as CampaignDraft;
          writeJson(STORAGE_DRAFT, migrated);
          sessionStorage.removeItem(STORAGE_DRAFT);
          applyDraft(migrated, parsed);
          setDraftRestored(true);
          setLoadingSelection(false);
          return;
        }
      } catch {
        // ignore
      }
    }

    if (draft) {
      applyDraft(draft, parsed);
      setDraftRestored(true);
    }

    setLoadingSelection(false);
  }, []);

  function applyDraft(
    draft: CampaignDraft,
    currentSelection: CampaignSelection
  ) {
    // Only restore field values if draft matches current selection
    // (or if ids match – user continued same campaign type)
    const sameType =
      draft.categoryId === currentSelection.category.id &&
      draft.subcategoryId === currentSelection.subcategory.id;

    if (!sameType && draft.categoryId && draft.subcategoryId) {
      // Different type selected later – still restore text fields if you prefer.
      // Here we restore only when type matches to avoid confusion.
      return;
    }

    if (draft.title) setTitle(draft.title);
    if (draft.description) setDescription(draft.description);
    if (draft.targetUrl) setTargetUrl(draft.targetUrl);
    if (draft.instructions) setInstructions(draft.instructions);
    if (draft.coverImageUrl) setCoverImageUrl(draft.coverImageUrl);
    if (draft.rewardPerWorker)
      setRewardPerWorker(
        Math.max(MINIMUM_REWARD, Number(draft.rewardPerWorker) || MINIMUM_REWARD)
      );
    if (draft.totalWorkers)
      setTotalWorkers(
        Math.max(MINIMUM_WORKERS, Number(draft.totalWorkers) || MINIMUM_WORKERS)
      );
    if (typeof draft.proofRequired === "boolean") {
      setProofRequired(draft.proofRequired);
    }
    if (draft.startDate) setStartDate(draft.startDate);
    if (draft.endDate) setEndDate(draft.endDate);
  }

  /* =========================================
     AUTO-SAVE TO localStorage ON EVERY CHANGE
  ========================================= */

  useEffect(() => {
    if (!selection || loadingSelection) return;

    const campaignData: CampaignDraft = {
      advertiserId: selection.advertiserId,
      categoryId: selection.category.id,
      categoryName: selection.category.name,
      categorySlug: selection.category.slug,
      subcategoryId: selection.subcategory.id,
      subcategoryName: selection.subcategory.name,
      subcategorySlug: selection.subcategory.slug,
      title: title,
      description: description,
      targetUrl: targetUrl,
      instructions: instructions,
      coverImageUrl: coverImageUrl,
      rewardPerWorker: Number(rewardPerWorker) || MINIMUM_REWARD,
      totalWorkers: Number(totalWorkers) || MINIMUM_WORKERS,
      totalBudget,
      proofRequired,
      startDate: startDate || null,
      endDate: endDate || null,
    };

    writeJson(STORAGE_DRAFT, campaignData);
    setSaveHint("Draft saved automatically");

    const t = setTimeout(() => setSaveHint(""), 1500);
    return () => clearTimeout(t);
  }, [
    selection,
    loadingSelection,
    title,
    description,
    targetUrl,
    instructions,
    coverImageUrl,
    rewardPerWorker,
    totalWorkers,
    totalBudget,
    proofRequired,
    startDate,
    endDate,
  ]);

  /* =========================================
     CLEAR DRAFT (only when user chooses)
  ========================================= */

  const handleClearDraft = () => {
    const ok = window.confirm(
      "Delete this saved draft? This cannot be undone."
    );
    if (!ok) return;

    localStorage.removeItem(STORAGE_DRAFT);
    sessionStorage.removeItem(STORAGE_DRAFT);

    setTitle("");
    setDescription("");
    setTargetUrl("");
    setInstructions("");
    setCoverImageUrl("");
    setRewardPerWorker(MINIMUM_REWARD);
    setTotalWorkers(MINIMUM_WORKERS);
    setProofRequired(true);
    setStartDate("");
    setEndDate("");
    setFormError("");
    setSaveHint("Draft deleted");
  };

  /* =========================================
     CONTINUE → REVIEW
  ========================================= */

  const handleContinue = (event: FormEvent) => {
    event.preventDefault();
    setFormError("");

    if (!selection) {
      setFormError(
        "Please select a category and subcategory first."
      );
      return;
    }

    if (title.trim().length < 5) {
      setFormError(
        "Campaign title must contain at least 5 characters."
      );
      return;
    }

    if (description.trim().length < 20) {
      setFormError(
        "Please provide a campaign description of at least 20 characters."
      );
      return;
    }

    if (!targetUrl.trim()) {
      setFormError("Please enter the campaign target URL.");
      return;
    }

    if (instructions.trim().length < 20) {
      setFormError(
        "Please provide clear instructions for workers."
      );
      return;
    }

    if (Number(rewardPerWorker) < MINIMUM_REWARD) {
      setFormError(
        `The minimum reward per worker is ${formatNaira(
          MINIMUM_REWARD
        )}.`
      );
      return;
    }

    if (Number(totalWorkers) < MINIMUM_WORKERS) {
      setFormError(
        `The minimum number of workers is ${MINIMUM_WORKERS}.`
      );
      return;
    }

    if (
      startDate &&
      endDate &&
      new Date(endDate) < new Date(startDate)
    ) {
      setFormError(
        "The end date cannot be earlier than the start date."
      );
      return;
    }

    const campaignData: CampaignDraft = {
      advertiserId: selection.advertiserId,
      categoryId: selection.category.id,
      categoryName: selection.category.name,
      categorySlug: selection.category.slug,
      subcategoryId: selection.subcategory.id,
      subcategoryName: selection.subcategory.name,
      subcategorySlug: selection.subcategory.slug,
      title: title.trim(),
      description: description.trim(),
      targetUrl: targetUrl.trim(),
      instructions: instructions.trim(),
      coverImageUrl: coverImageUrl.trim(),
      rewardPerWorker: Number(rewardPerWorker),
      totalWorkers: Number(totalWorkers),
      totalBudget,
      proofRequired,
      startDate: startDate || null,
      endDate: endDate || null,
    };

    // Final write (already auto-saving, but ensure trimmed values)
    writeJson(STORAGE_DRAFT, campaignData);

    router.push("/advertiser/dashboard/campaigns/create/review");
  };

  if (loadingSelection) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            size={28}
            className="animate-spin text-[#0B3939]"
          />
          <p className="text-sm text-slate-500">
            Loading campaign details…
          </p>
        </div>
      </div>
    );
  }

  if (!selection) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle
            size={42}
            className="mx-auto text-red-500"
          />
          <h1 className="mt-4 text-2xl font-bold text-red-950">
            Campaign type not selected
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-red-700">
            Select a category and subcategory before entering
            your campaign details.
          </p>
          <button
            type="button"
            onClick={() =>
              router.push(
                "/advertiser/dashboard/campaigns/create"
              )
            }
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0B3939] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#082d2d]"
          >
            <ArrowLeft size={17} />
            Select Category
          </button>
        </div>
      </div>
    );
  }

  const { category, subcategory } = selection;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() =>
            router.push(
              "/advertiser/dashboard/campaigns/create"
            )
          }
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0B3939]"
        >
          <ArrowLeft size={18} />
          Change Category
        </button>

        <div className="flex items-center gap-3">
          {saveHint && (
            <span className="text-xs font-medium text-emerald-600">
              {saveHint}
            </span>
          )}
          {draftRestored && (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Draft restored
            </span>
          )}
          <button
            type="button"
            onClick={handleClearDraft}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
          >
            <Trash2 size={14} />
            Delete draft
          </button>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B3939] text-sm font-bold text-white">
            2
          </span>
          <div>
            <p className="text-sm font-semibold text-[#0B3939]">
              Step 2 of 3
            </p>
            <h1 className="text-3xl font-bold text-slate-900">
              Campaign Details
            </h1>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
          Your progress is saved automatically. You can refresh,
          close the browser, or log out — the draft stays until
          you delete it or submit the campaign.
        </p>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[#0B3939]/15 bg-[#0B3939]/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Category
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B3939] text-white">
              <Check size={19} />
            </div>
            <h2 className="font-bold text-[#0B3939]">
              {category.name}
            </h2>
          </div>
        </div>

        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">
            Selected Task
          </p>
          <h2 className="mt-3 text-lg font-bold text-orange-900">
            {subcategory.name}
          </h2>
        </div>
      </div>

      <div className="mb-10">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-[#0B3939]">Category</span>
          <span className="text-[#0B3939]">Details</span>
          <span className="text-slate-400">Review</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-2/3 rounded-full bg-[#0B3939]" />
        </div>
      </div>

      <form
        onSubmit={handleContinue}
        className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]"
      >
        <div className="space-y-7">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0B3939]/10 text-[#0B3939]">
                <ClipboardList size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Basic Information
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Describe what the campaign is about.
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Campaign Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Example: Follow our Instagram page"
                  maxLength={100}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0B3939] focus:bg-white focus:ring-4 focus:ring-[#0B3939]/10"
                />
                <p className="mt-2 text-xs text-slate-400">
                  {title.length}/100 characters
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Campaign Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly explain the purpose of this campaign..."
                  rows={5}
                  maxLength={1000}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0B3939] focus:bg-white focus:ring-4 focus:ring-[#0B3939]/10"
                />
                <p className="mt-2 text-xs text-slate-400">
                  {description.length}/1000 characters
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0B3939]/10 text-[#0B3939]">
                <Link2 size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Task Information
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add the link and instructions workers will follow.
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Target URL
                </label>
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0B3939] focus:bg-white focus:ring-4 focus:ring-[#0B3939]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Worker Instructions
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Example: Open the link, follow the account, and submit a screenshot as proof."
                  rows={6}
                  maxLength={2000}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0B3939] focus:bg-white focus:ring-4 focus:ring-[#0B3939]/10"
                />
                <p className="mt-2 text-xs text-slate-400">
                  {instructions.length}/2000 characters
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Cover Image URL
                  <span className="ml-1 font-normal text-slate-400">
                    (Optional)
                  </span>
                </label>
                <div className="relative">
                  <ImageIcon
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="url"
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0B3939] focus:bg-white focus:ring-4 focus:ring-[#0B3939]/10"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-[#0B3939]/30">
                <input
                  type="checkbox"
                  checked={proofRequired}
                  onChange={(e) => setProofRequired(e.target.checked)}
                  className="mt-1 h-5 w-5 accent-[#0B3939]"
                />
                <div>
                  <p className="font-semibold text-slate-800">
                    Require proof of completion
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Workers will submit a screenshot, link, or note
                    after completing the task.
                  </p>
                </div>
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0B3939]/10 text-[#0B3939]">
                <CalendarDays size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Campaign Schedule
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Set campaign dates if required.
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Start Date
                  <span className="ml-1 font-normal text-slate-400">
                    (Optional)
                  </span>
                </label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-700 outline-none transition focus:border-[#0B3939] focus:bg-white focus:ring-4 focus:ring-[#0B3939]/10"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  End Date
                  <span className="ml-1 font-normal text-slate-400">
                    (Optional)
                  </span>
                </label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || undefined}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-700 outline-none transition focus:border-[#0B3939] focus:bg-white focus:ring-4 focus:ring-[#0B3939]/10"
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="h-fit xl:sticky xl:top-7">
          <div className="overflow-hidden rounded-3xl border border-[#0B3939]/15 bg-white shadow-sm">
            <div className="bg-[#0B3939] p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                  <Wallet size={21} />
                </div>
                <div>
                  <h2 className="font-bold">Campaign Budget</h2>
                  <p className="text-xs text-white/70">
                    Calculated automatically
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6 p-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Reward per Worker
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[#0B3939]">
                    ₦
                  </span>
                  <input
                    type="number"
                    min={MINIMUM_REWARD}
                    step="1"
                    value={rewardPerWorker}
                    onChange={(e) =>
                      setRewardPerWorker(
                        Math.max(
                          MINIMUM_REWARD,
                          Number(e.target.value) || 0
                        )
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-9 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#0B3939] focus:bg-white focus:ring-4 focus:ring-[#0B3939]/10"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Minimum: ₦50 per worker
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Number of Workers
                </label>
                <div className="relative">
                  <Users
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="number"
                    min={MINIMUM_WORKERS}
                    step="1"
                    value={totalWorkers}
                    onChange={(e) =>
                      setTotalWorkers(
                        Math.max(
                          MINIMUM_WORKERS,
                          Number(e.target.value) || 0
                        )
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#0B3939] focus:bg-white focus:ring-4 focus:ring-[#0B3939]/10"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Minimum: 10 workers
                </p>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Reward</span>
                  <span>
                    {formatNaira(Number(rewardPerWorker) || 0)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                  <span>Workers</span>
                  <span>× {Number(totalWorkers) || 0}</span>
                </div>
                <div className="mt-5 rounded-2xl bg-[#0B3939]/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total Budget
                  </p>
                  <p className="mt-2 text-3xl font-bold text-[#0B3939]">
                    {formatNaira(totalBudget)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <Info
                  size={18}
                  className="mt-0.5 shrink-0 text-blue-600"
                />
                <p className="text-xs leading-5 text-blue-800">
                  Draft is saved in this browser automatically.
                  It is only removed when you delete it or after
                  a successful submit.
                </p>
              </div>

              {formError && (
                <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0 text-red-600"
                  />
                  <p className="text-sm leading-5 text-red-700">
                    {formError}
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F47B20] px-5 py-4 text-sm font-bold text-white transition hover:bg-orange-600"
              >
                Review Campaign
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}