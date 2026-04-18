import { Suspense } from "react";
import { OnboardingWizard } from "./OnboardingWizard";

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={<div className="p-10 text-center text-sm text-neutral-600">Loading onboarding…</div>}
    >
      <OnboardingWizard />
    </Suspense>
  );
}
