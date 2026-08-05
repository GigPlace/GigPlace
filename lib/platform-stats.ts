// lib/platform-stats.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export type PlatformStats = {
  totalUsers: number;
  activeGigs: number;
  verifiedCompletions: number;
  rewardsPaid: number;
};

export async function getPlatformStats(): Promise<PlatformStats> {
  try {
    // Run queries in parallel for better performance
    const [
      usersRes,
      gigsRes,
      completionsRes,
      rewardsRes,
    ] = await Promise.all([
      // Total Registered Users
      supabase.from('profiles').select('id', { count: 'exact', head: true }),

      // Active Gigs / Campaigns
      supabase
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),

      // Verified Completions
      supabase
        .from('task_completions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved'),

      // Total Rewards Paid (Earnings)
      supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'earning')
        .eq('status', 'completed'),
    ]);

    const totalUsers = usersRes.count ?? 0;
    const activeGigs = gigsRes.count ?? 0;
    const verifiedCompletions = completionsRes.count ?? 0;

    // Calculate total rewards
    const rewardsPaid =
      rewardsRes.data?.reduce((sum, tx) => sum + (tx.amount || 0), 0) ?? 0;

    return {
      totalUsers,
      activeGigs,
      verifiedCompletions,
      rewardsPaid,
    };
  } catch (error) {
    console.error('Failed to fetch platform stats:', error);
    // Return zeros on error (graceful degradation)
    return {
      totalUsers: 0,
      activeGigs: 0,
      verifiedCompletions: 0,
      rewardsPaid: 0,
    };
  }
}