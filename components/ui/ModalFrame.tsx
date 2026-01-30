"use client";

import type { ReactNode } from "react";

interface ModalFrameProps {
  title: string;
  subtitle?: string;
  error?: string | null;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: "sm" | "md" | "lg";
  stickyHeader?: boolean;
}

const MAX_WIDTH_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
} as const;

export default function ModalFrame({
  title,
  subtitle,
  error,
  onClose,
  children,
  footer,
  maxWidth = "md",
  stickyHeader = false,
}: ModalFrameProps) {
  const widthClass = MAX_WIDTH_CLASSES[maxWidth];
  const hasScrollableContent = maxWidth === "lg" || stickyHeader;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white rounded-lg shadow-xl ${widthClass} w-full ${
          hasScrollableContent ? "max-h-[90vh] overflow-y-auto" : ""
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 flex items-center justify-between ${
            stickyHeader ? "sticky top-0 bg-white border-b z-10" : ""
          }`}
        >
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            {subtitle && (
              <p className="text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl cursor-pointer"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Content */}
        {children}

        {/* Footer */}
        {footer && <div className="px-6 pb-6">{footer}</div>}
      </div>
    </div>
  );
}
