import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Select nativo estilizado. A diferencia de un dropdown custom, el select
 * nativo funciona con teclado y lectores de pantalla sin configuración extra.
 */
const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative inline-flex items-center">
    <select
      className={cn(
        "h-9 w-full appearance-none rounded-lg border border-input bg-background pl-3 pr-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      className="pointer-events-none absolute right-2.5 size-4 text-muted-foreground"
      aria-hidden="true"
    />
  </div>
));
Select.displayName = "Select";

export { Select };
