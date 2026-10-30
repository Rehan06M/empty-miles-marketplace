
import { ArrowUpRight } from "lucide-react";
import { FreightScrollHero } from "../../components/landing/FreightScrollHero";

export function LandingPage() {
    return (
        <main>
            <FreightScrollHero />

            <section
                id="how-it-works"
                className="bg-white px-6 py-24"
            >
                <div className="mx-auto max-w-6xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                        Built for Smarter Road Freight
                    </p>

                    <h2 className="mt-6 max-w-4xl font-display text-5xl uppercase leading-none text-ink md:text-7xl">
                        LESS WASTED SPACE.
                        <br />
                        MORE USEFUL JOURNEYS.
                    </h2>

                    <p className="mt-8 max-w-2xl text-base leading-7 text-muted">
                        Shippers discover compatible capacity.
                        Carriers publish their available space.
                        Our marketplace helps connect both sides
                        along existing routes.
                    </p>

                    <a
                        id="get-started"
                        href="/register"
                        className="mt-10 inline-flex items-center gap-3 rounded-full bg-brand px-7 py-4 text-xs font-semibold uppercase tracking-wider text-white hover:bg-brand-hover"
                    >
                        Join the Marketplace
                        <ArrowUpRight size={18} />
                    </a>
                </div>
            </section>
        </main>
    );
}
