// app/admin/signup/page.tsx
"use client";

import { useState, FormEvent, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  NATIONALITIES,
  NIGERIAN_STATES,
  NIGERIAN_STATE_NAMES,
} from "@/lib/admin/nigeria-locations";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  state: string;
  lga: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  nationality?: string;
  state?: string;
  lga?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export default function AdminSignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    nationality: "",
    state: "",
    lga: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // LGA options based on selected state
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

      // Reset LGA when state changes
      if (name === "state") {
        updated.lga = "";
      }

      return updated;
    });

    // Clear related errors
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (name === "state" && errors.lga) {
      setErrors((prev) => ({ ...prev, lga: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }
    if (!formData.nationality) {
      newErrors.nationality = "Nationality is required";
    }
    if (!formData.state) {
      newErrors.state = "State is required";
    }
    if (!formData.lga) {
      newErrors.lga = "Local Government Area is required";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrors({});

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            nationality: formData.nationality,
            state: formData.state,
            lga: formData.lga,
          },
        },
      });

      if (error) {
        setErrors({ general: error.message });
        setIsLoading(false);
        return;
      }

      if (data.user) {
        const { error: profileError } = await supabase
          .from("admin_profiles")
          .insert({
            id: data.user.id,
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            nationality: formData.nationality,
            state: formData.state,
            lga: formData.lga,
            role: "admin",
            status: "pending",
          });

        if (profileError) {
          setErrors({ general: profileError.message });
          setIsLoading(false);
          return;
        }

        setSuccessMessage(
          "Admin account created successfully. Your account is awaiting approval."
        );

        setTimeout(() => {
          router.push("/admin/login");
        }, 2000);
      }
    } catch {
      setErrors({
        general: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white">
              <ShieldCheck className="h-4 w-4" />
              Secure admin registration
            </div>

            <h1 className="text-3xl font-bold leading-tight text-white">
              Manage the GigPlace platform with confidence.
            </h1>

            <p className="mt-6 max-w-lg text-xs leading-7 text-white/75">
              Create an administrator account to oversee campaigns, users, tasks, and
              platform operations. Your account will be reviewed before full access is
              granted.
            </p>

            <div className="mt-10 space-y-3">
              <Feature
                number="01"
                title="Register securely"
                text="Submit your details to create a pending admin account."
              />

              <Feature
                number="02"
                title="Await approval"
                text="An existing administrator will review your request."
              />

              <Feature
                number="03"
                title="Manage the platform"
                text="Once approved, access tools to run GigPlace effectively."
              />
            </div>
          </div>
          <p className="relative z-10 text-sm text-white/50">
            © {new Date().getFullYear()} GigPlace. All rights reserved.
          </p>
        </section>
      <section className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        {/* Logo & Brand */}
        <div className="w-full max-w-xl">
            <div className="mb-8 lg:hidden">
              <Link
                href="/"
                className="text-3xl font-bold tracking-tight text-[#0b3939]"
              >
                GigPlace
              </Link>
            </div>


        {/* Card */}
        {/* <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Create Admin Account
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Register as an administrator to manage the GigPlace platform.
            </p>
          </div> */}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          {/* General Error */}
          {errors.general && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* First Name & Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#0b3939]/20 focus:border-[#0b3939] ${
                    errors.firstName ? "border-red-400" : "border-gray-300"
                  }`}
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#0b3939]/20 focus:border-[#0b3939] ${
                    errors.lastName ? "border-red-400" : "border-gray-300"
                  }`}
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#0b3939]/20 focus:border-[#0b3939] ${
                  errors.email ? "border-red-400" : "border-gray-300"
                }`}
                placeholder="admin@gigplace.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#0b3939]/20 focus:border-[#0b3939] ${
                  errors.phone ? "border-red-400" : "border-gray-300"
                }`}
                placeholder="+234 800 000 0000"
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
              )}
            </div>

            {/* Nationality */}
            <div>
              <label
                htmlFor="nationality"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nationality
              </label>
              <select
                id="nationality"
                name="nationality"
                value={formData.nationality}
                onChange={handleChange}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#0b3939]/20 focus:border-[#0b3939] bg-white ${
                  errors.nationality ? "border-red-400" : "border-gray-300"
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
                <p className="mt-1 text-xs text-red-600">{errors.nationality}</p>
              )}
            </div>

            {/* State & LGA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="state"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  State
                </label>
                <select
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#0b3939]/20 focus:border-[#0b3939] bg-white ${
                    errors.state ? "border-red-400" : "border-gray-300"
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
                  <p className="mt-1 text-xs text-red-600">{errors.state}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="lga"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Local Government Area
                </label>
                <select
                  id="lga"
                  name="lga"
                  value={formData.lga}
                  onChange={handleChange}
                  disabled={!formData.state}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#0b3939]/20 focus:border-[#0b3939] bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed ${
                    errors.lga ? "border-red-400" : "border-gray-300"
                  }`}
                >
                  <option value="">
                    {formData.state ? "Select LGA" : "Select state first"}
                  </option>
                  {lgaOptions.map((lga) => (
                    <option key={lga} value={lga}>
                      {lga}
                    </option>
                  ))}
                </select>
                {errors.lga && (
                  <p className="mt-1 text-xs text-red-600">{errors.lga}</p>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full rounded-lg border px-3 py-2.5 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-[#0b3939]/20 focus:border-[#0b3939] ${
                    errors.password ? "border-red-400" : "border-gray-300"
                  }`}
                  placeholder="••••••••"
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
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full rounded-lg border px-3 py-2.5 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-[#0b3939]/20 focus:border-[#0b3939] ${
                    errors.confirmPassword
                      ? "border-red-400"
                      : "border-gray-300"
                  }`}
                  placeholder="••••••••"
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
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#0b3939] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#062828] focus:outline-none focus:ring-2 focus:ring-[#0b3939]/20 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Admin Account"
              )}
            </button>
          </form>

          {/* Sign In Link */}
          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an admin account?{" "}
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