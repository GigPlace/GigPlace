"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as XLSX from "xlsx";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { supabase } from "@/lib/supabase";
import {
  ActivityItem,
  AnalyticsSummary,
  CampaignPerformance,
  CampaignRow,
  ChartPoint,
  DateRangeKey,
  ProfileRow,
  SubmissionRow,
  TaskRow,
  TransactionRow,
  WalletRow,
  formatNaira,
  formatNumber,
  formatPct,
  getRangeDates,
  groupByPeriod,
  inRange,
} from "@/lib/analytics";

const RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "90d", label: "Last 90 Days" },
  { key: "year", label: "This Year" },
  { key: "all", label: "All Time" },
  { key: "custom", label: "Custom Range" },
];

/** Convert Recharts SVGs to <img> so html-to-image / PDF capture them */
async function inlineSvgCharts(root: HTMLElement): Promise<() => void> {
  const svgs = Array.from(root.querySelectorAll("svg"));
  const restorers: Array<() => void> = [];

  await Promise.all(
    svgs.map(async (svg) => {
      try {
        const rect = svg.getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) return;

        const clone = svg.cloneNode(true) as SVGElement;
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        if (!clone.getAttribute("width")) {
          clone.setAttribute("width", String(rect.width));
        }
        if (!clone.getAttribute("height")) {
          clone.setAttribute("height", String(rect.height));
        }

        // Ensure white background for areas that might be transparent
        const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bg.setAttribute("width", "100%");
        bg.setAttribute("height", "100%");
        bg.setAttribute("fill", "#ffffff");
        clone.insertBefore(bg, clone.firstChild);

        const xml = new XMLSerializer().serializeToString(clone);
        const svg64 =
          "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);

        const img = new Image();
        img.crossOrigin = "anonymous";

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("SVG image load failed"));
          img.src = svg64;
        });

        const scale = 2;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(rect.width * scale));
        canvas.height = Math.max(1, Math.floor(rect.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.scale(scale, scale);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);

        const pngUrl = canvas.toDataURL("image/png");
        const replacement = document.createElement("img");
        replacement.src = pngUrl;
        replacement.alt = "chart";
        replacement.width = rect.width;
        replacement.height = rect.height;
        replacement.style.display = "block";
        replacement.style.width = `${rect.width}px`;
        replacement.style.height = `${rect.height}px`;
        replacement.style.maxWidth = "100%";

        const parent = svg.parentElement;
        if (!parent) return;

        parent.replaceChild(replacement, svg);
        restorers.push(() => {
          parent.replaceChild(svg, replacement);
        });
      } catch {
        // skip individual svg failures
      }
    })
  );

  return () => {
    restorers.forEach((fn) => {
      try {
        fn();
      } catch {
        // ignore restore errors
      }
    });
  };
}

