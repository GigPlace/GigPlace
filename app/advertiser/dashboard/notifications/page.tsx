"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Loader2,
  Megaphone,
  MoreVertical,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Volume2,
  VolumeX,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* ========== TYPES ========== */

type NotificationType =
  | "campaign"
  | "task_submission"
  | "approved"
  | "rejected"
  | "payment"
  | "wallet"
  | "account"
  | "security"
  | "system"
  | "general"
  | "task";

type NotificationSource =
  | "notifications"
  | "campaigns"
  | "campaign_tasks"
  | "task_submissions"
  | "transactions"
  | "wallets";

interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  related_campaign_id: string | null;
  source: NotificationSource;
  source_record_id?: string;
  event_key?: string;
  for_role?: "user" | "advertiser" | "all";
  created_at: string;
  campaign?: { id: string; title: string } | null;
}

type FilterTab =
  | "all"
  | "unread"
  | "campaigns"
  | "task_submissions"
  | "payments"
  | "system";

type SortFilter = "all" | "unread" | "read" | "newest" | "oldest";

interface SoundSettings {
  soundEnabled: boolean;
  volume: number;
}

const SOUND_KEY = "gigplace_notification_sound";
const PAGE_SIZE = 30;
const ROLE = "advertiser"; // ← Advertiser dashboard only

/* ========== HELPERS ========== */

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function loadSoundSettings(): SoundSettings {
  if (typeof window === "undefined") {
    return { soundEnabled: true, volume: 0.6 };
  }
  try {
    const raw = localStorage.getItem(SOUND_KEY);
    if (!raw) return { soundEnabled: true, volume: 0.6 };
    const p = JSON.parse(raw) as SoundSettings;
    return {
      soundEnabled: Boolean(p.soundEnabled),
      volume: Math.min(1, Math.max(0, Number(p.volume) || 0.6)),
    };
  } catch {
    return { soundEnabled: true, volume: 0.6 };
  }
}

function saveSoundSettings(s: SoundSettings) {
  localStorage.setItem(SOUND_KEY, JSON.stringify(s));
}

function playTone(volume: number) {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o1.type = "sine";
    o2.type = "sine";
    o1.frequency.value = 880;
    o2.frequency.value = 1175;
    const v = Math.min(1, Math.max(0, volume)) * 0.15;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(v, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    o1.connect(gain);
    o2.connect(gain);
    gain.connect(ctx.destination);
    o1.start(now);
    o2.start(now);
    o1.stop(now + 0.4);
    o2.stop(now + 0.4);
    o1.onended = () => void ctx.close();
  } catch {
    /* ignore */
  }
}

function timeAgo(dateStr: string) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
  });
}

function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function getDateGroup(dateStr: string) {
  const date = startOfDay(new Date(dateStr));
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (date.getTime() === today.getTime()) return "Today";
  if (date.getTime() === yesterday.getTime()) return "Yesterday";
  if (date > weekAgo) return "Earlier This Week";
  return "Older";
}

function getIcon(type: string) {
  switch (type) {
    case "campaign":
    case "task":
      return Megaphone;
    case "task_submission":
      return ClipboardCheck;
    case "approved":
      return CheckCircle2;
    case "rejected":
      return XCircle;
    case "payment":
    case "wallet":
      return Wallet;
    case "account":
    case "security":
      return ShieldCheck;
    default:
      return Bell;
  }
}

function getTypeLabel(type: string) {
  const map: Record<string, string> = {
    campaign: "Campaign",
    task: "Campaign Task",
    task_submission: "Task Submission",
    approved: "Approved",
    rejected: "Rejected",
    payment: "Payment",
    wallet: "Wallet",
    system: "System",
    general: "General",
  };
  return map[type] || "Notification";
}

function matchesTab(n: AppNotification, tab: FilterTab) {
  switch (tab) {
    case "unread":
      return !n.is_read;
    case "campaigns":
      return n.type === "campaign" || n.type === "task";
    case "task_submissions":
      return (
        n.type === "task_submission" ||
        n.type === "approved" ||
        n.type === "rejected"
      );
    case "payments":
      return n.type === "payment" || n.type === "wallet";
    case "system":
      return ["system", "account", "security", "general"].includes(n.type);
    default:
      return true;
  }
}

