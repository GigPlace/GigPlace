"use client";

import { PASSWORD_REQUIREMENTS } from "@/lib/admin/constants";
import { Check, X } from "lucide-react";

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const passed = PASSWORD_REQUIREMENTS.filter((r) => r.test(password)).length;
  const strength =
    passed === 0
      ? 0
      : passed <= 1
        ? 1
        : passed === 2
          ? 2
          : passed === 3
            ? 3
            : 4;

  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = [
    "bg-gray-200",
    "bg-red-500",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-emerald-500",
  ];

  return (
    <div className="space-y-2 pt-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= strength ? colors[strength] : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      {strength > 0 && (
        <p className="text-xs text-gray-500">
          Strength: <span className="font-medium">{labels[strength]}</span>
        </p>
      )}
      <ul className="space-y-1">
        {PASSWORD_REQUIREMENTS.map((req) => {
          const ok = req.test(password);
          return (
            <li
              key={req.id}
              className={`flex items-center gap-1.5 text-xs ${
                ok ? "text-emerald-600" : "text-gray-400"
              }`}
            >
              {ok ? (
                <Check className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <X className="h-3.5 w-3.5 shrink-0" />
              )}
              {req.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}