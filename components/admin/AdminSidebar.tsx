"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  X,
  LayoutDashboard,
  Users,
  BriefcaseBusiness,
  ClipboardList,
  Wallet,
  CreditCard,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  ShieldCheck,
  ChevronRight,
  UserCog,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type AdminSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  fullName?: string | null;
  userName?: string | null;
};

const navigation = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "Campaigns",
    href: "/admin/campaigns",
    icon: BriefcaseBusiness,
  },
  {
    label: "Tasks",
    href: "/admin/tasks",
    icon: ClipboardList,
  },
  {
    label: "Wallets",
    href: "/admin/wallets",
    icon: Wallet,
  },
  {
    label: "Payments",
    href: "/admin/payments",
    icon: CreditCard,
  },
  {
    label: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
  },
  {
    label: "Notifications",
    href: "/admin/notifications",
    icon: Bell,
  },
];

const systemNavigation = [
  {
    label: "Admin Management",
    href: "/admin/management",
    icon: UserCog,
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export default function AdminSidebar({
  isOpen,
  onClose,
  fullName,
  userName,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();

    onClose();

    router.replace("/admin/login");

    router.refresh();
  };

  const initials = fullName
    ? fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((name) => name.charAt(0))
        .join("")
        .toUpperCase()
    : "GA";

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === href;
    }

    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[280px] flex-col overflow-hidden bg-[#0b3939] text-white shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-[78px] shrink-0 items-center justify-between border-b border-white/10 px-6">
          <Link
            href="/admin/dashboard"
            onClick={onClose}
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg font-black text-[#0b3939] shadow-lg">
              G
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight">
                GigPlace
              </h1>

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Admin Portal
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
            Main Menu
          </p>

          <nav className="space-y-1.5">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                    active
                      ? "bg-white text-[#0b3939] shadow-lg"
                      : "text-white/65 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 ${
                      active
                        ? "text-[#0b3939]"
                        : "text-white/55 group-hover:text-white"
                    }`}
                  />

                  <span className="flex-1">
                    {item.label}
                  </span>

                  {active && (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* System Section */}
          <div className="mt-8">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
              System
            </p>

            <nav className="space-y-1.5">
              {systemNavigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                      active
                        ? "bg-white text-[#0b3939] shadow-lg"
                        : "text-white/65 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 shrink-0 ${
                        active
                          ? "text-[#0b3939]"
                          : "text-white/55 group-hover:text-white"
                      }`}
                    />

                    <span className="flex-1">
                      {item.label}
                    </span>

                    {active && (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Admin Profile */}
        <div className="shrink-0 border-t border-white/10 p-4">
          <div className="rounded-2xl bg-white/10 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-300 text-sm font-bold text-[#0b3939]">
                {initials}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {fullName || "GigPlace Admin"}
                </p>

                <div className="mt-0.5 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />

                  <p className="truncate text-xs text-white/50">
                    {userName || "Administrator"}
                  </p>
                </div>
              </div>
            </div>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-white/75 transition hover:bg-red-500 hover:text-white"
            >
              <LogOut className="h-4 w-4" />

              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}