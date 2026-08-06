"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* =========================================
   TYPES
========================================= */

type SubmissionStatus =
  | "pending"
  | "approved"
  | "rejected";

type Campaign = {
  id: string;
  title: string;
  advertiser_id: string;
};

type CampaignTask = {
  id: string;
  title: string | null;
  campaign_id: string;
  campaigns: Campaign | Campaign[] | null;
};

type Submission = {
  id: string;
  task_id: string;
  worker_id: string;

  proof_url: string | null;
  proof_note: string | null;

  status: SubmissionStatus;

  reward_amount: number;

  reviewed_by: string | null;
  review_note: string | null;
  reviewed_at: string | null;

  created_at: string;
  updated_at: string;

  campaign_tasks:
    | CampaignTask
    | CampaignTask[]
    | null;
};

/* =========================================
   CONSTANTS
========================================= */

const ITEMS_PER_PAGE = 10;

/* =========================================
   PAGE
========================================= */

export default function AdvertiserTaskSubmissionsPage() {
  const router = useRouter();

  const [submissions, setSubmissions] =
    useState<Submission[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [searchQuery, setSearchQuery] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [campaignFilter, setCampaignFilter] =
    useState("all");

  const [currentPage, setCurrentPage] =
    useState(1);

  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);

  const [reviewing, setReviewing] =
    useState(false);

  const [rejectionReason, setRejectionReason] =
    useState("");

  const [showRejectBox, setShowRejectBox] =
    useState(false);

  const [successMessage, setSuccessMessage] =
    useState("");

  /* =========================================
     NORMALIZE RELATION DATA
  ========================================= */

  const getTask = (
    submission: Submission
  ): CampaignTask | null => {
    const task =
      submission.campaign_tasks;

    if (!task) {
      return null;
    }

    return Array.isArray(task)
      ? task[0] || null
      : task;
  };

  const getCampaign = (
    submission: Submission
  ): Campaign | null => {
    const task = getTask(submission);

    if (!task?.campaigns) {
      return null;
    }

    return Array.isArray(
      task.campaigns
    )
      ? task.campaigns[0] || null
      : task.campaigns;
  };

  /* =========================================
     LOAD SUBMISSIONS
  ========================================= */

  const loadSubmissions =
    useCallback(async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const {
          data: {
            user,
          },
          error: authError,
        } =
          await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          router.replace("/login");
          return;
        }

        /*
          Correct relationship:

          task_submissions
              ↓
          campaign_tasks
              ↓
          campaigns
        */

        const {
          data,
          error,
        } = await supabase
          .from("task_submissions")
          .select(`
            id,
            task_id,
            worker_id,
            proof_url,
            proof_note,
            status,
            reward_amount,
            reviewed_by,
            review_note,
            reviewed_at,
            created_at,
            updated_at,

            campaign_tasks (
              id,
              title,
              campaign_id,

              campaigns (
                id,
                title,
                advertiser_id
              )
            )
          `)
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (error) {
          throw error;
        }

        const typedData =
          (data ||
            []) as Submission[];

        /*
          Only show submissions
          belonging to campaigns
          owned by this advertiser.
        */

        const advertiserSubmissions =
          typedData.filter(
            (
              submission
            ) => {
              const task =
                Array.isArray(
                  submission.campaign_tasks
                )
                  ? submission
                      .campaign_tasks[0]
                  : submission
                      .campaign_tasks;

              if (
                !task
              ) {
                return false;
              }

              const campaign =
                Array.isArray(
                  task.campaigns
                )
                  ? task
                      .campaigns[0]
                  : task
                      .campaigns;

              return (
                campaign
                  ?.advertiser_id ===
                user.id
              );
            }
          );

        setSubmissions(
          advertiserSubmissions
        );
      } catch (
        error: unknown
      ) {
        console.error(
          "Submission loading error:",
          error
        );

        setErrorMessage(
          error instanceof
          Error
            ? error.message
            : "Unable to load task submissions."
        );
      } finally {
        setLoading(false);
      }
    }, [
      router,
    ]);

  /* =========================================
     LOAD ON PAGE OPEN
  ========================================= */

  useEffect(() => {
    loadSubmissions();
  }, [
    loadSubmissions,
  ]);

  /* =========================================
     CAMPAIGN OPTIONS
  ========================================= */

  const campaigns =
    useMemo(() => {
      const campaignMap =
        new Map<
          string,
          Campaign
        >();

      submissions.forEach(
        (
          submission
        ) => {
          const campaign =
            getCampaign(
              submission
            );

          if (
            campaign
          ) {
            campaignMap.set(
              campaign.id,
              campaign
            );
          }
        }
      );

      return Array.from(
        campaignMap.values()
      );
    }, [
      submissions,
    ]);

  /* =========================================
     FILTER SUBMISSIONS
  ========================================= */

  const filteredSubmissions =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      return submissions.filter(
        (
          submission
        ) => {
          const campaign =
            getCampaign(
              submission
            );

          const task =
            getTask(
              submission
            );

          const campaignTitle =
            campaign?.title
              ?.toLowerCase() ||
            "";

          const taskTitle =
            task?.title
              ?.toLowerCase() ||
            "";

          const workerId =
            submission.worker_id
              .toLowerCase();

          const matchesSearch =
            !query ||
            campaignTitle.includes(
              query
            ) ||
            taskTitle.includes(
              query
            ) ||
            workerId.includes(
              query
            ) ||
            submission.proof_note
              ?.toLowerCase()
              .includes(
                query
              );

          const matchesStatus =
            statusFilter ===
              "all" ||
            submission.status ===
              statusFilter;

          const matchesCampaign =
            campaignFilter ===
              "all" ||
            campaign?.id ===
              campaignFilter;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesCampaign
          );
        }
      );
    }, [
      submissions,
      searchQuery,
      statusFilter,
      campaignFilter,
    ]);

  /* =========================================
     SUMMARY
  ========================================= */

  const summary = useMemo(
    () => ({
      total:
        submissions.length,

      pending:
        submissions.filter(
          (
            item
          ) =>
            item.status ===
            "pending"
        ).length,

      approved:
        submissions.filter(
          (
            item
          ) =>
            item.status ===
            "approved"
        ).length,

      rejected:
        submissions.filter(
          (
            item
          ) =>
            item.status ===
            "rejected"
        ).length,
    }),
    [
      submissions,
    ]
  );

  /* =========================================
     PAGINATION
  ========================================= */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredSubmissions.length /
          ITEMS_PER_PAGE
      )
    );

  const safePage =
    Math.min(
      currentPage,
      totalPages
    );

  const paginatedSubmissions =
    filteredSubmissions.slice(
      (
        safePage -
        1
      ) *
        ITEMS_PER_PAGE,
      safePage *
        ITEMS_PER_PAGE
    );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    statusFilter,
    campaignFilter,
  ]);

  /* =========================================
     REVIEW SUBMISSION
  ========================================= */

  const updateSubmissionStatus =
    async (
      status:
        | "approved"
        | "rejected"
    ) => {
      if (
        !selectedSubmission
      ) {
        return;
      }

      if (
        status ===
          "rejected" &&
        !rejectionReason.trim()
      ) {
        return;
      }

      try {
        setReviewing(
          true
        );

        setSuccessMessage(
          ""
        );

        const {
          data: {
            user,
          },
          error: authError,
        } =
          await supabase.auth.getUser();

        if (
          authError
        ) {
          throw authError;
        }

        if (
          !user
        ) {
          router.replace(
            "/login"
          );
          return;
        }

        /*
          Update the
          selected submission.
        */

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "task_submissions"
            )
            .update({
              status,

              reviewed_by:
                user.id,

              review_note:
                status ===
                "rejected"
                  ? rejectionReason.trim()
                  : null,

              reviewed_at:
                new Date()
                  .toISOString(),

              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              "id",
              selectedSubmission.id
            )
            .select()
            .single();

        if (
          error
        ) {
          throw error;
        }

        setSubmissions(
          (
            current
          ) =>
            current.map(
              (
                submission
              ) =>
                submission.id ===
                selectedSubmission.id
                  ? {
                      ...submission,

                      status:
                        data.status,

                      reviewed_by:
                        data.reviewed_by,

                      review_note:
                        data.review_note,

                      reviewed_at:
                        data.reviewed_at,

                      updated_at:
                        data.updated_at,
                    }
                  : submission
            )
        );

        setSelectedSubmission(
          (
            current
          ) =>
            current
              ? {
                  ...current,

                  status:
                    data.status,

                  reviewed_by:
                    data.reviewed_by,

                  review_note:
                    data.review_note,

                  reviewed_at:
                    data.reviewed_at,

                  updated_at:
                    data.updated_at,
                }
              : null
        );

        setSuccessMessage(
          status ===
            "approved"
            ? "Submission approved successfully."
            : "Submission rejected successfully."
        );

        setShowRejectBox(
          false
        );

        setRejectionReason(
          ""
        );

        window.setTimeout(
          () => {
            setSelectedSubmission(
              null
            );

            setSuccessMessage(
              ""
            );
          },
          1200
        );
      } catch (
        error: unknown
      ) {
        console.error(
          "Submission review error:",
          error
        );

        alert(
          error instanceof
            Error
            ? error.message
            : "Unable to update this submission."
        );
      } finally {
        setReviewing(
          false
        );
      }
    };

  /* =========================================
     HELPERS
  ========================================= */

  const formatDate = (
    value:
      | string
      | null
  ) => {
    if (
      !value
    ) {
      return (
        "Not available"
      );
    }

    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return (
        "Invalid date"
      );
    }

    return new Intl.DateTimeFormat(
      "en-NG",
      {
        dateStyle:
          "medium",
        timeStyle:
          "short",
      }
    ).format(
      date
    );
  };

  const getStatusStyle = (
    status:
      SubmissionStatus
  ) => {
    switch (
      status
    ) {
      case "approved":
        return "border-emerald-200 bg-emerald-100 text-emerald-700";

      case "rejected":
        return "border-red-200 bg-red-100 text-red-700";

      default:
        return "border-amber-200 bg-amber-100 text-amber-700";
    }
  };

  /* =========================================
     LOADING
  ========================================= */

  if (
    loading
  ) {
    return (
      <main className="min-h-[70vh] p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" />

            <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-slate-100" />
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {[
              1,
              2,
              3,
              4,
            ].map(
              (
                item
              ) => (
                <div
                  key={
                    item
                  }
                  className="h-32 animate-pulse rounded-3xl border border-slate-200 bg-slate-100"
                />
              )
            )}
          </div>

          <div className="mt-8 h-96 animate-pulse rounded-3xl border border-slate-200 bg-slate-100" />
        </div>
      </main>
    );
  }

  /* =========================================
     ERROR
  ========================================= */

  if (
    errorMessage
  ) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertCircle
              size={
                32
              }
              className="text-red-600"
            />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-red-950">
            Unable to Load
            Submissions
          </h1>

          <p className="mt-3 text-sm leading-6 text-red-700">
            {
              errorMessage
            }
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={
                loadSubmissions
              }
              className="rounded-xl bg-[#0b3939] px-6 py-3 text-sm font-semibold text-white"
            >
              Try Again
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/advertiser/dashboard"
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700"
            >
              Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* =========================================
     PAGE
  ========================================= */

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* HEADER */}

      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <button
            type="button"
            onClick={() =>
              router.push(
                "/advertiser/dashboard/campaigns"
              )
            }
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0b3939]"
          >
            <ArrowLeft
              size={
                18
              }
            />

            Back to Campaigns
          </button>

          <h1 className="text-3xl font-bold text-slate-900">
            Task
            Submissions
          </h1>

          <p className="mt-2 max-w-2xl leading-7 text-slate-500">
            Review worker
            submissions,
            verify proof,
            and approve or
            reject completed
            campaign tasks.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-[#0b3939]/15 bg-[#0b3939]/5 px-5 py-4">
          <ShieldCheck
            size={
              22
            }
            className="text-[#0b3939]"
          />

          <p className="text-sm font-medium text-[#0b3939]">
            Only your
            campaign
            submissions are
            displayed.
          </p>
        </div>
      </div>

      {/* SUMMARY */}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Submissions"
          value={
            summary.total
          }
          icon={
            <ClipboardCheck
              size={
                25
              }
            />
          }
          iconClass="bg-[#0b3939]/10 text-[#0b3939]"
        />

        <SummaryCard
          title="Pending Review"
          value={
            summary.pending
          }
          icon={
            <Clock3
              size={
                25
              }
            />
          }
          iconClass="bg-amber-100 text-amber-700"
        />

        <SummaryCard
          title="Approved"
          value={
            summary.approved
          }
          icon={
            <CheckCircle2
              size={
                25
              }
            />
          }
          iconClass="bg-emerald-100 text-emerald-700"
        />

        <SummaryCard
          title="Rejected"
          value={
            summary.rejected
          }
          icon={
            <XCircle
              size={
                25
              }
            />
          }
          iconClass="bg-red-100 text-red-700"
        />
      </div>

      {/* FILTERS */}

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_200px]">
          <div className="relative">
            <Search
              size={
                20
              }
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={
                searchQuery
              }
              onChange={(
                event
              ) =>
                setSearchQuery(
                  event
                    .target
                    .value
                )
              }
              placeholder="Search campaign, task, worker ID, or note..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 text-sm outline-none transition focus:border-[#0b3939]"
            />
          </div>

          <select
            value={
              campaignFilter
            }
            onChange={(
              event
            ) =>
              setCampaignFilter(
                event
                  .target
                  .value
              )
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0b3939]"
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

          <select
            value={
              statusFilter
            }
            onChange={(
              event
            ) =>
              setStatusFilter(
                event
                  .target
                  .value
              )
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0b3939]"
          >
            <option value="all">
              All Statuses
            </option>

            <option value="pending">
              Pending
            </option>

            <option value="approved">
              Approved
            </option>

            <option value="rejected">
              Rejected
            </option>
          </select>
        </div>
      </section>

      {/* TABLE */}

      <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        {paginatedSubmissions.length ===
        0 ? (
          <div className="flex min-h-[350px] flex-col items-center justify-center p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0b3939]/10">
              <ClipboardCheck
                size={
                  38
                }
                className="text-[#0b3939]"
              />
            </div>

            <h2 className="mt-6 text-xl font-bold text-slate-900">
              No Submissions
              Found
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              There are no task
              submissions matching
              your current
              filters.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px]">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <TableHeader>
                      Worker
                    </TableHeader>

                    <TableHeader>
                      Campaign
                    </TableHeader>

                    <TableHeader>
                      Task
                    </TableHeader>

                    <TableHeader>
                      Submitted
                    </TableHeader>

                    <TableHeader>
                      Status
                    </TableHeader>

                    <TableHeader>
                      Actions
                    </TableHeader>
                  </tr>
                </thead>

                <tbody>
                  {paginatedSubmissions.map(
                    (
                      submission
                    ) => {
                      const campaign =
                        getCampaign(
                          submission
                        );

                      const task =
                        getTask(
                          submission
                        );

                      return (
                        <tr
                          key={
                            submission.id
                          }
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="px-6 py-5">
                            <p className="max-w-[180px] truncate text-sm font-semibold text-slate-800">
                              {
                                submission.worker_id
                              }
                            </p>
                          </td>

                          <td className="px-6 py-5">
                            <p className="font-semibold text-slate-800">
                              {
                                campaign?.title ||
                                "Unknown Campaign"
                              }
                            </p>
                          </td>

                          <td className="px-6 py-5">
                            <p className="text-sm text-slate-600">
                              {
                                task?.title ||
                                "Campaign Task"
                              }
                            </p>
                          </td>

                          <td className="px-6 py-5">
                            <p className="text-sm text-slate-600">
                              {formatDate(
                                submission.created_at
                              )}
                            </p>
                          </td>

                          <td className="px-6 py-5">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold capitalize ${getStatusStyle(
                                submission.status
                              )}`}
                            >
                              {
                                submission.status
                              }
                            </span>
                          </td>

                          <td className="px-6 py-5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSubmission(
                                  submission
                                );

                                setShowRejectBox(
                                  false
                                );

                                setRejectionReason(
                                  ""
                                );
                              }}
                              className="inline-flex items-center gap-2 rounded-xl border border-[#0b3939]/20 px-4 py-2 text-sm font-semibold text-[#0b3939] transition hover:bg-[#0b3939]/5"
                            >
                              <Eye
                                size={
                                  17
                                }
                              />

                              View
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}

            <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing{" "}
                {
                  filteredSubmissions.length ===
                  0
                    ? 0
                    : (
                        safePage -
                        1
                      ) *
                        ITEMS_PER_PAGE +
                      1
                }
                {" "}–
                {Math.min(
                  safePage *
                    ITEMS_PER_PAGE,
                  filteredSubmissions.length
                )}
                {" "}of{" "}
                {
                  filteredSubmissions.length
                }
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={
                    safePage ===
                    1
                  }
                  onClick={() =>
                    setCurrentPage(
                      (
                        page
                      ) =>
                        Math.max(
                          1,
                          page -
                            1
                        )
                    )
                  }
                  className="rounded-xl border border-slate-200 p-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft
                    size={
                      19
                    }
                  />
                </button>

                <span className="px-3 text-sm font-semibold">
                  Page{" "}
                  {
                    safePage
                  }
                  {" "}of{" "}
                  {
                    totalPages
                  }
                </span>

                <button
                  type="button"
                  disabled={
                    safePage ===
                    totalPages
                  }
                  onClick={() =>
                    setCurrentPage(
                      (
                        page
                      ) =>
                        Math.min(
                          totalPages,
                          page +
                            1
                        )
                    )
                  }
                  className="rounded-xl border border-slate-200 p-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight
                    size={
                      19
                    }
                  />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* DETAILS MODAL */}

      {selectedSubmission && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-7 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Submission
                  Details
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Review the
                  worker’s proof
                  before making a
                  decision.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedSubmission(
                    null
                  )
                }
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X
                  size={
                    22
                  }
                />
              </button>
            </div>

            <div className="space-y-6 p-7">
              {successMessage && (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                  <CheckCircle2
                    size={
                      22
                    }
                  />

                  <p className="text-sm font-semibold">
                    {
                      successMessage
                    }
                  </p>
                </div>
              )}

              {/* CAMPAIGN */}

              <div className="grid gap-4 md:grid-cols-2">
                <InfoBox
                  label="Campaign"
                  value={
                    getCampaign(
                      selectedSubmission
                    )?.title ||
                    "Unknown Campaign"
                  }
                />

                <InfoBox
                  label="Task"
                  value={
                    getTask(
                      selectedSubmission
                    )?.title ||
                    "Campaign Task"
                  }
                />

                <InfoBox
                  label="Worker ID"
                  value={
                    selectedSubmission.worker_id
                  }
                />

                <InfoBox
                  label="Submission Date"
                  value={formatDate(
                    selectedSubmission.created_at
                  )}
                />
              </div>

              {/* PROOF */}

              <div>
                <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-900">
                  <FileText
                    size={
                      20
                    }
                    className="text-[#0b3939]"
                  />

                  Submitted Proof
                </h3>

                {selectedSubmission.proof_url ? (
                  <a
                    href={
                      selectedSubmission.proof_url
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-2xl border border-[#0b3939]/15 bg-[#0b3939]/5 p-5 text-sm font-semibold text-[#0b3939]"
                  >
                    Open Submitted
                    Proof

                    <ExternalLink
                      size={
                        19
                      }
                    />
                  </a>
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
                    No proof file
                    was attached.
                  </div>
                )}
              </div>

              {/* NOTE */}

              <div>
                <h3 className="mb-3 font-bold text-slate-900">
                  Worker Note
                </h3>

                <div className="min-h-28 whitespace-pre-line rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-600">
                  {selectedSubmission.proof_note ||
                    "No additional note was provided."}
                </div>
              </div>

              {/* REJECTION */}

              {showRejectBox && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                  <label className="mb-2 block text-sm font-bold text-red-900">
                    Rejection
                    Reason
                  </label>

                  <textarea
                    value={
                      rejectionReason
                    }
                    onChange={(
                      event
                    ) =>
                      setRejectionReason(
                        event
                          .target
                          .value
                      )
                    }
                    rows={
                      4
                    }
                    placeholder="Explain why this submission is being rejected..."
                    className="w-full resize-none rounded-xl border border-red-200 bg-white p-4 text-sm outline-none focus:border-red-500"
                  />
                </div>
              )}

              {/* REVIEW NOTE */}

              {selectedSubmission.review_note && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="font-bold">
                    Review Note
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {
                      selectedSubmission.review_note
                    }
                  </p>
                </div>
              )}
            </div>

            {/* ACTIONS */}

            {selectedSubmission.status ===
              "pending" && (
              <div className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-white p-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={
                    reviewing
                  }
                  onClick={() => {
                    if (
                      showRejectBox
                    ) {
                      updateSubmissionStatus(
                        "rejected"
                      );
                    } else {
                      setShowRejectBox(
                        true
                      );
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-6 py-3 text-sm font-semibold text-red-700 disabled:opacity-50"
                >
                  {reviewing &&
                  showRejectBox ? (
                    <Loader2
                      size={
                        18
                      }
                      className="animate-spin"
                    />
                  ) : (
                    <XCircle
                      size={
                        18
                      }
                    />
                  )}

                  {showRejectBox
                    ? "Confirm Rejection"
                    : "Reject"}
                </button>

                <button
                  type="button"
                  disabled={
                    reviewing
                  }
                  onClick={() =>
                    updateSubmissionStatus(
                      "approved"
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b3939] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {reviewing &&
                  !showRejectBox ? (
                    <Loader2
                      size={
                        18
                      }
                      className="animate-spin"
                    />
                  ) : (
                    <Check
                      size={
                        18
                      }
                    />
                  )}

                  Approve
                  Submission
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

/* =========================================
   REUSABLE COMPONENTS
========================================= */

function SummaryCard({
  title,
  value,
  icon,
  iconClass,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <h2 className="mt-3 text-3xl font-bold text-slate-900">
            {value}
          </h2>
        </div>

        <div
          className={`flex h-13 w-13 items-center justify-center rounded-2xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </section>
  );
}

function TableHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}