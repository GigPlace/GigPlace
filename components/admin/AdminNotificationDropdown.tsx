"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminLayout } from "@/app/contexts/AdminLayoutContext";

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function timeAgo(dateStr: string) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminNotificationDropdown() {
  const { profile } = useAdminLayout();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [alert, setAlert] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, message, is_read, created_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(12);

      const rows = (data || []) as AdminNotification[];
      setItems(rows);
      setUnread(rows.filter((n) => !n.is_read).length);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(`admin-header-notifications:${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const row = payload.new as AdminNotification;
          setItems((prev) => [row, ...prev].slice(0, 12));
          setUnread((c) => c + (row.is_read ? 0 : 1));
          setAlert(row.title);
          window.setTimeout(() => setAlert(null), 3500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          void load();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile?.id, load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markAllRead = async () => {
    if (!profile?.id) return;
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", profile.id)
      .eq("is_read", false);
  };

  const badge = unread > 99 ? "99+" : unread > 0 ? String(unread) : null;

  return (
    <div className="relative" ref={rootRef}>
      {alert && (
        <div className="fixed bottom-4 left-1/2 z-[90] -translate-x-1/2 rounded-2xl bg-[#0b3939] px-4 py-2.5 text-sm text-white shadow-lg">
          {alert}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) void load();
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={18} />
        {badge && (
          <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#0b3939] px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(100vw-2rem,360px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold text-slate-900">Notifications</p>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={unread === 0}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0b3939] disabled:opacity-40"
            >
              <CheckCheck size={14} /> Mark all read
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-slate-400" size={22} />
              </div>
            )}
            {!loading && items.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-slate-400">
                No notifications yet.
              </p>
            )}
            {!loading &&
              items.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-slate-50 px-4 py-3 ${
                    !n.is_read ? "bg-[#0b3939]/[0.04]" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#0b3939]" />
                    )}
                    <div className={!n.is_read ? "" : "pl-4"}>
                      <p className="text-sm font-semibold text-slate-900">
                        {n.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                        {n.message}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <Link
            href="/admin/dashboard/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-semibold text-[#0b3939] hover:bg-slate-50"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}