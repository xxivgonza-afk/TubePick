import Link from "next/link";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/constants/site";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2", className)}
      aria-label={`${SITE_NAME} — inicio`}
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
        <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      </span>
      <span className="text-base font-semibold tracking-tight">{SITE_NAME}</span>
    </Link>
  );
}
