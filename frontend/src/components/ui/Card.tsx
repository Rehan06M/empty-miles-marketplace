
import type {
  HTMLAttributes,
  ReactNode,
} from "react";

interface CardProps
  extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({
  children,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={[
        "rounded-xl border border-line bg-white",
        "p-6 shadow-[0_8px_32px_rgba(0,0,0,0.025)]",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
