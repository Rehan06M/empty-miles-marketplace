
import { useEffect, useState } from "react";
import { DesignSystemPreview } from "./pages/public/DesignSystemPreview";

function App() {
  const [backendStatus, setBackendStatus] =
    useState("Checking backend...");

  useEffect(() => {
    const controller = new AbortController();

    async function checkBackend() {
      try {
        const response = await fetch("/api/v1/health", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Backend unavailable");
        }

        const data: { success: boolean } =
          await response.json();

        if (!controller.signal.aborted) {
          setBackendStatus(
            data.success
              ? "Backend connected"
              : "Backend reported an error"
          );
        }
      } catch {
        if (!controller.signal.aborted) {
          setBackendStatus("Backend disconnected");
        }
      }
    }

    checkBackend();

    return () => controller.abort();
  }, []);

  return (
    <>
      <DesignSystemPreview />

      <div
        role="status"
        className="fixed bottom-4 right-4 z-50 rounded-full border border-line bg-white px-4 py-2 font-mono text-[10px] text-ink shadow-lg"
      >
        {backendStatus}
      </div>
    </>
  );
}

export default App;
