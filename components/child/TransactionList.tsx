"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { Database } from "@/types/database";
import CalendarView from "@/components/admin/CalendarView";

type Transaction = Database["public"]["Tables"]["star_transactions"]["Row"] & {
  quests: {
    name_en: string;
    name_zh: string | null;
    icon: string | null;
    category: string | null;
  } | null;
};

interface TransactionListProps {
  transactions: Transaction[];
  locale: string;
}

export default function TransactionList({
  transactions,
  locale,
}: TransactionListProps) {
  const t = useTranslations();
  const [filter, setFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");
  const [showCount, setShowCount] = useState(20);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter((tx) => {
      if (filter !== "all" && tx.status !== filter) return false;
      return true;
    });

    // Filter by selected date
    if (selectedDate) {
      filtered = filtered.filter((tx) => {
        const date = new Date(tx.created_at);
        const txDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return txDate === selectedDate;
      });
    }

    return filtered;
  }, [transactions, filter, selectedDate]);

  // Apply show limit
  const displayedTransactions = filteredTransactions.slice(0, showCount);
  const hasMore = filteredTransactions.length > showCount;

  // Calculate stats
  const stats = {
    all: transactions.length,
    approved: transactions.filter((tx) => tx.status === "approved").length,
    pending: transactions.filter((tx) => tx.status === "pending").length,
    rejected: transactions.filter((tx) => tx.status === "rejected").length,
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      approved: "bg-success/10 text-success border-success",
      pending: "bg-warning/10 text-warning border-warning",
      rejected: "bg-danger/10 text-danger border-danger",
    };
    return badges[status as keyof typeof badges] || "bg-gray-100 text-gray-600 border-gray-300";
  };

  const getStatusText = (status: string) => {
    return t(`status.${status}` as any);
  };

  const getTransactionName = (tx: Transaction) => {
    if (tx.quests) {
      return locale === "zh-CN"
        ? tx.quests.name_zh || tx.quests.name_en
        : tx.quests.name_en;
    }
    return tx.custom_description || "Custom";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === "zh-CN" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
              selectedDate={selectedDate}
              onDateSelect={(date) => setSelectedDate(date)}
            />
          </div>
        )}

        {/* Filters and List - Right Side or Full Width */}
        <div className="bg-white rounded-lg shadow-md p-6">
      {/* View Mode Toggle and Filter Tabs */}
      <div className="mb-6 border-b pb-4 space-y-4">
        {/* View Mode Toggle */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-700">
            {locale === "zh-CN" ? "查看方式" : "View Mode"}
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

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: t("history.allTransactions") },
          { key: "approved", label: t("status.approved") },
          { key: "pending", label: t("status.pending") },
          { key: "rejected", label: t("status.rejected") },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === tab.key
                ? "bg-primary text-gray-900"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
            <span className="ml-2 text-sm opacity-75">
              ({stats[tab.key as keyof typeof stats]})
            </span>
          </button>
        ))}
      </div>

      {/* Transaction List */}
      {displayedTransactions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-gray-500 text-lg">{t("history.emptyState")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedTransactions.map((tx) => (
            <div
              key={tx.id}
              className={`p-4 rounded-lg border-2 transition hover:shadow-md ${
                tx.status === "approved"
                  ? "bg-gray-50 border-gray-200"
                  : tx.status === "pending"
                  ? "bg-warning/5 border-warning/20"
                  : "bg-danger/5 border-danger/20"
              }`}
            >
              <div className="flex items-start justify-between">
                {/* Left: Icon and Info */}
                <div className="flex items-start space-x-3 flex-1">
                  <div className="text-3xl mt-1">
                    {tx.quests?.icon || (tx.stars > 0 ? "⭐" : "⚠️")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg">
                      {getTransactionName(tx)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {formatDate(tx.created_at)}
                    </p>

                    {/* Source */}
                    <p className="text-xs text-gray-600 mt-1">
                      {tx.source === "parent_record"
                        ? t("history.parentRecorded")
                        : t("history.youRequested")}
                    </p>

                    {/* Child Note */}
                    {tx.child_note && (
                      <p className="text-sm text-gray-700 mt-2 italic">
                        &quot;{tx.child_note}&quot;
                      </p>
                    )}

                    {/* Parent Response (for rejected) */}
                    {tx.status === "rejected" && tx.parent_response && (
                      <div className="mt-2 p-2 bg-danger/10 rounded border border-danger/20">
                        <p className="text-xs font-semibold text-danger">
                          {t("history.rejectionReason")}:
                        </p>
                        <p className="text-sm text-danger">
                          {tx.parent_response}
                        </p>
                      </div>
                    )}

                    {/* Pending indicator */}
                    {tx.status === "pending" && (
                      <p className="text-xs text-warning mt-2 flex items-center">
                        <span className="mr-1">⏳</span>
                        {t("history.waitingApproval")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Stars and Status */}
                <div className="text-right ml-4 flex-shrink-0">
                  <div
                    className={`text-2xl font-bold mb-2 ${
                      tx.stars > 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    {tx.stars > 0 ? "+" : ""}
                    {tx.stars}
                  </div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                      tx.status
                    )}`}
                  >
                    {getStatusText(tx.status)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show More Button */}
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setShowCount(showCount + 20)}
            className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition"
          >
            {t("history.showMore")} ({filteredTransactions.length - showCount}{" "}
            {t("common.all").toLowerCase()})
          </button>
        </div>
      )}
    </div>
        </div>
      </div>
    </div>
  );
}
