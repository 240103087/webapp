import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";

type Variant = "primary" | "secondary" | "ghost" | "danger";
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "sm";
  busy?: boolean;
  busyLabel?: string;
  icon?: ReactNode;
}
export function Button({ variant = "secondary", size = "md", busy, busyLabel, icon, children, className = "", disabled, type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${size === "sm" ? "btn-sm" : ""} ${className}`}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {icon}
      {busy && busyLabel ? busyLabel : children}
    </button>
  );
}

export function ButtonLink({ variant = "secondary", size = "md", icon, children, className = "", ...rest }: LinkProps & { variant?: Variant; size?: "md" | "sm"; icon?: ReactNode }) {
  return (
    <Link className={`btn btn-${variant} ${size === "sm" ? "btn-sm" : ""} ${className}`} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
