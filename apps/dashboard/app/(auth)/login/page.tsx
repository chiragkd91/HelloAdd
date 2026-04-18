import { LoginForm } from "./login-form";
import { Suspense } from "react";

function LoginFallback() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-neutral-100 px-6">
      <p className="text-sm text-neutral-500">Loading…</p>
    </div>
  );
}

export default function DashboardLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
