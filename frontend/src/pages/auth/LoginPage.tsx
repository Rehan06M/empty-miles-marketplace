
import { useState } from "react";
import type { FormEvent } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";

import { AuthLayout } from "../../components/layout/AuthLayout";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { isValidEmail } from "../../utils/authValidation";

type LoginErrors = {
  email?: string;
  password?: string;
};

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [notice, setNotice] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    const nextErrors: LoginErrors = {};

    if (!isValidEmail(email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    // Step 7: validation only.
    // Never simulate a successful authenticated session.
    setNotice(
      "Form validated. Account sign-in will be enabled when the backend authentication API is connected in Step 12."
    );
  }

  return (
    <AuthLayout>
      <div className="mb-9">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line px-4 py-2">
          <LockKeyhole size={14} className="text-brand" />
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            Marketplace Access
          </span>
        </div>

        <h1 className="font-display text-5xl uppercase leading-tight text-ink sm:text-6xl">
          WELCOME <span className="text-brand">BACK.</span>
        </h1>

        <p className="mt-3 text-sm text-muted">
          Enter your details to access your marketplace account.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <TextField
          label="Email Address"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setErrors((current) => ({
              ...current,
              email: undefined,
            }));
            setNotice("");
          }}
          error={errors.email}
          required
        />

        <div>
          <div className="relative">
            <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrors((current) => ({
                  ...current,
                  password: undefined,
                }));
                setNotice("");
              }}
              error={errors.password}
              className="pr-14"
              required
            />

            <button
              type="button"
              className="absolute right-4 top-[42px] text-muted hover:text-ink"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeOff size={19} />
              ) : (
                <Eye size={19} />
              )}
            </button>
          </div>
        </div>

        <p className="text-right text-xs text-muted">
          Password recovery will be available after
          authentication is connected.
        </p>

        <Button type="submit" className="w-full">
          Sign In
        </Button>

        {notice && (
          <div
            role="status"
            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800"
          >
            {notice}
          </div>
        )}
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        New to Empty Miles?{" "}
        <Link
          to="/register"
          className="font-semibold text-brand hover:underline"
        >
          Create an account
        </Link>
      </p>

      <p className="mt-8 border-t border-line pt-5 text-center text-xs text-muted">
        UI preview only — live account authentication
        is not enabled yet.
      </p>
    </AuthLayout>
  );
}
