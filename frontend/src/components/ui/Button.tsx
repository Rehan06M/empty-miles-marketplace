
import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

type ButtonVariant = "primary" | "outline" | "dark";

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const styles: Record<ButtonVariant, string> = {
  primary:
    "border-brand bg-brand text-white hover:bg-brand-hover",
  outline:
    "border-line bg-white text-ink hover:bg-canvas",
  dark:
    "border-ink bg-ink text-white hover:bg-neutral-800",
};

export function Button({
  variant = "primary",
  children,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex min-h-11 items-center justify-center",
        "gap-2 rounded-full border px-6 py-3",
        "text-xs font-semibold uppercase tracking-[0.1em]",
        "transition-colors duration-200",
        "disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
