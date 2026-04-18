"use client";

import { buttonVariantStyles } from "@/components/ui/buttonStyles";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const confirmVariantClass: Record<NonNullable<ConfirmModalProps["variant"]>, string> = {
  danger: "bg-red-600 text-white hover:bg-red-700",
  warning: "bg-amber-600 text-white hover:bg-amber-700",
  info: "bg-primary text-white hover:bg-primary-hover",
};

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-modal-title" className="text-base font-medium text-neutral-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-neutral-600">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className={buttonVariantStyles.ghost}
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`inline-flex min-h-[40px] items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${confirmVariantClass[variant]}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Please wait
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
