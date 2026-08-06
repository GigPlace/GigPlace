"use client";

import { LogOut, X } from "lucide-react";
import { useAdminLayout } from "@/app/contexts/AdminLayoutContext";

export default function AdminLogoutModal() {
  const { logoutOpen, setLogoutOpen, handleLogout } = useAdminLayout();

  if (!logoutOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        aria-label="Close logout dialog"
        onClick={() => setLogoutOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <LogOut size={20} />
          </div>
          <button
            type="button"
            onClick={() => setLogoutOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <h2 id="logout-title" className="mt-4 text-lg font-bold text-slate-900">
          Sign out of Admin Portal?
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          You will need to sign in again to manage GigPlace.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setLogoutOpen(false)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}