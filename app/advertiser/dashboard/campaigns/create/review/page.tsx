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

  // Load Campaign Draft
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

  // Fetch Wallet Balance
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

      // 1. Deduct from available_balance
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

      // 2. Create transaction record
      await supabase.from("transactions").insert({
        user_id: user.id,
        transaction_type: "campaign_funding",
        amount: campaign.totalBudget,
        direction: "debit",
        status: "completed",
        description: `Campaign funding - ${campaign.title}`,
      });

      // 3. Create the campaign
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

      // Clear draft
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={40} className="animate-spin text-[#0b3939]" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle size={42} className="mx-auto text-red-500" />
          <h1 className="mt-4 text-2xl font-bold text-red-950">
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

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <button
        type="button"
        onClick={goToDetails}
        disabled={submitting}
        className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0b3939] disabled:opacity-50"
      >
        <ArrowLeft size={18} />
        Edit Campaign Details
      </button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b3939] text-xl font-bold text-white">
            3
          </span>
          <div>
            <p className="text-sm font-semibold text-[#0b3939]">Step 3 of 3</p>
            <h1 className="text-3xl font-bold text-slate-900">
              Review & Submit
            </h1>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-slate-500">
          Review your campaign and confirm payment from your wallet before
          submitting for approval.
        </p>
      </div>

      {/* Progress */}
      <div className="mb-10">
        <div className="mb-2 flex justify-between text-xs font-semibold text-[#0b3939]">
          <span>Category</span>
          <span>Details</span>
          <span>Review</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-full bg-[#0b3939]" />
        </div>
      </div>

      {/* Approval notice */}
      <div className="mb-10 flex gap-4 rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <ShieldCheck size={26} className="mt-1 text-amber-600" />
        <div>
          <h3 className="font-bold text-amber-900">
            Campaign approval required
          </h3>
          <p className="mt-1 text-sm text-amber-800">
            Your campaign will be submitted as <strong>pending</strong> and the
            total budget will be deducted from your wallet.
          </p>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          {/* Overview */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            {campaign.coverImageUrl && (
              <div className="h-64">
                <img
                  src={campaign.coverImageUrl}
                  alt={campaign.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#0b3939]/10 px-4 py-1 text-xs font-bold text-[#0b3939]">
                      {campaign.categoryName}
                    </span>
                    <span className="rounded-full bg-orange-100 px-4 py-1 text-xs font-bold text-orange-700">
                      {campaign.subcategoryName}
                    </span>
                  </div>
                  <h2 className="mt-4 text-3xl font-bold text-slate-900">
                    {campaign.title}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={goToDetails}
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium transition hover:border-[#0b3939] disabled:opacity-50"
                >
                  <Pencil size={17} />
                  Edit
                </button>
              </div>

              <div className="mt-8 border-t pt-8">
                <div className="flex gap-4">
                  <FileText size={24} className="mt-1 text-[#0b3939]" />
                  <div>
                    <h3 className="font-bold">Description</h3>
                    <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-600">
                      {campaign.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Worker task */}
          <section className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b3939]/10">
                <ClipboardList size={28} className="text-[#0b3939]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Worker Task</h2>
                <p className="text-slate-500">What workers will see</p>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h4 className="mb-3 flex items-center gap-2 font-semibold">
                  <Link2 size={20} />
                  Target URL
                </h4>
                <a
                  href={campaign.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 break-all rounded-2xl bg-slate-50 p-5 text-[#0b3939] transition hover:bg-[#0b3939]/5"
                >
                  {campaign.targetUrl}
                  <ExternalLink size={18} />
                </a>
              </div>

              <div>
                <h4 className="mb-3 font-semibold">Instructions</h4>
                <div className="whitespace-pre-line rounded-2xl bg-slate-50 p-6 text-slate-600">
                  {campaign.instructions}
                </div>
              </div>

              <div className="flex gap-4 rounded-3xl border p-6">
                <CheckCircle2
                  size={26}
                  className={
                    campaign.proofRequired
                      ? "text-emerald-600"
                      : "text-slate-400"
                  }
                />
                <div>
                  <p className="font-bold">
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
          <section className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b3939]/10">
                <CalendarDays size={28} className="text-[#0b3939]" />
              </div>
              <h2 className="text-2xl font-bold">Campaign Schedule</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-6">
                <p className="text-xs font-medium uppercase text-slate-400">
                  Starts
                </p>
                <p className="mt-2 font-semibold">
                  {formatDate(campaign.startDate)}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-6">
                <p className="text-xs font-medium uppercase text-slate-400">
                  Ends
                </p>
                <p className="mt-2 font-semibold">
                  {formatDate(campaign.endDate)}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="h-fit xl:sticky xl:top-8">
          <div className="overflow-hidden rounded-3xl border border-[#0b3939]/20 bg-white shadow-sm">
            <div className="bg-[#0b3939] p-8 text-white">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                  <Wallet size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Payment Summary</h3>
                  <p className="text-white/70">Wallet & Budget</p>
                </div>
              </div>
            </div>

            <div className="space-y-6 p-8">
              <div className="flex justify-between">
                <span className="text-slate-600">Reward per worker</span>
                <span className="font-bold">
                  {formatNaira(campaign.rewardPerWorker)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <Users size={18} />
                  Total Workers
                </span>
                <span className="font-bold">{campaign.totalWorkers}</span>
              </div>

              <div className="border-t pt-6">
                <div className="rounded-3xl bg-[#0b3939]/5 p-6 text-center">
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Total Budget
                  </p>
                  <p className="mt-3 text-4xl font-bold text-[#0b3939]">
                    {formatNaira(campaign.totalBudget)}
                  </p>
                </div>
              </div>

              {/* Wallet Balance */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">
                    Your Wallet Balance
                  </span>
                  <span className="font-bold text-[#0b3939]">
                    {walletBalance !== null
                      ? formatNaira(walletBalance)
                      : "—"}
                  </span>
                </div>

                {!hasEnoughBalance && walletBalance !== null && (
                  <p className="mt-3 text-sm font-medium text-red-600">
                    Insufficient balance. Please fund your wallet.
                  </p>
                )}

                {hasEnoughBalance && (
                  <p className="mt-3 text-sm font-medium text-emerald-600">
                    Sufficient balance available
                  </p>
                )}
              </div>

              {errorMessage && (
                <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                  <AlertCircle size={20} className="mt-0.5 shrink-0" />
                  <p>{errorMessage}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !hasEnoughBalance}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#0b3939] py-4 font-semibold text-white transition hover:bg-[#062828] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    {hasEnoughBalance
                      ? "Submit & Pay from Wallet"
                      : "Insufficient Balance"}
                  </>
                )}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}