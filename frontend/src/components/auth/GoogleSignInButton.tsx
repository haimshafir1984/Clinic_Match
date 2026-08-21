import { useEffect, useRef } from "react";

// Minimal shape of the Google Identity Services API we actually use —
// there's no official @types package for the GIS script, so this is scoped
// to just initialize()/renderButton() rather than pulling in a broad any.
interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleAccountsId {
  initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, string>) => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void;
  text?: "signin_with" | "continue_with";
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

// Renders nothing if the client ID isn't configured (local dev without the
// env var, or before it's been added in Render) instead of showing a button
// that can only ever fail.
export function GoogleSignInButton({ onCredential, text = "continue_with" }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    if (!CLIENT_ID || !containerRef.current) return;

    let cancelled = false;
    const tryRender = () => {
      if (cancelled || !containerRef.current) return;
      const accountsId = window.google?.accounts?.id;
      if (!accountsId) {
        // The GIS script (loaded in index.html) may not have executed yet.
        window.setTimeout(tryRender, 100);
        return;
      }
      accountsId.initialize({
        client_id: CLIENT_ID,
        callback: (response) => onCredentialRef.current(response.credential),
      });
      accountsId.renderButton(containerRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        width: "320",
        text,
        locale: "iw",
      });
    };

    tryRender();
    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!CLIENT_ID) return null;

  return <div ref={containerRef} className="flex justify-center" />;
}
