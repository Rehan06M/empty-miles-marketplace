
import { useEffect, useState } from "react";
import { Truck, CheckCircle2, AlertCircle } from "lucide-react";

type HealthResponse = {
  success: boolean;
  message: string;
  service: string;
  status: string;
};

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(
    null
  );

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function checkBackend() {
      try {
        const response = await fetch("/api/v1/health", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Backend request failed");
        }

        const data: HealthResponse = await response.json();

        if (!controller.signal.aborted) {
          setHealth(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unknown connection error"
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    checkBackend();

    return () => controller.abort();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900 p-8 text-white shadow-2xl">
        <div className="mb-6 inline-flex rounded-2xl bg-blue-500/10 p-4 text-blue-400">
          <Truck size={36} />
        </div>

        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-400">
          Project Foundation
        </p>

        <h1 className="mb-3 text-3xl font-bold">
          Empty Miles Marketplace
        </h1>

        <p className="mb-8 text-slate-400">
          Connecting unused truck capacity with freight
          opportunities.
        </p>

        <div className="rounded-xl border border-white/10 bg-slate-950 p-5">
          <h2 className="mb-3 text-lg font-semibold">
            Backend Connection
          </h2>

          {loading && (
            <p className="text-slate-400">
              Checking backend connection...
            </p>
          )}

          {!loading && health && (
            <div className="flex items-start gap-3 text-emerald-400">
              <CheckCircle2 size={22} />

              <div>
                <p className="font-semibold">
                  Connected successfully
                </p>

                <p className="mt-1 text-sm text-slate-300">
                  {health.message}
                </p>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="flex items-start gap-3 text-red-400">
              <AlertCircle size={22} />

              <div>
                <p className="font-semibold">
                  Connection failed
                </p>

                <p className="mt-1 text-sm text-slate-300">
                  {error}
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Step 4 — Frontend and backend integration test
        </p>
      </section>
    </main>
  );
}

export default App;
