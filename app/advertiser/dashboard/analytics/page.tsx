"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Eye,
  Loader2,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabase";

/* =========================================
   TYPES
========================================= */

type DateRange =
  | "7"
  | "30"
  | "90"
  | "all";

type CampaignStatus =
  | "pending"
  | "approved"
  | "active"
  | "completed"
  | "rejected"
  | string;

type Campaign = {
  id: string;
  title: string;
  status: CampaignStatus;

  total_slots: number;
  completed_slots: number;

  total_budget: number;
  reward_per_task: number;

  starts_at: string | null;
  ends_at: string | null;

  created_at: string;
};

type CampaignTask = {
  id: string;
  campaign_id: string;
};

type TaskSubmission = {
  id: string;
  task_id: string;
  worker_id: string;

  status:
    | "pending"
    | "approved"
    | "rejected"
    | string;

  reward_amount: number;

  created_at: string;
};

type CampaignAnalytics = {
  campaign: Campaign;

  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;

  workersReached: number;

  amountSpent: number;
  remainingBudget: number;

  approvalRate: number;
  completionRate: number;
};

type MetricCardProps = {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  iconClassName: string;
};

/* =========================================
   CONSTANTS
========================================= */

const BRAND = "#0b3939";

const CHART_COLORS = {
  brand: "#0b3939",
  brandLight: "#dcebea",
  green: "#16a34a",
  amber: "#d97706",
  red: "#dc2626",
  blue: "#2563eb",
  slate: "#64748b",
};

const STATUS_COLORS = [
  CHART_COLORS.amber,
  CHART_COLORS.green,
  CHART_COLORS.red,
];

/* =========================================
   PAGE
========================================= */

