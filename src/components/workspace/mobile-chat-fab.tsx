"use client";

import { useState, useEffect } from "react";
import { MessageSquare, X } from "lucide-react";
import { ChatDrawer } from "./chat-drawer";

export function MobileChatFab({
  documentId,
  suggestedQuestions,
  disabledReason,
}: {
  documentId: string;
  suggestedQuestions: string[];
  disabledReason: string | null;
}) {
  const [open, setOpen] = useState(false);

  // Lock body scroll when chat overlay is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      {/* Floating Chat Overlay */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] animate-[fadeIn_150ms_ease-out]"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Chat Panel */}
          <div className="fixed inset-x-3 bottom-3 top-16 z-50 flex flex-col overflow-hidden rounded-2xl border border-[#D8D2C6] bg-[#FFFDF7] shadow-modal animate-[slideUp_200ms_ease-out]">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-[#D8D2C6] bg-[#F3F0E8]/80 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <MessageSquare className="h-3.5 w-3.5 text-primary" />
                </div>
                <h2 className="text-sm font-semibold text-[#171714]">
                  Document Q&A
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#646158] transition-colors hover:bg-[#D8D2C6]/40 hover:text-[#171714]"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat Content */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <ChatDrawer
                documentId={documentId}
                suggestedQuestions={suggestedQuestions}
                disabledReason={disabledReason}
              />
            </div>
          </div>
        </>
      )}

      {/* FAB Button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-all duration-200 hover:bg-primary-deep hover:shadow-xl hover:shadow-primary/40 active:scale-95"
          aria-label="Open document chat"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
