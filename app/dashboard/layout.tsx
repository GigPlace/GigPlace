'use client';

import {
  useEffect,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

import { supabase } from '@/lib/supabase';

type Profile = {
  full_name: string | null;
  user_name: string | null;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [profile, setProfile] =
    useState<Profile | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace('/login');
        return;
      }

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select(
          'full_name, user_name'
        )
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error(
          'Profile error:',
          profileError
        );
      }

      setProfile(profileData);
    } catch (error) {
      console.error(
        'Dashboard authentication error:',
        error
      );

      router.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  const displayName =
    profile?.full_name ||
    profile?.user_name ||
    'GigPlace User';

  const firstName =
    displayName.split(' ')[0];

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F8F7]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-[#0B3939]/15 border-t-[#0B3939]" />

          <p className="text-sm font-semibold text-slate-500">
            Loading your workspace...
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F8F7]">

      <DashboardSidebar
        isOpen={menuOpen}
        onClose={() =>
          setMenuOpen(false)
        }
        fullName={
          profile?.full_name
        }
        userName={
          profile?.user_name
        }
      />

      <div className="min-h-screen lg:ml-[280px]">

        <DashboardHeader
          onMenuClick={() =>
            setMenuOpen(true)
          }
          firstName={firstName}
        />

        <main className="px-5 py-7 lg:px-9 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}