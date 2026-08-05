'use client';

import {
  useEffect,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import AdvertiserSidebar from '@/components/advertiser/AdvertiserSidebar';
import AdvertiserHeader from '@/components/advertiser/AdvertiserHeader';

import { supabase } from '@/lib/supabase';

type Profile = {
  full_name: string | null;
  user_name: string | null;
};

export default function AdvertiserDashboardLayout({
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
    loadAdvertiser();
  }, []);

  const loadAdvertiser = async () => {
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
        'Advertiser authentication error:',
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
    'GigPlace Advertiser';

  const firstName =
    displayName.split(' ')[0];

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F7FB]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-[#172554]/15 border-t-[#172554]" />

          <p className="text-sm font-semibold text-slate-500">
            Loading advertiser workspace...
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FB]">

      <AdvertiserSidebar
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

        <AdvertiserHeader
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