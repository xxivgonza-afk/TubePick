"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useEffect } from "react";
import { useUIStore } from "@/stores/ui-store";

export function Toast() {
  const toast = useUIStore((s) => s.toast);
  const clearToast = useUIStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(clearToast, 2200);
    return () => window.clearTimeout(timer);
  }, [toast, clearToast]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
    >
      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="pointer-events-auto flex items-center gap-2 rounded-full border bg-popover px-4 py-2 text-sm font-medium text-popover-foreground shadow-lg"
          >
            <CheckCircle2 className="size-4 text-brand" aria-hidden="true" />
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
