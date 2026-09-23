"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Pencil,
  Send,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

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

export default function ReviewCampaignPage() {
  const router = useRouter();

  const [campaign, setCampaign] = useState<CampaignDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(true);

  useEffect(() => {
    let savedDraft = localStorage.getItem("gigplace_campaign_draft");

    if (!savedDraft) {
      const sessionDraft = sessionStorage.getItem("gigplace_campaign_draft");
      if (sessionDraft) {
        localStorage.setItem("gigplace_campaign_draft", sessionDraft);
        sessionStorage.removeItem("gigplace_campaign_draft");
        savedDraft = sessionDraft;
      }
    }

    if (!savedDraft) {
      router.replace("/advertiser/dashboard/campaigns/create");
      return;
    }

    try {
      const parsedDraft = JSON.parse(savedDraft) as CampaignDraft;

      if (
        !parsedDraft.categoryId ||
        !parsedDraft.subcategoryId ||
        !parsedDraft.title
      ) {
        localStorage.removeItem("gigplace_campaign_draft");
        sessionStorage.removeItem("gigplace_campaign_draft");
        router.replace("/advertiser/dashboard/campaigns/create");
        return;
      }

      const looksLikeSlug =
        !parsedDraft.categoryId.includes("-") ||
        !parsedDraft.subcategoryId.includes("-");

      if (looksLikeSlug) {
        setErrorMessage(
          "This draft uses an old format. Please select the category again."
        );
        localStorage.removeItem("gigplace_campaign_draft");
        localStorage.removeItem("campaignSelection");
        sessionStorage.removeItem("gigplace_campaign_draft");
        sessionStorage.removeItem("campaignSelection");
        setCampaign(null);
        return;
      }

      setCampaign(parsedDraft);
    } catch (error) {
      console.error(error);
      localStorage.removeItem("gigplace_campaign_draft");
      sessionStorage.removeItem("gigplace_campaign_draft");
      router.replace("/advertiser/dashboard/campaigns/create");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoadingWallet(false);
          return;
        }

        const { data: wallet, error } = await supabase
          .from("wallets")
          .select("available_balance")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Wallet fetch error:", error);
          setWalletBalance(0);
        } else {
          setWalletBalance(Number(wallet?.available_balance) || 0);
        }
      } catch (err) {
        console.error(err);
        setWalletBalance(0);
      } finally {
        setLoadingWallet(false);
      }
    };

    fetchWalletBalance();
  }, []);

  const formatNaira = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (date: string | null) => {
    if (!date) return "Not specified";
    return new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  };

  const goToDetails = () => {
    router.push("/advertiser/dashboard/campaigns/create/details");
  };

  const goToCategory = () => {
    router.push("/advertiser/dashboard/campaigns/create");
  };

  const handleSubmit = async () => {
    if (!campaign) {
      setErrorMessage("Campaign information is missing.");
      return;
    }

    if (walletBalance === null || walletBalance < campaign.totalBudget) {
      setErrorMessage("Insufficient wallet balance. Please fund your wallet.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const newBalance = walletBalance - campaign.totalBudget;

      const { error: walletError } = await supabase
        .from("wallets")
        .update({
          available_balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (walletError) {
        console.error("Wallet update error:", walletError);
        throw new Error("Failed to deduct funds from wallet.");
      }

      await supabase.from("transactions").insert({
        user_id: user.id,
        transaction_type: "campaign_funding",
        amount: campaign.totalBudget,
        direction: "debit",
        status: "completed",
        description: `Campaign funding - ${campaign.title}`,
      });

      const { error: campaignError } = await supabase.from("campaigns").insert({
        advertiser_id: user.id,
        title: campaign.title,
        description: campaign.description,
        category_id: campaign.categoryId,
        subcategory_id: campaign.subcategoryId,
        cover_image_url: campaign.coverImageUrl || null,
        target_url: campaign.targetUrl,
        reward_per_task: campaign.rewardPerWorker,
        total_slots: campaign.totalWorkers,
        completed_slots: 0,
        total_budget: campaign.totalBudget,
        status: "pending",
        starts_at: campaign.startDate || null,
        ends_at: campaign.endDate || null,
        instructions: campaign.instructions,
        proof_required: campaign.proofRequired,
      });

      if (campaignError) throw campaignError;

      localStorage.removeItem("gigplace_campaign_draft");
      localStorage.removeItem("campaignSelection");
      sessionStorage.removeItem("gigplace_campaign_draft");
      sessionStorage.removeItem("campaignSelection");

      router.push("/advertiser/dashboard/campaigns/success");
    } catch (error: unknown) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to submit campaign."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || loadingWallet) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Loader2 size={40} className="animate-spin text-[#0b3939]" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center sm:rounded-3xl sm:p-8">
          <AlertCircle size={42} className="mx-auto text-red-500" />
          <h1 className="mt-4 text-xl font-bold text-red-950 sm:text-2xl">
            No campaign to review
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-red-700">
            {errorMessage ||
              "Select a category and fill in the details before reviewing."}
          </p>
          <button
            type="button"
            onClick={goToCategory}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0b3939] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#062828]"
          >
            <ArrowLeft size={17} />
            Start again
          </button>
        </div>
      </div>
    );
  }

  const hasEnoughBalance =
    walletBalance !== null && walletBalance >= campaign.totalBudget;

  /* Payment card – mobile first + desktop sidebar */
  const PaymentCard = (
    <div className="overflow-hidden rounded-2xl border border-[#0b3939]/20 bg-white shadow-sm sm:rounded-3xl">
      <div className="bg-[#0b3939] p-4 text-white sm:p-6 lg:p-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 sm:h-12 sm:w-12 sm:rounded-2xl">
            <Wallet size={22} className="sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold sm:text-xl">
              Payment Summary
            </h3>
            <p className="text-xs text-white/70 sm:text-sm">Wallet & Budget</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between gap-3 text-sm sm:text-base">
          <span className="shrink-0 text-slate-600">Reward per worker</span>
          <span className="break-all text-right font-bold">
            {formatNaira(campaign.rewardPerWorker)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm sm:text-base">
          <span className="flex shrink-0 items-center gap-2 text-slate-600">
            <Users size={16} className="sm:h-[18px] sm:w-[18px]" />
            Total Workers
          </span>
          <span className="font-bold">{campaign.totalWorkers}</span>
        </div>

        <div className="border-t border-slate-100 pt-4 sm:pt-6">
          <div className="rounded-2xl bg-[#0b3939]/5 p-4 text-center sm:rounded-3xl sm:p-6">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 sm:text-xs">
              Total Budget
            </p>
            <p className="mt-2 break-all text-2xl font-bold text-[#0b3939] sm:mt-3 sm:text-3xl lg:text-4xl">
              {formatNaira(campaign.totalBudget)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-slate-600">Your Wallet Balance</span>
            <span className="break-all font-bold text-[#0b3939]">
              {walletBalance !== null ? formatNaira(walletBalance) : "—"}
            </span>
          </div>

          {!hasEnoughBalance && walletBalance !== null && (
            <p className="mt-2 text-sm font-medium text-red-600 sm:mt-3">
              Insufficient balance. Please fund your wallet.
            </p>
          )}

          {hasEnoughBalance && (
            <p className="mt-2 text-sm font-medium text-emerald-600 sm:mt-3">
              Sufficient balance available
            </p>
          )}
        </div>

        {errorMessage && (
          <div className="flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:gap-3 sm:p-4">
            <AlertCircle size={18} className="mt-0.5 shrink-0 sm:h-5 sm:w-5" />
            <p className="min-w-0 break-words">{errorMessage}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !hasEnoughBalance}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b3939] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#062828] disabled:cursor-not-allowed disabled:opacity-50 sm:gap-3 sm:rounded-2xl sm:py-4 sm:text-base"
        >
          {submitting ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Processing...
            </>
          ) : (
            <>
              <Send size={18} className="shrink-0 sm:h-5 sm:w-5" />
              <span className="text-center leading-tight">
                {hasEnoughBalance
                  ? "Submit & Pay from Wallet"
                  : "Insufficient Balance"}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <button
        type="button"
        onClick={goToDetails}
        disabled={submitting}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0b3939] disabled:opacity-50 sm:mb-8"
      >
        <ArrowLeft size={18} />
        Edit Campaign Details
      </button>

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-start gap-3 sm:items-center">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0b3939] text-lg font-bold text-white sm:h-10 sm:w-10 sm:text-xl">
            3
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#0b3939] sm:text-sm">
              Step 3 of 3
            </p>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Review & Submit
            </h1>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:mt-4 sm:text-base">
          Review your campaign and confirm payment from your wallet before
          submitting for approval.
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8 sm:mb-10">
        <div className="mb-2 flex justify-between gap-2 text-[10px] font-semibold text-[#0b3939] sm:text-xs">
          <span>Category</span>
          <span>Details</span>
          <span>Review</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-full bg-[#0b3939]" />
        </div>
      </div>

      {/* Approval notice */}
      <div className="mb-8 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:mb-10 sm:gap-4 sm:rounded-3xl sm:p-6">
        <ShieldCheck
          size={22}
          className="mt-0.5 shrink-0 text-amber-600 sm:mt-1 sm:h-[26px] sm:w-[26px]"
        />
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-amber-900 sm:text-base">
            Campaign approval required
          </h3>
          <p className="mt-1 text-sm leading-6 text-amber-800">
            Your campaign will be submitted as <strong>pending</strong> and the
            total budget will be deducted from your wallet.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] xl:gap-8">
        {/* Mobile / tablet: payment first */}
        <div className="block xl:hidden">{PaymentCard}</div>

        <div className="min-w-0 space-y-5 sm:space-y-6 lg:space-y-8">
          {/* Overview */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white sm:rounded-3xl">
            {campaign.coverImageUrl && (
              <div className="h-40 sm:h-52 md:h-64">
                <img
                  src={campaign.coverImageUrl}
                  alt={campaign.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#0b3939]/10 px-3 py-1 text-[10px] font-bold text-[#0b3939] sm:px-4 sm:text-xs">
                      {campaign.categoryName}
                    </span>
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-[10px] font-bold text-orange-700 sm:px-4 sm:text-xs">
                      {campaign.subcategoryName}
                    </span>
                  </div>
                  <h2 className="mt-3 break-words text-xl font-bold text-slate-900 sm:mt-4 sm:text-2xl lg:text-3xl">
                    {campaign.title}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={goToDetails}
                  disabled={submitting}
                  className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium transition hover:border-[#0b3939] disabled:opacity-50 sm:w-auto sm:rounded-2xl sm:px-5 sm:py-3"
                >
                  <Pencil size={16} className="sm:h-[17px] sm:w-[17px]" />
                  Edit
                </button>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-6 sm:mt-8 sm:pt-8">
                <div className="flex gap-3 sm:gap-4">
                  <FileText
                    size={20}
                    className="mt-0.5 shrink-0 text-[#0b3939] sm:mt-1 sm:h-6 sm:w-6"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold sm:text-base">
                      Description
                    </h3>
                    <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-slate-600 sm:mt-3 sm:text-base">
                      {campaign.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Worker task */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:rounded-3xl sm:p-6 lg:p-8">
            <div className="mb-5 flex items-start gap-3 sm:mb-8 sm:items-center sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0b3939]/10 sm:h-12 sm:w-12 sm:rounded-2xl">
                <ClipboardList
                  size={22}
                  className="text-[#0b3939] sm:h-7 sm:w-7"
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold sm:text-2xl">Worker Task</h2>
                <p className="text-sm text-slate-500">What workers will see</p>
              </div>
            </div>

            <div className="space-y-5 sm:space-y-8">
              {campaign.targetUrl ? (
                <div>
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold sm:mb-3 sm:text-base">
                    <Link2 size={18} className="sm:h-5 sm:w-5" />
                    Target URL
                  </h4>
                  <a
                    href={campaign.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 break-all rounded-xl bg-slate-50 p-3 text-sm text-[#0b3939] transition hover:bg-[#0b3939]/5 sm:items-center sm:gap-3 sm:rounded-2xl sm:p-5 sm:text-base"
                  >
                    <span className="min-w-0 flex-1">{campaign.targetUrl}</span>
                    <ExternalLink
                      size={16}
                      className="mt-0.5 shrink-0 sm:mt-0 sm:h-[18px] sm:w-[18px]"
                    />
                  </a>
                </div>
              ) : null}

              <div>
                <h4 className="mb-2 text-sm font-semibold sm:mb-3 sm:text-base">
                  Instructions
                </h4>
                <div className="whitespace-pre-line break-words rounded-xl bg-slate-50 p-4 text-sm text-slate-600 sm:rounded-2xl sm:p-6 sm:text-base">
                  {campaign.instructions}
                </div>
              </div>

              <div className="flex gap-3 rounded-2xl border border-slate-200 p-4 sm:gap-4 sm:rounded-3xl sm:p-6">
                <CheckCircle2
                  size={22}
                  className={`mt-0.5 shrink-0 sm:h-[26px] sm:w-[26px] ${
                    campaign.proofRequired
                      ? "text-emerald-600"
                      : "text-slate-400"
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold sm:text-base">
                    {campaign.proofRequired
                      ? "Proof required"
                      : "No proof required"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {campaign.proofRequired
                      ? "Workers must submit proof of completion."
                      : "Workers do not need to submit proof."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Schedule */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:rounded-3xl sm:p-6 lg:p-8">
            <div className="mb-5 flex items-center gap-3 sm:mb-8 sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0b3939]/10 sm:h-12 sm:w-12 sm:rounded-2xl">
                <CalendarDays
                  size={22}
                  className="text-[#0b3939] sm:h-7 sm:w-7"
                />
              </div>
              <h2 className="text-lg font-bold sm:text-2xl">
                Campaign Schedule
              </h2>
            </div>

            <div className="grid gap-3 sm:gap-6 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 sm:rounded-3xl sm:p-6">
                <p className="text-[10px] font-medium uppercase text-slate-400 sm:text-xs">
                  Starts
                </p>
                <p className="mt-1.5 break-words text-sm font-semibold sm:mt-2 sm:text-base">
                  {formatDate(campaign.startDate)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 sm:rounded-3xl sm:p-6">
                <p className="text-[10px] font-medium uppercase text-slate-400 sm:text-xs">
                  Ends
                </p>
                <p className="mt-1.5 break-words text-sm font-semibold sm:mt-2 sm:text-base">
                  {formatDate(campaign.endDate)}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden h-fit xl:sticky xl:top-8 xl:block">
          {PaymentCard}
        </aside>
      </div>
    </div>
  );
}