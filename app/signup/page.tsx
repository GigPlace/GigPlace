'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  ShieldCheck,
  User,
  UserRound,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';

type UserRole = 'user' | 'advertiser';

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSignup = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setLoading(true);
    setError('');
    setMessage('');

    const cleanUserName = userName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');

    if (!cleanUserName) {
      setError(
        'Username can only contain letters, numbers, and underscores.'
      );
      setLoading(false);
      return;
    }

    const { data, error: signupError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          user_name: cleanUserName,
          role,
        },
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError('We could not create your account. Please try again.');
      setLoading(false);
      return;
    }

    setMessage(
      'Your account has been created. Please check your email to confirm your account.'
    );

    setTimeout(() => {
      router.push('/login');
    }, 2500);

    setLoading(false);
  };

  return (
    <main className=" max-w-7xl m-auto bg-[#f4f8f7]">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left side */}
        <section className="relative hidden overflow-hidden bg-[#0b3939] px-12 py-14 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-white blur-3xl" />
            <div className="absolute -bottom-28 -right-20 h-96 w-96 rounded-full bg-emerald-300 blur-3xl" />
          </div>

          <Link
            href="/"
            className="relative z-10 text-3xl font-bold tracking-tight text-white"
          >
            Gig<span className="text-emerald-300">Place</span>
          </Link>

          <div className="relative z-10 max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white">
              <ShieldCheck className="h-4 w-4" />
              Secure and trusted task platform
            </div>

            <h1 className="text-5xl font-bold leading-tight text-white">
              Turn simple tasks into meaningful earnings.
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-white/75">
              Join GigPlace to discover campaigns, complete verified tasks,
              earn rewards, or promote your business through real user
              engagement.
            </p>

            <div className="mt-10 space-y-5">
              <Feature
                number="01"
                title="Discover opportunities"
                text="Browse available campaigns and find tasks that fit you."
              />

              <Feature
                number="02"
                title="Complete and submit"
                text="Follow the instructions and submit the required proof."
              />

              <Feature
                number="03"
                title="Earn and withdraw"
                text="Track approved earnings and request withdrawals."
              />
            </div>
          </div>

          <p className="relative z-10 text-sm text-white/50">
            © {new Date().getFullYear()} GigPlace. All rights reserved.
          </p>
        </section>

        {/* Right side */}
        <section className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-xl">
            <div className="mb-8 lg:hidden">
              <Link
                href="/"
                className="text-3xl font-bold tracking-tight text-[#0b3939]"
              >
                GigPlace
              </Link>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-9">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0b3939]">
                  Create your account
                </p>

                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  Join GigPlace today
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Create an account to start completing tasks or launching
                  campaigns.
                </p>
              </div>

              {error && (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {message && (
                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {message}
                </div>
              )}

              <form
                onSubmit={handleSignup}
                className="mt-7 space-y-5"
              >
                {/* Role */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    I want to join as
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <RoleButton
                      active={role === 'user'}
                      icon={<UserRound className="h-5 w-5" />}
                      title="Worker"
                      description="Complete tasks and earn"
                      onClick={() => setRole('user')}
                    />

                    <RoleButton
                      active={role === 'advertiser'}
                      icon={<BriefcaseBusiness className="h-5 w-5" />}
                      title="Advertiser"
                      description="Create campaigns"
                      onClick={() => setRole('advertiser')}
                    />
                  </div>
                </div>

                {/* Full name */}
                <InputField
                  label="Full name"
                  type="text"
                  value={fullName}
                  placeholder="Enter your full name"
                  icon={<User className="h-5 w-5" />}
                  onChange={setFullName}
                />

                {/* Username */}
                <InputField
                  label="Username"
                  type="text"
                  value={userName}
                  placeholder="e.g. kayode_dev"
                  icon={<UserRound className="h-5 w-5" />}
                  onChange={setUserName}
                />

                {/* Email */}
                <InputField
                  label="Email address"
                  type="email"
                  value={email}
                  placeholder="you@example.com"
                  icon={<Mail className="h-5 w-5" />}
                  onChange={setEmail}
                />

                {/* Password */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Password
                  </label>

                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-[#0b3939] focus-within:ring-4 focus-within:ring-[#0b3939]/10">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      placeholder="Create a secure password"
                      required
                      minLength={6}
                      className="w-full bg-transparent py-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
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

                  <p className="mt-2 text-xs text-slate-400">
                    Use at least 6 characters.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b3939] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#062b2b] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-7 text-center text-sm text-slate-500">
                Already have an account?{' '}
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

function InputField({
  label,
  type,
  value,
  placeholder,
  icon,
  onChange,
}: {
  label: string;
  type: string;
  value: string;
  placeholder: string;
  icon: React.ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-[#0b3939] focus-within:ring-4 focus-within:ring-[#0b3939]/10">
        <span className="text-slate-400">{icon}</span>

        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required
          className="w-full bg-transparent py-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>
    </div>
  );
}

function RoleButton({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        active
          ? 'border-[#0b3939] bg-[#0b3939]/5 ring-2 ring-[#0b3939]/10'
          : 'border-slate-200 bg-white hover:border-[#0b3939]/40'
      }`}
    >
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${
          active
            ? 'bg-[#0b3939] text-white'
            : 'bg-slate-100 text-slate-500'
        }`}
      >
        {icon}
      </div>

      <p className="font-semibold text-slate-800">
        {title}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </button>
  );
}

function Feature({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xs font-bold text-emerald-200">
        {number}
      </span>

      <div>
        <h3 className="font-semibold text-white">
          {title}
        </h3>

        <p className="mt-1 text-sm leading-6 text-white/60">
          {text}
        </p>
      </div>
    </div>
  );
}