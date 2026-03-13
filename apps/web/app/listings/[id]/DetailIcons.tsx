import type { ReactNode } from 'react';

function IconShell({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center text-current">
      {children}
    </span>
  );
}

export function ArrowLeftIcon() {
  return (
    <IconShell>
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
        <path d="M12.5 4.5L7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconShell>
  );
}

export function ArrowRightIcon() {
  return (
    <IconShell>
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
        <path d="M7.5 4.5L13 10l-5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconShell>
  );
}

export function LocationIcon() {
  return (
    <IconShell>
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
        <path d="M10 17s4.5-4.3 4.5-8.2A4.5 4.5 0 1 0 5.5 8.8C5.5 12.7 10 17 10 17Z" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="10" cy="8.5" r="1.7" fill="currentColor" />
      </svg>
    </IconShell>
  );
}

export function ClockIcon() {
  return (
    <IconShell>
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
        <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 6.7v3.7l2.5 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconShell>
  );
}

export function CalendarIcon() {
  return (
    <IconShell>
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
        <rect x="3.2" y="4.5" width="13.6" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6.4 3.5v2.4M13.6 3.5v2.4M3.5 7.6h13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </IconShell>
  );
}

export function VerifiedIcon() {
  return (
    <IconShell>
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
        <path d="M10 2.8l2.1 1.2 2.4-.1 1 2.1 2 1.3-.6 2.3.6 2.3-2 1.3-1 2.1-2.4-.1L10 17.2l-2.1-1.2-2.4.1-1-2.1-2-1.3.6-2.3-.6-2.3 2-1.3 1-2.1 2.4.1L10 2.8Z" fill="currentColor" />
        <path d="M7.1 10.1l1.8 1.8 4-4.2" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconShell>
  );
}

export function GalleryIcon() {
  return (
    <IconShell>
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
        <rect x="3.2" y="4" width="13.6" height="12" rx="2.4" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="7.1" cy="8" r="1.3" fill="currentColor" />
        <path d="M5.3 13.5l2.7-2.8 2.1 1.9 2.3-2.3 2.3 3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconShell>
  );
}

export function PhoneIcon() {
  return (
    <IconShell>
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
        <path d="M6 3.8h2l1 2.7-1.2 1.6c.7 1.2 1.7 2.2 2.9 2.9l1.6-1.2 2.7 1v2c0 .9-.8 1.7-1.7 1.6-2.8-.2-5.5-1.5-7.6-3.6C3.6 10.6 2.3 8 2.1 5.1 2.1 4.2 2.8 3.5 3.8 3.5H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconShell>
  );
}

export function WhatsAppIcon() {
  return (
    <IconShell>
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
        <path d="M10 17a6.8 6.8 0 1 0-3.2-.8L4 17l.8-2.7A6.8 6.8 0 0 0 10 17Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7.8 7.3c-.2-.4-.3-.4-.5-.4h-.4c-.1 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.1 1.6 2.4 3.8 3.3 1.8.8 2.2.6 2.5.6.4-.1 1.1-.5 1.2-1s.2-1 .2-1.1c-.1-.1-.3-.2-.6-.3l-1.1-.5c-.3-.1-.5-.1-.7.1l-.5.6c-.1.1-.3.2-.6.1-.2-.1-1-.4-1.9-1.3-.7-.6-1.2-1.5-1.4-1.7-.1-.3 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.3 0-.5l-.3-.9Z" fill="currentColor" />
      </svg>
    </IconShell>
  );
}
