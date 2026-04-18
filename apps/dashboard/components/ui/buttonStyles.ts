/** Shared Tailwind classes for `<Button>` and `<Link>` that should look like buttons. */
export const buttonVariantStyles = {
  primary:
    "inline-flex items-center justify-center bg-primary text-white hover:bg-primary-hover rounded-xl px-4 py-2 text-sm font-bold shadow-sm transition-colors",
  secondary:
    "inline-flex items-center justify-center bg-neutral-200 text-neutral-900 hover:bg-neutral-300 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
  ghost:
    "inline-flex items-center justify-center text-neutral-700 hover:bg-neutral-100 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
} as const;

export type ButtonVariant = keyof typeof buttonVariantStyles;
