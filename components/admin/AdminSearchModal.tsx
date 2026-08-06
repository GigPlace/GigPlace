"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  Loader2,
  Megaphone,
  Search,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type ResultGroup = {
  type: string;
  label: string;
  icon: typeof Users;
  items: { id: string; title: string; subtitle?: string; href: string }[];
};

interface AdminSearchModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AdminSearchModal({ open, onClose }: AdminSearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<ResultGroup[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery("");
      setGroups([]);
      setActiveIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const runSearch = useCallback(async (q: string) => {
    const term = q.trim();
    if (term.length < 2) {
      setGroups([]);
      return;
    }

    setLoading(true);
    try {
      const like = `%${term}%`;

      const [usersRes, campaignsRes, submissionsRes, txRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, role")
          .or(`full_name.ilike.${like},email.ilike.${like}`)
          .limit(6),
        supabase
          .from("campaigns")
          .select("id, title, status")
          .ilike("title", like)
          .limit(6),
        supabase
          .from("task_submissions")
          .select("id, status, created_at")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("transactions")
          .select("id, description, amount, status")
          .ilike("description", like)
          .limit(6),
      ]);

      const next: ResultGroup[] = [];

      if (usersRes.data?.length) {
        next.push({
          type: "users",
          label: "Users",
          icon: Users,
          items: usersRes.data.map((u) => ({
            id: u.id,
            title: u.full_name || u.email || "User",
            subtitle: `${u.role || "user"} · ${u.email || ""}`,
            href: `/admin/dashboard/users?id=${u.id}`,
          })),
        });
      }

      if (campaignsRes.data?.length) {
        next.push({
          type: "campaigns",
          label: "Campaigns",
          icon: Megaphone,
          items: campaignsRes.data.map((c) => ({
            id: c.id,
            title: c.title,
            subtitle: c.status,
            href: `/admin/dashboard/campaigns?id=${c.id}`,
          })),
        });
      }

      if (submissionsRes.data?.length && term.length >= 2) {
        // Filter client-side lightly; IDs rarely match search text
        next.push({
          type: "submissions",
          label: "Task Submissions",
          icon: ClipboardCheck,
          items: submissionsRes.data.slice(0, 4).map((s) => ({
            id: s.id,
            title: `Submission ${s.id.slice(0, 8)}…`,
            subtitle: s.status,
            href: `/admin/dashboard/submissions?id=${s.id}`,
          })),
        });
      }

      if (txRes.data?.length) {
        next.push({
          type: "transactions",
          label: "Transactions",
          icon: Wallet,
          items: txRes.data.map((t) => ({
            id: t.id,
            title: t.description || "Transaction",
            subtitle: `${t.status} · ₦${t.amount}`,
            href: `/admin/dashboard/transactions?id=${t.id}`,
          })),
        });
      }

      setGroups(next);
      setActiveIndex(0);
    } catch (err) {
      console.error(err);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => void runSearch(query), 280);
    return () => window.clearTimeout(t);
  }, [query, open, runSearch]);

  const flatItems = groups.flatMap((g) =>
    g.items.map((item) => ({ ...item, group: g.label }))
  );

  const goTo = (href: string) => {
    onClose();
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(flatItems.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flatItems[activeIndex]) {
      e.preventDefault();
      goTo(flatItems[activeIndex].href);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        aria-label="Close search"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <Search size={18} className="text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search users, campaigns, submissions, transactions…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          {loading && <Loader2 size={16} className="animate-spin text-slate-400" />}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {query.trim().length < 2 && (
            <p className="px-3 py-8 text-center text-sm text-slate-400">
              Type at least 2 characters to search.
            </p>
          )}

          {query.trim().length >= 2 && !loading && groups.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-slate-400">
              No results found.
            </p>
          )}

          {groups.map((group) => (
            <div key={group.type} className="mb-2">
              <p className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
              {group.items.map((item) => {
                const idx = flatItems.findIndex((f) => f.id === item.id && f.href === item.href);
                const active = idx === activeIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goTo(item.href)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                      active ? "bg-[#0b3939]/10 text-[#0b3939]" : "hover:bg-slate-50"
                    }`}
                  >
                    <group.icon size={16} className="mt-0.5 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {item.title}
                      </span>
                      {item.subtitle && (
                        <span className="block truncate text-xs text-slate-500">
                          {item.subtitle}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5">↑↓</kbd>{" "}
          navigate ·{" "}
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5">Enter</kbd>{" "}
          open ·{" "}
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5">Esc</kbd>{" "}
          close
        </div>
      </div>
    </div>
  );
}