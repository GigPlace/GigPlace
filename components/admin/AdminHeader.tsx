"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  Bell,
  CheckCircle2,
  Clock3,
  CreditCard,
  Menu,
  Megaphone,
  RefreshCw,
  Wallet,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type NotificationType =
  | "campaign"
  | "task"
  | "submission"
  | "transaction"
  | "wallet";

type AdminNotification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  href: string;
};

type AdminHeaderProps = {
  onMenuClick: () => void;
  firstName: string;
};

export default function AdminHeader({
  onMenuClick,
  firstName,
}: AdminHeaderProps) {
  const [notifications, setNotifications] =
    useState<AdminNotification[]>([]);

  const [isNotificationOpen, setIsNotificationOpen] =
    useState(false);

  const [loadingNotifications, setLoadingNotifications] =
    useState(true);

  const notificationRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();

    const interval = setInterval(
      () => {
        loadNotifications();
      },
      30000
    );

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(
          event.target as Node
        )
      ) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const loadNotifications =
    async () => {
      setLoadingNotifications(true);

      try {
        const [
          campaignsResult,
          tasksResult,
          submissionsResult,
          transactionsResult,
          walletsResult,
        ] = await Promise.all([
          supabase
            .from("campaigns")
            .select(`
              id,
              title,
              status,
              created_at
            `)
            .order(
              "created_at",
              {
                ascending: false,
              }
            )
            .limit(5),

          supabase
            .from("campaign_tasks")
            .select(`
              id,
              title,
              campaign_id,
              status,
              created_at
            `)
            .order(
              "created_at",
              {
                ascending: false,
              }
            )
            .limit(5),

          supabase
            .from("task_submissions")
            .select(`
              id,
              task_id,
              status,
              reward_amount,
              created_at
            `)
            .order(
              "created_at",
              {
                ascending: false,
              }
            )
            .limit(5),

          supabase
            .from("transactions")
            .select(`
              id,
              transaction_type,
              amount,
              direction,
              status,
              description,
              created_at
            `)
            .order(
              "created_at",
              {
                ascending: false,
              }
            )
            .limit(5),

          supabase
            .from("wallets")
            .select(`
              id,
              user_id,
              available_balance,
              pending_balance,
              updated_at
            `)
            .order(
              "updated_at",
              {
                ascending: false,
              }
            )
            .limit(5),
        ]);

        const errors = [
          campaignsResult.error,
          tasksResult.error,
          submissionsResult.error,
          transactionsResult.error,
          walletsResult.error,
        ].filter(Boolean);

        if (errors.length > 0) {
          console.error(
            "Notification errors:",
            errors
          );
        }

        const campaignNotifications:
          AdminNotification[] =
          (campaignsResult.data || []).map(
            (campaign) => ({
              id: `campaign-${campaign.id}`,
              title:
                campaign.status ===
                "pending"
                  ? "Campaign awaiting approval"
                  : "New campaign activity",

              message: `${
                campaign.title ||
                "Untitled campaign"
              } is ${
                campaign.status ||
                "pending"
              }.`,

              type: "campaign",

              createdAt:
                campaign.created_at,

              href:
                "/admin/dashboard/campaigns",
            })
          );

        const taskNotifications:
          AdminNotification[] =
          (tasksResult.data || []).map(
            (task) => ({
              id: `task-${task.id}`,

              title:
                "New campaign task",

              message: `${
                task.title
              } was added to a campaign.`,

              type: "task",

              createdAt:
                task.created_at,

              href:
                "/admin/dashboard/tasks",
            })
          );

        const submissionNotifications:
          AdminNotification[] =
          (
            submissionsResult.data ||
            []
          ).map(
            (submission) => ({
              id: `submission-${submission.id}`,

              title:
                submission.status ===
                "pending"
                  ? "Task submission needs review"
                  : "Task submission updated",

              message:
                submission.status ===
                "pending"
                  ? `A worker submitted proof for review. Reward: ₦${Number(
                      submission.reward_amount
                    ).toLocaleString()}`
                  : `A task submission was marked as ${submission.status}.`,

              type:
                "submission",

              createdAt:
                submission.created_at,

              href:
                "/admin/dashboard/submissions",
            })
          );

        const transactionNotifications:
          AdminNotification[] =
          (
            transactionsResult.data ||
            []
          ).map(
            (transaction) => ({
              id: `transaction-${transaction.id}`,

              title:
                transaction.transaction_type ===
                "campaign_funding"
                  ? "Campaign funded"
                  : "New transaction",

              message:
                transaction.description ||
                `${transaction.direction} transaction of ₦${Number(
                  transaction.amount
                ).toLocaleString()}`,

              type:
                "transaction",

              createdAt:
                transaction.created_at,

              href:
                "/admin/dashboard/transactions",
            })
          );

        const walletNotifications:
          AdminNotification[] =
          (
            walletsResult.data ||
            []
          ).map(
            (wallet) => ({
              id: `wallet-${wallet.id}`,

              title:
                "Wallet updated",

              message: `Available balance: ₦${Number(
                wallet.available_balance
              ).toLocaleString()}`,

              type:
                "wallet",

              createdAt:
                wallet.updated_at,

              href:
                "/admin/dashboard/wallet",
            })
          );

        const allNotifications = [
          ...campaignNotifications,
          ...taskNotifications,
          ...submissionNotifications,
          ...transactionNotifications,
          ...walletNotifications,
        ]
          .sort(
            (a, b) =>
              new Date(
                b.createdAt
              ).getTime() -
              new Date(
                a.createdAt
              ).getTime()
          )
          .slice(0, 15);

        setNotifications(
          allNotifications
        );
      } catch (error) {
        console.error(
          "Unable to load admin notifications:",
          error
        );
      } finally {
        setLoadingNotifications(
          false
        );
      }
    };

  const formatTime = (
    date: string
  ) => {
    const notificationDate =
      new Date(date);

    const difference =
      Date.now() -
      notificationDate.getTime();

    const minutes =
      Math.floor(
        difference /
          60000
      );

    if (minutes < 1) {
      return "Just now";
    }

    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours =
      Math.floor(
        minutes / 60
      );

    if (hours < 24) {
      return `${hours}h ago`;
    }

    const days =
      Math.floor(
        hours / 24
      );

    return `${days}d ago`;
  };

  const getNotificationIcon = (
    type: NotificationType
  ) => {
    const iconClass =
      "h-4 w-4";

    switch (type) {
      case "campaign":
        return (
          <Megaphone
            className={
              iconClass
            }
          />
        );

      case "task":
        return (
          <CheckCircle2
            className={
              iconClass
            }
          />
        );

      case "submission":
        return (
          <Clock3
            className={
              iconClass
            }
          />
        );

      case "transaction":
        return (
          <CreditCard
            className={
              iconClass
            }
          />
        );

      case "wallet":
        return (
          <Wallet
            className={
              iconClass
            }
          />
        );
    }
  };

  const getIconStyle = (
    type: NotificationType
  ) => {
    switch (type) {
      case "campaign":
        return "bg-blue-50 text-blue-600";

      case "task":
        return "bg-violet-50 text-violet-600";

      case "submission":
        return "bg-amber-50 text-amber-600";

      case "transaction":
        return "bg-emerald-50 text-emerald-600";

      case "wallet":
        return "bg-cyan-50 text-cyan-600";
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-[72px] items-center justify-between px-5 lg:px-9">

        {/* Left */}
        <div className="flex items-center gap-4">

          <button
            type="button"
            onClick={
              onMenuClick
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 lg:hidden"
            aria-label="Open admin menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div>
            <p className="text-xs font-medium text-slate-400">
              Welcome back
            </p>

            <h2 className="text-base font-bold text-slate-900">
              {firstName}
            </h2>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">

          <div
            ref={
              notificationRef
            }
            className="relative"
          >

            <button
              type="button"
              onClick={() =>
                setIsNotificationOpen(
                  (
                    previous
                  ) =>
                    !previous
                )
              }
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              aria-label="Open notifications"
            >
              <Bell className="h-5 w-5" />

              {notifications.length >
                0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {notifications.length >
                  99
                    ? "99+"
                    : notifications.length}
                </span>
              )}
            </button>

            {isNotificationOpen && (
              <div className="absolute right-0 top-12 z-50 w-[calc(100vw-2.5rem)] max-w-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

                {/* Notification Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

                  <div>
                    <h3 className="font-bold text-slate-900">
                      Notifications
                    </h3>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Recent platform
                      activity
                    </p>
                  </div>

                  <div className="flex items-center gap-2">

                    <button
                      type="button"
                      onClick={() =>
                        loadNotifications()
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                      aria-label="Refresh notifications"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setIsNotificationOpen(
                          false
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                      aria-label="Close notifications"
                    >
                      <X className="h-4 w-4" />
                    </button>

                  </div>
                </div>

                {/* Notification List */}
                <div className="max-h-[460px] overflow-y-auto">

                  {loadingNotifications ? (
                    <div className="flex items-center justify-center py-16">

                      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#0b3939]/20 border-t-[#0b3939]" />

                    </div>
                  ) : notifications.length ===
                    0 ? (
                    <div className="px-6 py-14 text-center">

                      <Bell className="mx-auto h-10 w-10 text-slate-300" />

                      <h4 className="mt-4 font-semibold text-slate-700">
                        No notifications
                      </h4>

                      <p className="mt-1 text-sm text-slate-500">
                        New platform
                        activity will appear
                        here.
                      </p>

                    </div>
                  ) : (
                    notifications.map(
                      (
                        notification
                      ) => (
                        <Link
                          key={
                            notification.id
                          }
                          href={
                            notification.href
                          }
                          onClick={() =>
                            setIsNotificationOpen(
                              false
                            )
                          }
                          className="flex gap-3 border-b border-slate-100 px-5 py-4 transition hover:bg-slate-50 last:border-b-0"
                        >

                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${getIconStyle(
                              notification.type
                            )}`}
                          >
                            {getNotificationIcon(
                              notification.type
                            )}
                          </div>

                          <div className="min-w-0 flex-1">

                            <div className="flex items-start justify-between gap-3">

                              <p className="text-sm font-semibold text-slate-800">
                                {
                                  notification.title
                                }
                              </p>

                              <span className="shrink-0 text-[11px] text-slate-400">
                                {formatTime(
                                  notification.createdAt
                                )}
                              </span>

                            </div>

                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                              {
                                notification.message
                              }
                            </p>

                          </div>

                        </Link>
                      )
                    )
                  )}

                </div>

                {/* Footer */}
                <Link
                  href="/admin/dashboard/notifications"
                  onClick={() =>
                    setIsNotificationOpen(
                      false
                    )
                  }
                  className="block border-t border-slate-100 px-5 py-3 text-center text-sm font-semibold text-[#0b3939] transition hover:bg-slate-50"
                >
                  View all notifications
                </Link>

              </div>
            )}

          </div>

          {/* Admin Avatar */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0b3939] text-sm font-bold text-white">
            {firstName
              ?.charAt(0)
              .toUpperCase() ||
              "A"}
          </div>

        </div>
      </div>
    </header>
  );
}