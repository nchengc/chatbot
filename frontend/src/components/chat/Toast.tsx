import { useToastStore } from "@/lib/toast";

/**
 * Floating toast (parse 1 single-message variant).
 *
 * Renders fixed at bottom-right; auto-dismisses via `useToastStore`.
 * Keeps animations minimal to fit the dark ChatGPT-style theme.
 */
export function Toast() {
  const msg = useToastStore((s) => s.msg);
  if (!msg) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
      <div className="pointer-events-auto max-w-md rounded-xl border border-border bg-bg-panel px-4 py-2.5 text-sm text-fg shadow-xl animate-[toast-in_180ms_ease-out]">
        {msg}
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}