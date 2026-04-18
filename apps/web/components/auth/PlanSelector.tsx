"use client";

import type { Plan } from "./planTypes";

const PLANS: { id: Plan; name: string; price: string; hint: string }[] = [
  { id: "STARTER", name: "Starter", price: "₹4,999/mo", hint: "1 brand · 3 platforms" },
  { id: "GROWTH", name: "Growth", price: "₹12,999/mo", hint: "AI features · 10 users" },
  { id: "AGENCY", name: "Agency", price: "₹34,999/mo", hint: "Unlimited · white-label" },
];

type Props = {
  value: Plan;
  onChange: (plan: Plan) => void;
};

export function PlanSelector({ value, onChange }: Props) {
  return (
    <fieldset>
      <legend className="mb-3 block text-sm font-bold text-neutral-900">Choose your plan</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {PLANS.map((p) => {
          const selected = value === p.id;
          return (
            <label
              key={p.id}
              className={`relative flex cursor-pointer flex-col rounded-2xl border-2 p-4 transition-colors ${
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <input
                type="radio"
                name="plan"
                value={p.id}
                checked={selected}
                onChange={() => onChange(p.id)}
                className="sr-only"
              />
              <span className="text-sm font-bold text-neutral-900">{p.name}</span>
              <span className="mt-1 text-xs font-semibold text-primary">{p.price}</span>
              <span className="mt-2 text-xs text-neutral-500">{p.hint}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
