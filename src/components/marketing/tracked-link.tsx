"use client";

import Link, { type LinkProps } from "next/link";
import { trackEvent } from "@/lib/analytics";
import type { ReactNode } from "react";

/**
 * Link wrapper that fires a `cta_clicked` analytics event before navigation.
 * Use for primary CTAs where we want to know which location drove the click
 * (hero, pricing card, guides section, etc.).
 *
 * Doesn't prevent default — navigation happens as normal, event fires
 * synchronously so PostHog can queue it.
 */
interface TrackedLinkProps extends Omit<LinkProps, "onClick"> {
  /** Identifies where on the page this CTA sits, e.g. "homepage_hero". */
  location: string;
  /** The target URL identifier — defaults to href. */
  cta?: string;
  children: ReactNode;
  className?: string;
}

export function TrackedLink({
  location,
  cta,
  children,
  className,
  href,
  ...rest
}: TrackedLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() =>
        trackEvent("cta_clicked", {
          location,
          cta: cta ?? (typeof href === "string" ? href : ""),
        })
      }
      {...rest}
    >
      {children}
    </Link>
  );
}