export default function AdvertiserCampaignAnalyticsPage() {
  const router = useRouter();

  const [campaigns, setCampaigns] =
    useState<Campaign[]>([]);

  const [tasks, setTasks] =
    useState<CampaignTask[]>([]);

  const [submissions, setSubmissions] =
    useState<TaskSubmission[]>([]);

  const [selectedCampaignId, setSelectedCampaignId] =
    useState("all");

  const [dateRange, setDateRange] =
    useState<DateRange>("30");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  /* =========================================
     LOAD ANALYTICS
  ========================================= */

  const loadAnalytics = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setErrorMessage("");

        /* ---------------------------------
           AUTHENTICATED USER
        --------------------------------- */

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          router.replace("/login");
          return;
        }

        /* ---------------------------------
           LOAD ADVERTISER CAMPAIGNS
        --------------------------------- */

        const {
          data: campaignData,
          error: campaignError,
        } = await supabase
          .from("campaigns")
          .select(
            `
              id,
              title,
              status,
              total_slots,
              completed_slots,
              total_budget,
              reward_per_task,
              starts_at,
              ends_at,
              created_at
            `
          )
          .eq(
            "advertiser_id",
            user.id
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (campaignError) {
          throw campaignError;
        }

        const loadedCampaigns =
          (campaignData ??
            []) as Campaign[];

        setCampaigns(
          loadedCampaigns
        );

        if (
          loadedCampaigns.length === 0
        ) {
          setTasks([]);
          setSubmissions([]);
          return;
        }

        /* ---------------------------------
           LOAD CAMPAIGN TASKS

           campaign_tasks
           → campaign_id
           → campaigns
        --------------------------------- */

        const campaignIds =
          loadedCampaigns.map(
            (campaign) =>
              campaign.id
          );

        const {
          data: taskData,
          error: taskError,
        } = await supabase
          .from("campaign_tasks")
          .select(
            `
              id,
              campaign_id
            `
          )
          .in(
            "campaign_id",
            campaignIds
          );

        if (taskError) {
          throw taskError;
        }

        const loadedTasks =
          (taskData ??
            []) as CampaignTask[];

        setTasks(
          loadedTasks
        );

        if (
          loadedTasks.length === 0
        ) {
          setSubmissions([]);
          return;
        }

        /* ---------------------------------
           LOAD TASK SUBMISSIONS

           task_submissions
           → task_id
           → campaign_tasks
        --------------------------------- */

        const taskIds =
          loadedTasks.map(
            (task) =>
              task.id
          );

        const {
          data: submissionData,
          error: submissionError,
        } = await supabase
          .from("task_submissions")
          .select(
            `
              id,
              task_id,
              worker_id,
              status,
              reward_amount,
              created_at
            `
          )
          .in(
            "task_id",
            taskIds
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (submissionError) {
          throw submissionError;
        }

        setSubmissions(
          (submissionData ??
            []) as TaskSubmission[]
        );
      } catch (
        error: unknown
      ) {
        console.error(
          "Analytics loading error:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load campaign analytics."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  /* =========================================
     LOAD ON PAGE OPEN
  ========================================= */

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  /* =========================================
     DATE FILTER
  ========================================= */

  const startDate = useMemo(() => {
    if (
      dateRange === "all"
    ) {
      return null;
    }

    const days =
      Number(dateRange);

    const date =
      new Date();

    date.setDate(
      date.getDate() -
        days
    );

    return date;
  }, [dateRange]);

  /* =========================================
     FILTERED SUBMISSIONS
  ========================================= */

  const filteredSubmissions =
    useMemo(() => {
      let result = [
        ...submissions,
      ];

      if (startDate) {
        result =
          result.filter(
            (submission) =>
              new Date(
                submission.created_at
              ) >=
              startDate
          );
      }

      if (
        selectedCampaignId !==
        "all"
      ) {
        const selectedTaskIds =
          new Set(
            tasks
              .filter(
                (task) =>
                  task.campaign_id ===
                  selectedCampaignId
              )
              .map(
                (task) =>
                  task.id
              )
          );

        result =
          result.filter(
            (submission) =>
              selectedTaskIds.has(
                submission.task_id
              )
          );
      }

      return result;
    }, [
      submissions,
      tasks,
      selectedCampaignId,
      startDate,
    ]);

  /* =========================================
     FILTERED CAMPAIGNS
  ========================================= */

  const selectedCampaigns =
    useMemo(() => {
      if (
        selectedCampaignId ===
        "all"
      ) {
        return campaigns;
      }

      return campaigns.filter(
        (campaign) =>
          campaign.id ===
          selectedCampaignId
      );
    }, [
      campaigns,
      selectedCampaignId,
    ]);

  /* =========================================
     OVERALL METRICS
  ========================================= */

  const metrics = useMemo(() => {
    const totalCampaigns =
      selectedCampaigns.length;

    const activeCampaigns =
      selectedCampaigns.filter(
        (campaign) =>
          [
            "active",
            "approved",
          ].includes(
            campaign.status.toLowerCase()
          )
      ).length;

    const totalSubmissions =
      filteredSubmissions.length;

    const pendingSubmissions =
      filteredSubmissions.filter(
        (submission) =>
          submission.status.toLowerCase() ===
          "pending"
      ).length;

    const approvedSubmissions =
      filteredSubmissions.filter(
        (submission) =>
          submission.status.toLowerCase() ===
          "approved"
      ).length;

    const rejectedSubmissions =
      filteredSubmissions.filter(
        (submission) =>
          submission.status.toLowerCase() ===
          "rejected"
      ).length;

    const workersReached =
      new Set(
        filteredSubmissions.map(
          (submission) =>
            submission.worker_id
        )
      ).size;

    const totalBudget =
      selectedCampaigns.reduce(
        (
          total,
          campaign
        ) =>
          total +
          Number(
            campaign.total_budget
          ),
        0
      );

    const amountSpent =
      filteredSubmissions
        .filter(
          (submission) =>
            submission.status.toLowerCase() ===
            "approved"
        )
        .reduce(
          (
            total,
            submission
          ) =>
            total +
            Number(
              submission.reward_amount
            ),
          0
        );

    const remainingBudget =
      Math.max(
        0,
        totalBudget -
          amountSpent
      );

    const approvalRate =
      totalSubmissions > 0
        ? Math.round(
            (approvedSubmissions /
              totalSubmissions) *
              100
          )
        : 0;

    const totalSlots =
      selectedCampaigns.reduce(
        (
          total,
          campaign
        ) =>
          total +
          Number(
            campaign.total_slots
          ),
        0
      );

    const completedSlots =
      selectedCampaigns.reduce(
        (
          total,
          campaign
        ) =>
          total +
          Number(
            campaign.completed_slots
          ),
        0
      );

    const completionRate =
      totalSlots > 0
        ? Math.min(
            100,
            Math.round(
              (completedSlots /
                totalSlots) *
                100
            )
          )
        : 0;

    return {
      totalCampaigns,
      activeCampaigns,
      totalSubmissions,
      pendingSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      workersReached,
      totalBudget,
      amountSpent,
      remainingBudget,
      approvalRate,
      completionRate,
      totalSlots,
      completedSlots,
    };
  }, [
    selectedCampaigns,
    filteredSubmissions,
  ]);

  /* =========================================
     CAMPAIGN ANALYTICS
  ========================================= */

  const campaignAnalytics =
    useMemo<
      CampaignAnalytics[]
    >(() => {
      return selectedCampaigns.map(
        (campaign) => {
          const campaignTaskIds =
            new Set(
              tasks
                .filter(
                  (task) =>
                    task.campaign_id ===
                    campaign.id
                )
                .map(
                  (task) =>
                    task.id
                )
            );

          const campaignSubmissions =
            filteredSubmissions.filter(
              (
                submission
              ) =>
                campaignTaskIds.has(
                  submission.task_id
                )
            );

          const approved =
            campaignSubmissions.filter(
              (
                submission
              ) =>
                submission.status.toLowerCase() ===
                "approved"
            );

          const pending =
            campaignSubmissions.filter(
              (
                submission
              ) =>
                submission.status.toLowerCase() ===
                "pending"
            );

          const rejected =
            campaignSubmissions.filter(
              (
                submission
              ) =>
                submission.status.toLowerCase() ===
                "rejected"
            );

          const amountSpent =
            approved.reduce(
              (
                total,
                submission
              ) =>
                total +
                Number(
                  submission.reward_amount
                ),
              0
            );

          const approvalRate =
            campaignSubmissions.length >
            0
              ? Math.round(
                  (approved.length /
                    campaignSubmissions.length) *
                    100
                )
              : 0;

          const completionRate =
            campaign.total_slots >
            0
              ? Math.min(
                  100,
                  Math.round(
                    (campaign.completed_slots /
                      campaign.total_slots) *
                      100
                  )
                )
              : 0;

          return {
            campaign,

            totalSubmissions:
              campaignSubmissions.length,

            pendingSubmissions:
              pending.length,

            approvedSubmissions:
              approved.length,

            rejectedSubmissions:
              rejected.length,

            workersReached:
              new Set(
                campaignSubmissions.map(
                  (
                    submission
                  ) =>
                    submission.worker_id
                )
              ).size,

            amountSpent,

            remainingBudget:
              Math.max(
                0,
                Number(
                  campaign.total_budget
                ) -
                  amountSpent
              ),

            approvalRate,

            completionRate,
          };
        }
      );
    }, [
      selectedCampaigns,
      tasks,
      filteredSubmissions,
    ]);

  /* =========================================
     CHART DATA
  ========================================= */

  const submissionsOverTime =
    useMemo(() => {
      const grouped =
        new Map<
          string,
          number
        >();

      filteredSubmissions.forEach(
        (submission) => {
          const date =
            new Date(
              submission.created_at
            ).toLocaleDateString(
              "en-NG",
              {
                day: "2-digit",
                month: "short",
              }
            );

          grouped.set(
            date,
            (grouped.get(
              date
            ) ?? 0) + 1
          );
        }
      );

      return Array.from(
        grouped.entries()
      ).map(
        ([
          date,
          submissions,
        ]) => ({
          date,
          submissions,
        })
      );
    }, [
      filteredSubmissions,
    ]);

  const statusChartData =
    useMemo(
      () => [
        {
          name: "Pending",
          value:
            metrics.pendingSubmissions,
        },
        {
          name: "Approved",
          value:
            metrics.approvedSubmissions,
        },
        {
          name: "Rejected",
          value:
            metrics.rejectedSubmissions,
        },
      ],
      [metrics]
    );

  const campaignPerformanceData =
    useMemo(
      () =>
        campaignAnalytics.map(
          (item) => ({
            name:
              item.campaign.title
                .length >
              16
                ? `${item.campaign.title.slice(
                    0,
                    16
                  )}...`
                : item
                    .campaign
                    .title,

            approved:
              item.approvedSubmissions,

            submissions:
              item.totalSubmissions,
          })
        ),
      [
        campaignAnalytics,
      ]
    );

  const budgetChartData =
    useMemo(
      () => [
        {
          name:
            "Total Budget",

          amount:
            metrics.totalBudget,
        },
        {
          name:
            "Amount Spent",

          amount:
            metrics.amountSpent,
        },
        {
          name:
            "Remaining",

          amount:
            metrics.remainingBudget,
        },
      ],
      [metrics]
    );

  /* =========================================
     SELECTED CAMPAIGN
  ========================================= */

  const selectedCampaignAnalytics =
    useMemo(() => {
      if (
        selectedCampaignId ===
        "all"
      ) {
        return null;
      }

      return (
        campaignAnalytics.find(
          (item) =>
            item.campaign.id ===
            selectedCampaignId
        ) ?? null
      );
    }, [
      campaignAnalytics,
      selectedCampaignId,
    ]);

  /* =========================================
     HELPERS
  ========================================= */

  const formatNaira = (
    amount: number
  ) =>
    new Intl.NumberFormat(
      "en-NG",
      {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
      }
    ).format(
      Number(amount)
    );

  const formatDate = (
    date: string | null
  ) => {
    if (!date) {
      return "Not specified";
    }

    const parsed =
      new Date(date);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return "Invalid date";
    }

    return new Intl.DateTimeFormat(
      "en-NG",
      {
        dateStyle:
          "medium",
      }
    ).format(parsed);
  };

  const getStatusClass = (
    status: string
  ) => {
    switch (
      status.toLowerCase()
    ) {
      case "active":
      case "approved":
        return "border-emerald-200 bg-emerald-50 text-emerald-700";

      case "completed":
        return "border-blue-200 bg-blue-50 text-blue-700";

      case "rejected":
        return "border-red-200 bg-red-50 text-red-700";

      default:
        return "border-amber-200 bg-amber-50 text-amber-700";
    }
  };

  /* =========================================
     LOADING
  ========================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 lg:p-8">
        <div className="mx-auto max-w-7xl animate-pulse space-y-8">
          <div className="h-28 rounded-3xl bg-slate-200" />

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from(
              {
                length: 12,
              }
            ).map(
              (
                _,
                index
              ) => (
                <div
                  key={
                    index
                  }
                  className="h-36 rounded-3xl bg-slate-200"
                />
              )
            )}
          </div>

          <div className="grid gap-7 lg:grid-cols-2">
            <div className="h-[380px] rounded-3xl bg-slate-200" />

            <div className="h-[380px] rounded-3xl bg-slate-200" />
          </div>
        </div>
      </main>
    );
  }

  /* =========================================
     ERROR
  ========================================= */

  if (errorMessage) {
    return (
      <main className="flex min-h-[75vh] items-center justify-center bg-slate-50 px-6">
        <section className="w-full max-w-xl rounded-3xl border border-red-200 bg-white p-9 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <AlertCircle
              size={32}
              className="text-red-600"
            />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Unable to Load Analytics
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {
              errorMessage
            }
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                loadAnalytics()
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b3939] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#062828]"
            >
              <RefreshCw
                size={18}
              />

              Try Again
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/advertiser/dashboard/campaigns"
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700"
            >
              Back to Campaigns
            </button>
          </div>
        </section>
      </main>
    );
  }

  /* =========================================
     EMPTY STATE
  ========================================= */

  if (
    campaigns.length ===
    0
  ) {
    return (
      <main className="flex min-h-[75vh] items-center justify-center bg-slate-50 px-6">
        <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#0b3939]/10">
            <BarChart3
              size={38}
              className="text-[#0b3939]"
            />
          </div>

          <h1 className="mt-6 text-2xl font-bold text-slate-900">
            No Campaign Analytics Yet
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
            Create your first campaign to begin tracking worker activity, task submissions, approval performance, and budget usage.
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/advertiser/dashboard/campaigns"
              )
            }
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#0b3939] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#062828]"
          >
            <BriefcaseBusiness
              size={18}
            />

            Go to Campaigns
          </button>
        </section>
      </main>
    );
  }

  /* =========================================
     PAGE
  ========================================= */

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-6 lg:px-8">
        {/* HEADER */}

        <section className="mb-7 rounded-3xl bg-[#0b3939] p-7 text-white shadow-sm sm:p-9">
          <div className="flex flex-col gap-7 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/advertiser/dashboard/campaigns"
                  )
                }
                className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition hover:text-white"
              >
                <ArrowLeft
                  size={18}
                />

                Back to Campaigns
              </button>

              <div className="mt-6 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                  <BarChart3
                    size={29}
                  />
                </div>

                <div>
                  <h1 className="text-3xl font-bold">
                    Campaign Analytics
                  </h1>

                  <p className="mt-1 text-sm leading-6 text-white/70">
                    Monitor campaign performance, worker activity, submissions, approvals, and budget utilization.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                loadAnalytics(
                  true
                )
              }
              disabled={
                refreshing
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#0b3939] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshCw
                size={18}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              {refreshing
                ? "Refreshing..."
                : "Refresh Analytics"}
            </button>
          </div>
        </section>

        {/* FILTERS */}

        <section className="mb-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Select Campaign
              </label>

              <select
                value={
                  selectedCampaignId
                }
                onChange={(
                  event
                ) =>
                  setSelectedCampaignId(
                    event
                      .target
                      .value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#0b3939] focus:ring-4 focus:ring-[#0b3939]/10"
              >
                <option value="all">
                  All Campaigns
                </option>

                {campaigns.map(
                  (
                    campaign
                  ) => (
                    <option
                      key={
                        campaign.id
                      }
                      value={
                        campaign.id
                      }
                    >
                      {
                        campaign.title
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Date Range
              </label>

              <select
                value={
                  dateRange
                }
                onChange={(
                  event
                ) =>
                  setDateRange(
                    event
                      .target
                      .value as DateRange
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#0b3939] focus:ring-4 focus:ring-[#0b3939]/10"
              >
                <option value="7">
                  Last 7 Days
                </option>

                <option value="30">
                  Last 30 Days
                </option>

                <option value="90">
                  Last 90 Days
                </option>

                <option value="all">
                  All Time
                </option>
              </select>
            </div>
          </div>
        </section>

        {/* METRICS */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Campaigns"
            value={
              metrics.totalCampaigns
            }
            description="Campaigns in selected view"
            icon={
              <BriefcaseBusiness
                size={23}
              />
            }
            iconClassName="bg-[#0b3939]/10 text-[#0b3939]"
          />

          <MetricCard
            title="Active Campaigns"
            value={
              metrics.activeCampaigns
            }
            description="Approved or currently active"
            icon={
              <Activity
                size={23}
              />
            }
            iconClassName="bg-emerald-50 text-emerald-600"
          />

          <MetricCard
            title="Total Submissions"
            value={
              metrics.totalSubmissions
            }
            description="Tasks submitted by workers"
            icon={
              <ClipboardCheck
                size={23}
              />
            }
            iconClassName="bg-blue-50 text-blue-600"
          />

          <MetricCard
            title="Pending Review"
            value={
              metrics.pendingSubmissions
            }
            description="Awaiting advertiser action"
            icon={
              <Clock3
                size={23}
              />
            }
            iconClassName="bg-amber-50 text-amber-600"
          />

          <MetricCard
            title="Approved"
            value={
              metrics.approvedSubmissions
            }
            description="Successfully approved tasks"
            icon={
              <CheckCircle2
                size={23}
              />
            }
            iconClassName="bg-emerald-50 text-emerald-600"
          />

          <MetricCard
            title="Rejected"
            value={
              metrics.rejectedSubmissions
            }
            description="Submissions not accepted"
            icon={
              <XCircle
                size={23}
              />
            }
            iconClassName="bg-red-50 text-red-600"
          />

          <MetricCard
            title="Workers Reached"
            value={
              metrics.workersReached
            }
            description="Unique workers who submitted"
            icon={
              <Users
                size={23}
              />
            }
            iconClassName="bg-violet-50 text-violet-600"
          />

          <MetricCard
            title="Total Budget"
            value={formatNaira(
              metrics.totalBudget
            )}
            description="Combined campaign budget"
            icon={
              <Wallet
                size={23}
              />
            }
            iconClassName="bg-[#0b3939]/10 text-[#0b3939]"
          />

          <MetricCard
            title="Amount Spent"
            value={formatNaira(
              metrics.amountSpent
            )}
            description="Approved task rewards"
            icon={
              <CircleDollarSign
                size={23}
              />
            }
            iconClassName="bg-orange-50 text-orange-600"
          />

          <MetricCard
            title="Remaining Budget"
            value={formatNaira(
              metrics.remainingBudget
            )}
            description="Available campaign balance"
            icon={
              <Wallet
                size={23}
              />
            }
            iconClassName="bg-cyan-50 text-cyan-600"
          />

          <MetricCard
            title="Approval Rate"
            value={`${metrics.approvalRate}%`}
            description="Approved out of all submissions"
            icon={
              <TrendingUp
                size={23}
              />
            }
            iconClassName="bg-emerald-50 text-emerald-600"
          />

          <MetricCard
            title="Campaign Completion"
            value={`${metrics.completionRate}%`}
            description={`${metrics.completedSlots}/${metrics.totalSlots} worker slots completed`}
            icon={
              <Target
                size={23}
              />
            }
            iconClassName="bg-blue-50 text-blue-600"
          />
        </section>

        {/* CHARTS */}

        <section className="mt-8 grid gap-7 xl:grid-cols-2">
          {/* SUBMISSIONS OVER TIME */}

          <ChartCard
            title="Task Submissions Over Time"
            description="Worker task activity during the selected period"
          >
            {submissionsOverTime.length >
            0 ? (
              <ResponsiveContainer
                width="100%"
                height={320}
              >
                <AreaChart
                  data={
                    submissionsOverTime
                  }
                >
                  <defs>
                    <linearGradient
                      id="submissionGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={
                          CHART_COLORS.brand
                        }
                        stopOpacity={
                          0.35
                        }
                      />

                      <stop
                        offset="95%"
                        stopColor={
                          CHART_COLORS.brand
                        }
                        stopOpacity={
                          0
                        }
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={
                      false
                    }
                  />

                  <XAxis
                    dataKey="date"
                    tickLine={
                      false
                    }
                    axisLine={
                      false
                    }
                  />

                  <YAxis
                    allowDecimals={
                      false
                    }
                    tickLine={
                      false
                    }
                    axisLine={
                      false
                    }
                  />

                  <Tooltip />

                  <Area
                    type="monotone"
                    dataKey="submissions"
                    stroke={
                      CHART_COLORS.brand
                    }
                    strokeWidth={
                      3
                    }
                    fill="url(#submissionGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmptyState />
            )}
          </ChartCard>

          {/* STATUS BAR */}

          <ChartCard
            title="Submission Review Status"
            description="Comparison of pending, approved, and rejected submissions"
          >
            <ResponsiveContainer
              width="100%"
              height={320}
            >
              <BarChart
                data={
                  statusChartData
                }
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={
                    false
                  }
                />

                <XAxis
                  dataKey="name"
                  tickLine={
                    false
                  }
                  axisLine={
                    false
                  }
                />

                <YAxis
                  allowDecimals={
                    false
                  }
                  tickLine={
                    false
                  }
                  axisLine={
                    false
                  }
                />

                <Tooltip />

                <Bar
                  dataKey="value"
                  radius={[
                    8,
                    8,
                    0,
                    0,
                  ]}
                >
                  {statusChartData.map(
                    (
                      _,
                      index
                    ) => (
                      <Cell
                        key={
                          index
                        }
                        fill={
                          STATUS_COLORS[
                            index
                          ]
                        }
                      />
                    )
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* DONUT */}

          <ChartCard
            title="Submission Status Distribution"
            description="Percentage distribution by review status"
          >
            {metrics.totalSubmissions >
            0 ? (
              <ResponsiveContainer
                width="100%"
                height={320}
              >
                <PieChart>
                  <Pie
                    data={
                      statusChartData
                    }
                    dataKey="value"
                    nameKey="name"
                    innerRadius={
                      70
                    }
                    outerRadius={
                      110
                    }
                    paddingAngle={
                      4
                    }
                  >
                    {statusChartData.map(
                      (
                        _,
                        index
                      ) => (
                        <Cell
                          key={
                            index
                          }
                          fill={
                            STATUS_COLORS[
                              index
                            ]
                          }
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip />

                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmptyState />
            )}
          </ChartCard>

          {/* CAMPAIGN PERFORMANCE */}

          <ChartCard
            title="Campaign Performance"
            description="Total submissions compared with approved tasks"
          >
            {campaignPerformanceData.length >
            0 ? (
              <ResponsiveContainer
                width="100%"
                height={320}
              >
                <BarChart
                  data={
                    campaignPerformanceData
                  }
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={
                      false
                    }
                  />

                  <XAxis
                    dataKey="name"
                    tickLine={
                      false
                    }
                    axisLine={
                      false
                    }
                  />

                  <YAxis
                    allowDecimals={
                      false
                    }
                    tickLine={
                      false
                    }
                    axisLine={
                      false
                    }
                  />

                  <Tooltip />

                  <Legend />

                  <Bar
                    dataKey="submissions"
                    name="Submissions"
                    fill={
                      CHART_COLORS.blue
                    }
                    radius={[
                      6,
                      6,
                      0,
                      0,
                    ]}
                  />

                  <Bar
                    dataKey="approved"
                    name="Approved"
                    fill={
                      CHART_COLORS.green
                    }
                    radius={[
                      6,
                      6,
                      0,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmptyState />
            )}
          </ChartCard>
        </section>

        {/* BUDGET + PROGRESS */}

        <section className="mt-8 grid gap-7 xl:grid-cols-2">
          <ChartCard
            title="Budget Utilization"
            description="Total budget, approved rewards, and available balance"
          >
            <ResponsiveContainer
              width="100%"
              height={320}
            >
              <BarChart
                data={
                  budgetChartData
                }
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={
                    false
                  }
                />

                <XAxis
                  dataKey="name"
                  tickLine={
                    false
                  }
                  axisLine={
                    false
                  }
                />

                <YAxis
                  tickLine={
                    false
                  }
                  axisLine={
                    false
                  }
                  tickFormatter={(
                    value
                  ) =>
                    `₦${Number(
                      value
                    ).toLocaleString()}`
                  }
                />

                <Tooltip
                  formatter={(
                    value
                  ) =>
                    formatNaira(
                      Number(
                        value
                      )
                    )
                  }
                />

                <Bar
                  dataKey="amount"
                  fill={
                    CHART_COLORS.brand
                  }
                  radius={[
                    8,
                    8,
                    0,
                    0,
                  ]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Worker Slot Completion
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Overall progress across selected campaigns
              </p>
            </div>

            <div className="mt-10 flex justify-center">
              <div className="relative flex h-52 w-52 items-center justify-center rounded-full border-[18px] border-[#0b3939]/10">
                <div
                  className="absolute inset-[-18px] rounded-full"
                  style={{
                    background: `conic-gradient(${BRAND} ${metrics.completionRate}%, #e2e8f0 0)`,
                    mask: "radial-gradient(farthest-side, transparent calc(100% - 18px), #000 0)",
                    WebkitMask:
                      "radial-gradient(farthest-side, transparent calc(100% - 18px), #000 0)",
                  }}
                />

                <div className="relative z-10 text-center">
                  <p className="text-4xl font-bold text-[#0b3939]">
                    {
                      metrics.completionRate
                    }
                    %
                  </p>

                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Completed
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-9 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-50 p-5 text-center">
                <p className="text-2xl font-bold text-slate-900">
                  {
                    metrics.completedSlots
                  }
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Completed Slots
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5 text-center">
                <p className="text-2xl font-bold text-slate-900">
                  {
                    metrics.totalSlots
                  }
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Total Slots
                </p>
              </div>
            </div>
          </section>
        </section>

        {/* SELECTED CAMPAIGN DETAILS */}

        {selectedCampaignAnalytics && (
          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${getStatusClass(
                      selectedCampaignAnalytics
                        .campaign
                        .status
                    )}`}
                  >
                    {
                      selectedCampaignAnalytics
                        .campaign
                        .status
                    }
                  </span>

                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <CalendarDays
                      size={15}
                    />

                    {
                      formatDate(
                        selectedCampaignAnalytics
                          .campaign
                          .starts_at
                      )
                    }

                    <span>
                      —
                    </span>

                    {
                      formatDate(
                        selectedCampaignAnalytics
                          .campaign
                          .ends_at
                      )
                    }
                  </span>
                </div>

                <h2 className="mt-4 text-2xl font-bold text-slate-900">
                  {
                    selectedCampaignAnalytics
                      .campaign
                      .title
                  }
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Detailed campaign performance and recent worker activity
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/advertiser/dashboard/campaigns/view?campaignId=${selectedCampaignAnalytics.campaign.id}`
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#0b3939]/20 px-5 py-3 text-sm font-semibold text-[#0b3939] transition hover:bg-[#0b3939]/5"
              >
                <Eye
                  size={18}
                />

                View Campaign
              </button>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DetailMetric
                label="Total Submissions"
                value={
                  selectedCampaignAnalytics.totalSubmissions
                }
              />

              <DetailMetric
                label="Approval Rate"
                value={`${selectedCampaignAnalytics.approvalRate}%`}
              />

              <DetailMetric
                label="Budget Used"
                value={formatNaira(
                  selectedCampaignAnalytics.amountSpent
                )}
              />

              <DetailMetric
                label="Workers Reached"
                value={
                  selectedCampaignAnalytics.workersReached
                }
              />
            </div>

            <div className="mt-7">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-600">
                  Worker Progress
                </span>

                <span className="font-bold text-[#0b3939]">
                  {
                    selectedCampaignAnalytics
                      .campaign
                      .completed_slots
                  }
                  /
                  {
                    selectedCampaignAnalytics
                      .campaign
                      .total_slots
                  }
                </span>
              </div>

              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#0b3939] transition-all"
                  style={{
                    width: `${selectedCampaignAnalytics.completionRate}%`,
                  }}
                />
              </div>
            </div>
          </section>
        )}

        {/* TOP CAMPAIGNS */}

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Top Performing Campaigns
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Performance overview for your campaigns
              </p>
            </div>

            <span className="rounded-full bg-[#0b3939]/10 px-4 py-2 text-xs font-bold text-[#0b3939]">
              {
                campaignAnalytics.length
              }{" "}
              Campaigns
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1250px] w-full">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">
                    Campaign
                  </th>

                  <th className="px-6 py-4">
                    Status
                  </th>

                  <th className="px-6 py-4">
                    Worker Slots
                  </th>

                  <th className="px-6 py-4">
                    Submissions
                  </th>

                  <th className="px-6 py-4">
                    Approved
                  </th>

                  <th className="px-6 py-4">
                    Approval Rate
                  </th>

                  <th className="px-6 py-4">
                    Budget Used
                  </th>

                  <th className="px-6 py-4">
                    Completion
                  </th>

                  <th className="px-6 py-4">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {[
                  ...campaignAnalytics,
                ]
                  .sort(
                    (
                      a,
                      b
                    ) =>
                      b.approvalRate -
                      a.approvalRate
                  )
                  .map(
                    (
                      item
                    ) => (
                      <tr
                        key={
                          item
                            .campaign
                            .id
                        }
                        className="border-t border-slate-100 transition hover:bg-slate-50"
                      >
                        <td className="px-6 py-5">
                          <p className="max-w-[220px] truncate font-semibold text-slate-900">
                            {
                              item
                                .campaign
                                .title
                            }
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${getStatusClass(
                              item
                                .campaign
                                .status
                            )}`}
                          >
                            {
                              item
                                .campaign
                                .status
                            }
                          </span>
                        </td>

                        <td className="px-6 py-5 text-sm">
                          {
                            item
                              .campaign
                              .completed_slots
                          }
                          /
                          {
                            item
                              .campaign
                              .total_slots
                          }
                        </td>

                        <td className="px-6 py-5 text-sm font-semibold">
                          {
                            item.totalSubmissions
                          }
                        </td>

                        <td className="px-6 py-5 text-sm font-semibold text-emerald-600">
                          {
                            item.approvedSubmissions
                          }
                        </td>

                        <td className="px-6 py-5">
                          <span className="font-bold text-[#0b3939]">
                            {
                              item.approvalRate
                            }
                            %
                          </span>
                        </td>

                        <td className="px-6 py-5 text-sm font-semibold">
                          {formatNaira(
                            item.amountSpent
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-[#0b3939]"
                                style={{
                                  width: `${item.completionRate}%`,
                                }}
                              />
                            </div>

                            <span className="text-xs font-bold">
                              {
                                item.completionRate
                              }
                              %
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedCampaignId(
                                item
                                  .campaign
                                  .id
                              )
                            }
                            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0b3939] transition hover:underline"
                          >
                            View

                            <ChevronRight
                              size={
                                16
                              }
                            />
                          </button>
                        </td>
                      </tr>
                    )
                  )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

/* =========================================
   METRIC CARD
========================================= */

function MetricCard({
  title,
  value,
  description,
  icon,
  iconClassName,
}: MetricCardProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {title}
          </p>

          <h3 className="mt-3 text-2xl font-bold text-slate-900">
            {value}
          </h3>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClassName}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </section>
  );
}

/* =========================================
   CHART CARD
========================================= */

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
}

/* =========================================
   EMPTY CHART
========================================= */

function ChartEmptyState() {
  return (
    <div className="flex h-[320px] flex-col items-center justify-center text-center">
      <BarChart3
        size={38}
        className="text-slate-300"
      />

      <h3 className="mt-4 font-bold text-slate-700">
        No Analytics Data
      </h3>

      <p className="mt-1 max-w-xs text-sm text-slate-500">
        Campaign submission data will appear here when workers begin completing tasks.
      </p>
    </div>
  );
}

/* =========================================
   DETAIL METRIC
========================================= */

function DetailMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}