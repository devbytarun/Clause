"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { FileText, Loader2, Trash2, X } from "lucide-react";

export interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  filename?: string;
  isDeleting?: boolean;
}

const emptySubscribe = () => () => {};

export function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Permanently delete document?",
  description = "This action is permanent and cannot be undone. All extracted citations, risks, missing protections, and counter-proposals will be erased.",
  filename,
  isDeleting = false,
}: DeleteModalProps) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll and focus cancel button when opened
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus cancel button by default to prevent accidental enter-key confirm
    const timer = setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, isDeleting, onClose]);

  if (!isMounted || !isOpen) return null;

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-[#171714]/40 backdrop-blur-xs transition-opacity animate-[fadeIn_150ms_ease-out]"
        onClick={() => {
          if (!isDeleting) onClose();
        }}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div className="relative w-full max-w-md rounded-[12px] border border-[#D8D2C6] bg-[#FFFDF7] p-6 shadow-modal animate-[slideUp_200ms_ease-out] z-10">
        {/* Top bar with icon & close button */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] border border-[#C53B36]/25 bg-[#C53B36]/10 text-[#C53B36]">
            <Trash2 className="h-5 w-5" />
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#989388] transition-colors hover:bg-[#F3F0E8] hover:text-[#171714] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5]"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4">
          <h3
            id="delete-dialog-title"
            className="font-['Georgia',serif] text-lg font-bold tracking-tight text-[#171714]"
          >
            {title}
          </h3>

          {filename && (
            <div className="mt-2.5 flex items-center gap-2 rounded-[6px] border border-[#D8D2C6] bg-[#F3F0E8] px-3 py-2 text-xs font-mono font-semibold text-[#171714]">
              <FileText className="h-4 w-4 text-[#646158] shrink-0" />
              <span className="truncate" title={filename}>
                {filename}
              </span>
            </div>
          )}

          <p
            id="delete-dialog-description"
            className="mt-3 text-[13px] leading-relaxed text-[#646158]"
          >
            {description}
          </p>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="inline-flex h-[38px] items-center justify-center rounded-[6px] border border-[#D8D2C6] bg-[#FFFDF7] px-4 font-sans text-[13px] font-bold text-[#171714] transition-all hover:bg-[#F3F0E8] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isDeleting}
            className="inline-flex h-[38px] items-center justify-center gap-2 rounded-[6px] bg-[#C53B36] px-4 font-sans text-[13px] font-bold text-[#FFFDF7] shadow-xs transition-all hover:bg-[#A82E2A] active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C53B36]"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Deleting…</span>
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                <span>Permanently Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
