
import type { ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, Route, Truck } from "lucide-react";
import { Link } from "react-router-dom";

import { BrandLogo } from "../ui/BrandLogo";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      {/* Left side: form area */}
      <div className="flex min-h-screen flex-col px-6 py-7 sm:px-12 lg:px-16">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" aria-label="Empty Miles Marketplace home">
            <BrandLogo />
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink hover:text-brand"
          >
            <ArrowLeft size={15} />
            Home
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-14">
          {children}
        </div>

        <p className="text-center font-mono text-[10px] text-muted">
          © {new Date().getFullYear()} Empty Miles Marketplace
        </p>
      </div>

      {/* Right side: static branded panel */}
      <aside className="relative hidden min-h-screen overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex justify-between">
          <span className="font-mono text-xs tracking-widest text-white/60">
            FREIGHT NETWORK / INDIA
          </span>
          <ArrowUpRight size={22} />
        </div>

        <div className="relative z-10">
          <div className="mb-10 inline-flex items-center gap-3 rounded-full border border-white/20 px-4 py-2">
            <Route size={16} className="text-brand" />
            <span className="text-xs uppercase tracking-wider text-white/70">
              Smarter Freight Connections
            </span>
          </div>

          <h2 className="font-display text-[clamp(4rem,6vw,8rem)] leading-[0.92] uppercase">
            MAKE
            <br />
            EVERY
            <br />
            <span className="text-brand">MILE</span>
            <br />
            COUNT.
          </h2>

          <p className="mt-8 max-w-sm text-sm leading-7 text-white/60">
            One marketplace connecting available truck
            capacity with shipments along existing routes.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/20 pt-6">
          <div className="flex items-center gap-3">
            <Truck size={23} strokeWidth={1.5} />
            <span className="text-xs uppercase tracking-widest text-white/60">
              Less Empty Space. More Opportunity.
            </span>
          </div>
          <span className="font-mono text-xs text-white/50">
            EM / 01
          </span>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 top-1/2 -translate-y-1/2 rotate-90 font-display text-[18rem] leading-none text-white/[0.035]"
        >
          FREIGHT
        </div>
      </aside>
    </div>
  );
}
