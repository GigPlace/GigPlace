"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

import { supabase } from "@/lib/supabase";

type AdminProfile = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: "admin" | "super_admin";
  status: "pending" | "approved" | "rejected" | "suspended";
};

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const [profile, setProfile] = useState<AdminProfile | null>(null);

  useEffect(() => {
    loadAdmin();
  }, []);

  const loadAdmin = async () => {
    try {
      // Get the currently logged-in user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      // Redirect if no admin is logged in
      if (authError || !user) {
        router.replace("/admin/login");
        return;
      }

      // Get the admin profile
      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("admin_profiles")
        .select(`
          first_name,
          last_name,
          email,
          role,
          status
        `)
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        console.error(
          "Admin profile error:",
          profileError
        );

        await supabase.auth.signOut();

        router.replace("/admin/login");
        return;
      }

      // Prevent pending admins from entering the dashboard
      if (profileData.status !== "approved") {
        await supabase.auth.signOut();

        router.replace(
          "/admin/login?error=account_pending"
        );

        return;
      }

      setProfile(profileData);
    } catch (error) {
      console.error(
        "Admin authentication error:",
        error
      );

      router.replace("/admin/login");
    } finally {
      setLoading(false);
    }
  };

  const displayName =
    `${profile?.first_name ?? ""} ${
      profile?.last_name ?? ""
    }`.trim() || "GigPlace Admin";

  const firstName =
    profile?.first_name || "Admin";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F7FB]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-[#0b3939]/15 border-t-[#0b3939]" />

          <p className="text-sm font-semibold text-slate-500">
            Loading admin workspace...
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      <AdminSidebar
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        fullName={displayName}
        userName={profile?.email || "admin@gigplace.com"}
      />

      <div className="min-h-screen lg:ml-[280px]">
        <AdminHeader
          onMenuClick={() => setMenuOpen(true)}
          firstName={firstName}
        />

        <main className="px-5 py-7 lg:px-9 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}