function eventKey(
  source: NotificationSource,
  recordId: string,
  kind: string
) {
  return `${source}:${recordId}:${kind}`;
}

/* ========== PAGE ========== */

export default function AdvertiserNotificationsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [sortFilter, setSortFilter] = useState<SortFilter>("newest");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AppNotification | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [soundSettings, setSoundSettings] = useState<SoundSettings>({
    soundEnabled: true,
    volume: 0.6,
  });
  const [draftSound, setDraftSound] = useState<SoundSettings>({
    soundEnabled: true,
    volume: 0.6,
  });

  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [liveAlert, setLiveAlert] = useState<string | null>(null);

  const userInteracted = useRef(false);
  const offsetRef = useRef(0);
  const seenKeys = useRef(new Set<string>());
  const walletCache = useRef<{
    available_balance: number;
    pending_balance: number;
  } | null>(null);

  const showToast = useCallback(
    (type: "success" | "error", message: string) => {
      setToast({ type, message });
      window.setTimeout(() => setToast(null), 3000);
    },
    []
  );

  useEffect(() => {
    const mark = () => {
      userInteracted.current = true;
    };
    window.addEventListener("pointerdown", mark, { once: true });
    window.addEventListener("keydown", mark, { once: true });
    return () => {
      window.removeEventListener("pointerdown", mark);
      window.removeEventListener("keydown", mark);
    };
  }, []);

  useEffect(() => {
    setSoundSettings(loadSoundSettings());
  }, []);

  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [openMenuId]);

  /* ----- central live helper ----- */
  const addLiveNotification = useCallback(
    (n: AppNotification, opts?: { persist?: boolean; silent?: boolean }) => {
      const key =
        n.event_key ||
        eventKey(n.source, n.source_record_id || n.id, n.type);

      if (seenKeys.current.has(key)) return;
      seenKeys.current.add(key);

      setNotifications((prev) => {
        if (
          prev.some(
            (x) =>
              x.id === n.id ||
              (x.event_key && x.event_key === key) ||
              (x.source_record_id &&
                x.source_record_id === n.source_record_id &&
                x.type === n.type &&
                x.source === n.source)
          )
        ) {
          return prev;
        }
        return [{ ...n, event_key: key }, ...prev];
      });

      if (!opts?.silent) {
        setLiveAlert(n.title);
        window.setTimeout(() => setLiveAlert(null), 4000);
        const s = loadSoundSettings();
        if (s.soundEnabled && userInteracted.current) {
          playTone(s.volume);
        }
      }

      // Persist with advertiser role
      if (opts?.persist && userId) {
        void supabase.from("notifications").insert({
          user_id: userId,
          title: n.title,
          message: n.message,
          type: n.type,
          is_read: false,
          related_campaign_id: n.related_campaign_id,
          for_role: "advertiser", // ← important
        });
      }
    },
    [userId]
  );

  /* ----- load history (role filtered) ----- */
  const loadHistory = useCallback(
    async (uid: string, reset = true) => {
      try {
        if (reset) {
          setLoading(true);
          offsetRef.current = 0;
          setError(null);
        } else {
          setLoadingMore(true);
        }

        const from = reset ? 0 : offsetRef.current;
        const to = from + PAGE_SIZE - 1;

        const { data, error: err } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", uid)
          .in("for_role", [ROLE, "all"]) // ← only advertiser + all
          .order("created_at", { ascending: false })
          .range(from, to);

        if (err) throw err;

        const rows = data || [];
        const campaignIds = [
          ...new Set(
            rows
              .map((r) => r.related_campaign_id)
              .filter(Boolean) as string[]
          ),
        ];

        let campaignMap = new Map<string, { id: string; title: string }>();
        if (campaignIds.length) {
          const { data: camps } = await supabase
            .from("campaigns")
            .select("id, title")
            .in("id", campaignIds);
          campaignMap = new Map(
            (camps || []).map((c) => [c.id, { id: c.id, title: c.title }])
          );
        }

        const mapped: AppNotification[] = rows.map((r) => {
          const key = eventKey(
            "notifications",
            r.id,
            r.type || "general"
          );
          seenKeys.current.add(key);
          return {
            id: r.id,
            user_id: r.user_id,
            title: r.title,
            message: r.message,
            type: (r.type || "general") as NotificationType,
            is_read: Boolean(r.is_read),
            related_campaign_id: r.related_campaign_id,
            source: "notifications" as const,
            source_record_id: r.id,
            event_key: key,
            for_role: r.for_role,
            created_at: r.created_at,
            campaign: r.related_campaign_id
              ? campaignMap.get(r.related_campaign_id) || null
              : null,
          };
        });

        setNotifications((prev) => (reset ? mapped : [...prev, ...mapped]));
        offsetRef.current = from + rows.length;
        setHasMore(rows.length === PAGE_SIZE);
      } catch (e: unknown) {
        console.error(e);
        setError(
          e instanceof Error ? e.message : "Unable to load notifications."
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  /* ----- resolve submission ownership ----- */
  const fetchSubmissionWithOwnership = useCallback(
    async (submissionId: string) => {
      const { data, error: err } = await supabase
        .from("task_submissions")
        .select(
          `
          id,
          task_id,
          worker_id,
          proof_url,
          proof_note,
          status,
          reward_amount,
          review_note,
          created_at,
          updated_at,
          campaign_tasks!task_submissions_task_id_fkey (
            id,
            title,
            campaign_id,
            campaigns!campaign_tasks_campaign_id_fkey (
              id,
              title,
              advertiser_id
            )
          )
        `
        )
        .eq("id", submissionId)
        .maybeSingle();

      if (err || !data) return null;
      return data;
    },
    []
  );

  /* ----- realtime + auth ----- */
  useEffect(() => {
    const channels: ReturnType<typeof supabase.channel>[] = [];

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);
      await loadHistory(user.id, true);

      // Cache wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("available_balance, pending_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (wallet) {
        walletCache.current = {
          available_balance: Number(wallet.available_balance) || 0,
          pending_balance: Number(wallet.pending_balance) || 0,
        };
      }

      // 1) notifications table (filtered by role on client after insert)
      channels.push(
        supabase
          .channel(`rt-notifications-adv:${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              const r = payload.new as any;

              // Only show if meant for advertiser
              if (r.for_role && r.for_role !== "advertiser" && r.for_role !== "all") {
                return;
              }

              addLiveNotification({
                id: r.id,
                user_id: r.user_id,
                title: r.title,
                message: r.message,
                type: (r.type || "general") as NotificationType,
                is_read: Boolean(r.is_read),
                related_campaign_id: r.related_campaign_id,
                source: "notifications",
                source_record_id: r.id,
                event_key: eventKey("notifications", r.id, r.type || "general"),
                for_role: r.for_role,
                created_at: r.created_at,
                campaign: null,
              });
            }
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              const r = payload.new as AppNotification;
              setNotifications((prev) =>
                prev.map((n) =>
                  n.id === r.id
                    ? {
                        ...n,
                        is_read: r.is_read,
                        title: r.title,
                        message: r.message,
                      }
                    : n
                )
              );
            }
          )
          .on(
            "postgres_changes",
            {
              event: "DELETE",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              const old = payload.old as { id?: string };
              if (!old?.id) return;
              setNotifications((prev) => prev.filter((n) => n.id !== old.id));
            }
          )
          .subscribe()
      );

      // 2) campaigns (own only)
      channels.push(
        supabase
          .channel(`rt-campaigns-adv:${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "campaigns",
              filter: `advertiser_id=eq.${user.id}`,
            },
            (payload) => {
              const row = (payload.new || payload.old) as any;
              if (!row?.id || row.advertiser_id !== user.id) return;

              const event = payload.eventType;
              let title = "Campaign update";
              let message = `Campaign “${row.title}” was updated.`;
              let kind = "update";

              if (event === "INSERT") {
                title = "Campaign created";
                message = `“${row.title}” was created and is ${row.status}.`;
                kind = "created";
              } else if (event === "UPDATE") {
                const status = (row.status || "").toLowerCase();
                if (status === "active" || status === "approved") {
                  title = "Campaign activated";
                  message = `“${row.title}” is now active.`;
                  kind = status;
                } else if (status === "paused") {
                  title = "Campaign paused";
                  message = `“${row.title}” was paused.`;
                  kind = "paused";
                } else if (status === "completed") {
                  title = "Campaign completed";
                  message = `“${row.title}” is completed.`;
                  kind = "completed";
                } else if (
                  status === "rejected" ||
                  status === "needs_attention"
                ) {
                  title = "Campaign needs attention";
                  message = `“${row.title}” status: ${row.status}.`;
                  kind = status;
                } else {
                  title = "Campaign status changed";
                  message = `“${row.title}” is now “${row.status}”.`;
                  kind = `status:${row.status}`;
                }
              } else {
                return;
              }

              addLiveNotification(
                {
                  id: `live-campaign-${row.id}-${kind}`,
                  user_id: user.id,
                  title,
                  message,
                  type: "campaign",
                  is_read: false,
                  related_campaign_id: row.id,
                  source: "campaigns",
                  source_record_id: row.id,
                  event_key: eventKey("campaigns", row.id, kind),
                  created_at:
                    row.updated_at ||
                    row.created_at ||
                    new Date().toISOString(),
                  campaign: { id: row.id, title: row.title },
                },
                { persist: true }
              );
            }
          )
          .subscribe()
      );

      // 3) campaign_tasks
      channels.push(
        supabase
          .channel(`rt-campaign-tasks-adv:${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "campaign_tasks",
            },
            async (payload) => {
              const row = (payload.new || payload.old) as any;
              if (!row?.campaign_id) return;

              const { data: camp } = await supabase
                .from("campaigns")
                .select("id, title, advertiser_id")
                .eq("id", row.campaign_id)
                .maybeSingle();

              if (!camp || camp.advertiser_id !== user.id) return;

              const event = payload.eventType;
              let title = "Task updated";
              let message = `Task “${row.title}” on “${camp.title}” was updated.`;
              let kind = "update";

              if (event === "INSERT") {
                title = "New campaign task";
                message = `Task “${row.title}” was added to “${camp.title}”.`;
                kind = "created";
              } else if (event === "UPDATE") {
                const st = (row.status || "").toLowerCase();
                if (st === "inactive" || st === "completed") {
                  title = `Task ${st}`;
                  message = `“${row.title}” is now ${st}.`;
                  kind = st;
                }
              } else {
                return;
              }

              addLiveNotification(
                {
                  id: `live-task-${row.id}-${kind}`,
                  user_id: user.id,
                  title,
                  message,
                  type: "task",
                  is_read: false,
                  related_campaign_id: camp.id,
                  source: "campaign_tasks",
                  source_record_id: row.id,
                  event_key: eventKey("campaign_tasks", row.id, kind),
                  created_at:
                    row.updated_at ||
                    row.created_at ||
                    new Date().toISOString(),
                  campaign: { id: camp.id, title: camp.title },
                },
                { persist: true }
              );
            }
          )
          .subscribe()
      );

      // 4) task_submissions
      channels.push(
        supabase
          .channel(`rt-task-submissions-adv:${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "task_submissions",
            },
            async (payload) => {
              const row = (payload.new || payload.old) as any;
              if (!row?.id) return;

              const full = await fetchSubmissionWithOwnership(row.id);
              if (!full) return;

              const taskRaw = full.campaign_tasks as unknown;
              const task = Array.isArray(taskRaw) ? taskRaw[0] : taskRaw;
              if (!task) return;

              const campRaw = (task as any).campaigns;
              const camp = Array.isArray(campRaw) ? campRaw[0] : campRaw;
              if (!camp || camp.advertiser_id !== user.id) return;

              const event = payload.eventType;
              const status = (full.status || "").toLowerCase();
              let title = "Submission update";
              let message = `A submission on “${camp.title}” was updated.`;
              let type: NotificationType = "task_submission";
              let kind = "update";

              if (event === "INSERT") {
                title = "New task submission";
                message = `A worker submitted proof for “${
                  (task as any).title || "a task"
                }” on “${camp.title}”.`;
                type = "task_submission";
                kind = "submitted";
              } else if (event === "UPDATE") {
                if (status === "approved") {
                  title = "Submission approved";
                  message = `A submission on “${camp.title}” was approved.`;
                  type = "approved";
                  kind = "approved";
                } else if (status === "rejected") {
                  title = "Submission rejected";
                  message = `A submission on “${camp.title}” was rejected.`;
                  type = "rejected";
                  kind = "rejected";
                } else {
                  kind = `status:${status}`;
                }
              } else {
                return;
              }

              addLiveNotification(
                {
                  id: `live-sub-${full.id}-${kind}`,
                  user_id: user.id,
                  title,
                  message,
                  type,
                  is_read: false,
                  related_campaign_id: camp.id,
                  source: "task_submissions",
                  source_record_id: full.id,
                  event_key: eventKey("task_submissions", full.id, kind),
                  created_at:
                    full.updated_at ||
                    full.created_at ||
                    new Date().toISOString(),
                  campaign: { id: camp.id, title: camp.title },
                },
                { persist: true }
              );
            }
          )
          .subscribe()
      );

      // 5) transactions
      channels.push(
        supabase
          .channel(`rt-transactions-adv:${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "transactions",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              const t = payload.new as any;
              const amount = formatNaira(Number(t.amount) || 0);
              const dir = t.direction || "";
              const st = t.status || "";
              const desc = t.description || t.transaction_type || "Transaction";

              addLiveNotification(
                {
                  id: `live-tx-${t.id}`,
                  user_id: user.id,
                  title: "Transaction update",
                  message: `${desc}: ${amount} (${dir}, ${st})`,
                  type: "payment",
                  is_read: false,
                  related_campaign_id: t.campaign_id,
                  source: "transactions",
                  source_record_id: t.id,
                  event_key: eventKey("transactions", t.id, st),
                  created_at: t.created_at || new Date().toISOString(),
                  campaign: null,
                },
                { persist: true }
              );
            }
          )
          .subscribe()
      );

      // 6) wallets
      channels.push(
        supabase
          .channel(`rt-wallets-adv:${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "wallets",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              const w = payload.new as any;
              const available = Number(w.available_balance) || 0;
              const pending = Number(w.pending_balance) || 0;
              const prev = walletCache.current;

              if (
                prev &&
                prev.available_balance === available &&
                prev.pending_balance === pending
              ) {
                return;
              }

              let message = `Available balance is now ${formatNaira(available)}.`;
              if (prev) {
                const diff = available - prev.available_balance;
                if (diff > 0) {
                  message = `Wallet credited ${formatNaira(
                    diff
                  )}. Available: ${formatNaira(available)}.`;
                } else if (diff < 0) {
                  message = `Wallet debited ${formatNaira(
                    Math.abs(diff)
                  )}. Available: ${formatNaira(available)}.`;
                }
              }

              walletCache.current = {
                available_balance: available,
                pending_balance: pending,
              };

              addLiveNotification(
                {
                  id: `live-wallet-${w.id}-${w.updated_at || Date.now()}`,
                  user_id: user.id,
                  title: "Wallet updated",
                  message,
                  type: "wallet",
                  is_read: false,
                  related_campaign_id: null,
                  source: "wallets",
                  source_record_id: w.id,
                  event_key: eventKey(
                    "wallets",
                    w.id,
                    String(w.updated_at || available)
                  ),
                  created_at: w.updated_at || new Date().toISOString(),
                  campaign: null,
                },
                { persist: true }
              );
            }
          )
          .subscribe()
      );
    };

    void init();

    return () => {
      channels.forEach((ch) => {
        void supabase.removeChannel(ch);
      });
    };
  }, [router, loadHistory, addLiveNotification, fetchSubmissionWithOwnership]);

  /* ----- mutations ----- */
  const markAsRead = useCallback(
    async (id: string) => {
      const prev = notifications;
      setNotifications((list) =>
        list.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setSelected((s) => (s?.id === id ? { ...s, is_read: true } : s));

      if (!id.startsWith("live-")) {
        const { error: err } = await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("id", id)
          .eq("user_id", userId!);
        if (err) {
          setNotifications(prev);
          showToast("error", "Failed to mark as read.");
          return;
        }
      }
      showToast("success", "Marked as read.");
    },
    [notifications, userId, showToast]
  );

  const markAsUnread = useCallback(
    async (id: string) => {
      const prev = notifications;
      setNotifications((list) =>
        list.map((n) => (n.id === id ? { ...n, is_read: false } : n))
      );
      if (!id.startsWith("live-")) {
        const { error: err } = await supabase
          .from("notifications")
          .update({ is_read: false })
          .eq("id", id)
          .eq("user_id", userId!);
        if (err) {
          setNotifications(prev);
          showToast("error", "Failed to mark as unread.");
          return;
        }
      }
      showToast("success", "Marked as unread.");
    },
    [notifications, userId, showToast]
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    const prev = notifications;
    setNotifications((list) => list.map((n) => ({ ...n, is_read: true })));

    const { error: err } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .in("for_role", [ROLE, "all"])
      .eq("is_read", false);

    if (err) {
      setNotifications(prev);
      showToast("error", "Failed to mark all as read.");
      return;
    }
    showToast("success", "All marked as read.");
  }, [userId, notifications, showToast]);

  const deleteNotification = useCallback(
    async (id: string) => {
      const prev = notifications;
      setNotifications((list) => list.filter((n) => n.id !== id));
      setSelected((s) => (s?.id === id ? null : s));
      if (!id.startsWith("live-")) {
        const { error: err } = await supabase
          .from("notifications")
          .delete()
          .eq("id", id)
          .eq("user_id", userId!);
        if (err) {
          setNotifications(prev);
          showToast("error", "Failed to delete.");
          return;
        }
      }
      showToast("success", "Notification deleted.");
    },
    [notifications, userId, showToast]
  );

  /* ----- filter / group ----- */
  const filtered = useMemo(() => {
    let list = notifications.filter((n) => matchesTab(n, activeTab));
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          (n.campaign?.title || "").toLowerCase().includes(q)
      );
    }
    if (sortFilter === "unread") list = list.filter((n) => !n.is_read);
    if (sortFilter === "read") list = list.filter((n) => n.is_read);
    list = [...list].sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sortFilter === "oldest" ? ta - tb : tb - ta;
    });
    return list;
  }, [notifications, activeTab, searchQuery, sortFilter]);

  const grouped = useMemo(() => {
    const order = ["Today", "Yesterday", "Earlier This Week", "Older"];
    const map = new Map<string, AppNotification[]>();
    for (const n of filtered) {
      const g = getDateGroup(n.created_at);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(n);
    }
    return order
      .filter((g) => map.has(g))
      .map((g) => ({ group: g, items: map.get(g)! }));
  }, [filtered]);

  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((n) => !n.is_read).length;
    const campaigns = notifications.filter(
      (n) => n.type === "campaign" || n.type === "task"
    ).length;
    const tasks = notifications.filter((n) =>
      ["task_submission", "approved", "rejected"].includes(n.type)
    ).length;
    return { total, unread, campaigns, tasks };
  }, [notifications]);

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
    { id: "campaigns", label: "Campaigns" },
    { id: "task_submissions", label: "Task Submissions" },
    { id: "payments", label: "Payments" },
    { id: "system", label: "System" },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 h-10 w-64 animate-pulse rounded-xl bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border bg-white"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg items-center justify-center px-4">
        <div className="w-full rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="mx-auto text-red-500" size={40} />
          <h2 className="mt-4 text-xl font-bold text-red-950">
            Unable to load notifications
          </h2>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => userId && loadHistory(userId, true)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0b3939] px-5 py-3 text-sm font-semibold text-white"
          >
            <RefreshCw size={16} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {toast && (
          <div
            className={`fixed right-4 top-4 z-50 max-w-sm rounded-2xl border px-4 py-3 text-sm shadow-lg ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {toast.message}
          </div>
        )}

        {liveAlert && (
          <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-[#0b3939] px-5 py-3 text-sm text-white shadow-xl">
            <Bell size={16} /> {liveAlert}
          </div>
        )}

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Advertiser Notifications
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-500">
              Stay updated on your campaigns, task submissions, payments, and
              account activities.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void markAllAsRead()}
              disabled={stats.unread === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              <CheckCheck size={17} /> Mark All as Read
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftSound(soundSettings);
                setSettingsOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0b3939] px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Settings size={17} /> Notification Settings
            </button>
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Notifications", value: stats.total, icon: Bell },
            {
              label: "Unread Notifications",
              value: stats.unread,
              icon: CheckCircle2,
            },
            {
              label: "Campaign Updates",
              value: stats.campaigns,
              icon: Megaphone,
            },
            {
              label: "Task Submission Updates",
              value: stats.tasks,
              icon: ClipboardCheck,
            },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {c.label}
                </p>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b3939]/10 text-[#0b3939]">
                  <c.icon size={18} />
                </div>
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {c.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mb-6 space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
                  activeTab === t.id
                    ? "bg-[#0b3939] text-white"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, message, or campaign…"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-[#0b3939] focus:ring-4 focus:ring-[#0b3939]/10"
              />
            </div>
            <div className="relative sm:w-56">
              <select
                value={sortFilter}
                onChange={(e) =>
                  setSortFilter(e.target.value as SortFilter)
                }
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-medium"
              >
                <option value="all">All Notifications</option>
                <option value="unread">Unread Only</option>
                <option value="read">Read</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <Bell size={44} className="mx-auto text-slate-300" />
            <h2 className="mt-4 text-xl font-bold text-slate-900">
              {searchQuery.trim()
                ? "No matching notifications"
                : "No notifications yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Campaign, submission, payment, and wallet events will appear here
              in real time.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(({ group, items }) => (
              <section key={group}>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  {group === "Today"
                    ? "Recent Notifications · Today"
                    : group}
                </h2>
                <ul className="space-y-3">
                  {items.map((n) => {
                    const Icon = getIcon(n.type);
                    const unread = !n.is_read;
                    return (
                      <li key={n.id + (n.event_key || "")}>
                        <div
                          className={`relative flex gap-4 rounded-2xl border p-4 sm:p-5 ${
                            unread
                              ? "border-[#0b3939]/15 bg-[#0b3939]/[0.04]"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          {unread && (
                            <span className="absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#0b3939] sm:left-3" />
                          )}
                          <div
                            className={`ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:ml-3 ${
                              unread
                                ? "bg-[#0b3939] text-white"
                                : "bg-[#0b3939]/10 text-[#0b3939]"
                            }`}
                          >
                            <Icon size={20} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3
                                  className={`text-sm sm:text-base ${
                                    unread
                                      ? "font-bold text-slate-900"
                                      : "font-semibold text-slate-800"
                                  }`}
                                >
                                  {n.title}
                                </h3>
                                <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                                  {n.message}
                                </p>
                                {n.campaign?.title && (
                                  <p className="mt-2 text-xs font-medium text-[#0b3939]">
                                    Campaign: {n.campaign.title}
                                  </p>
                                )}
                                <p className="mt-2 text-xs text-slate-400">
                                  {timeAgo(n.created_at)} ·{" "}
                                  {unread ? "Unread" : "Read"} ·{" "}
                                  {getTypeLabel(n.type)}
                                </p>
                              </div>
                              <div className="relative flex shrink-0 items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelected(n)}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold"
                                >
                                  View Details
                                </button>
                                {n.related_campaign_id && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      router.push(
                                        `/advertiser/dashboard/campaigns/view?campaignId=${n.related_campaign_id}`
                                      )
                                    }
                                    className="hidden rounded-lg bg-[#0b3939] px-3 py-1.5 text-xs font-semibold text-white sm:inline-flex"
                                  >
                                    View Campaign
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(
                                      openMenuId === n.id ? null : n.id
                                    );
                                  }}
                                  className="rounded-lg border border-slate-200 p-1.5"
                                  aria-label="More actions"
                                >
                                  <MoreVertical size={16} />
                                </button>
                                {openMenuId === n.id && (
                                  <div
                                    className="absolute right-0 top-9 z-20 w-44 rounded-xl border bg-white py-1 shadow-lg"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {n.is_read ? (
                                      <button
                                        type="button"
                                        className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                                        onClick={() =>
                                          void markAsUnread(n.id)
                                        }
                                      >
                                        Mark as Unread
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                                        onClick={() => void markAsRead(n.id)}
                                      >
                                        Mark as Read
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                      onClick={() =>
                                        void deleteNotification(n.id)
                                      }
                                    >
                                      Delete Notification
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}

            {hasMore && (
              <div className="flex justify-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => userId && loadHistory(userId, false)}
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-5 py-3 text-sm font-semibold"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Loading…
                    </>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Details panel */}
      {selected && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setSelected(null)}
            aria-label="Close"
          />
          <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-lg font-bold">Notification Details</h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-6">
              {(() => {
                const Icon = getIcon(selected.type);
                return (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0b3939] text-white">
                    <Icon size={28} />
                  </div>
                );
              })()}
              <h3 className="mt-5 text-xl font-bold">{selected.title}</h3>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                {selected.message}
              </p>
              <dl className="mt-6 space-y-3 rounded-2xl border bg-slate-50 p-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Type</dt>
                  <dd className="font-semibold">
                    {getTypeLabel(selected.type)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Source</dt>
                  <dd className="font-semibold">{selected.source}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Status</dt>
                  <dd className="font-semibold">
                    {selected.is_read ? "Read" : "Unread"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Received</dt>
                  <dd className="font-semibold">
                    {formatFullDate(selected.created_at)}
                  </dd>
                </div>
                {selected.campaign && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Campaign</dt>
                    <dd className="font-semibold text-[#0b3939]">
                      {selected.campaign.title}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
            <div className="space-y-2 border-t p-5">
              {selected.related_campaign_id && (
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/advertiser/dashboard/campaigns/view?campaignId=${selected.related_campaign_id}`
                    )
                  }
                  className="flex w-full justify-center rounded-xl bg-[#0b3939] py-3 text-sm font-semibold text-white"
                >
                  View Campaign
                </button>
              )}
              {!selected.is_read && (
                <button
                  type="button"
                  onClick={() => void markAsRead(selected.id)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold"
                >
                  <Check size={16} /> Mark as Read
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Settings */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setSettingsOpen(false)}
            aria-label="Close settings"
          />
          <div className="relative z-10 w-full max-w-md rounded-3xl border bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Notification Settings</h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">Notification Sound</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Play sound for new notifications
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draftSound.soundEnabled}
                  onClick={() =>
                    setDraftSound((s) => ({
                      ...s,
                      soundEnabled: !s.soundEnabled,
                    }))
                  }
                  className={`relative h-7 w-12 rounded-full ${
                    draftSound.soundEnabled ? "bg-[#0b3939]" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                      draftSound.soundEnabled ? "left-5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <label htmlFor="vol">Volume</label>
                  <span>{Math.round(draftSound.volume * 100)}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <VolumeX size={16} />
                  <input
                    id="vol"
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={draftSound.volume}
                    onChange={(e) =>
                      setDraftSound((s) => ({
                        ...s,
                        volume: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-[#0b3939]"
                  />
                  <Volume2 size={16} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  userInteracted.current = true;
                  playTone(draftSound.volume);
                }}
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold"
              >
                <Volume2 size={16} /> Test Sound
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                saveSoundSettings(draftSound);
                setSoundSettings(draftSound);
                setSettingsOpen(false);
                showToast("success", "Settings saved.");
              }}
              className="mt-8 w-full rounded-xl bg-[#0b3939] py-3 text-sm font-semibold text-white"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}