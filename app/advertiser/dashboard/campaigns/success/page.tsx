"use client";

import Link from "next/link";
import { CheckCircle2, ArrowRight, PlusCircle } from "lucide-react";

export default function CampaignSuccessPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="w-full max-w-xl text-center">
        {/* Success Icon */}
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 size={56} className="text-emerald-600" />
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
          Campaign Submitted Successfully!
        </h1>

        {/* Description */}
        <p className="mt-4 text-slate-600 text-lg leading-relaxed">
          Your campaign has been submitted for approval and the total budget has
          been deducted from your wallet. You will be notified once it is
          reviewed.
        </p>

        {/* Info Card */}
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm">
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Status</span>
              <span className="font-semibold text-amber-600">Pending Review</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment</span>
              <span className="font-semibold text-emerald-600">
                Deducted from Wallet
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/advertiser/dashboard/campaigns"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0b3939] px-8 py-4 text-sm font-semibold text-white transition hover:bg-[#062828]"
          >
            View My Campaigns
            <ArrowRight size={18} />
          </Link>

          <Link
            href="/advertiser/dashboard/campaigns/create"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-8 py-4 text-sm font-semibold text-slate-700 transition hover:border-[#0b3939] hover:text-[#0b3939]"
          >
            <PlusCircle size={18} />
            Create Another Campaign
          </Link>
        </div>
      </div>
    </div>
  );
}