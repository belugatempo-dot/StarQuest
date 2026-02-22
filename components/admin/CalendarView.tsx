"use client";

import { useState, useMemo } from "react";

export interface CalendarTransaction {
  id: string;
  stars: number;
  created_at: string;
  status?: string;
}

interface CalendarViewProps {
  transactions: CalendarTransaction[];
  locale: string;
  onDateSelect: (date: string) => void;
  selectedDate?: string;
}

export default function CalendarView({
  transactions,
  locale,
  onDateSelect,
  selectedDate,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Get all days in the current month
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysCount = lastDay.getDate();

    // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay();

    const days: Array<{
      date: Date | null;
      dateString: string;
      transactions: CalendarTransaction[];
      totalStars: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({
        date: null,
        dateString: "",
        transactions: [],
        totalStars: 0,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
      });
    }

    // Add all days in the month
    for (let day = 1; day <= daysCount; day++) {
      const date = new Date(year, month, day);
      // Use local date string for comparison
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTransactions = transactions.filter((t) => {
        const transactionDate = new Date(t.created_at);
        const transactionLocalDate = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}-${String(transactionDate.getDate()).padStart(2, '0')}`;
        return transactionLocalDate === dateString;
      });
      const totalStars = dayTransactions
        .filter((t) => t.status === "approved")
        .reduce((sum, t) => sum + t.stars, 0);
      const today = new Date();
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      days.push({
        date,
        dateString,
        transactions: dayTransactions,
        totalStars,
        isCurrentMonth: true,
        isToday,
        isSelected: dateString === selectedDate,
      });
    }

    return days;
  }, [currentMonth, transactions, selectedDate]);

  const monthName = currentMonth.toLocaleDateString(
    locale === "zh-CN" ? "zh-CN" : "en-US",
    { year: "numeric", month: "long" }
  );

  const weekDays =
    locale === "zh-CN"
      ? ["日", "一", "二", "三", "四", "五", "六"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  return (
    <div className="starry-bg rounded-lg shadow-lg p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <button
          onClick={previousMonth}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
        >
          ◀
        </button>
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-white star-glow">{monthName}</h2>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-star-gold text-night-deep font-semibold rounded-lg hover:bg-star-warm transition"
          >
            {locale === "zh-CN" ? "今天" : "Today"}
          </button>
        </div>
        <button
          onClick={nextMonth}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
        >
          ▶
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 relative z-10">
        {/* Week day headers */}
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center font-semibold text-star-glow py-2 text-sm"
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {daysInMonth.map((day, index) => {
          if (!day.date) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const hasActivity = day.transactions.length > 0;
          const positiveCount = day.transactions.filter((t) => t.stars > 0).length;
          const negativeCount = day.transactions.filter((t) => t.stars < 0).length;

          return (
            <button
              key={day.dateString}
              onClick={() => onDateSelect(day.dateString)}
              className={`aspect-square p-1 rounded-lg border-2 transition hover:shadow-lg relative overflow-hidden ${
                day.isSelected
                  ? "border-star-gold bg-star-gold/30 ring-2 ring-star-gold shadow-[0_0_15px_rgba(255,215,0,0.4)]"
                  : day.isToday
                  ? "border-star-warm bg-star-warm/20"
                  : hasActivity
                  ? "border-white/30 bg-white/10"
                  : "border-white/10 bg-white/5 hover:bg-white/15"
              }`}
            >
              <div className="h-full flex flex-col">
                {/* Date number */}
                <div
                  className={`text-xs font-semibold text-left ${
                    day.isSelected
                      ? "text-star-gold star-glow"
                      : day.isToday
                      ? "text-star-warm"
                      : "text-white"
                  }`}
                >
                  {day.date.getDate()}
                </div>

                {/* Activity indicator */}
                {hasActivity && (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-0.5 min-h-0">
                    {/* Activity dot indicator */}
                    <div className="flex items-center space-x-0.5">
                      {positiveCount > 0 && (
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_4px_rgba(74,222,128,0.6)]"></div>
                      )}
                      {negativeCount > 0 && (
                        <div className="w-1.5 h-1.5 bg-red-400 rounded-full shadow-[0_0_4px_rgba(248,113,113,0.6)]"></div>
                      )}
                    </div>

                    {/* Total stars - compact */}
                    <div
                      className={`text-[10px] font-bold leading-tight ${
                        day.totalStars > 0
                          ? "text-green-400"
                          : day.totalStars < 0
                          ? "text-red-400"
                          : "text-gray-300"
                      }`}
                    >
                      {day.totalStars > 0 ? "+" : ""}
                      {day.totalStars}
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-white/20 relative z-10">
        <div className="flex flex-wrap items-center gap-4 text-sm text-white/80">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 border-2 border-star-warm bg-star-warm/20 rounded"></div>
            <span>{locale === "zh-CN" ? "今天" : "Today"}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 border-2 border-star-gold bg-star-gold/30 rounded shadow-[0_0_10px_rgba(255,215,0,0.3)]"></div>
            <span>{locale === "zh-CN" ? "已选择" : "Selected"}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
            <span>{locale === "zh-CN" ? "加分" : "Positive"}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
            <span>{locale === "zh-CN" ? "扣分" : "Negative"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
