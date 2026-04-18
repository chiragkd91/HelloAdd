"use client";

import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="modal-title" className="text-xl font-bold tracking-tight text-neutral-900">
            {title}
          </h2>
          <button
            type="button"
            className="rounded-lg p-1 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
