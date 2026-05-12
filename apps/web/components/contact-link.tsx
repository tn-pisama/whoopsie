"use client";

// Drop-in replacement for `<a href="mailto:...">` that opens an in-page
// ContactModal instead. Used on /privacy + /terms so the page stays server-
// rendered and only the link itself becomes client.

import { useState } from "react";
import { ContactModal } from "./contact-modal";

type Kind = "hi" | "security";

interface ContactLinkProps {
  kind: Kind;
  className?: string;
  children: React.ReactNode;
}

export function ContactLink({
  kind,
  className,
  children,
}: ContactLinkProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "underline decoration-coral underline-offset-2 hover:text-coral"
        }
      >
        {children}
      </button>
      <ContactModal kind={kind} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
