export type SubmissionStatus = "pending" | "approved" | "rejected";

export type WorkerProfile = {
  id: string;
  full_name: string | null;
  user_name: string | null;
  email: string | null;
};

export type AdminProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

export type Campaign = {
  id: string;
  title: string | null;
};

export type CampaignTask = {
  id: string;
  title: string;
  campaign_id: string;
};

export type Submission = {
  id: string;
  task_id: string;
  worker_id: string;
  proof_url: any;
  proof_note: string | null;
  proof_text?: string | null;
  status: SubmissionStatus;
  reward_amount: number;
  reviewed_by: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  task?: { id: string; title: string; campaign_id: string };
  campaign?: { id: string; title: string | null };
  worker?: WorkerProfile;
  reviewer?: AdminProfile;
};

export type CampaignCardData = {
  id: string;
  title: string;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

export const PAGE_SIZE = 10;

export const parseProofUrls = (proofUrl: any): string[] => {
  if (!proofUrl) return [];
  if (Array.isArray(proofUrl)) {
    return proofUrl.filter((u) => typeof u === "string" && u.trim());
  }
  if (typeof proofUrl === "string") {
    try {
      const parsed = JSON.parse(proofUrl);
      if (Array.isArray(parsed)) {
        return parsed.filter((u) => typeof u === "string" && u.trim());
      }
      return [proofUrl];
    } catch {
      return [proofUrl];
    }
  }
  return [];
};

export const isVideoUrl = (url: string) =>
  /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url) ||
  url.includes("/video") ||
  url.includes("video/");

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));

export const formatTime = (date: string) =>
  new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));

export const getInitials = (name?: string | null) => {
  if (!name) return "GP";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};