"use client";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { Toaster } from "react-hot-toast";
import { useLayoutEffect, useState } from "react";

/**
 * Mount toasts only on the client so server HTML matches the first client paint.
 * react-hot-toast injects portal nodes that often differ from SSR and trigger hydration warnings.
 *
 * Rendered *before* `{children}` and use `useLayoutEffect` so the Toaster exists before any
 * page `useEffect` runs. Otherwise sibling order can run `toast()` from a page before this
 * component mounts, which breaks hydration and surfaces as "ServerRoot" / document errors.
 */
function ClientToaster() {
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return <Toaster position="top-right" toastOptions={{ duration: 4000 }} />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ClientToaster />
      {children}
    </AuthProvider>
  );
}
