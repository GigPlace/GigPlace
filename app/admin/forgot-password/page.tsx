"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { Loader2, ShieldCheck, ArrowLeft, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/admin/reset-password`,
        }
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSuccessMessage(
        "If an account exists with this email, you will receive a password reset link shortly. Please check your inbox (and spam folder)."
      );
      setEmail("");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
              Secure password recovery
            </div>

            <h1 className="text-3xl font-bold leading-tight text-white">
              Reset your admin password securely.
            </h1>

            <p className="mt-6 max-w-lg text-xs leading-7 text-white/75">
              Enter the email associated with your administrator account. We’ll
              send you a secure link to create a new password.
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
                Forgot Password
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Enter your email and we’ll send you a reset link.
              </p>
            </div>

            {successMessage && (
              <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                {successMessage}
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    className={`w-full rounded-lg border px-3 py-2.5 pl-10 text-sm outline-none transition focus:ring-2 focus:ring-[#0b3939]/20 focus:border-[#0b3939] ${
                      error ? "border-red-400" : "border-gray-300"
                    }`}
                    placeholder="admin@gigplace.com"
                    autoComplete="email"
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#0b3939] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#062828] focus:outline-none focus:ring-2 focus:ring-[#0b3939]/20 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending link...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
              <Link
                href="/admin/login"
                className="inline-flex items-center gap-1.5 font-medium text-[#0b3939] hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}