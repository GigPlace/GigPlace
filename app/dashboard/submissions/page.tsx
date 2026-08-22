'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  XCircle,
  Image as ImageIcon,
  Video,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type SubmissionStatus = 'pending' | 'approved' | 'rejected';

interface Submission {
  id: string;
  status: SubmissionStatus;
  reward_amount: number;
  proof_url: string[] | null;
  proof_note: string | null;
  proof_text: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  task: {
    id: string;
    title: string;
    reward_amount: number;
    campaign: {
      id: string;
      title: string;
      cover_image_url: string | null;
    };
  };
}

const statusConfig = {
  pending: {
    label: 'Pending Review',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-50 text-red-700 border-red-200',
    icon: XCircle,
  },
};

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | SubmissionStatus>('all');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError('');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('You must be logged in to view submissions.');
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('task_submissions')
        .select(
          `
          id,
          status,
          reward_amount,
          proof_url,
          proof_note,
          proof_text,
          review_note,
          reviewed_at,
          created_at,
          updated_at,
          task:campaign_tasks (
            id,
            title,
            reward_amount,
            campaign:campaigns (
              id,
              title,
              cover_image_url
            )
          )
        `
        )
        .eq('worker_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      // Normalize proof_url (it is stored as jsonb array of strings)
      const normalized = (data || []).map((item: any) => ({
        ...item,
        proof_url: Array.isArray(item.proof_url)
          ? item.proof_url
          : item.proof_url
          ? [item.proof_url]
          : null,
        task: item.task,
      }));

      setSubmissions(normalized);
    } catch (err) {
      setError('Failed to load submissions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredSubmissions =
    filter === 'all'
      ? submissions
      : submissions.filter((s) => s.status === filter);

  const stats = {
    total: submissions.length,
    pending: submissions.filter((s) => s.status === 'pending').length,
    approved: submissions.filter((s) => s.status === 'approved').length,
    rejected: submissions.filter((s) => s.status === 'rejected').length,
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#0b3939]" />
          <p className="text-sm text-slate-500">Loading your submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          My Submissions
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Track all the tasks you have submitted and their current status.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Pending" value={stats.pending} color="amber" />
        <StatCard label="Approved" value={stats.approved} color="emerald" />
        <StatCard label="Rejected" value={stats.rejected} color="red" />
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === status
                ? 'bg-[#0b3939] text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-[#0b3939]/40'
            }`}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-800">
            No submissions found
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            {filter === 'all'
              ? "You haven't submitted any tasks yet."
              : `You don't have any ${filter} submissions.`}
          </p>
          <Link
            href="/dashboard/campaigns"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0b3939] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#062b2b]"
          >
            Browse Campaigns
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((submission) => {
            const config = statusConfig[submission.status];
            const StatusIcon = config.icon;

            return (
              <div
                key={submission.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
                  {/* Campaign Image */}
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    {submission.task?.campaign?.cover_image_url ? (
                      <img
                        src={submission.task.campaign.cover_image_url}
                        alt={submission.task.campaign.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <FileText className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {submission.task?.title || 'Untitled Task'}
                        </h3>
                        <p className="mt-0.5 text-sm text-slate-500">
                          Campaign: {submission.task?.campaign?.title || '—'}
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${config.color}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {config.label}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        Submitted:{' '}
                        {new Date(submission.created_at).toLocaleString()}
                      </span>
                      {submission.reviewed_at && (
                        <span>
                          Reviewed:{' '}
                          {new Date(submission.reviewed_at).toLocaleString()}
                        </span>
                      )}
                      <span className="font-medium text-slate-700">
                        Reward: ₦{Number(submission.reward_amount || 0).toLocaleString()}
                      </span>
                    </div>

                    {/* Proof Text / Note */}
                    {(submission.proof_text || submission.proof_note) && (
                      <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        {submission.proof_text || submission.proof_note}
                      </div>
                    )}

                    {/* Proof Files */}
                    {submission.proof_url && submission.proof_url.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {submission.proof_url.map((url, idx) => {
                          const isVideo = url.match(/\.(mp4|webm|mov)$/i);
                          return (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-[#0b3939] hover:text-[#0b3939]"
                            >
                              {isVideo ? (
                                <Video className="h-3.5 w-3.5" />
                              ) : (
                                <ImageIcon className="h-3.5 w-3.5" />
                              )}
                              Proof {idx + 1}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          );
                        })}
                      </div>
                    )}

                    {/* Review Note */}
                    {submission.review_note && (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-xs font-medium text-slate-500">
                          Reviewer note:
                        </p>
                        <p className="mt-0.5 text-sm text-slate-700">
                          {submission.review_note}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color = 'slate',
}: {
  label: string;
  value: number;
  color?: 'slate' | 'amber' | 'emerald' | 'red';
}) {
  const colors = {
    slate: 'bg-white border-slate-200',
    amber: 'bg-amber-50 border-amber-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    red: 'bg-red-50 border-red-100',
  };

  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}