
import type {
  InputHTMLAttributes,
} from "react";
import { useId } from "react";

interface TextFieldProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function TextField({
  label,
  error,
  id,
  className = "",
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={inputId}
        className="text-sm font-semibold text-ink"
      >
        {label}
      </label>

      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={[
          "min-h-12 w-full rounded-lg border bg-white",
          "px-4 text-sm text-ink outline-none",
          "placeholder:text-neutral-400",
          "focus:border-brand focus:ring-2 focus:ring-brand/15",
          error ? "border-red-500" : "border-line",
          className,
        ].join(" ")}
        {...props}
      />

      {error && (
        <p id={errorId} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
