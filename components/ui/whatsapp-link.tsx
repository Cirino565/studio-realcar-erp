"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type WhatsAppLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

function cleanupMobileState() {
  const active = document.activeElement;

  if (active instanceof HTMLElement) {
    active.blur();
  }

  document.body.style.overflow = "";
  document.body.style.pointerEvents = "";
  document.documentElement.style.overflow = "";
  document.documentElement.style.pointerEvents = "";
}

const WhatsAppLink = React.forwardRef<HTMLAnchorElement, WhatsAppLinkProps>(
  ({ href, className, onClick, children, ...props }, ref) => {
    React.useEffect(() => {
      window.addEventListener("focus", cleanupMobileState);
      window.addEventListener("pageshow", cleanupMobileState);
      document.addEventListener("visibilitychange", cleanupMobileState);

      return () => {
        window.removeEventListener("focus", cleanupMobileState);
        window.removeEventListener("pageshow", cleanupMobileState);
        document.removeEventListener("visibilitychange", cleanupMobileState);
      };
    }, []);

    function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
      onClick?.(event);

      if (event.defaultPrevented) {
        return;
      }

      event.preventDefault();
      cleanupMobileState();

      window.open(href, "_blank", "noopener,noreferrer");

      window.setTimeout(cleanupMobileState, 150);
      window.setTimeout(cleanupMobileState, 700);
    }

    return (
      <a
        ref={ref}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(className)}
        onClick={handleClick}
        {...props}
      >
        {children}
      </a>
    );
  }
);

WhatsAppLink.displayName = "WhatsAppLink";

export { WhatsAppLink };
