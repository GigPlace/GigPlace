// components/home/PlatformStats.tsx
'use client';

import { useEffect, useState } from 'react';
import { Users, BriefcaseBusiness, CircleCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type PlatformStats = {
  totalUsers: number;
  activeGigs: number;
  verifiedCompletions: number;
};

function StatsCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="group bg-white rounded-3xl p-8 border border-gray-100 hover:border-[#0b3939]/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="w-12 h-12 bg-[#e8f3f2] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6 text-[#0b3939]" />
      </div>

      <div className="text-4xl font-semibold text-[#102a2a] mb-1 tabular-nums">
        {value}
      </div>
      <div className="font-medium text-[#0b3939] mb-2">{label}</div>
      <p className="text-sm text-[#0b3939]">{description}</p>
    </div>
  );
}

async function fetchStats(): Promise<PlatformStats> {
  const { data, error } = await supabase.rpc('get_platform_stats');

  if (error || !data) {
    console.error('Failed to fetch platform stats:', error);
    return {
      totalUsers: 0,
      activeGigs: 0,
      verifiedCompletions: 0,
    };
  }

  return {
    totalUsers: Number(data.total_users) || 0,
    activeGigs: Number(data.active_gigs) || 0,
    verifiedCompletions: Number(data.verified_completions) || 0,
  };
}

export default function PlatformStats() {
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    activeGigs: 0,
    verifiedCompletions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    fetchStats().then((data) => {
      setStats(data);
      setLoading(false);
    });

    // Realtime subscriptions
    const channel = supabase
      .channel('platform-stats')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        async () => setStats(await fetchStats())
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaigns' },
        async () => setStats(await fetchStats())
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_submissions' },
        async () => setStats(await fetchStats())
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <section className="py-20 bg-[#f7faf9]">
      <div className="max-w-7xl mx-auto px-6 md:px-8 lg:px-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-white rounded-full text-[#0b3939] text-sm font-medium mb-4 border border-[#0b3939]/10">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            LIVE PLATFORM INSIGHTS
          </div>

          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#0b3939] mb-4">
            Growing Opportunities.<br />Real Results.
          </h2>

          <p className="max-w-2xl mx-auto text-[#0b3939]/80 md:text-lg text-base">
            See the real impact of GigPlace as users create gigs, complete verified tasks, and earn rewards.
          </p>
        </div>

        {/* Stats Grid – 3 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatsCard
            icon={Users}
            label="Registered Users"
            value={loading ? '—' : stats.totalUsers.toLocaleString('en-NG')}
            description="Active members on the platform"
          />

          <StatsCard
            icon={BriefcaseBusiness}
            label="Active Gigs"
            value={loading ? '—' : stats.activeGigs.toLocaleString('en-NG')}
            description="Campaigns open for participation"
          />

          <StatsCard
            icon={CircleCheck}
            label="Verified Completions"
            value={loading ? '—' : stats.verifiedCompletions.toLocaleString('en-NG')}
            description="Successfully approved tasks"
          />
        </div>

        {/* Live Indicator */}
        {/* <div className="text-center mt-10 text-sm text-[#647575] flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          Data updates in real-time
        </div> */}
      </div>
    </section>
  );
}