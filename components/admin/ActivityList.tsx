"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import CalendarView from "./CalendarView";
import EditTransactionModal from "./EditTransactionModal";

type Transaction = Database["public"]["Tables"]["star_transactions"]["Row"] & {
  quests?: {
    name_en: string;
    name_zh: string | null;
    icon: string | null;
    category: string | null;
  } | null;
  children?: {
    name: string;
    avatar_url: string | null;
  } | null;
};

interface ActivityListProps {
  transactions: Transaction[];
  locale: string;
}

export default function ActivityList({ transactions, locale }: ActivityListProps) {
  const t = useTranslations();
  const router = useRouter();
  const supabase = createClient();

  const [filterType, setFilterType] = useState<"all" | "positive" | "negative">("all");
  const [filterDate, setFilterDate] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Filter by positive/negative
    if (filterType === "positive") {
      filtered = filtered.filter((t) => t.stars > 0);
    } else if (filterType === "negative") {
      filtered = filtered.filter((t) => t.stars < 0);
    }

    // Filter by single date
    if (filterDate) {
      filtered = filtered.filter((t) => {
        const date = new Date(t.created_at);
        const transactionDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return transactionDate === filterDate;
      });
    }

    // Filter by date range
    if (startDate && endDate) {
      filtered = filtered.filter((t) => {
        const date = new Date(t.created_at);
        const transactionDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return transactionDate >= startDate && transactionDate <= endDate;
      });
    } else if (startDate) {
      filtered = filtered.filter((t) => {
        const date = new Date(t.created_at);
        const transactionDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return transactionDate >= startDate;
      });
    } else if (endDate) {
      filtered = filtered.filter((t) => {
        const date = new Date(t.created_at);
        const transactionDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return transactionDate <= endDate;
      });
    }

    return filtered;
  }, [transactions, filterType, filterDate, startDate, endDate]);

  // Group by date for calendar view
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach((transaction) => {
      const date = new Date(transaction.created_at);
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (!groups[dateString]) {
        groups[dateString] = [];
      }
      groups[dateString].push(transaction);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTransactions]);

  const getQuestName = (transaction: Transaction) => {
    if (transaction.custom_description) {
      return transaction.custom_description;
    }
    if (transaction.quests) {
      return locale === "zh-CN"
        ? transaction.quests.name_zh || transaction.quests.name_en
        : transaction.quests.name_en;
    }
    return locale === "zh-CN" ? "未知任务" : "Unknown quest";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (locale === "zh-CN") {
      return date.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateShort = (dateString: string) => {
    // Parse YYYY-MM-DD format manually to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    if (locale === "zh-CN") {
      return date.toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
      });
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getDailyTotal = (transactions: Transaction[]) => {
    return transactions.reduce((sum, t) => sum + t.stars, 0);
  };

  const clearFilters = () => {
    setFilterType("all");
    setFilterDate("");
    setStartDate("");
    setEndDate("");
  };

  const handleDelete = async (transaction: Transaction) => {
    const questName = getQuestName(transaction);
    const confirmMessage =
      locale === "zh-CN"
        ? `确定要删除这条记录吗？\n\n任务: ${questName}\n星星: ${transaction.stars > 0 ? "+" : ""}${transaction.stars}⭐`
        : `Are you sure you want to delete this record?\n\nQuest: ${questName}\nStars: ${transaction.stars > 0 ? "+" : ""}${transaction.stars}⭐`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setDeletingId(transaction.id);

    try {
      const { error } = await supabase
        .from("star_transactions")
        .delete()
        .eq("id", transaction.id);

      if (error) throw error;

      router.refresh();
    } catch (err) {
      console.error("Error deleting transaction:", err);
      alert(
        locale === "zh-CN"
          ? "删除失败，请重试"
          : "Failed to delete, please try again"
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Layout: Calendar + Filters */}
      <div className={`${viewMode === "calendar" ? 'grid lg:grid-cols-2 gap-6' : ''}`}>
        {/* Calendar Picker - Left Side */}
        {viewMode === "calendar" && (
          <div className="lg:sticky lg:top-4 lg:self-start">
            <CalendarView
              transactions={transactions}
              locale={locale}
              selectedDate={filterDate}
              onDateSelect={(date) => {
                setFilterDate(date);
                setStartDate("");
                setEndDate("");
              }}
            />
          </div>
        )}

        {/* Filters - Right Side or Full Width */}
        <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            {locale === "zh-CN" ? "筛选" : "Filters"}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 rounded-lg transition ${
                viewMode === "list"
                  ? "bg-secondary text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              📋 {locale === "zh-CN" ? "列表" : "List"}
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-4 py-2 rounded-lg transition ${
                viewMode === "calendar"
                  ? "bg-secondary text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              📅 {locale === "zh-CN" ? "日历" : "Calendar"}
            </button>
          </div>
        </div>

        {/* Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {locale === "zh-CN" ? "类型" : "Type"}
          </label>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilterType("all")}
              className={`px-4 py-2 rounded-lg transition ${
                filterType === "all"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {locale === "zh-CN" ? "全部" : "All"}
            </button>
            <button
              onClick={() => setFilterType("positive")}
              className={`px-4 py-2 rounded-lg transition ${
                filterType === "positive"
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              ➕ {locale === "zh-CN" ? "加分" : "Positive"}
            </button>
            <button
              onClick={() => setFilterType("negative")}
              className={`px-4 py-2 rounded-lg transition ${
                filterType === "negative"
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              ➖ {locale === "zh-CN" ? "扣分" : "Negative"}
            </button>
          </div>
        </div>

        {/* Date Filters (Input fields) */}
        {viewMode === "list" && (
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {locale === "zh-CN" ? "单个日期" : "Single Date"}
              </label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => {
                  setFilterDate(e.target.value);
                  setStartDate("");
                  setEndDate("");
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {locale === "zh-CN" ? "开始日期" : "Start Date"}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setFilterDate("");
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {locale === "zh-CN" ? "结束日期" : "End Date"}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setFilterDate("");
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Clear Filters Button */}
        {(filterType !== "all" || filterDate || startDate || endDate) && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            🔄 {locale === "zh-CN" ? "清除所有筛选" : "Clear all filters"}
          </button>
        )}

        {/* Results Count */}
        <div className="text-sm text-gray-600">
          {locale === "zh-CN"
            ? `显示 ${filteredTransactions.length} 条记录（共 ${transactions.length} 条）`
            : `Showing ${filteredTransactions.length} of ${transactions.length} records`}
        </div>
      </div>

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {filteredTransactions.length === 0 ? (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <p className="text-gray-500">
                {locale === "zh-CN" ? "没有找到记录" : "No records found"}
              </p>
            </div>
          ) : (
            filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${
                  transaction.stars > 0
                    ? "border-green-500"
                    : "border-red-500"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">
                        {transaction.quests?.icon || "⭐"}
                      </span>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {getQuestName(transaction)}
                        </h3>
                        <div className="flex items-center space-x-3 text-sm text-gray-600">
                          <span>
                            👤 {transaction.children?.name || "Unknown"}
                          </span>
                          <span>•</span>
                          <span>{formatDate(transaction.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    {transaction.parent_response && (
                      <p className="text-sm text-gray-600 mt-2">
                        💬 {transaction.parent_response}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <div
                      className={`text-2xl font-bold ${
                        transaction.stars > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {transaction.stars > 0 ? "+" : ""}
                      {transaction.stars} ⭐
                    </div>
                    {/* Action Buttons */}
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => setEditingTransaction(transaction)}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                      >
                        ✏️ {locale === "zh-CN" ? "编辑" : "Edit"}
                      </button>
                      <button
                        onClick={() => handleDelete(transaction)}
                        disabled={deletingId === transaction.id}
                        className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition disabled:opacity-50"
                      >
                        🗑️ {locale === "zh-CN" ? "删除" : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <div className="space-y-4">
          {groupedByDate.length === 0 ? (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <p className="text-gray-500">
                {locale === "zh-CN" ? "没有找到记录" : "No records found"}
              </p>
            </div>
          ) : (
            groupedByDate.map(([date, dayTransactions]) => {
              const dailyTotal = getDailyTotal(dayTransactions);
              return (
                <div
                  key={date}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                  {/* Date Header */}
                  <div className="bg-gradient-to-r from-secondary/20 to-primary/20 px-6 py-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold">
                        📅 {formatDateShort(date)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {dayTransactions.length}{" "}
                        {locale === "zh-CN" ? "条记录" : "records"}
                      </p>
                    </div>
                    <div
                      className={`text-2xl font-bold ${
                        dailyTotal > 0
                          ? "text-green-600"
                          : dailyTotal < 0
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    >
                      {dailyTotal > 0 ? "+" : ""}
                      {dailyTotal} ⭐
                    </div>
                  </div>

                  {/* Transactions for this date */}
                  <div className="p-6 space-y-3">
                    {dayTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className={`p-4 rounded-lg border-2 ${
                          transaction.stars > 0
                            ? "border-green-200 bg-green-50"
                            : "border-red-200 bg-red-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">
                              {transaction.quests?.icon || "⭐"}
                            </span>
                            <div>
                              <h4 className="font-semibold">
                                {getQuestName(transaction)}
                              </h4>
                              <p className="text-sm text-gray-600">
                                👤 {transaction.children?.name || "Unknown"} •{" "}
                                {new Date(transaction.created_at).toLocaleTimeString(
                                  locale === "zh-CN" ? "zh-CN" : "en-US",
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                              </p>
                              {transaction.parent_response && (
                                <p className="text-sm text-gray-600 mt-1">
                                  💬 {transaction.parent_response}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div
                              className={`text-xl font-bold ${
                                transaction.stars > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {transaction.stars > 0 ? "+" : ""}
                              {transaction.stars}⭐
                            </div>
                            {/* Action Buttons */}
                            <div className="flex space-x-1">
                              <button
                                onClick={() => setEditingTransaction(transaction)}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDelete(transaction)}
                                disabled={deletingId === transaction.id}
                                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition disabled:opacity-50"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

        </div>
      </div>

      {/* Edit Modal */}
      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          locale={locale}
          onClose={() => setEditingTransaction(null)}
        />
      )}
    </div>
  );
}
