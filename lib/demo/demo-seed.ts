/**
 * Demo family seed — creates a fully-populated demo family with realistic activity.
 */

import {
  DEMO_PARENT_EMAIL,
  DEMO_FAMILY_NAME,
  DEMO_PARENT_NAME,
  DEMO_CHILDREN,
  DEMO_HISTORY_DAYS,
  DemoChildProfile,
} from "./demo-config";

/**
 * Loose Supabase client type for demo seeding.
 * The generated Database types don't include Relationships,
 * causing `never` inference with SupabaseClient<Database>.
 */
type AdminClient = {
  from: (table: string) => any;
  rpc: (fn: string, params?: Record<string, unknown>) => any;
  auth: { admin: { createUser: (opts: any) => any; deleteUser: (id: string) => any } };
};

interface QuestRow {
  id: string;
  type: "duty" | "bonus" | "violation";
  stars: number;
  name_en: string;
  is_active: boolean;
}

interface RewardRow {
  id: string;
  stars_cost: number;
  name_en: string;
  is_active: boolean;
}

export interface SeedResult {
  familyId: string;
  parentId: string;
  children: Array<{
    name: string;
    email: string;
    password: string;
    userId: string;
  }>;
  stats: {
    transactions: number;
    redemptions: number;
    days: number;
  };
}

/**
 * Seeded pseudo-random number generator (mulberry32).
 * Produces deterministic sequences for reproducible demo data.
 */
