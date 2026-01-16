"use client";

import { useState, useMemo } from "react";

interface Transaction {
  id: string;
  stars: number;
  created_at: string;
}

interface CalendarViewProps {
  transactions: Transaction[];
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
      transactions: Transaction[];
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
      const totalStars = dayTransactions.reduce((sum, t) => sum + t.stars, 0);
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
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={previousMonth}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          ◀
        </button>
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold">{monthName}</h2>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-secondary text-white rounded-lg hover:bg-secondary/90 transition"
          >
            {locale === "zh-CN" ? "今天" : "Today"}
          </button>
        </div>
        <button
          onClick={nextMonth}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          ▶
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Week day headers */}
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center font-semibold text-gray-600 py-2 text-sm"
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
              className={`aspect-square p-1 rounded-lg border-2 transition hover:shadow-md relative overflow-hidden ${
                day.isSelected
                  ? "border-secondary bg-secondary/20 ring-2 ring-secondary"
                  : day.isToday
                  ? "border-primary bg-primary/10"
                  : hasActivity
                  ? "border-gray-300 bg-gray-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className="h-full flex flex-col">
                {/* Date number */}
                <div
                  className={`text-xs font-semibold text-left ${
                    day.isSelected
                      ? "text-secondary"
                      : day.isToday
                      ? "text-primary"
                      : "text-gray-700"
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
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      )}
                      {negativeCount > 0 && (
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                      )}
                    </div>

                    {/* Total stars - compact */}
                    <div
                      className={`text-[10px] font-bold leading-tight ${
                        day.totalStars > 0
                          ? "text-green-600"
                          : day.totalStars < 0
                          ? "text-red-600"
                          : "text-gray-600"
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
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 border-2 border-primary bg-primary/10 rounded"></div>
            <span>{locale === "zh-CN" ? "今天" : "Today"}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 border-2 border-secondary bg-secondary/20 rounded"></div>
            <span>{locale === "zh-CN" ? "已选择" : "Selected"}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>{locale === "zh-CN" ? "加分" : "Positive"}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
            <span>{locale === "zh-CN" ? "扣分" : "Negative"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
