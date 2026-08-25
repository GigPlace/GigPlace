"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  Info,
  Loader2,
  AlertCircle,
  Gift,
  Banknote,
  ClipboardCheck,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type NotificationType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "reward"
  | "withdrawal"
  | "submission";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  link: string | null;
  is_read: boolean;
  for_role: "user" | "advertiser" | "all";
  created_at: string;
};

const typeConfig: Record<
  NotificationType,
  { icon: any; color: string; bg: string }
> = {
  info: { icon: Info, color: "text-blue-600", bg: "bg-blue-50" },
  success: { icon: Check, color: "text-emerald-600", bg: "bg-emerald-50" },
  warning: { icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
  error: { icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
  reward: { icon: Gift, color: "text-purple-600", bg: "bg-purple-50" },
  withdrawal: { icon: Banknote, color: "text-emerald-600", bg: "bg-emerald-50" },
  submission: {
    icon: ClipboardCheck,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
};

const formatDate = (date: string) => {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const ROLE = "user"; // ← Worker / User dashboard

  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in.");
        return;
      }

      // Only notifications for this role (or "all")
      const { data, error: fetchError } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .in("for_role", [ROLE, "all"])
        .order("created_at", { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      setNotifications(data || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Real-time
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let isMounted = true;

    const setupRealtime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !isMounted) return;

      channel = supabase
        .channel(`notifications-user-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            if (isMounted) loadNotifications(true);
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadNotifications]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    }
  };

  const markAllAsRead = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .in("for_role", [ROLE, "all"])
      .eq("is_read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);

    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0b3939]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            Stay updated with your tasks, rewards and withdrawals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadNotifications(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0b3939] px-4 py-2 text-sm font-medium text-white hover:bg-[#062b2b]"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            filter === "all"
              ? "bg-[#0b3939] text-white"
              : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            filter === "unread"
              ? "bg-[#0b3939] text-white"
              : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          Unread {unreadCount > 0 && `(${unreadCount})`}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {filteredNotifications.length === 0 ? (
          <div className="py-20 text-center">
            <Bell className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 font-semibold text-slate-700">
              {filter === "unread"
                ? "No unread notifications"
                : "No notifications yet"}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              We’ll notify you about important updates here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredNotifications.map((notification) => {
              const config = typeConfig[notification.type] || typeConfig.info;
              const Icon = config.icon;

              return (
                <div
                  key={notification.id}
                  className={`flex gap-4 px-5 py-4 transition hover:bg-slate-50 ${
                    !notification.is_read ? "bg-slate-50/70" : ""
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.bg}`}
                  >
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className={`text-sm font-semibold ${
                            notification.is_read
                              ? "text-slate-700"
                              : "text-slate-900"
                          }`}
                        >
                          {notification.title}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-600">
                          {notification.message}
                        </p>
                        <p className="mt-1.5 text-xs text-slate-400">
                          {formatDate(notification.created_at)}
                        </p>
                      </div>

                      {!notification.is_read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#0b3939]" />
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      {notification.link && (
                        <Link
                          href={notification.link}
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs font-semibold text-[#0b3939] hover:underline"
                        >
                          View details →
                        </Link>
                      )}

                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs font-medium text-slate-500 hover:text-slate-700"
                        >
                          Mark as read
                        </button>
                      )}

                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-xs font-medium text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}