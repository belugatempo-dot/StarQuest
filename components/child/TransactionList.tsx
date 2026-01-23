"use client";

import UnifiedActivityList from "@/components/shared/UnifiedActivityList";
import type { Database } from "@/types/database";
import { transformStarTransaction } from "@/lib/activity-utils";

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

/**
 * TransactionList - Wrapper component for child activity list
 *
 * This component maintains backwards compatibility with existing code
 * while delegating to the shared UnifiedActivityList component.
 * Note: Transactions are already sorted from the server, so we preserve the order.
 */
export default function TransactionList({
  transactions,
  locale,
}: TransactionListProps) {
  // Transform transactions to unified format (preserving order from server)
  const unifiedActivities = transactions.map((tx) =>
    transformStarTransaction(tx, false)
  );

  return (
    <UnifiedActivityList
      activities={unifiedActivities}
      locale={locale}
      role="child"
    />
  );
}
