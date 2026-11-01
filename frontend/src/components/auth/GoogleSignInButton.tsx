
import {
  useEffect,
  useRef,
  useState,
} from "react";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccountsId = {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
  }) => void;

  renderButton: (
    element: HTMLElement,
    options: {
      type: "standard";
      theme: "outline";
      size: "large";
      text: "continue_with";
      shape: "pill";
      width: number;
    }
  ) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => Promise<void>;
  disabled?: boolean;
}

const GOOGLE_SCRIPT =
  "https://accounts.google.com/gsi/client";

let scriptPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_SCRIPT}"]`
    );

    const script = existing ?? document.createElement("script");

    const loaded = () => {
      cleanup();
      resolve();
    };

    const failed = () => {
      cleanup();
      scriptPromise = null;
      reject(new Error("Google Sign-In could not load"));
    };

    function cleanup() {
      script.removeEventListener("load", loaded);
      script.removeEventListener("error", failed);
    }

    script.addEventListener("load", loaded);
    script.addEventListener("error", failed);

    if (!existing) {
      script.src = GOOGLE_SCRIPT;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  return scriptPromise;
}

export function GoogleSignInButton({
  onCredential,
  disabled = false,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      return;
    }

    loadGoogleScript()
      .then(() => {
        if (
          cancelled ||
          !window.google ||
          !containerRef.current
        ) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          auto_select: false,
          callback: (response) => {
            if (
              cancelled ||
              disabled ||
              !response.credential
            ) {
              return;
            }

            void onCredential(response.credential);
          },
        });

        containerRef.current.replaceChildren();

        window.google.accounts.id.renderButton(
          containerRef.current,
          {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "pill",
            width: 300,
          }
        );
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "Google Sign-In could not load. Please try again."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [onCredential, disabled]);

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return (
      <p className="text-xs text-amber-700">
        Google Sign-In is not configured.
        Add VITE_GOOGLE_CLIENT_ID to frontend/.env.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className={
          disabled
            ? "pointer-events-none opacity-50"
            : ""
        }
      />

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
