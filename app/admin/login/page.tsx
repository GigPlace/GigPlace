// app/admin/login/page.tsx
"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrors({ general: error.message });
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        setErrors({ general: "Unable to sign in. Please try again." });
        setIsLoading(false);
        return;
      }

      // Optional: verify this user has an admin profile
      const { data: profile, error: profileError } = await supabase
        .from("admin_profiles")
        .select("id, status, role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setErrors({
          general: "No admin account found for this user.",
        });
        setIsLoading(false);
        return;
      }

      if (profile.status === "pending") {
        await supabase.auth.signOut();
        setErrors({
          general:
            "Your admin account is still awaiting approval. Please try again later.",
        });
        setIsLoading(false);
        return;
      }

      if (profile.status === "rejected" || profile.status === "suspended") {
        await supabase.auth.signOut();
        setErrors({
          general: "Your admin account is not active. Contact support.",
        });
        setIsLoading(false);
        return;
      }

      // Success — redirect to admin area
      router.push("/admin/dashboard");
    } catch {
      setErrors({
        general: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="max-w-7xl m-auto bg-[#f4f8f7]">
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
              Secure admin access
            </div>

            <h1 className="text-5xl font-bold leading-tight text-white">
              Welcome back to the admin panel.
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-white/75">
              Sign in to manage campaigns, users, tasks, and the overall
              GigPlace platform with confidence and control.
            </p>

            <div className="mt-10 space-y-5">
              <Feature
                number="01"
                title="Secure sign-in"
                text="Authenticate with your approved admin credentials."
              />
              <Feature
                number="02"
                title="Full platform control"
                text="Oversee users, campaigns, and platform operations."
              />
              <Feature
                number="03"
                title="Real-time insights"
                text="Monitor activity and keep GigPlace running smoothly."
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
                Gig<span className="text-emerald-500">Place</span>
              </Link>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-9">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0b3939]">
                  Admin access
                </p>

                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  Sign in to Admin
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Enter your credentials to access the GigPlace admin panel.
                </p>
              </div>

              {errors.general && (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errors.general}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                {/* Email */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Email address
                  </label>
                  <div
                    className={`flex items-center gap-3 rounded-xl border bg-slate-50 px-4 transition focus-within:border-[#0b3939] focus-within:ring-4 focus-within:ring-[#0b3939]/10 ${
                      errors.email ? "border-red-300" : "border-slate-200"
                    }`}
                  >
                    <span className="text-slate-400">
                      <Mail className="h-5 w-5" />
                    </span>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) {
                          setErrors((prev) => ({ ...prev, email: undefined }));
                        }
                      }}
                      placeholder="admin@gigplace.com"
                      className="w-full bg-transparent py-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  <div
                    className={`flex items-center rounded-xl border bg-slate-50 px-4 transition focus-within:border-[#0b3939] focus-within:ring-4 focus-within:ring-[#0b3939]/10 ${
                      errors.password ? "border-red-300" : "border-slate-200"
                    }`}
                  >
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) {
                          setErrors((prev) => ({
                            ...prev,
                            password: undefined,
                          }));
                        }
                      }}
                      placeholder="Enter your password"
                      className="w-full bg-transparent py-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 transition hover:text-[#0b3939]"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1.5 text-xs text-red-600">
                      {errors.password}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b3939] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#062b2b] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-7 text-center text-sm text-slate-500">
                Don&apos;t have an admin account?{" "}
                <Link
                  href="/admin/signup"
                  className="font-semibold text-[#0b3939] hover:underline"
                >
                  Create Admin Account
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
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
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-white/60">{text}</p>
      </div>
    </div>
  );
}