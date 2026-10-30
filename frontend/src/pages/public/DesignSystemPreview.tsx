
import {
  ArrowRight,
  MapPinned,
  Package,
  Truck,
} from "lucide-react";

import { BrandLogo } from "../../components/ui/BrandLogo";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { TextField } from "../../components/ui/TextField";

export function DesignSystemPreview() {
  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-line">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <BrandLogo />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            Design System / 01
          </span>
        </nav>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Smarter Freight. Fewer Empty Miles.
        </p>

        <h1 className="max-w-5xl font-display text-[clamp(3.5rem,9vw,9rem)] leading-[0.95] uppercase">
          EVERY EMPTY
          <br />
          MILE IS AN
          <br />
          <span className="text-brand">OPPORTUNITY.</span>
        </h1>

        <p className="mt-8 max-w-xl text-base leading-7 text-muted">
          Connect available truck capacity with freight
          opportunities along existing journeys.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={() =>
            document.getElementById("components")
              ?.scrollIntoView({ behavior: "smooth" })
          }>
            Explore Platform <ArrowRight size={16} />
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              document.getElementById("components")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            View Components
          </Button>
        </div>
      </section>

      <section
        id="components"
        className="bg-ink px-6 py-20 text-white"
      >
        <div className="mx-auto max-w-7xl">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
            Marketplace Capabilities
          </p>

          <h2 className="font-display text-5xl uppercase leading-none md:text-7xl">
            ONE SMART
            <br />
            <span className="text-brand">MARKETPLACE.</span>
          </h2>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                icon: <MapPinned size={34} />,
                title: "SMART ROUTE MATCHING",
                body: "Find compatible full-route, partial-route and detour shipments.",
              },
              {
                icon: <Truck size={34} />,
                title: "EMPTY TRUCK CAPACITY",
                body: "Turn unused capacity on existing journeys into new opportunities.",
              },
              {
                icon: <Package size={34} />,
                title: "EASIER BOOKINGS",
                body: "Request space, receive carrier approval and track shipment status.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="border-t border-white/20 pt-6"
              >
                <div className="mb-8 text-white">
                  {feature.icon}
                </div>

                <h3 className="font-display text-3xl leading-tight">
                  {feature.title}
                </h3>

                <p className="mt-4 text-sm leading-6 text-white/60">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-canvas px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-5xl uppercase">
            DASHBOARD COMPONENTS
          </h2>

          <p className="mt-3 text-muted">
            The same visual identity, without cinematic animations.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <Card>
              <p className="text-sm text-muted">
                Active Shipments
              </p>
              <p className="mt-3 font-display text-5xl">
                12
              </p>
              <div className="mt-5">
                <Badge variant="success">Active</Badge>
              </div>
            </Card>

            <Card>
              <p className="text-sm text-muted">
                Available Matches
              </p>
              <p className="mt-3 font-display text-5xl">
                08
              </p>
              <div className="mt-5">
                <Badge variant="info">Matched</Badge>
              </div>
            </Card>

            <Card>
              <p className="text-sm text-muted">
                Booking Requests
              </p>
              <p className="mt-3 font-display text-5xl">
                03
              </p>
              <div className="mt-5">
                <Badge variant="warning">
                  Pending Approval
                </Badge>
              </div>
            </Card>
          </div>

          <div className="mt-8 max-w-lg">
            <Card>
              <h3 className="mb-6 text-lg font-bold">
                Example Shipment Form
              </h3>

              <div className="space-y-5">
                <TextField
                  label="Pickup Location"
                  placeholder="Mumbai, Maharashtra"
                />

                <TextField
                  label="Delivery Location"
                  placeholder="Lonavala, Maharashtra"
                />

                <Button
                  className="w-full"
                  onClick={() =>
                    window.alert(
                      "Form submission will be implemented in Step 9."
                    )
                  }
                >
                  Find Available Trucks
                </Button>
              </div>
            </Card>
          </div>

          <p className="mt-5 text-xs text-muted">
            All counts and shipment fields above are demonstration data.
          </p>
        </div>
      </section>
    </main>
  );
}
