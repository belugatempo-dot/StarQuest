-- 🧪 测试查询 | Test Queries for Quest Classification System

-- 1. 查看所有表
SELECT tablename FROM pg_tables WHERE schemaname = 'public'
ORDER BY tablename;
-- 应该看到: families, levels, quests, redemptions, rewards, star_transactions, users

-- 2. 检查 quests 表的新字段
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'quests'
AND column_name IN ('type', 'scope', 'max_per_day')
ORDER BY column_name;
-- 应该看到:
-- max_per_day | integer | 1
-- scope       | text    | 'self'::text
-- type        | text    | 'bonus'::text

-- 3. 统计模板任务数量（注册家庭后会自动创建）
SELECT
  type,
  scope,
  COUNT(*) as count
FROM quests
GROUP BY type, scope
ORDER BY type, scope;
-- 应该看到:
-- bonus     | family | 7
-- bonus     | other  | 5
-- bonus     | self   | 6
-- duty      | self   | 11
-- violation | self   | 7
-- 总计: 36 个任务

-- 4. 查看 Bonus Quests（孩子端可见的任务）
SELECT
  id,
  name_en,
  stars,
  type,
  scope,
  category,
  icon
FROM quests
WHERE type = 'bonus'
ORDER BY scope, sort_order
LIMIT 10;

-- 5. 查看 Duty Quests（家长端记录"漏做"）
SELECT
  name_en,
  stars,
  category,
  max_per_day
FROM quests
WHERE type = 'duty'
ORDER BY category, sort_order;

-- 6. 查看 Violation Quests（家长端记录"违规"）
SELECT
  name_en,
  stars,
  category
FROM quests
WHERE type = 'violation'
ORDER BY sort_order;

-- 7. 验证索引存在
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'quests'
AND indexname IN ('idx_quests_type', 'idx_quests_scope');

-- 8. 检查模板函数
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('initialize_family_templates', 'create_family_with_templates');

-- 9. 查看奖励模板
SELECT
  name_en,
  stars_required,
  category
FROM rewards
ORDER BY stars_required;

-- 10. 查看等级系统
SELECT
  name_en,
  min_stars,
  icon
FROM levels
ORDER BY min_stars;
