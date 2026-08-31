"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Loader2,
  AlertCircle,
  Search,
  Eye,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Campaign = {
  id: string;
  title: string;
  status: string;
  total_budget: number;
  reward_per_task: number;
  total_slots: number;
  completed_slots: number;
  created_at: string;
  starts_at: string | null;
  ends_at: string | null;
  category_id: string;
  subcategory_id: string;
};

export default function AdvertiserCampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
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
        .eq("advertiser_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setCampaigns(data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load campaigns");
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

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
    }).format(new Date(date));

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

  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={40} className="animate-spin text-[#0b3939]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Campaigns</h1>
          <p className="mt-2 text-slate-500">
            Manage and track all your campaigns
          </p>
        </div>

        <Link
          href="/advertiser/dashboard/campaigns/create"
          className="inline-flex items-center gap-2 rounded-2xl bg-[#0b3939] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#062828]"
        >
          <Plus size={18} />
          Create New Campaign
        </Link>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm outline-none focus:border-[#0b3939]"
          />
        </div>
      </div>

      {error && (
        <div className="mb-8 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      {!loading && filteredCampaigns.length === 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Wallet size={28} className="text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">No campaigns yet</h2>
          <p className="mt-2 text-slate-500">
            Create your first campaign to start reaching workers.
          </p>
          <Link
            href="/advertiser/dashboard/campaigns/create"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#0b3939] px-6 py-3 text-sm font-semibold text-white"
          >
            <Plus size={18} />
            Create Campaign
          </Link>
        </div>
      )}

      {filteredCampaigns.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredCampaigns.map((campaign) => {
            const progress =
              campaign.total_slots > 0
                ? Math.round(
                    (campaign.completed_slots / campaign.total_slots) * 100
                  )
                : 0;

            return (
              <Link
                key={campaign.id}
                href={`/advertiser/dashboard/campaigns/${campaign.id}/view`}
                className="block rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[#0b3939]/40 hover:shadow-md"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusColor(
                      campaign.status
                    )}`}
                  >
                    {campaign.status}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatDate(campaign.created_at)}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 line-clamp-2">
                  {campaign.title}
                </h3>

                <div className="mt-6 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-500">
                      <Wallet size={16} />
                      Budget
                    </span>
                    <span className="font-semibold">
                      {formatNaira(campaign.total_budget)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-500">
                      <Users size={16} />
                      Progress
                    </span>
                    <span className="font-semibold">
                      {campaign.completed_slots}/{campaign.total_slots}
                    </span>
                  </div>

                  <div className="mt-2">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#0b3939] transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-right text-xs text-slate-400">
                      {progress}% completed
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-700">
                  <Eye size={16} />
                  View progress
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}