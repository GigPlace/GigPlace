'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSuccessMessage(
        'If an account exists with this email, you will receive a password reset link shortly. Please check your inbox and spam folder.'
      );
      setEmail('');
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="h-screen max-w-7xl mx-auto bg-[#f4f8f7] overflow-hidden">
      <div className="grid h-full lg:grid-cols-2">
        {/* Left side */}
        <section className="relative hidden overflow-hidden bg-[#0b3939] px-8 py-8 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white blur-3xl" />
            <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-emerald-300 blur-3xl" />
          </div>

          <Link
            href="/"
            className="relative z-10 text-2xl font-bold tracking-tight text-white"
          >
            Gig<span className="text-emerald-300">Place</span>
          </Link>

          <div className="relative z-10 max-w-md">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure password recovery
            </div>

            <h1 className="text-3xl font-bold leading-snug text-white">
              Reset your password securely.
            </h1>

            <p className="mt-3 text-sm leading-5 text-white/70">
              Enter the email linked to your account and we’ll send you a secure
              link to create a new password.
            </p>
          </div>

          <p className="relative z-10 text-xs text-white/50">
            © {new Date().getFullYear()} GigPlace
          </p>
        </section>

        {/* Right side */}
        <section className="flex h-full items-center justify-center overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-lg">
            <div className="mb-4 lg:hidden">
              <Link
                href="/"
                className="text-2xl font-bold tracking-tight text-[#0b3939]"
              >
                GigPlace
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/40 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#0b3939]">
                  Account recovery
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                  Forgot password?
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Enter your email and we’ll send you a reset link.
                </p>
              </div>

              {successMessage && (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  {successMessage}
                </div>
              )}

              {error && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Email
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 transition focus-within:border-[#0b3939] focus-within:ring-2 focus-within:ring-[#0b3939]/10">
                    <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                    <input
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="you@example.com"
                      className="w-full bg-transparent py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0b3939] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#062b2b] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending link...
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </form>

              <p className="mt-4 text-center text-xs text-slate-500">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 font-semibold text-[#0b3939] hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to log in
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}