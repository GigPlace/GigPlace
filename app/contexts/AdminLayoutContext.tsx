"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export interface AdminProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  avatar_url: string | null;
}

interface AdminLayoutContextValue {
  profile: AdminProfile | null;
  loading: boolean;
  sidebarCollapsed: boolean;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  logoutOpen: boolean;
  setLogoutOpen: (open: boolean) => void;
  handleLogout: () => Promise<void>;
}

const AdminLayoutContext = createContext<AdminLayoutContextValue | null>(null);

const COLLAPSED_KEY = "gigplace_admin_sidebar_collapsed";

export function AdminLayoutProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_KEY);
      if (saved === "true") setSidebarCollapsedState(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const verifyAdmin = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, email, role, avatar_url")
          .eq("id", user.id)
          .single();

        if (profileError || !profileData) {
          router.replace("/login");
          return;
        }

        if (profileData.role !== "admin") {
          // Send non-admins to their own area
          if (profileData.role === "advertiser") {
            router.replace("/advertiser/dashboard");
          } else if (profileData.role === "worker") {
            router.replace("/worker/dashboard");
          } else {
            router.replace("/login");
          }
          return;
        }

        if (!cancelled) {
          setProfile(profileData as AdminProfile);
        }
      } catch (err) {
        console.error("Admin auth error:", err);
        router.replace("/login");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void verifyAdmin();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
    try {
      localStorage.setItem(COLLAPSED_KEY, String(collapsed));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed);
  }, [sidebarCollapsed, setSidebarCollapsed]);

  const handleLogout = useCallback(async () => {
    setLogoutOpen(false);
    setProfile(null);
    await supabase.auth.signOut();
    router.replace("/login");
  }, [router]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const value = useMemo(
    () => ({
      profile,
      loading,
      sidebarCollapsed,
      mobileOpen,
      setMobileOpen,
      toggleSidebarCollapsed,
      setSidebarCollapsed,
      logoutOpen,
      setLogoutOpen,
      handleLogout,
    }),
    [
      profile,
      loading,
      sidebarCollapsed,
      mobileOpen,
      toggleSidebarCollapsed,
      setSidebarCollapsed,
      logoutOpen,
      handleLogout,
    ]
  );

  return (
    <AdminLayoutContext.Provider value={value}>
      {children}
    </AdminLayoutContext.Provider>
  );
}

export function useAdminLayout() {
  const ctx = useContext(AdminLayoutContext);
  if (!ctx) {
    throw new Error("useAdminLayout must be used within AdminLayoutProvider");
  }
  return ctx;
}