export default function AdminAnalyticsPage() {
  const reportRef = useRef<HTMLDivElement>(null);

  const [rangeKey, setRangeKey] = useState<DateRangeKey>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportMsg, setExportMsg] = useState("");
  const [exportErr, setExportErr] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [wallets, setWallets] = useState<WalletRow[]>([]);

  const { from, to } = useMemo(
    () => getRangeDates(rangeKey, customFrom, customTo),
    [rangeKey, customFrom, customTo]
  );

  const rangeLabel = useMemo(() => {
    const opt = RANGE_OPTIONS.find((o) => o.key === rangeKey);
    if (rangeKey === "custom" && customFrom && customTo) {
      return `${customFrom} → ${customTo}`;
    }
    return opt?.label || "Selected period";
  }, [rangeKey, customFrom, customTo]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [
        profilesRes,
        campaignsRes,
        tasksRes,
        submissionsRes,
        transactionsRes,
        walletsRes,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, user_name, email, created_at"),
        supabase
          .from("campaigns")
          .select(
            "id, title, status, total_slots, completed_slots, total_budget, created_at"
          ),
        supabase
          .from("campaign_tasks")
          .select(
            "id, campaign_id, status, max_workers, completed_workers, reward_amount, created_at"
          ),
        supabase
          .from("task_submissions")
          .select(
            "id, task_id, worker_id, status, reward_amount, created_at, reviewed_at"
          ),
        supabase
          .from("transactions")
          .select(
            "id, user_id, transaction_type, amount, direction, status, reference, created_at"
          ),
        supabase
          .from("wallets")
          .select(
            "id, user_id, available_balance, pending_balance, total_earned, total_withdrawn"
          ),
      ]);

      const errs = [
        profilesRes.error,
        campaignsRes.error,
        tasksRes.error,
        submissionsRes.error,
        transactionsRes.error,
        walletsRes.error,
      ].filter(Boolean);

      if (errs.length > 0) {
        throw new Error(errs[0]?.message || "Failed to load analytics data.");
      }

      setProfiles((profilesRes.data || []) as ProfileRow[]);
      setCampaigns(
        (campaignsRes.data || []).map((c) => ({
          ...c,
          total_slots: Number(c.total_slots ?? 0),
          completed_slots: Number(c.completed_slots ?? 0),
          total_budget: Number(c.total_budget ?? 0),
        }))
      );
      setTasks(
        (tasksRes.data || []).map((t) => ({
          ...t,
          max_workers: Number(t.max_workers ?? 0),
          completed_workers: Number(t.completed_workers ?? 0),
          reward_amount: Number(t.reward_amount ?? 0),
        }))
      );
      setSubmissions(
        (submissionsRes.data || []).map((s) => ({
          ...s,
          reward_amount: Number(s.reward_amount ?? 0),
        }))
      );
      setTransactions(
        (transactionsRes.data || []).map((t) => ({
          ...t,
          amount: Number(t.amount ?? 0),
        }))
      );
      setWallets(
        (walletsRes.data || []).map((w) => ({
          ...w,
          available_balance: Number(w.available_balance ?? 0),
          pending_balance: Number(w.pending_balance ?? 0),
          total_earned: Number(w.total_earned ?? 0),
          total_withdrawn: Number(w.total_withdrawn ?? 0),
        }))
      );
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to load analytics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProfiles = useMemo(
    () => profiles.filter((p) => inRange(p.created_at, from, to)),
    [profiles, from, to]
  );
  const filteredCampaigns = useMemo(
    () => campaigns.filter((c) => inRange(c.created_at, from, to)),
    [campaigns, from, to]
  );
  const filteredTasks = useMemo(
    () => tasks.filter((t) => inRange(t.created_at, from, to)),
    [tasks, from, to]
  );
  const filteredSubmissions = useMemo(
    () => submissions.filter((s) => inRange(s.created_at, from, to)),
    [submissions, from, to]
  );
  const filteredTransactions = useMemo(
    () => transactions.filter((t) => inRange(t.created_at, from, to)),
    [transactions, from, to]
  );

  const summary: AnalyticsSummary = useMemo(() => {
    const activeUsers = new Set(
      [
        ...filteredSubmissions.map((s) => s.worker_id),
        ...filteredTransactions.map((t) => t.user_id),
      ].filter(Boolean)
    ).size;

    const activeCampaigns = campaigns.filter(
      (c) => (c.status || "").toLowerCase() === "active"
    ).length;
    const completedCampaigns = campaigns.filter((c) =>
      ["completed", "ended", "closed"].includes((c.status || "").toLowerCase())
    ).length;
    const pendingCampaigns = campaigns.filter((c) =>
      ["pending", "draft"].includes((c.status || "").toLowerCase())
    ).length;

    const completedTasks = tasks.filter((t) =>
      ["completed", "closed"].includes((t.status || "").toLowerCase())
    ).length;

    const pendingSub = filteredSubmissions.filter(
      (s) => s.status === "pending"
    ).length;
    const approvedSub = filteredSubmissions.filter(
      (s) => s.status === "approved"
    ).length;
    const rejectedSub = filteredSubmissions.filter(
      (s) => s.status === "rejected"
    ).length;

    const totalSlots = campaigns.reduce((s, c) => s + (c.total_slots || 0), 0);
    const completedSlots = campaigns.reduce(
      (s, c) => s + (c.completed_slots || 0),
      0
    );

    return {
      totalUsers: profiles.length,
      activeUsers,
      newUsers: filteredProfiles.length,
      totalCampaigns: campaigns.length,
      activeCampaigns,
      completedCampaigns,
      pendingCampaigns,
      totalTasks: tasks.length,
      completedTasks,
      totalSubmissions: filteredSubmissions.length,
      pendingSubmissions: pendingSub,
      approvedSubmissions: approvedSub,
      rejectedSubmissions: rejectedSub,
      totalSlots,
      completedSlots,
      availableBalance: wallets.reduce((s, w) => s + w.available_balance, 0),
      pendingBalance: wallets.reduce((s, w) => s + w.pending_balance, 0),
      totalEarned: wallets.reduce((s, w) => s + w.total_earned, 0),
      totalWithdrawn: wallets.reduce((s, w) => s + w.total_withdrawn, 0),
      transactionVolume: filteredTransactions.reduce((s, t) => s + t.amount, 0),
      transactionCount: filteredTransactions.length,
    };
  }, [
    profiles,
    campaigns,
    tasks,
    filteredProfiles,
    filteredSubmissions,
    filteredTransactions,
    wallets,
  ]);

  const approvalRate =
    summary.totalSubmissions > 0
      ? (summary.approvedSubmissions / summary.totalSubmissions) * 100
      : 0;
  const rejectionRate =
    summary.totalSubmissions > 0
      ? (summary.rejectedSubmissions / summary.totalSubmissions) * 100
      : 0;

  const userGrowth: ChartPoint[] = useMemo(
    () =>
      groupByPeriod(
        filteredProfiles.map((p) => p.created_at),
        from,
        to,
        rangeKey
      ),
    [filteredProfiles, from, to, rangeKey]
  );

  const campaignGrowth: ChartPoint[] = useMemo(
    () =>
      groupByPeriod(
        filteredCampaigns.map((c) => c.created_at),
        from,
        to,
        rangeKey
      ),
    [filteredCampaigns, from, to, rangeKey]
  );

  const taskGrowth: ChartPoint[] = useMemo(
    () =>
      groupByPeriod(
        filteredTasks.map((t) => t.created_at),
        from,
        to,
        rangeKey
      ),
    [filteredTasks, from, to, rangeKey]
  );

  const submissionChart: ChartPoint[] = useMemo(() => {
    const all = groupByPeriod(
      filteredSubmissions.map((s) => s.created_at),
      from,
      to,
      rangeKey
    );
    const approved = groupByPeriod(
      filteredSubmissions
        .filter((s) => s.status === "approved")
        .map((s) => s.created_at),
      from,
      to,
      rangeKey
    );
    const rejected = groupByPeriod(
      filteredSubmissions
        .filter((s) => s.status === "rejected")
        .map((s) => s.created_at),
      from,
      to,
      rangeKey
    );
    const aMap = new Map(approved.map((p) => [p.label, p.value]));
    const rMap = new Map(rejected.map((p) => [p.label, p.value]));
    return all.map((p) => ({
      label: p.label,
      value: p.value,
      value2: aMap.get(p.label) || 0,
      value3: rMap.get(p.label) || 0,
    }));
  }, [filteredSubmissions, from, to, rangeKey]);

  const financialChart: ChartPoint[] = useMemo(
    () =>
      groupByPeriod(
        filteredTransactions.map((t) => t.created_at),
        from,
        to,
        rangeKey
      ).map((p) => {
        const dayTx = filteredTransactions.filter((t) => {
          const d = new Date(t.created_at);
          const useDaily =
            rangeKey === "today" || rangeKey === "7d" || rangeKey === "30d";
          const key = useDaily
            ? d.toISOString().slice(0, 10)
            : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          return key === p.label;
        });
        return {
          label: p.label,
          value: dayTx.reduce((s, t) => s + t.amount, 0),
          value2: dayTx.length,
        };
      }),
    [filteredTransactions, from, to, rangeKey]
  );

  const campaignPerformance: CampaignPerformance[] = useMemo(() => {
    const taskCountMap = new Map<string, number>();
    tasks.forEach((t) => {
      taskCountMap.set(
        t.campaign_id,
        (taskCountMap.get(t.campaign_id) || 0) + 1
      );
    });
    return campaigns
      .map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        total_slots: c.total_slots || 0,
        completed_slots: c.completed_slots || 0,
        taskCount: taskCountMap.get(c.id) || 0,
      }))
      .sort((a, b) => b.completed_slots - a.completed_slots)
      .slice(0, 10);
  }, [campaigns, tasks]);

  const recentActivity: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];

    filteredCampaigns.slice(0, 5).forEach((c) => {
      items.push({
        id: `c-${c.id}`,
        type: "campaign",
        title: "New campaign created",
        subtitle: c.title || c.id.slice(0, 8),
        created_at: c.created_at,
      });
    });
    filteredTasks.slice(0, 5).forEach((t) => {
      items.push({
        id: `t-${t.id}`,
        type: "task",
        title: "New task created",
        subtitle: t.id.slice(0, 8),
        created_at: t.created_at,
      });
    });
    filteredSubmissions.slice(0, 8).forEach((s) => {
      items.push({
        id: `s-${s.id}`,
        type: "submission",
        title:
          s.status === "approved"
            ? "Submission approved"
            : s.status === "rejected"
            ? "Submission rejected"
            : "New submission received",
        subtitle: s.id.slice(0, 8),
        created_at: s.created_at,
      });
    });
    filteredTransactions.slice(0, 5).forEach((t) => {
      items.push({
        id: `tx-${t.id}`,
        type: "transaction",
        title: "Transaction recorded",
        subtitle: `${t.transaction_type} · ${formatNaira(t.amount)}`,
        created_at: t.created_at,
      });
    });

    return items
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 12);
  }, [
    filteredCampaigns,
    filteredTasks,
    filteredSubmissions,
    filteredTransactions,
  ]);

  /* -------------------- Exports -------------------- */
  const handleExportPNG = async () => {
    if (!reportRef.current) return;
    setExporting("png");
    setExportErr("");
    setExportMsg("");

    let restore: (() => void) | null = null;

    try {
      // Let charts finish layout
      await new Promise((r) => setTimeout(r, 400));
      restore = await inlineSvgCharts(reportRef.current);

      const dataUrl = await toPng(reportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      const link = document.createElement("a");
      link.download = `gigplace-analytics-${rangeKey}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      setExportMsg("PNG report downloaded.");
    } catch (e) {
      console.error(e);
      setExportErr(e instanceof Error ? e.message : "PNG export failed.");
    } finally {
      if (restore) restore();
      setExporting(null);
      setExportOpen(false);
    }
  };

  const handleExportExcel = () => {
    setExporting("excel");
    setExportErr("");
    setExportMsg("");
    try {
      const wb = XLSX.utils.book_new();

      const overview = [
        ["Metric", "Value", "Date Range"],
        ["Total Users", summary.totalUsers, rangeLabel],
        ["New Users (period)", summary.newUsers, rangeLabel],
        ["Active Users (period)", summary.activeUsers, rangeLabel],
        ["Total Campaigns", summary.totalCampaigns, rangeLabel],
        ["Active Campaigns", summary.activeCampaigns, rangeLabel],
        ["Total Tasks", summary.totalTasks, rangeLabel],
        ["Completed Tasks", summary.completedTasks, rangeLabel],
        ["Total Submissions (period)", summary.totalSubmissions, rangeLabel],
        ["Approved Submissions", summary.approvedSubmissions, rangeLabel],
        ["Rejected Submissions", summary.rejectedSubmissions, rangeLabel],
        ["Approval Rate", formatPct(approvalRate), rangeLabel],
        ["Available Balance", summary.availableBalance, rangeLabel],
        ["Pending Balance", summary.pendingBalance, rangeLabel],
        ["Total Earned", summary.totalEarned, rangeLabel],
        ["Total Withdrawn", summary.totalWithdrawn, rangeLabel],
        ["Transaction Volume (period)", summary.transactionVolume, rangeLabel],
      ];
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(overview),
        "Overview"
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          filteredProfiles.map((p) => ({
            id: p.id,
            full_name: p.full_name,
            user_name: p.user_name,
            email: p.email,
            created_at: p.created_at,
          }))
        ),
        "Users"
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          campaigns.map((c) => ({
            id: c.id,
            title: c.title,
            status: c.status,
            total_slots: c.total_slots,
            completed_slots: c.completed_slots,
            total_budget: c.total_budget,
            created_at: c.created_at,
          }))
        ),
        "Campaigns"
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          tasks.map((t) => ({
            id: t.id,
            campaign_id: t.campaign_id,
            status: t.status,
            max_workers: t.max_workers,
            completed_workers: t.completed_workers,
            reward_amount: t.reward_amount,
            created_at: t.created_at,
          }))
        ),
        "Tasks"
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          filteredSubmissions.map((s) => ({
            id: s.id,
            task_id: s.task_id,
            worker_id: s.worker_id,
            status: s.status,
            reward_amount: s.reward_amount,
            created_at: s.created_at,
            reviewed_at: s.reviewed_at,
          }))
        ),
        "Submissions"
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          filteredTransactions.map((t) => ({
            id: t.id,
            user_id: t.user_id,
            transaction_type: t.transaction_type,
            amount: t.amount,
            direction: t.direction,
            status: t.status,
            reference: t.reference,
            created_at: t.created_at,
          }))
        ),
        "Transactions"
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          wallets.map((w) => ({
            id: w.id,
            user_id: w.user_id,
            available_balance: w.available_balance,
            pending_balance: w.pending_balance,
            total_earned: w.total_earned,
            total_withdrawn: w.total_withdrawn,
          }))
        ),
        "Wallets"
      );

      XLSX.writeFile(wb, `gigplace-analytics-${rangeKey}-${Date.now()}.xlsx`);
      setExportMsg("Excel report downloaded.");
    } catch (e) {
      setExportErr(e instanceof Error ? e.message : "Excel export failed.");
    } finally {
      setExporting(null);
      setExportOpen(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExporting("pdf");
    setExportErr("");
    setExportMsg("");

    let restore: (() => void) | null = null;

    try {
      await new Promise((r) => setTimeout(r, 400));
      restore = await inlineSvgCharts(reportRef.current);

      const dataUrl = await toPng(reportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.setFontSize(14);
      pdf.text("GigPlace — Platform Analytics Report", 10, 10);
      pdf.setFontSize(9);
      pdf.text(
        `Period: ${rangeLabel}  |  Generated: ${new Date().toLocaleString()}`,
        10,
        16
      );

      const imgWidth = pageWidth - 20;
      const imgProps = pdf.getImageProperties(dataUrl);
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      let heightLeft = imgHeight;
      let position = 20;

      pdf.addImage(dataUrl, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 25;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(dataUrl, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 10;
      }

      pdf.save(`gigplace-analytics-${rangeKey}-${Date.now()}.pdf`);
      setExportMsg("PDF report downloaded.");
    } catch (e) {
      console.error(e);
      setExportErr(e instanceof Error ? e.message : "PDF export failed.");
    } finally {
      if (restore) restore();
      setExporting(null);
      setExportOpen(false);
    }
  };

  /* -------------------- UI helpers -------------------- */
  const StatCard = ({
    label,
    value,
    icon: Icon,
    style,
  }: {
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    style: string;
  }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 truncate text-base font-bold text-slate-900 sm:text-lg">
            {value}
          </p>
        </div>
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );

  const ChartCard = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900 sm:text-base">{title}</h3>
      <div className="mt-3 h-[240px] w-full min-h-[240px] sm:h-[300px]">
        {children}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0b3939]">
            Insights
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
            Analytics
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            Monitor platform activity, campaign performance, task completion,
            users, and financial trends.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={rangeKey}
            onChange={(e) => setRangeKey(e.target.value as DateRangeKey)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>

          {rangeKey === "custom" && (
            <div className="flex gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-xl border border-slate-200 px-2.5 py-2 text-sm"
              />
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-xl border border-slate-200 px-2.5 py-2 text-sm"
              />
            </div>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((v) => !v)}
              disabled={!!exporting}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {exporting ? "Generating..." : "Export"}
            </button>

            {exportOpen && !exporting && (
              <div className="absolute right-0 z-30 mt-1.5 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={handleExportPNG}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ImageIcon className="h-4 w-4" />
                  Export as PNG
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export as Excel
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <FileText className="h-4 w-4" />
                  Export as PDF
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {(exportMsg || exportErr) && (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-sm ${
            exportErr
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <span>{exportErr || exportMsg}</span>
          <button
            type="button"
            onClick={() => {
              setExportMsg("");
              setExportErr("");
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-800">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadData(true)}
            className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Report content (used for PNG/PDF) */}
      <div
        ref={reportRef}
        className="space-y-5 bg-white"
        style={{ color: "#0f172a", backgroundColor: "#ffffff" }}
      >
        <p className="text-xs text-slate-400">
          Report period:{" "}
          <span className="font-medium text-slate-600">{rangeLabel}</span>
        </p>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Total Users"
            value={formatNumber(summary.totalUsers)}
            icon={Users}
            style="bg-blue-50 text-blue-600"
          />
          <StatCard
            label="Active Users"
            value={formatNumber(summary.activeUsers)}
            icon={Users}
            style="bg-sky-50 text-sky-600"
          />
          <StatCard
            label="Total Campaigns"
            value={formatNumber(summary.totalCampaigns)}
            icon={Megaphone}
            style="bg-[#0b3939]/10 text-[#0b3939]"
          />
          <StatCard
            label="Active Campaigns"
            value={formatNumber(summary.activeCampaigns)}
            icon={Megaphone}
            style="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            label="Total Tasks"
            value={formatNumber(summary.totalTasks)}
            icon={ClipboardList}
            style="bg-violet-50 text-violet-600"
          />
          <StatCard
            label="Completed Tasks"
            value={formatNumber(summary.completedTasks)}
            icon={CheckCircle2}
            style="bg-teal-50 text-teal-600"
          />
          <StatCard
            label="Total Submissions"
            value={formatNumber(summary.totalSubmissions)}
            icon={BarChart3}
            style="bg-amber-50 text-amber-600"
          />
          <StatCard
            label="Approved Submissions"
            value={formatNumber(summary.approvedSubmissions)}
            icon={CheckCircle2}
            style="bg-emerald-50 text-emerald-600"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="User Growth">
            {userGrowth.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="New users"
                    stroke="#0b3939"
                    fill="#0b3939"
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Campaigns Created">
            {campaignGrowth.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={campaignGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="value"
                    name="Campaigns"
                    fill="#0b3939"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Task Activity">
            {taskGrowth.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={taskGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Tasks"
                    stroke="#7c3aed"
                    fill="#7c3aed"
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Submission Activity">
            {submissionChart.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={submissionChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="value"
                    name="Submitted"
                    fill="#94a3b8"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="value2"
                    name="Approved"
                    fill="#10b981"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="value3"
                    name="Rejected"
                    fill="#ef4444"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 sm:text-base">
            Submission Funnel
          </h3>
          <div className="mt-4 grid gap-2 sm:grid-cols-5">
            {[
              { label: "Available Tasks", value: summary.totalTasks },
              { label: "Submissions", value: summary.totalSubmissions },
              { label: "Pending Review", value: summary.pendingSubmissions },
              { label: "Approved", value: summary.approvedSubmissions },
              { label: "Rejected", value: summary.rejectedSubmissions },
            ].map((step, i) => (
              <div
                key={step.label}
                className="relative rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-3 text-center"
              >
                <p className="text-xs text-slate-500">{step.label}</p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {formatNumber(step.value)}
                </p>
                {i < 4 && (
                  <span className="absolute -right-2 top-1/2 hidden -translate-y-1/2 text-slate-300 sm:block">
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
            <span>
              Approval rate:{" "}
              <strong className="text-emerald-700">
                {formatPct(approvalRate)}
              </strong>
            </span>
            <span>
              Rejection rate:{" "}
              <strong className="text-red-600">{formatPct(rejectionRate)}</strong>
            </span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 sm:text-base">
              Financial Overview
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {[
                {
                  label: "Available Balance",
                  value: formatNaira(summary.availableBalance),
                },
                {
                  label: "Pending Balance",
                  value: formatNaira(summary.pendingBalance),
                },
                {
                  label: "Total Earned",
                  value: formatNaira(summary.totalEarned),
                },
                {
                  label: "Total Withdrawn",
                  value: formatNaira(summary.totalWithdrawn),
                },
                {
                  label: "Txn Volume (period)",
                  value: formatNaira(summary.transactionVolume),
                },
                {
                  label: "Transactions (period)",
                  value: formatNumber(summary.transactionCount),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                >
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <ChartCard title="Financial Activity">
            {financialChart.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={financialChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatNaira(v)} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Volume (₦)"
                    stroke="#0b3939"
                    fill="#0b3939"
                    fillOpacity={0.12}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3.5">
            <h3 className="text-sm font-bold text-slate-900 sm:text-base">
              Campaign Performance
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Top campaigns by completed slots.
            </p>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  {[
                    "Campaign",
                    "Tasks",
                    "Total slots",
                    "Completed",
                    "Remaining",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaignPerformance.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      No campaigns found.
                    </td>
                  </tr>
                ) : (
                  campaignPerformance.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-4 py-2.5 text-sm font-medium text-slate-800">
                        {c.title || "Untitled"}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">
                        {c.taskCount}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">
                        {c.total_slots}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">
                        {c.completed_slots}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">
                        {Math.max(0, c.total_slots - c.completed_slots)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold capitalize text-slate-600">
                          {c.status || "—"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-2.5 p-3 md:hidden">
            {campaignPerformance.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No campaigns found.
              </p>
            ) : (
              campaignPerformance.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      {c.title || "Untitled"}
                    </p>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold capitalize text-slate-600">
                      {c.status || "—"}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-500">
                    <div>
                      <p>Tasks</p>
                      <p className="font-semibold text-slate-800">
                        {c.taskCount}
                      </p>
                    </div>
                    <div>
                      <p>Completed</p>
                      <p className="font-semibold text-slate-800">
                        {c.completed_slots}/{c.total_slots}
                      </p>
                    </div>
                    <div>
                      <p>Remaining</p>
                      <p className="font-semibold text-slate-800">
                        {Math.max(0, c.total_slots - c.completed_slots)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 sm:text-base">
            Recent Activity
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">
            Latest platform events in the selected period.
          </p>
          {recentActivity.length === 0 ? (
            <p className="mt-6 text-center text-sm text-slate-500">
              No analytics data available for this period.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {recentActivity.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {item.title}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {item.subtitle}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-slate-400">
                    {new Date(item.created_at).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                    })}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-400">
      No data for this period
    </div>
  );
}