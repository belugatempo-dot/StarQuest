# StarQuest 快速设置指南

## 📋 设置步骤概览

1. ✅ 代码已就绪（Phase 1 + 2 完成）
2. ⏳ 创建 Supabase 项目
3. ⏳ 运行数据库迁移
4. ⏳ 配置环境变量
5. ⏳ 启动项目

---

## 1️⃣ 创建 Supabase 项目

### 步骤：

1. **访问** [https://supabase.com](https://supabase.com)
2. **登录** 或注册账号
3. **点击** "New Project"
4. **填写**：
   - Project Name: `StarQuest`（或其他名称）
   - Database Password: 创建一个强密码（记住它！）
   - Region: 选择离你最近的地区（如 `ap-southeast-1` 新加坡）
5. **点击** "Create new project"
6. **等待** 2-3 分钟项目创建完成

---

## 2️⃣ 运行数据库迁移

### 方法 A：通过 Supabase 控制台（推荐）

1. **在 Supabase Dashboard** 左侧菜单找到 `SQL Editor`
2. **点击** "New Query"
3. **复制** 以下文件的全部内容：
   ```
   supabase/migrations/20250101000000_initial_schema.sql
   ```
4. **粘贴** 到 SQL Editor
5. **点击** "Run" 按钮执行
6. **等待** 执行完成（应该显示 "Success"）

7. **重复步骤 2-6**，这次复制：
   ```
   supabase/migrations/20250101000001_seed_templates.sql
   ```

### 方法 B：使用 Supabase CLI（高级）

```bash
# 安装 Supabase CLI
npm install -g supabase

# 链接到你的项目（需要项目 ref）
supabase link --project-ref your-project-ref

# 推送迁移
supabase db push
```

---

## 3️⃣ 验证数据库创建

在 Supabase Dashboard:

1. **进入** `Table Editor`（左侧菜单）
2. **检查** 是否有以下表：
   - ✅ families
   - ✅ users
   - ✅ quests
   - ✅ star_transactions
   - ✅ rewards
   - ✅ redemptions
   - ✅ levels

3. **进入** `Database` → `Views`
4. **检查** 是否有：
   - ✅ child_balances

如果都存在，说明数据库创建成功！ 🎉

---

## 4️⃣ 获取环境变量

在 Supabase Dashboard:

1. **点击** 左侧菜单的 `Project Settings`（齿轮图标）
2. **点击** `API` 标签
3. **复制** 以下值：

   **Project URL**（在 "Project URL" 下）:
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```

   **anon/public key**（在 "Project API keys" → "anon public" 下）:
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

   **service_role key**（在 "Project API keys" → "service_role" 下，需要点击 "Reveal"）:
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   ⚠️ **警告**: service_role key 非常重要，不要泄露！

---

## 5️⃣ 配置环境变量

在项目根目录：

1. **创建** `.env.local` 文件：
   ```bash
   touch .env.local
   ```

2. **添加** 以下内容（替换为你的实际值）：
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **保存** 文件

---

## 6️⃣ 启动项目

```bash
# 确保依赖已安装
npm install

# 启动开发服务器
npm run dev
```

项目将在 http://localhost:3000 启动

---

## 7️⃣ 测试功能

### 注册第一个家庭

1. 访问 http://localhost:3000
2. 点击右上角切换语言（测试中英文）
3. 点击 "Register"
4. 填写：
   - Family Name: `测试家庭`
   - Your Name: `爸爸`
   - Email: `test@example.com`
   - Password: `password123`
5. 点击 "Register"

✅ 如果成功，会跳转到家长 Dashboard！

### 检查数据库

回到 Supabase Dashboard → Table Editor:

1. **查看 `families` 表** - 应该有一条记录
2. **查看 `users` 表** - 应该有一个家长用户
3. **查看 `quests` 表** - 应该有 9 个预设任务
4. **查看 `rewards` 表** - 应该有 6 个预设奖励
5. **查看 `levels` 表** - 应该有 7 个等级

---

## 8️⃣ 创建孩子账号

### 方法 A：通过数据库（临时方案）

1. 在 Supabase Dashboard → **Authentication** → **Users**
2. **点击** "Add User"
3. **填写**：
   - Email: `child@example.com`
   - Password: `password123`
   - Auto Confirm User: ✅
4. **点击** "Create User"
5. **复制** 新用户的 User UID

6. 在 **Table Editor** → **users** 表
7. **点击** "Insert row"
8. **填写**：
   - id: 粘贴刚才的 User UID
   - family_id: 从 families 表复制你的 family_id
   - name: `小明`
   - role: `child`
   - locale: `zh-CN`
9. **点击** "Save"

### 方法 B：等待 Phase 3（家长端成员管理功能）

---

## 9️⃣ 测试孩子端功能

1. **登出** 家长账号
2. **登录** 孩子账号：
   - Email: `child@example.com`
   - Password: `password123`

你应该能看到：
- ✅ **Dashboard**: 显示 0 星星、等级 1
- ✅ **Quests**: 9 个可完成的任务
- ✅ **Rewards**: 6 个可兑换的奖励
- ✅ **History**: 暂无记录
- ✅ **Profile**: 个人信息和徽章墙

---

## 🎉 成功！

如果所有步骤都正常，说明 StarQuest 已经成功运行！

---

## 🐛 常见问题

### Q: 运行 SQL 迁移时报错？
A: 检查是否按顺序运行了两个 SQL 文件，先运行 `initial_schema.sql`，再运行 `seed_templates.sql`

### Q: 注册后报错 "Failed to create user"？
A: 检查 `.env.local` 中的环境变量是否正确

### Q: 孩子登录后看不到任务？
A: 检查 `quests` 表中的 `family_id` 是否与用户的 `family_id` 一致

### Q: RLS 策略报错？
A: 确保两个 SQL 迁移文件都成功执行了

---

## 📚 下一步

Phase 2 已完成所有孩子端功能。现在可以：

1. **测试现有功能** - 完整体验孩子端流程
2. **开始 Phase 3** - 开发家长端功能（审批、管理）
3. **添加更多测试** - 为新功能编写测试

选择你想继续的方向！🚀
