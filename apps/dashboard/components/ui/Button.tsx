import type { ButtonHTMLAttributes } from "react";
import { buttonVariantStyles, type ButtonVariant } from "./buttonStyles";

export { buttonVariantStyles } from "./buttonStyles";
export type { ButtonVariant };

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ variant = "primary", className = "", type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={`${buttonVariantStyles[variant]} ${className}`.trim()} {...props} />
  );
}