export function createRng(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pick a multiplier from the child's weighted distribution.
 */
function pickMultiplier(
  dist: Record<number, number>,
  rand: () => number
): number {
  const roll = rand();
  let cumulative = 0;
  for (const [mult, prob] of Object.entries(dist)) {
    cumulative += prob;
    if (roll < cumulative) return Number(mult);
  }
  return 1;
}

/**
 * Generate a random timestamp within a day at a specific hour range.
 */
function randomTimestamp(
  baseDate: Date,
  hourStart: number,
  hourEnd: number,
  rand: () => number
): string {
  const d = new Date(baseDate);
  const hour = hourStart + Math.floor(rand() * (hourEnd - hourStart));
  const minute = Math.floor(rand() * 60);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/**
 * Pick N random items from an array (without replacement).
 */
function pickRandom<T>(arr: T[], count: number, rand: () => number): T[] {
  const shuffled = [...arr].sort(() => rand() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

/**
 * Create the complete demo family with all data.
 */
export async function seedDemoFamily(
  supabase: AdminClient
): Promise<SeedResult> {
  const rng = createRng(42);
  const parentPassword = process.env.DEMO_PARENT_PASSWORD;
  if (!parentPassword) {
    throw new Error("DEMO_PARENT_PASSWORD environment variable is required");
  }

  // 1. Create parent auth user
  const { data: parentAuth, error: parentAuthError } =
    await supabase.auth.admin.createUser({
      email: DEMO_PARENT_EMAIL,
      password: parentPassword,
      email_confirm: true,
    });

  if (parentAuthError || !parentAuth.user) {
    throw new Error(
      `Failed to create parent auth user: ${parentAuthError?.message ?? "unknown"}`
    );
  }

  const parentId = parentAuth.user.id;

  // 2. Create family with templates via RPC
  const { data: familyId, error: familyError } = await supabase.rpc(
    "create_family_with_templates",
    {
      p_user_id: parentId,
      p_family_name: DEMO_FAMILY_NAME,
      p_user_name: DEMO_PARENT_NAME,
      p_user_email: DEMO_PARENT_EMAIL,
      p_user_locale: "en",
    }
  );

  if (familyError || !familyId) {
    throw new Error(
      `Failed to create family: ${familyError?.message ?? "no family_id returned"}`
    );
  }

  // 3. Create children
  const childResults: SeedResult["children"] = [];
  for (const child of DEMO_CHILDREN) {
    const { data: childAuth, error: childAuthError } =
      await supabase.auth.admin.createUser({
        email: child.email,
        password: child.password,
        email_confirm: true,
      });

    if (childAuthError || !childAuth.user) {
      throw new Error(
        `Failed to create child auth user ${child.name}: ${childAuthError?.message ?? "unknown"}`
      );
    }

    const childId = childAuth.user.id;

    const { error: insertError } = await supabase.from("users").insert({
      id: childId,
      family_id: familyId,
      name: child.name,
      role: "child",
      email: child.email,
      locale: child.locale,
    });

    if (insertError) {
      throw new Error(
        `Failed to insert child user ${child.name}: ${insertError.message}`
      );
    }

    childResults.push({
      name: child.name,
      email: child.email,
      password: child.password,
      userId: childId,
    });
  }

  // 4. Fetch quests and rewards
  const { data: quests } = (await supabase
    .from("quests")
    .select("*")
    .eq("family_id", familyId)
    .eq("is_active", true)) as { data: QuestRow[] | null; error: unknown };

  const { data: rewards } = (await supabase
    .from("rewards")
    .select("*")
    .eq("family_id", familyId)
    .eq("is_active", true)) as { data: RewardRow[] | null; error: unknown };

  if (!quests?.length || !rewards?.length) {
    throw new Error("No quests or rewards found after family creation");
  }

  const dutyQuests = quests.filter((q) => q.type === "duty");
  const bonusQuests = quests.filter((q) => q.type === "bonus");
  const violationQuests = quests.filter((q) => q.type === "violation");

  // 5. Generate transactions for each child
  const now = new Date();
  let totalTransactions = 0;
  let totalRedemptions = 0;

  for (let i = 0; i < DEMO_CHILDREN.length; i++) {
    const childProfile = DEMO_CHILDREN[i];
    const childId = childResults[i].userId;
    const { behavior } = childProfile;
    const transactions: Record<string, unknown>[] = [];

    for (let dayOffset = DEMO_HISTORY_DAYS; dayOffset >= 0; dayOffset--) {
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);
      date.setHours(0, 0, 0, 0);

      const isRecent = dayOffset <= 5;

      // Duty misses (negative stars, parent-recorded, evening)
      for (const quest of dutyQuests) {
        if (rng() < behavior.dutyMissRate) {
          transactions.push({
            family_id: familyId,
            child_id: childId,
            quest_id: quest.id,
            stars: -Math.abs(quest.stars),
            source: "parent_record",
            status: "approved",
            created_by: parentId,
            reviewed_by: parentId,
            created_at: randomTimestamp(date, 18, 21, rng),
            reviewed_at: randomTimestamp(date, 18, 21, rng),
          });
        }
      }

      // Bonus completions (positive stars, daytime)
      const [minBonuses, maxBonuses] = behavior.bonusesPerDay;
      const bonusCount =
        minBonuses + Math.floor(rng() * (maxBonuses - minBonuses + 1));
      const selectedBonuses = pickRandom(bonusQuests, bonusCount, rng);

      for (const quest of selectedBonuses) {
        const isChildRequest = rng() < behavior.childRequestRate;
        const multiplier = pickMultiplier(behavior.multiplierDist, rng);
        const createdAt = randomTimestamp(date, 8, 20, rng);

        let status: "approved" | "pending" | "rejected" = "approved";
        if (isChildRequest && isRecent && rng() < behavior.pendingRate) {
          status = "pending";
        } else if (isChildRequest && rng() < behavior.rejectedRate) {
          status = "rejected";
        }

        const reviewedAt =
          status === "pending"
            ? null
            : new Date(
                new Date(createdAt).getTime() +
                  (15 + Math.floor(rng() * 45)) * 60000
              ).toISOString();

        transactions.push({
          family_id: familyId,
          child_id: childId,
          quest_id: quest.id,
          stars: quest.stars * multiplier,
          source: isChildRequest ? "child_request" : "parent_record",
          status,
          child_note: isChildRequest ? `I did ${quest.name_en}!` : null,
          created_by: isChildRequest ? childId : parentId,
          reviewed_by: status !== "pending" ? parentId : null,
          created_at: createdAt,
          reviewed_at: reviewedAt,
        });
      }

      // Violations (negative stars, rare)
      if (violationQuests.length > 0 && rng() < behavior.violationRate) {
        const quest = pickRandom(violationQuests, 1, rng)[0];
        transactions.push({
          family_id: familyId,
          child_id: childId,
          quest_id: quest.id,
          stars: -Math.abs(quest.stars),
          source: "parent_record",
          status: "approved",
          created_by: parentId,
          reviewed_by: parentId,
          created_at: randomTimestamp(date, 10, 19, rng),
          reviewed_at: randomTimestamp(date, 10, 19, rng),
        });
      }
    }

    // Insert transactions in batches (Supabase limit)
    const BATCH_SIZE = 500;
    for (let j = 0; j < transactions.length; j += BATCH_SIZE) {
      const batch = transactions.slice(j, j + BATCH_SIZE);
      const { error } = await supabase.from("star_transactions").insert(batch);
      if (error) {
        throw new Error(
          `Failed to insert transactions for ${childProfile.name}: ${error.message}`
        );
      }
    }
    totalTransactions += transactions.length;

    // 6. Generate redemptions
    const redemptionCount = childProfile.name === "Alisa" ? 4 : 3;
    const selectedRewards = pickRandom(rewards, redemptionCount, rng);
    const redemptions: Record<string, unknown>[] = [];

    for (let r = 0; r < selectedRewards.length; r++) {
      const reward = selectedRewards[r];
      const daysAgo = 5 + Math.floor(rng() * 20);
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      const createdAt = randomTimestamp(date, 10, 18, rng);

      const isLastAndCredit =
        childProfile.target.creditEnabled && r === selectedRewards.length - 1;
      const isPending = r === 0 && rng() < 0.5;

      redemptions.push({
        family_id: familyId,
        child_id: childId,
        reward_id: reward.id,
        stars_spent: reward.stars_cost,
        status: isPending ? "pending" : "approved",
        uses_credit: isLastAndCredit,
        credit_amount: isLastAndCredit
          ? Math.min(reward.stars_cost, childProfile.target.creditLimit ?? 0)
          : 0,
        created_at: createdAt,
        reviewed_at: isPending
          ? null
          : new Date(
              new Date(createdAt).getTime() + 30 * 60000
            ).toISOString(),
      });
    }

    if (redemptions.length > 0) {
      const { error } = await supabase.from("redemptions").insert(redemptions);
      if (error) {
        throw new Error(
          `Failed to insert redemptions for ${childProfile.name}: ${error.message}`
        );
      }
    }
    totalRedemptions += redemptions.length;

    // 7. Set up credit for Alexander
    if (childProfile.target.creditEnabled && childProfile.target.creditLimit) {
      await supabase.rpc("initialize_default_interest_tiers", {
        p_family_id: familyId,
      });

      const { error: creditError } = await supabase
        .from("child_credit_settings")
        .insert({
          family_id: familyId,
          child_id: childId,
          credit_enabled: true,
          credit_limit: childProfile.target.creditLimit,
          original_credit_limit: childProfile.target.creditLimit,
        });

      if (creditError) {
        throw new Error(
          `Failed to set up credit for ${childProfile.name}: ${creditError.message}`
        );
      }

      // Insert credit transaction for the credit-using redemption
      const creditRedemption = redemptions.find((r) => r.uses_credit);
      if (creditRedemption) {
        await supabase.from("credit_transactions").insert({
          family_id: familyId,
          child_id: childId,
          transaction_type: "credit_used",
          amount: creditRedemption.credit_amount ?? 0,
          balance_after: -(creditRedemption.credit_amount ?? 0),
          created_at: creditRedemption.created_at,
        });
      }
    }
  }

  // 8. Set up report preferences
  await supabase.from("family_report_preferences").insert({
    family_id: familyId,
    report_email: DEMO_PARENT_EMAIL,
    weekly_report_enabled: true,
    monthly_report_enabled: true,
    settlement_email_enabled: true,
    timezone: "America/New_York",
    report_locale: "en",
  });

  return {
    familyId: familyId,
    parentId,
    children: childResults,
    stats: {
      transactions: totalTransactions,
      redemptions: totalRedemptions,
      days: DEMO_HISTORY_DAYS,
    },
  };
}
