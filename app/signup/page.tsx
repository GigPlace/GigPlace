'use client';

import { useState, FormEvent, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  ShieldCheck,
  User,
  UserRound,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import {
  NATIONALITIES,
  NIGERIAN_STATES,
  NIGERIAN_STATE_NAMES,
} from '@/lib/admin/nigeria-locations';

interface FormData {
  fullName: string;
  userName: string;
  email: string;
  phone: string;
  nationality: string;
  state: string;
  lga: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  fullName?: string;
  userName?: string;
  email?: string;
  phone?: string;
  nationality?: string;
  state?: string;
  lga?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export default function SignupPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    userName: '',
    email: '',
    phone: '',
    nationality: '',
    state: '',
    lga: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const lgaOptions = useMemo(() => {
    if (!formData.state || !(formData.state in NIGERIAN_STATES)) {
      return [];
    }
    return NIGERIAN_STATES[formData.state as keyof typeof NIGERIAN_STATES];
  }, [formData.state]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'state') {
        updated.lga = '';
      }
      return updated;
    });

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (name === 'state' && errors.lga) {
      setErrors((prev) => ({ ...prev, lga: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    const cleanUserName = formData.userName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');

    if (!cleanUserName) {
      newErrors.userName =
        'Username can only contain letters, numbers, and underscores';
    } else if (cleanUserName.length < 3) {
      newErrors.userName = 'Username must be at least 3 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.nationality) {
      newErrors.nationality = 'Nationality is required';
    }

    if (!formData.state) {
      newErrors.state = 'State is required';
    }

    if (!formData.lga) {
      newErrors.lga = 'LGA is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrors({});

    if (!validateForm()) return;

    setIsLoading(true);

    const cleanUserName = formData.userName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim(),
            user_name: cleanUserName,
            phone: formData.phone.trim(),
            nationality: formData.nationality,
            state: formData.state,
            lga: formData.lga,
            role: 'user',
          },
        },
      });

      if (error) {
        setErrors({ general: error.message });
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        setErrors({
          general: 'We could not create your account. Please try again.',
        });
        setIsLoading(false);
        return;
      }

      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: formData.fullName.trim(),
        user_name: cleanUserName,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        nationality: formData.nationality,
        state: formData.state,
        lga: formData.lga,
        role: 'user',
        status: 'active',
      });

      if (profileError) {
        if (profileError.message.includes('user_name')) {
          setErrors({ userName: 'This username is already taken' });
        } else {
          setErrors({ general: profileError.message });
        }
        setIsLoading(false);
        return;
      }

      setSuccessMessage(
        'Account created! Please check your email to confirm.'
      );

      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch {
      setErrors({
        general: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const inputBase =
    'w-full rounded-lg border bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-[#0b3939] focus:ring-2 focus:ring-[#0b3939]/10';
  const inputError = 'border-red-400';
  const inputNormal = 'border-slate-200';

  return (
    <main className="h-screen max-w-7xl mx-auto bg-[#f4f8f7] overflow-hidden">
      <div className="grid h-full lg:grid-cols-2">
        {/* Left side - compact */}
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
              Secure & trusted platform
            </div>

            <h1 className="text-3xl font-bold leading-snug text-white">
              Turn simple tasks into meaningful earnings.
            </h1>

            <p className="mt-3 text-sm leading-5 text-white/70">
              Discover campaigns, complete tasks, earn rewards, or promote your
              business.
            </p>

            <div className="mt-6 space-y-3">
              <Feature number="01" title="Discover opportunities" />
              <Feature number="02" title="Complete and submit" />
              <Feature number="03" title="Earn and withdraw" />
            </div>
          </div>

          <p className="relative z-10 text-xs text-white/50">
            © {new Date().getFullYear()} GigPlace
          </p>
        </section>

        {/* Right side - Form (scrollable only if needed) */}
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
                  Create account
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                  Join GigPlace
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Start completing tasks or launching campaigns.
                </p>
              </div>

              {successMessage && (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  {successMessage}
                </div>
              )}

              {errors.general && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {errors.general}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                {/* Full Name + Username */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Full name
                    </label>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 transition focus-within:border-[#0b3939] focus-within:ring-2 focus-within:ring-[#0b3939]/10">
                      <User className="h-4 w-4 shrink-0 text-slate-400" />
                      <input
                        name="fullName"
                        type="text"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="Full name"
                        className="w-full bg-transparent py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      />
                    </div>
                    {errors.fullName && (
                      <p className="mt-1 text-[11px] text-red-600">
                        {errors.fullName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Username
                    </label>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 transition focus-within:border-[#0b3939] focus-within:ring-2 focus-within:ring-[#0b3939]/10">
                      <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
                      <input
                        name="userName"
                        type="text"
                        value={formData.userName}
                        onChange={handleChange}
                        placeholder="e.g. kayode_dev"
                        className="w-full bg-transparent py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      />
                    </div>
                    {errors.userName && (
                      <p className="mt-1 text-[11px] text-red-600">
                        {errors.userName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email + Phone */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Email
                    </label>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 transition focus-within:border-[#0b3939] focus-within:ring-2 focus-within:ring-[#0b3939]/10">
                      <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                      <input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        className="w-full bg-transparent py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-[11px] text-red-600">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Phone
                    </label>
                    <input
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+234 800 000 0000"
                      className={`${inputBase} ${
                        errors.phone ? inputError : inputNormal
                      }`}
                    />
                    {errors.phone && (
                      <p className="mt-1 text-[11px] text-red-600">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Nationality */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Nationality
                  </label>
                  <select
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleChange}
                    className={`${inputBase} ${
                      errors.nationality ? inputError : inputNormal
                    }`}
                  >
                    <option value="">Select nationality</option>
                    {NATIONALITIES.map((nat) => (
                      <option key={nat} value={nat}>
                        {nat}
                      </option>
                    ))}
                  </select>
                  {errors.nationality && (
                    <p className="mt-1 text-[11px] text-red-600">
                      {errors.nationality}
                    </p>
                  )}
                </div>

                {/* State & LGA */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      State
                    </label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className={`${inputBase} ${
                        errors.state ? inputError : inputNormal
                      }`}
                    >
                      <option value="">Select state</option>
                      {NIGERIAN_STATE_NAMES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                    {errors.state && (
                      <p className="mt-1 text-[11px] text-red-600">
                        {errors.state}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      LGA
                    </label>
                    <select
                      name="lga"
                      value={formData.lga}
                      onChange={handleChange}
                      disabled={!formData.state}
                      className={`${inputBase} disabled:cursor-not-allowed disabled:opacity-60 ${
                        errors.lga ? inputError : inputNormal
                      }`}
                    >
                      <option value="">
                        {formData.state ? 'Select LGA' : 'Select state first'}
                      </option>
                      {lgaOptions.map((lga) => (
                        <option key={lga} value={lga}>
                          {lga}
                        </option>
                      ))}
                    </select>
                    {errors.lga && (
                      <p className="mt-1 text-[11px] text-red-600">
                        {errors.lga}
                      </p>
                    )}
                  </div>
                </div>

                {/* Password + Confirm */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Min. 6 characters"
                        className={`${inputBase} pr-10 ${
                          errors.password ? inputError : inputNormal
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0b3939]"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-[11px] text-red-600">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Confirm password
                    </label>
                    <div className="relative">
                      <input
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirm password"
                        className={`${inputBase} pr-10 ${
                          errors.confirmPassword ? inputError : inputNormal
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0b3939]"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-[11px] text-red-600">
                        {errors.confirmPassword}
                      </p>
                    )}
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
                      Creating...
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-4 text-center text-xs text-slate-500">
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

function Feature({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[10px] font-bold text-emerald-200">
        {number}
      </span>
      <h3 className="text-sm font-medium text-white">{title}</h3>
    </div>
  );
}