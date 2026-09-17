export type DateRangeKey =
  | "today"
  | "7d"
  | "30d"
  | "90d"
  | "year"
  | "all"
  | "custom";

export type AnalyticsSummary = {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  pendingCampaigns: number;
  totalTasks: number;
  completedTasks: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  totalSlots: number;
  completedSlots: number;
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  transactionVolume: number;
  transactionCount: number;
};

export type ChartPoint = {
  label: string;
  value: number;
  value2?: number;
  value3?: number;
};

export type CampaignPerformance = {
  id: string;
  title: string | null;
  status: string | null;
  total_slots: number;
  completed_slots: number;
  taskCount: number;
};

export type ActivityItem = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  full_name: string | null;
  user_name: string | null;
  email: string | null;
  created_at: string;
};

export type CampaignRow = {
  id: string;
  title: string | null;
  status: string | null;
  total_slots: number | null;
  completed_slots: number | null;
  total_budget: number | null;
  created_at: string;
};

export type TaskRow = {
  id: string;
  campaign_id: string;
  status: string | null;
  max_workers: number | null;
  completed_workers: number | null;
  reward_amount: number | null;
  created_at: string;
};

export type SubmissionRow = {
  id: string;
  task_id: string;
  worker_id: string;
  status: string;
  reward_amount: number | null;
  created_at: string;
  reviewed_at: string | null;
};

export type TransactionRow = {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  direction: string;
  status: string;
  reference: string | null;
  created_at: string;
};

export type WalletRow = {
  id: string;
  user_id: string;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
};

export const formatNaira = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);

export const formatNumber = (n: number) =>
  new Intl.NumberFormat("en-NG").format(n);

export const formatPct = (n: number) =>
  `${(Number.isFinite(n) ? n : 0).toFixed(1)}%`;

export function getRangeDates(
  key: DateRangeKey,
  customFrom?: string,
  customTo?: string
): { from: Date | null; to: Date } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  if (key === "all") return { from: null, to };
  if (key === "custom" && customFrom && customTo) {
    const from = new Date(customFrom);
    from.setHours(0, 0, 0, 0);
    const end = new Date(customTo);
    end.setHours(23, 59, 59, 999);
    return { from, to: end };
  }

  const from = new Date(now);
  from.setHours(0, 0, 0, 0);

  switch (key) {
    case "today":
      break;
    case "7d":
      from.setDate(from.getDate() - 6);
      break;
    case "30d":
      from.setDate(from.getDate() - 29);
      break;
    case "90d":
      from.setDate(from.getDate() - 89);
      break;
    case "year":
      from.setMonth(0, 1);
      break;
    default:
      return { from: null, to };
  }
  return { from, to };
}

export function inRange(
  dateStr: string | null | undefined,
  from: Date | null,
  to: Date
): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (from && d < from) return false;
  if (d > to) return false;
  return true;
}

export function groupByPeriod(
  dates: string[],
  from: Date | null,
  to: Date,
  rangeKey: DateRangeKey
): ChartPoint[] {
  if (dates.length === 0) return [];

  const useDaily =
    rangeKey === "today" || rangeKey === "7d" || rangeKey === "30d";
  const map = new Map<string, number>();

  dates.forEach((iso) => {
    const d = new Date(iso);
    let key: string;
    if (useDaily) {
      key = d.toISOString().slice(0, 10);
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
    map.set(key, (map.get(key) || 0) + 1);
  });

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));
}