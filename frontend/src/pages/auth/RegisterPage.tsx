
import { useState } from "react";
import type { FormEvent } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Package,
  Truck,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { AuthLayout } from "../../components/layout/AuthLayout";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import {
  isAccountRole,
  isValidEmail,
  validatePassword,
} from "../../utils/authValidation";
import type { AccountRole } from "../../utils/authValidation";

type RegistrationErrors = {
  role?: string;
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
};

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get("role");

  const [role, setRole] = useState<AccountRole | null>(
    isAccountRole(requestedRole) ? requestedRole : null
  );
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [notice, setNotice] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    const nextErrors: RegistrationErrors = {};

    if (!role) {
      nextErrors.role = "Select an account type.";
    }

    if (name.trim().length < 2) {
      nextErrors.name = "Enter your full name.";
    }

    if (company.trim().length < 2) {
      nextErrors.company = "Enter your company or business name.";
    }

    if (!isValidEmail(email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      nextErrors.phone =
        "Enter a valid 10-digit Indian mobile number.";
    }

    nextErrors.password = validatePassword(password);

    if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    if (!acceptedTerms) {
      nextErrors.terms = "Please acknowledge the demo notice.";
    }

    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    // Never store passwords or pretend an account was created.
    setNotice(
      "Your registration details passed frontend validation. Account creation will be enabled when the backend API is connected in Step 12."
    );
  }

  return (
    <AuthLayout>
      <div className="mb-8">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
          Join Empty Miles
        </p>

        <h1 className="font-display text-5xl uppercase text-ink sm:text-6xl">
          JOIN THE <span className="text-brand">NETWORK.</span>
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted">
          Create your profile and help make every mile count.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-ink">
            I want to join as
          </legend>

          <div className="grid gap-3 sm:grid-cols-2">
            {([
              {
                value: "shipper" as const,
                label: "Shipper",
                description: "I need to move freight",
                icon: Package,
              },
              {
                value: "carrier" as const,
                label: "Carrier",
                description: "I have truck capacity",
                icon: Truck,
              },
            ]).map((option) => {
              const Icon = option.icon;
              const selected = role === option.value;

              return (
                <label
                  key={option.value}
                  className={[
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                    selected
                      ? "border-brand bg-blue-50"
                      : "border-line bg-white hover:border-neutral-400",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={selected}
                    onChange={() => {
                      setRole(option.value);
                      setErrors((current) => ({
                        ...current,
                        role: undefined,
                      }));
                      setNotice("");
                    }}
                    className="mt-1 accent-[#2f63ff]"
                    required
                  />

                  <div>
                    <Icon
                      size={22}
                      className={selected ? "text-brand" : "text-ink"}
                    />
                    <p className="mt-2 text-sm font-semibold text-ink">
                      {option.label}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {option.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          {errors.role && (
            <p role="alert" className="mt-2 text-xs text-red-600">
              {errors.role}
            </p>
          )}
        </fieldset>

        <TextField
          label="Full Name"
          name="name"
          autoComplete="name"
          placeholder="Your full name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.name}
          required
        />

        <TextField
          label="Company / Business Name"
          name="company"
          autoComplete="organization"
          placeholder="Your business name"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
          error={errors.company}
          required
        />

        <TextField
          label="Email Address"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
          required
        />

        <TextField
          label="Mobile Number"
          type="tel"
          name="phone"
          autoComplete="tel"
          placeholder="10-digit mobile number"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          error={errors.phone}
          required
        />

        <div className="relative">
          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="new-password"
            placeholder="Create a strong password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
            className="pr-14"
            required
          />

          <button
            type="button"
            className="absolute right-4 top-[42px] text-muted hover:text-ink"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        </div>

        <p className="text-xs leading-5 text-muted">
          Use at least 8 characters, including uppercase,
          lowercase, and a number.
        </p>

        <TextField
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={errors.confirmPassword}
          required
        />

        <label className="flex items-start gap-3 text-sm text-muted">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) =>
              setAcceptedTerms(event.target.checked)
            }
            className="mt-1 accent-[#2f63ff]"
          />
          <span>
            I understand this is a frontend demonstration.
            No account will be created at this stage.
          </span>
        </label>

        {errors.terms && (
          <p role="alert" className="text-xs text-red-600">
            {errors.terms}
          </p>
        )}

        <Button type="submit" className="w-full">
          Validate Registration
          <CheckCircle2 size={17} />
        </Button>

        {notice && (
          <div
            role="status"
            className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800"
          >
            {notice}
          </div>
        )}
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Already registered?{" "}
        <Link
          to="/login"
          className="font-semibold text-brand hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
