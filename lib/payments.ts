export type TransactionStatus = string;
export type TransactionDirection = string;
export type TransactionType = string;

export type ProfileLite = {
  id: string;
  full_name: string | null;
  user_name: string | null;
  email: string | null;
};

export type CampaignLite = {
  id: string;
  title: string | null;
};

export type SubmissionLite = {
  id: string;
  status: string | null;
  reward_amount: number | null;
  worker_id: string | null;
};

export type Transaction = {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  direction: string;
  status: string;
  submission_id: string | null;
  campaign_id: string | null;
  reference: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  user?: ProfileLite;
  campaign?: CampaignLite;
  submission?: SubmissionLite;
};

export type Wallet = {
  id: string;
  user_id: string;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
  created_at: string;
  updated_at: string;
};

export const PAGE_SIZE = 15;

export const formatNaira = (amount: number | null | undefined) => {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatDateTime = (date: string | null | undefined) => {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
};

export const formatDate = (date: string | null | undefined) => {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

export const getInitials = (name?: string | null) => {
  if (!name) return "GP";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
};

export const statusBadgeClass = (status: string) => {
  const s = status?.toLowerCase() ?? "";
  if (s === "completed" || s === "success" || s === "successful") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }
  if (s === "pending" || s === "processing") {
    return "border-amber-100 bg-amber-50 text-amber-700";
  }
  if (s === "failed" || s === "rejected" || s === "cancelled") {
    return "border-red-100 bg-red-50 text-red-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
};

export const directionBadgeClass = (direction: string) => {
  const d = direction?.toLowerCase() ?? "";
  if (d === "credit" || d === "in") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }
  if (d === "debit" || d === "out") {
    return "border-red-100 bg-red-50 text-red-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
};