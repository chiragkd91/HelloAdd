import Link from "next/link";

const MESSAGES: Record<string, string> = {
  missing: "No access token was provided. Ask your agency for a new client portal link.",
  invalid: "This link is invalid or has expired. Please request a new link from your agency.",
  session: "Your session expired. Open a fresh portal link from your agency.",
};

export default function ClientAccessPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const code = searchParams.error ?? "";
  const message = MESSAGES[code] ?? "Use the secure link your agency sent you to open the client portal.";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-bold text-neutral-900">Client access</h1>
        <p className="mt-3 text-sm text-neutral-600">{message}</p>
        <p className="mt-6 text-xs text-neutral-500">
          Need help?{" "}
          <Link href="/login" className="font-semibold text-sky-700 underline">
            Team sign-in
          </Link>
        </p>
      </div>
    </div>
  );
}
