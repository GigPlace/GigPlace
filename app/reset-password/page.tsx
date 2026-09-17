'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setIsValidSession(true);
        return;
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsValidSession(true);
        } else if (!session) {
          setIsValidSession(false);
        }
      });

      setTimeout(async () => {
        const {
          data: { session: current },
        } = await supabase.auth.getSession();
        if (!current) {
          setIsValidSession(false);
        }
      }, 800);

      return () => subscription.unsubscribe();
    };

    checkSession();
  }, []);

  const validate = () => {
    if (!password) {
      setError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!validate()) return;

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccessMessage(
        'Your password has been updated successfully. Redirecting to login...'
      );

      await supabase.auth.signOut();

      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputBase =
    'w-full rounded-lg border bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-[#0b3939] focus:ring-2 focus:ring-[#0b3939]/10';
  const inputError = 'border-red-400';
  const inputNormal = 'border-slate-200';

  if (isValidSession === null) {
    return (
      <main className="h-screen flex items-center justify-center bg-[#f4f8f7]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0b3939]" />
      </main>
    );
  }

  if (isValidSession === false) {
    return (
      <main className="h-screen max-w-7xl mx-auto bg-[#f4f8f7] overflow-hidden">
        <div className="grid h-full lg:grid-cols-2">
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
              <h1 className="text-3xl font-bold leading-snug text-white">
                Link invalid or expired.
              </h1>
              <p className="mt-3 text-sm leading-5 text-white/70">
                Please request a new password reset link to continue.
              </p>
            </div>

            <p className="relative z-10 text-xs text-white/50">
              © {new Date().getFullYear()} GigPlace
            </p>
          </section>

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

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/40 sm:p-6 text-center">
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 mb-4">
                  This password reset link is invalid or has expired.
                </div>

                <Link
                  href="/forgot-password"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-[#0b3939] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#062b2b]"
                >
                  Request a new link
                </Link>

                <p className="mt-4 text-xs text-slate-500">
                  <Link
                    href="/login"
                    className="font-semibold text-[#0b3939] hover:underline"
                  >
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
              Secure password update
            </div>

            <h1 className="text-3xl font-bold leading-snug text-white">
              Choose a new password.
            </h1>

            <p className="mt-3 text-sm leading-5 text-white/70">
              Create a strong password to keep your GigPlace account secure.
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
                  Reset password
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Enter your new password below.
                </p>
              </div>

              {successMessage && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
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
                    New password
                  </label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="Min. 6 characters"
                      className={`${inputBase} pr-10 ${
                        error ? inputError : inputNormal
                      }`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0b3939]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="Confirm password"
                      className={`${inputBase} pr-10 ${
                        error ? inputError : inputNormal
                      }`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0b3939]"
                      aria-label={
                        showConfirmPassword ? 'Hide password' : 'Show password'
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !!successMessage}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0b3939] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#062b2b] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update password'
                  )}
                </button>
              </form>

              <p className="mt-4 text-center text-xs text-slate-500">
                Remember your password?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-[#0b3939] hover:underline"
                >
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}