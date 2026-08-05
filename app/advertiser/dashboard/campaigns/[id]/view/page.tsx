"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Users,
  Wallet,
  AlertCircle,
  Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Campaign = {
  id: string;
  title: string;
  description: string;
  status: string;
  target_url: string;
  instructions: string | null;
  proof_required: boolean;
  reward_per_task: number;
  total_slots: number;
  completed_slots: number;
  total_budget: number;
  cover_image_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  category_id: string;
  subcategory_id: string;
};

export default function CampaignDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) {
      fetchCampaign();
    }
  }, [id]);

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .eq("advertiser_id", user.id)
        .single();

      if (fetchError) throw fetchError;

      setCampaign(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load campaign details");
    } finally {
      setLoading(false);
    }
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-700";
      case "active":
        return "bg-emerald-100 text-emerald-700";
      case "completed":
        return "bg-blue-100 text-blue-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={40} className="animate-spin text-[#0b3939]" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle size={42} className="mx-auto text-red-500" />
          <h1 className="mt-4 text-2xl font-bold text-red-950">
            Campaign not found
          </h1>
          <p className="mt-3 text-sm text-red-700">
            {error || "This campaign does not exist or you don’t have access."}
          </p>
          <Link
            href="/advertiser/dashboard/campaigns"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0b3939] px-5 py-3 text-sm font-semibold text-white"
          >
            <ArrowLeft size={17} />
            Back to Campaigns
          </Link>
        </div>
      </div>
    );
  }

  const progress =
    campaign.total_slots > 0
      ? Math.round((campaign.completed_slots / campaign.total_slots) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Back Button */}
      <Link
        href="/advertiser/dashboard/campaigns"
        className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0b3939]"
      >
        <ArrowLeft size={18} />
        Back to Campaigns
      </Link>

      {/* Header */}
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize ${getStatusColor(
                campaign.status
              )}`}
            >
              {campaign.status}
            </span>
            <span className="text-sm text-slate-400">
              Created {formatDate(campaign.created_at)}
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-slate-900">
            {campaign.title}
          </h1>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
        {/* Main Content */}
        <div className="space-y-8">
          {/* Cover Image */}
          {campaign.cover_image_url && (
            <div className="overflow-hidden rounded-3xl border border-slate-200">
              <img
                src={campaign.cover_image_url}
                alt={campaign.title}
                className="h-72 w-full object-cover"
              />
            </div>
          )}

          {/* Description */}
          <section className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="flex items-center gap-3 mb-6">
              <FileText size={22} className="text-[#0b3939]" />
              <h2 className="text-xl font-bold">Description</h2>
            </div>
            <p className="whitespace-pre-line leading-relaxed text-slate-600">
              {campaign.description}
            </p>
          </section>

          {/* Worker Task */}
          <section className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b3939]/10">
                <ClipboardList size={26} className="text-[#0b3939]" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Worker Task</h2>
                <p className="text-sm text-slate-500">
                  Information shown to workers
                </p>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h4 className="mb-3 flex items-center gap-2 font-semibold">
                  <Link2 size={18} />
                  Target URL
                </h4>
                <a
                  href={campaign.target_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 break-all rounded-2xl bg-slate-50 p-5 text-[#0b3939] transition hover:bg-[#0b3939]/5"
                >
                  {campaign.target_url}
                  <ExternalLink size={18} />
                </a>
              </div>

              {campaign.instructions && (
                <div>
                  <h4 className="mb-3 font-semibold">Instructions</h4>
                  <div className="whitespace-pre-line rounded-2xl bg-slate-50 p-6 text-slate-600">
                    {campaign.instructions}
                  </div>
                </div>
              )}

              <div className="flex gap-4 rounded-3xl border p-6">
                <CheckCircle2
                  size={24}
                  className={
                    campaign.proof_required
                      ? "text-emerald-600"
                      : "text-slate-400"
                  }
                />
                <div>
                  <p className="font-bold">
                    {campaign.proof_required
                      ? "Proof required"
                      : "No proof required"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {campaign.proof_required
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
                <CalendarDays size={26} className="text-[#0b3939]" />
              </div>
              <h2 className="text-xl font-bold">Campaign Schedule</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-6">
                <p className="text-xs font-medium uppercase text-slate-400">
                  Starts
                </p>
                <p className="mt-2 font-semibold">
                  {formatDate(campaign.starts_at)}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-6">
                <p className="text-xs font-medium uppercase text-slate-400">
                  Ends
                </p>
                <p className="mt-2 font-semibold">
                  {formatDate(campaign.ends_at)}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="h-fit xl:sticky xl:top-8 space-y-6">
          {/* Budget Card */}
          <div className="overflow-hidden rounded-3xl border border-[#0b3939]/20 bg-white shadow-sm">
            <div className="bg-[#0b3939] p-6 text-white">
              <div className="flex items-center gap-3">
                <Wallet size={24} />
                <h3 className="text-lg font-bold">Budget Overview</h3>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Budget</span>
                <span className="font-bold">
                  {formatNaira(campaign.total_budget)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Reward per Task</span>
                <span className="font-bold">
                  {formatNaira(campaign.reward_per_task)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <Users size={16} />
                  Total Slots
                </span>
                <span className="font-bold">{campaign.total_slots}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Completed</span>
                <span className="font-bold">
                  {campaign.completed_slots} / {campaign.total_slots}
                </span>
              </div>

              {/* Progress */}
              <div className="pt-4 border-t">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-slate-500">Progress</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#0b3939] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Status Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock size={20} className="text-[#0b3939]" />
              <h3 className="font-bold">Campaign Status</h3>
            </div>
            <span
              className={`inline-flex rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${getStatusColor(
                campaign.status
              )}`}
            >
              {campaign.status}
            </span>
            <p className="mt-4 text-sm text-slate-500">
              {campaign.status === "pending" &&
                "Your campaign is waiting for admin approval."}
              {campaign.status === "active" &&
                "Your campaign is live and accepting workers."}
              {campaign.status === "completed" &&
                "All slots have been filled."}
              {campaign.status === "rejected" &&
                "This campaign was rejected. Please contact support."}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}