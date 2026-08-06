"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Menu } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AdvertiserHeaderProps = {
  onMenuClick: () => void;
  firstName?: string;
};

export default function AdvertiserHeader({
  onMenuClick,
  firstName = "Advertiser",
}: AdvertiserHeaderProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchUnreadCount = useCallback(async (uid: string) => {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", uid)
      .eq("is_read", false);

    if (error) {
      console.error("Unread count error:", error);
      return;
    }

    setUnreadCount(count ?? 0);
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setUserId(user.id);
      await fetchUnreadCount(user.id);

      // Realtime: INSERT / UPDATE / DELETE for this advertiser only
      channel = supabase
        .channel(`header-notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // Re-fetch count on any change (simple + accurate)
            void fetchUnreadCount(user.id);
          }
        )
        .subscribe();
    };

    void init();

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [fetchUnreadCount]);

  const badgeLabel =
    unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur lg:px-9">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
          aria-label="Open advertiser menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#172554]">
            Advertiser Workspace
          </p>
          <h1 className="mt-1 text-lg font-bold text-slate-900">
            Welcome back, {firstName}
          </h1>
        </div>
      </div>

      <Link
        href="/advertiser/dashboard/notifications"
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
        aria-label={
          unreadCount > 0
            ? `Open notifications, ${unreadCount} unread`
            : "Open notifications"
        }
      >
        <Bell className="h-5 w-5" />

        {badgeLabel && (
          <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#0b3939] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {badgeLabel}
          </span>
        )}
      </Link>
    </header>
  );
}