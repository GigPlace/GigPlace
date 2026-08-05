'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setLoading(true);
    setError('');

    try {
      // 1. Sign in with Supabase Auth
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      if (!data.user) {
        setError(
          'Unable to find your account. Please try again.'
        );
        return;
      }

      // 2. Get the user's role from profiles
      const { data: profile, error: profileError } =
        await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', data.user.id)
          .single();

      if (profileError) {
        setError(
          'Your account was found, but your profile could not be loaded.'
        );
        return;
      }

      // 3. Check whether the account is active
      if (profile.status !== 'active') {
        await supabase.auth.signOut();

        setError(
          'This account is currently inactive. Please contact support.'
        );
        return;
      }

      // 4. Redirect based on role
      if (profile.role === 'advertiser') {
        router.replace('/advertiser/dashboard');
      } else {
        router.replace('/dashboard');
      }

      router.refresh();
    } catch {
      setError(
        'Something went wrong. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f8f7]">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* Left Section */}
        <section className="relative hidden overflow-hidden bg-[#0b3939] px-12 py-14 lg:flex lg:flex-col lg:justify-between">
          {/* Background decorations */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

            <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl" />

            <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />

            <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />
          </div>

          {/* Logo */}
          <Link
            href="/"
            className="relative z-10 text-3xl font-bold tracking-tight text-white"
          >
            Gig<span className="text-emerald-300">Place</span>
          </Link>

          {/* Main content */}
          <div className="relative z-10 max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
              <Sparkles className="h-4 w-4 text-emerald-300" />
              Your opportunities are waiting
            </div>

            <h1 className="text-5xl font-bold leading-tight tracking-tight text-white">
              Welcome back to
              <span className="block text-emerald-300">
                GigPlace.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-white/70">
              Log in to discover tasks, track your earnings,
              manage campaigns, and continue growing on GigPlace.
            </p>

            {/* Benefits */}
            <div className="mt-10 space-y-4">
              <LoginFeature
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Secure account access"
                text="Your account is protected through Supabase Authentication."
              />

              <LoginFeature
                icon={<Sparkles className="h-5 w-5" />}
                title="Personalized dashboard"
                text="Access the dashboard designed for your account role."
              />
            </div>
          </div>

          <p className="relative z-10 text-sm text-white/45">
            © {new Date().getFullYear()} GigPlace.
            All rights reserved.
          </p>
        </section>

        {/* Right Section */}
        <section className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">

            {/* Mobile logo */}
            <Link
              href="/"
              className="mb-8 inline-block text-3xl font-bold tracking-tight text-[#0b3939] lg:hidden"
            >
              GigPlace
            </Link>

            {/* Login card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-9">

              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0b3939]">
                  Welcome back
                </p>

                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  Log in to your account
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Enter your account details to continue
                  your GigPlace journey.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                >
                  {error}
                </div>
              )}

              {/* Form */}
              <form
                onSubmit={handleLogin}
                className="mt-7 space-y-5"
              >

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Email address
                  </label>

                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-[#0b3939] focus-within:ring-4 focus-within:ring-[#0b3939]/10">
                    <Mail className="h-5 w-5 shrink-0 text-slate-400" />

                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(event.target.value)
                      }
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      disabled={loading}
                      className="w-full bg-transparent py-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="text-sm font-semibold text-slate-700"
                    >
                      Password
                    </label>

                    <Link
                      href="/forgot-password"
                      className="text-xs font-semibold text-[#0b3939] hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-[#0b3939] focus-within:ring-4 focus-within:ring-[#0b3939]/10">
                    <LockKeyhole className="h-5 w-5 shrink-0 text-slate-400" />

                    <input
                      id="password"
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      disabled={loading}
                      className="w-full bg-transparent py-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          !showPassword
                        )
                      }
                      disabled={loading}
                      className="text-slate-400 transition hover:text-[#0b3939]"
                      aria-label={
                        showPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Login button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b3939] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#062b2b] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    <>
                      Log in
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>

              {/* Signup link */}
              <p className="mt-7 text-center text-sm text-slate-500">
                Don&apos;t have an account?{' '}
                <Link
                  href="/signup"
                  className="font-semibold text-[#0b3939] hover:underline"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function LoginFeature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-emerald-300">
        {icon}
      </div>

      <div>
        <h3 className="font-semibold text-white">
          {title}
        </h3>

        <p className="mt-1 text-sm leading-6 text-white/55">
          {text}
        </p>
      </div>
    </div>
  );
}