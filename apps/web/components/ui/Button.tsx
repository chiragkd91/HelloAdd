import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import Link from "next/link";
import type { LinkProps } from "next/link";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "heroGhost" | "heroGhostLight";

const variantClasses: Record<ButtonVariant, string> = {
  /** Brand purple CTA */
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-hover rounded-btn px-6 py-2.5 text-sm font-bold shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  secondary:
    "bg-neutral-200 text-neutral-900 hover:bg-neutral-300 rounded-btn px-6 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400",
  ghost:
    "text-neutral-700 hover:bg-neutral-100 rounded-btn px-4 py-2 text-sm font-medium transition-colors",
  /** Dark hero: outline button */
  heroGhost:
    "rounded-btn border border-white/25 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10",
  /** Light marketing hero: ghost with border */
  heroGhostLight:
    "rounded-btn border border-neutral-200/90 bg-white px-6 py-2.5 text-sm font-semibold text-dark shadow-sm transition-colors hover:bg-fog",
};

export function buttonClassName(variant: ButtonVariant = "primary", className = "") {
  return `inline-flex items-center justify-center gap-2 ${variantClasses[variant]} ${className}`.trim();
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ variant = "primary", className = "", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClassName(variant, className)} {...props} />;
}

type ButtonLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> &
  LinkProps & {
    variant?: ButtonVariant;
  };

export function ButtonLink({ variant = "primary", className = "", ...props }: ButtonLinkProps) {
  return <Link className={buttonClassName(variant, className)} {...props} />;
}
