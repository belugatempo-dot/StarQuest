# Supabase 重置指南 | Supabase Reset Guide

## 🎯 快速重置步骤 | Quick Reset Steps

### 方法 1：使用完整 Schema 文件（推荐）

**适合**：想要最新的完整 schema，包含所有 PRD 更新

1. **登录 Supabase Studio**
   ```
   https://supabase.com/dashboard
   ```

2. **选择您的项目**

3. **打开 SQL Editor**
   - 左侧菜单 → SQL Editor
   - 点击 "+ New query"

4. **删除所有现有表**（如果有的话）

   复制以下 SQL 并运行：
   ```sql
   -- 警告：这会删除所有数据！
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO postgres;
   GRANT ALL ON SCHEMA public TO public;
   ```

5. **运行完整 Schema**

   - 打开文件：`supabase/migrations/COMPLETE_SCHEMA.sql`
   - 复制**全部内容**
   - 粘贴到 SQL Editor
   - 点击 "Run" 或按 `Cmd+Enter`

6. **验证安装**

   运行以下查询检查：
   ```sql
   -- 查看所有表
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';

   -- 应该看到 7 个表：
   -- families, users, quests, star_transactions, rewards, redemptions, levels
   ```

7. **测试模板函数**

   ```sql
   -- 查看模板函数是否存在
   SELECT routine_name FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name IN ('initialize_family_templates', 'create_family_with_templates');
   ```

---

### 方法 2：逐步运行 Migrations（仅用于学习）

**适合**：想了解每一步的变化

按顺序运行以下文件：

1. ✅ `20250101000000_initial_schema.sql` - 基础 schema
2. ✅ `20250102000000_add_quest_type_scope.sql` - 添加新字段
3. ✅ `20250102000001_update_seed_templates.sql` - 更新模板

⚠️ **跳过**: `20250101000001_seed_templates.sql`（已过时）

---

## ✅ 验证清单 | Verification Checklist

运行完成后，检查以下内容：

### 1. 表结构检查

```sql
-- 检查 quests 表的新字段
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'quests'
AND column_name IN ('type', 'scope', 'max_per_day');

-- 应该看到：
-- type        | text    | 'bonus'::text
-- scope       | text    | 'self'::text
-- max_per_day | integer | 1
```

### 2. 测试创建家庭

在您的应用中注册一个新家庭，然后检查：

```sql
-- 查看创建的任务数量
SELECT
  type,
  scope,
  COUNT(*) as count
FROM quests
GROUP BY type, scope
ORDER BY type, scope;

-- 应该看到：
-- bonus     | family | 7
-- bonus     | other  | 5
-- bonus     | self   | 6
-- duty      | self   | 11
-- violation | self   | 7
-- 总计：36 个任务
```

### 3. 检查奖励

```sql
-- 查看奖励数量
SELECT COUNT(*) FROM rewards;
-- 应该是：每个家庭 11 个

-- 查看等级
SELECT COUNT(*) FROM levels;
-- 应该是：每个家庭 7 个
```

---

## 🔧 常见问题 | Troubleshooting

### 问题 1: "permission denied for schema public"

**解决方案**：
```sql
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
```

### 问题 2: "relation already exists"

**解决方案**：先删除所有表，重新开始
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

### 问题 3: RLS 策略不生效

**检查**：
```sql
-- 确认 RLS 已启用
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- rowsecurity 应该都是 't' (true)
```

### 问题 4: 注册时没有创建模板

**检查函数**：
```sql
-- 手动调用模板函数测试
SELECT initialize_family_templates('your-family-id-here'::uuid);
```

---

## 📱 下一步：测试应用

重置完成后，在您的应用中：

1. **注册新家庭**
   - 使用家长账号注册
   - 检查是否自动创建了 36 个任务模板

2. **添加孩子账号**
   - 在家长端添加孩子
   - 用孩子账号登录

3. **测试孩子端**
   - 进入 Quests 页面
   - 应该只看到 Bonus Quests（18个）
   - 按三组显示：帮助家人、自我提升、帮助他人

4. **测试家长端**
   - 进入快速记录页面 `/admin/record`
   - 应该看到三组任务：
     - ⭐ Did Good (Bonus - 18个)
     - 📋 Missed Duty (Duty - 11个)
     - ⚠️ Violation (Violation - 7个)

---

## 🎉 完成！

数据库已重置为最新 schema，包含：

- ✅ 新的任务分类系统 (type, scope, max_per_day)
- ✅ 36 个更新的任务模板
- ✅ 11 个更新的奖励模板
- ✅ 7 个等级
- ✅ 完整的 RLS 安全策略

开始使用新系统吧！🚀

---

## 📞 需要帮助？

如果遇到问题：
1. 检查 Supabase Studio 的 Logs
2. 查看浏览器 Console 的错误信息
3. 确认环境变量配置正确（`.env.local`）
