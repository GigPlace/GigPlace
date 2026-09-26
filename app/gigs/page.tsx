// app/gigs/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function GigsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login?next=/gigs");
        return;
      }

      // Optional: send logged-in workers to dashboard tasks
      // router.replace("/dashboard");
      setChecking(false);
    };

    checkAuth();
  }, [router]);

  if (checking) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#0b3939]" />
          <p className="text-sm text-slate-500">Checking your session…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[60vh] max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0b3939] sm:text-3xl">
          Explore Gigs
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Browse available tasks and start earning on GigPlace.
        </p>
      </div>

      {/* Placeholder — replace with real campaign/task list later */}
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
        <p className="text-sm text-slate-500">
          Gigs will appear here once campaigns are published.
        </p>
      </div>
    </main>
  );
}