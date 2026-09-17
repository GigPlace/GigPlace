"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  // Check if user arrived via a valid recovery link
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // After clicking the email link, Supabase sets a recovery session
      if (session) {
        setIsValidSession(true);
      } else {
        // Also listen for the PASSWORD_RECOVERY event (more reliable)
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "PASSWORD_RECOVERY") {
            setIsValidSession(true);
          } else if (!session) {
            setIsValidSession(false);
          }
        });

        // Small delay to allow the hash/query params to be processed
        setTimeout(async () => {
          const {
            data: { session: current },
          } = await supabase.auth.getSession();
          if (!current) {
            setIsValidSession(false);
          }
        }, 800);

        return () => subscription.unsubscribe();
      }
    };

    checkSession();
  }, []);

  const validate = () => {
    if (!password) {
      setError("Password is required");
      return false;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!validate()) return;

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccessMessage(
        "Your password has been updated successfully. Redirecting to login..."
      );

      // Sign out the recovery session so they log in with the new password
      await supabase.auth.signOut();

      setTimeout(() => {
        router.push("/admin/login");
      }, 2000);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while checking the recovery session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f8f7]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0b3939]" />
      </div>
    );
  }

  // Invalid or expired link
  if (isValidSession === false) {
    return (
      <div className="max-w-6xl m-auto bg-[#f4f8f7]">
        <div className="grid min-h-screen lg:grid-cols-2">
          <section className="relative hidden overflow-hidden bg-[#0b3939] px-12 py-7 lg:flex lg:flex-col lg:justify-between">
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
              <h1 className="text-3xl font-bold leading-tight text-white">
                Password reset link invalid or expired.
              </h1>
              <p className="mt-6 text-xs leading-7 text-white/75">
                Please request a new password reset link.
              </p>
            </div>
            <p className="relative z-10 text-sm text-white/50">
              © {new Date().getFullYear()} GigPlace. All rights reserved.
            </p>
          </section>

          <section className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
            <div className="w-full max-w-xl text-center">
              <div className="mb-8 lg:hidden">
                <Link
                  href="/"
                  className="text-3xl font-bold tracking-tight text-[#0b3939]"
                >
                  GigPlace
                </Link>
              </div>

              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-4 text-sm text-red-700 mb-6">
                This password reset link is invalid or has expired.
              </div>

              <Link
                href="/admin/forgot-password"
                className="inline-flex items-center justify-center rounded-lg bg-[#0b3939] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#062828] transition"
              >
                Request a new link
              </Link>

              <p className="mt-6 text-sm text-gray-600">
                <Link
                  href="/admin/login"
                  className="font-medium text-[#0b3939] hover:underline"
                >
                  Back to Sign In
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl m-auto bg-[#f4f8f7]">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left panel */}
        <section className="relative hidden overflow-hidden bg-[#0b3939] px-12 py-7 lg:flex lg:flex-col lg:justify-between">
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
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white">
              <ShieldCheck className="h-4 w-4" />
              Secure password update
            </div>

            <h1 className="text-3xl font-bold leading-tight text-white">
              Choose a new password.
            </h1>

            <p className="mt-6 max-w-lg text-xs leading-7 text-white/75">
              Create a strong password to protect your administrator account.
            </p>
          </div>

          <p className="relative z-10 text-sm text-white/50">
            © {new Date().getFullYear()} GigPlace. All rights reserved.
          </p>
        </section>

        {/* Right panel */}
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

            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Reset Password
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Enter your new password below.
              </p>
            </div>

            {successMessage && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                {successMessage}
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError("");
                    }}
                    className={`w-full rounded-lg border px-3 py-2.5 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-[#0b3939]/20 focus:border-[#0b3939] ${
                      error ? "border-red-400" : "border-gray-300"
                    }`}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError("");
                    }}
                    className={`w-full rounded-lg border px-3 py-2.5 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-[#0b3939]/20 focus:border-[#0b3939] ${
                      error ? "border-red-400" : "border-gray-300"
                    }`}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
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
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#0b3939] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#062828] focus:outline-none focus:ring-2 focus:ring-[#0b3939]/20 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  "Update Password"
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
              Remember your password?{" "}
              <Link
                href="/admin/login"
                className="font-medium text-[#0b3939] hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}