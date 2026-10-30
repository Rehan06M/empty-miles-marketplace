
import { useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  BarChart3,
  CalendarCheck,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Package,
  Route,
  Settings2,
  ShieldCheck,
  Truck,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

type DashboardRole = "shipper" | "carrier" | "admin";

type NavigationItem = {
  label: string;
  icon: LucideIcon;
  to?: string;
};

interface DashboardLayoutProps {
  role: DashboardRole;
  title: string;
  description: string;
  children: ReactNode;
}

const roleConfig: Record<
  DashboardRole,
  {
    label: string;
    items: NavigationItem[];
  }
> = {
  shipper: {
    label: "Shipper Workspace",
    items: [
      {
        label: "Overview",
        icon: LayoutDashboard,
        to: "/demo/shipper",
      },
      { label: "My Loads", icon: Package },
      { label: "Find Matches", icon: Route },
      { label: "My Bookings", icon: CalendarCheck },
      { label: "Analytics", icon: BarChart3 },
    ],
  },
  carrier: {
    label: "Carrier Workspace",
    items: [
      {
        label: "Overview",
        icon: LayoutDashboard,
        to: "/demo/carrier",
      },
      { label: "My Trucks", icon: Truck },
      { label: "Empty Legs", icon: Route },
      { label: "Booking Requests", icon: ClipboardList },
      { label: "Analytics", icon: BarChart3 },
    ],
  },
  admin: {
    label: "Admin Workspace",
    items: [
      {
        label: "Overview",
        icon: LayoutDashboard,
        to: "/demo/admin",
      },
      { label: "Users", icon: Users },
      { label: "Marketplace", icon: Package },
      { label: "Bookings", icon: CalendarCheck },
      { label: "Reports", icon: BarChart3 },
      { label: "Settings", icon: Settings2 },
    ],
  },
};

export function DashboardLayout({
  role,
  title,
  description,
  children,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const config = roleConfig[role];

  const SidebarContent = () => (
    <>
      <div className="border-b border-white/10 px-6 py-7">
        <Link
          to="/"
          className="inline-flex items-center gap-3 text-white"
        >
          <span className="font-sans text-3xl font-semibold tracking-[-0.08em]">
            EM
          </span>
          <span className="border-l border-white/20 pl-3 text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-white/70">
            Empty Miles
            <br />
            Marketplace
          </span>
        </Link>
      </div>

      <div className="px-6 pt-8 pb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-white/40">
          {config.label}
        </p>
      </div>

      <nav
        aria-label={`${config.label} navigation`}
        className="flex-1 space-y-1 px-3"
      >
        {config.items.map((item) => {
          const Icon = item.icon;

          if (!item.to) {
            return (
              <div
                key={item.label}
                aria-disabled="true"
                title="Available in a future step"
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-4 py-3 text-sm text-white/35"
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{item.label}</span>
                <span className="ml-auto text-[9px] uppercase">
                  Soon
                </span>
              </div>
            );
          }

          return (
            <NavLink
              key={item.label}
              to={item.to}
              end
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand text-white"
                    : "text-white/65 hover:bg-white/10 hover:text-white",
                ].join(" ")
              }
            >
              <Icon size={19} strokeWidth={1.8} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="space-y-4 border-t border-white/10 p-5">
        <div className="flex items-start gap-3 rounded-lg bg-white/5 p-3">
          <ShieldCheck
            size={18}
            className="mt-0.5 shrink-0 text-brand"
          />
          <p className="text-xs leading-5 text-white/55">
            Demo workspace. No account is signed in and
            all dashboard data is illustrative.
          </p>
        </div>

        <Link
          to="/"
          className="flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white"
        >
          <ArrowLeft size={15} />
          Back to Website
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-canvas lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-ink lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            className="absolute inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />

          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-ink">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setSidebarOpen(false)}
              className="absolute right-4 top-7 text-white"
            >
              <X size={22} />
            </button>

            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="flex min-h-20 items-center justify-between gap-4 border-b border-line bg-white px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-ink hover:bg-canvas lg:hidden"
            >
              <Menu size={22} />
            </button>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                {config.label}
              </p>
              <p className="text-sm font-semibold text-ink">
                Dashboard
              </p>
            </div>
          </div>

          <span className="rounded-full border border-line px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Demo Mode
          </span>
        </header>

        <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
          <div className="mb-9">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
              {config.label} / Overview
            </p>

            <h1 className="font-display text-4xl uppercase leading-tight text-ink sm:text-5xl">
              {title}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              {description}
            </p>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
