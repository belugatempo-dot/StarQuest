"use client";

import { useState, useRef, useEffect } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  tooltip: string;
  valueColor?: string;
  labelColor?: string;
  icon?: string;
  cardClass?: string;
}

export default function StatCard({
  label,
  value,
  tooltip,
  valueColor = "text-white",
  labelColor = "text-slate-300",
  icon,
  cardClass = "stat-night-card",
}: StatCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showTooltip) return;

    function handleClickOutside(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTooltip]);

  return (
    <div ref={cardRef} className={`${cardClass} rounded-lg shadow-lg p-4 relative`}>
      <div className="flex items-center justify-between mb-1 relative z-10">
        <div className={`text-sm ${labelColor}`}>
          {icon && <span>{icon} </span>}
          {label}
        </div>
        <button
          type="button"
          aria-label="info"
          onClick={() => setShowTooltip((prev) => !prev)}
          className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer text-xs leading-none"
        >
          ⓘ
        </button>
      </div>
      <div className={`text-2xl font-bold relative z-10 ${valueColor}`}>
        {value}
      </div>
      {showTooltip && (
        <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-slate-800 border border-white/20 rounded-lg px-3 py-2 text-xs text-slate-300 shadow-lg">
          {tooltip}
        </div>
      )}
    </div>
  );
}
