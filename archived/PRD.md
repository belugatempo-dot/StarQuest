# StarQuest | 夺星大闯关 - 开发需求文档

## 品牌信息

- **品牌**：Beluga Tempo | 鲸律
- **产品名**：StarQuest | 夺星大闯关
- **Slogan（英）**：Complete quests. Earn stars. Unlock rewards.
- **Slogan（中）**：闯关夺星，解锁奖励。

### 产品术语

| 英文 | 中文 | 说明 |
|------|------|------|
| Stars | 星星 | 积分单位 |
| Quests | 关卡任务 | 行为规则/任务 |
| Rewards | 奖励 | 可兑换的奖励 |
| Levels / Ranks | 等级 / 段位 | 累计星星达到的等级 |

---

## 项目概述

StarQuest 是一个家庭使用的儿童行为激励系统。孩子通过完成正面行为任务（Quests）获得星星（Stars），负面行为扣除星星，累积的星星可以兑换游戏时间、玩具等奖励（Rewards）。

**目标用户**：有学龄儿童的家庭，未来可扩展支持多家庭、多子女。

**设计理念**：将日常行为游戏化，让孩子在"闯关"中养成好习惯。

---

## 技术栈

- **前端**：Next.js 14+ (App Router) + Tailwind CSS
- **后端/数据库**：Supabase (PostgreSQL + Auth + RLS)
- **国际化**：next-intl
- **部署**：Vercel
- **邮件**：Resend 或 SendGrid（每周报告）

---

## 国际化 (i18n)

### 支持语言
- English (en) - 默认
- 简体中文 (zh-CN)

### 实现方式
使用 next-intl

### 语言切换逻辑
- 用户可在界面右上角切换语言
- 语言偏好保存在用户 profile 中
- 每个家庭成员可以有不同的语言设置
- 首次访问根据浏览器语言自动选择

### 目录结构
```
/messages
  /en.json
  /zh-CN.json
```

### 翻译范围
- UI 文字（按钮、标签、提示）
- 系统通知和提示信息
- 邮件模板（根据收件人语言设置）
- 预设的 Quests 和 Rewards 提供双语模板

### 格式本地化
- 日期：en → MM/DD/YYYY, zh → YYYY年MM月DD日
- 时间：en → 12-hour (3:00 PM), zh → 24-hour (15:00)

### 注意事项
- 用户自定义内容（Quest 名称、Reward 名称、备注）不翻译，保持用户输入原样
- 界面布局需考虑中英文长度差异

---

## 用户角色与权限

### 家长 (parent)
- 创建/编辑 Quests（任务规则）
- 直接记录星星（无需审批）
- 审批孩子提交的星星申请
- 创建/编辑 Rewards（奖励）
- 审批孩子的兑换申请
- 查看统计报表
- 管理家庭成员

### 孩子 (child)
- 查看自己的星星余额和历史
- 发起星星申请（完成任务后申请，需家长审批）
- 发起兑换申请（需家长审批）
- 查看可兑换的 Rewards 列表
- 查看自己的等级（Level/Rank）

---

## 核心业务流程

### 流程 A：获得星星
```
方式1：家长主动记录（无需审批）
家长看到孩子行为 → 选择 Quest 或自定义 → 直接生效（status = approved）

方式2：孩子发起申请（需审批）
孩子完成任务 → 选择 Quest 并提交说明 → status = pending 
→ 家长审批 → approved（星星生效）/ rejected（星星不生效，附原因）
```

### 流程 B：星星兑换
```
孩子发起兑换 → 选择 Reward → status = pending
→ 家长审批 → approved（扣除星星）/ rejected（星星不变，附原因）
→ 家长标记 fulfilled（奖励已实际给予）
```

### 流程 C：扣除星星
```
仅家长可操作
家长记录负面行为 → 选择扣分 Quest 或自定义 → 直接生效
```

---

## 数据库设计

### 表 1：families（家庭）
```sql
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 表 2：users（用户）
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  family_id UUID REFERENCES families(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('parent', 'child')),
  email TEXT,
  avatar_url TEXT,
  locale TEXT DEFAULT 'en' CHECK (locale IN ('en', 'zh-CN')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 表 3：quests（任务规则）
```sql
CREATE TABLE quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) NOT NULL,
  name_en TEXT NOT NULL,
  name_zh TEXT,
  stars INTEGER NOT NULL, -- 正数加星，负数扣星
  category TEXT, -- 'learning', 'chores', 'manners', 'health', 'other'
  icon TEXT, -- emoji
  is_positive BOOLEAN GENERATED ALWAYS AS (stars > 0) STORED,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 表 4：star_transactions（星星流水）
```sql
CREATE TABLE star_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) NOT NULL,
  child_id UUID REFERENCES users(id) NOT NULL,
  quest_id UUID REFERENCES quests(id), -- 可选，用模板时填
  custom_description TEXT, -- 不用模板时的描述
  stars INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('parent_record', 'child_request')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  child_note TEXT, -- 孩子的说明
  parent_response TEXT, -- 家长的回复/拒绝原因
  created_by UUID REFERENCES users(id) NOT NULL,
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);
```

### 表 5：rewards（奖励）
```sql
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) NOT NULL,
  name_en TEXT NOT NULL,
  name_zh TEXT,
  stars_cost INTEGER NOT NULL,
  category TEXT, -- 'screen_time', 'toys', 'activities', 'treats', 'other'
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 表 6：redemptions（兑换记录）
```sql
CREATE TABLE redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) NOT NULL,
  child_id UUID REFERENCES users(id) NOT NULL,
  reward_id UUID REFERENCES rewards(id) NOT NULL,
  stars_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled')),
  child_note TEXT,
  parent_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  fulfilled_at TIMESTAMP WITH TIME ZONE
);
```

### 表 7：levels（等级配置）
```sql
CREATE TABLE levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) NOT NULL,
  level_number INTEGER NOT NULL,
  name_en TEXT NOT NULL,
  name_zh TEXT,
  stars_required INTEGER NOT NULL, -- 累计获得多少星星达到此等级
  icon TEXT, -- badge emoji
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(family_id, level_number)
);
```

### 视图：child_balances（孩子星星余额）
```sql
CREATE VIEW child_balances AS
SELECT 
  u.id AS child_id,
  u.family_id,
  u.name,
  -- 当前可用星星 = 获得的 - 已兑换的
  COALESCE(SUM(st.stars) FILTER (WHERE st.status = 'approved'), 0) 
    - COALESCE(
        (SELECT SUM(r.stars_spent) 
         FROM redemptions r 
         WHERE r.child_id = u.id AND r.status IN ('approved', 'fulfilled')), 
        0
      ) AS current_stars,
  -- 累计获得的星星（用于计算等级）
  COALESCE(SUM(st.stars) FILTER (WHERE st.status = 'approved' AND st.stars > 0), 0) AS lifetime_stars
FROM users u
LEFT JOIN star_transactions st ON st.child_id = u.id
WHERE u.role = 'child'
GROUP BY u.id, u.family_id, u.name;
```

---

## RLS 策略（行级安全）

### 基本原则
- 所有表都启用 RLS
- 用户只能访问自己 family_id 的数据
- 家长可以读写所有家庭数据
- 孩子只能读，且只能创建特定类型的记录

### 策略示例
```sql
-- 启用 RLS
ALTER TABLE star_transactions ENABLE ROW LEVEL SECURITY;

-- 家长：完全访问自己家庭的数据
CREATE POLICY "Parents full access" ON star_transactions
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'parent'
    )
  );

-- 孩子：只能读取自己家庭的数据
CREATE POLICY "Children read own family" ON star_transactions
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid() AND role = 'child'
    )
  );

-- 孩子：只能创建自己的星星申请（仅正面行为）
CREATE POLICY "Children create own requests" ON star_transactions
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM users WHERE role = 'child')
    AND child_id = auth.uid()
    AND source = 'child_request'
    AND status = 'pending'
    AND stars > 0
  );

-- 对其他表应用类似策略...
```

---

## 页面结构

### 公共页面
- `/` - Landing page（产品介绍，展示 slogan）
- `/login` - 登录
- `/register` - 注册（创建家庭 + 第一个家长账号）
- `/join/:invite_code` - 通过邀请码加入家庭（未来）

### 孩子视角 `/app`
- `/app` - Dashboard：星星余额、当前等级、进度条、最近记录
- `/app/quests` - 可完成的任务列表 + 发起申请
- `/app/rewards` - 奖励商店 + 发起兑换
- `/app/history` - 历史记录（获得 & 兑换）
- `/app/profile` - 个人信息、等级徽章墙

### 家长视角 `/admin`
- `/admin` - 管理后台首页：待审批数、快速操作、本周统计
- `/admin/record` - 快速记录星星（选 Quest 或自定义）
- `/admin/approve` - 审批中心（星星申请 + 兑换申请）
- `/admin/quests` - 管理任务规则
- `/admin/rewards` - 管理奖励
- `/admin/levels` - 管理等级设置
- `/admin/family` - 家庭成员管理
- `/admin/reports` - 统计报表（周/月趋势）
- `/admin/settings` - 家庭设置

---

## 功能模块详细设计

### 1. Quests（任务）管理

**预设任务模板**（首次创建家庭时自动添加）：

| 英文 | 中文 | Stars | Category |
|------|------|-------|----------|
| Finish homework on time | 按时完成作业 | +10 | learning |
| Read for 30 minutes | 阅读30分钟 | +5 | learning |
| Help with chores | 帮忙做家务 | +5 | chores |
| Be polite and respectful | 礼貌待人 | +3 | manners |
| Brush teeth without reminder | 主动刷牙 | +2 | health |
| Exercise for 30 minutes | 运动30分钟 | +5 | health |
| Hitting or fighting | 打人 | -15 | manners |
| Lying | 说谎 | -10 | manners |
| Not following rules | 不遵守规则 | -5 | other |

**功能**：
- 家长可增删改任务
- 支持分类筛选
- 支持 emoji 图标
- 可停用（保留历史关联）
- 支持排序

### 2. Rewards（奖励）管理

**预设奖励模板**：

| 英文 | 中文 | Stars | Category |
|------|------|-------|----------|
| 30 min screen time | 30分钟屏幕时间 | 30 | screen_time |
| 1 hour gaming | 1小时游戏 | 50 | screen_time |
| Choose dinner menu | 选择晚餐菜单 | 20 | activities |
| Small toy | 小玩具 | 100 | toys |
| Play date with friends | 和朋友玩耍日 | 80 | activities |
| Stay up 30 min late | 晚睡30分钟 | 40 | treats |

### 3. Levels（等级）系统

**默认等级设置**：

| Level | 英文 | 中文 | 累计星星 | Icon |
|-------|------|------|----------|------|
| 1 | Starter | 新手 | 0 | 🌱 |
| 2 | Explorer | 探索者 | 50 | 🔍 |
| 3 | Adventurer | 冒险家 | 150 | 🎒 |
| 4 | Champion | 勇士 | 300 | ⚔️ |
| 5 | Hero | 英雄 | 500 | 🦸 |
| 6 | Legend | 传奇 | 1000 | 👑 |
| 7 | Star Master | 星星大师 | 2000 | ⭐ |

**功能**：
- 等级基于累计获得的星星（lifetime_stars），不因兑换减少
- 升级时显示庆祝动画
- 徽章墙展示已达成等级

### 4. 审批中心

**显示内容**：
- 待审批的星星申请（孩子发起）
- 待审批的兑换申请
- 按时间排序，最新在前

**操作**：
- Approve：通过，生效
- Reject：拒绝，可填写原因
- 批量操作（可选）

### 5. 统计报表

**周报内容**：
- 本周获得/扣除星星统计
- 按任务类别分布饼图
- 趋势对比（vs 上周）
- Top 3 完成的任务
- 兑换记录

**月报**：
- 月度总结
- 等级变化
- 累计里程碑

### 6. 周报邮件

**发送时间**：每周日晚 8 点（可配置）

**收件人**：家庭中所有家长

**邮件内容**（根据收件人语言设置）：
```
Subject: [StarQuest] Weekly Report - {Child Name} | 周报 - {孩子名字}

Hi {Parent Name},

Here's {Child Name}'s weekly summary:

⭐ Stars This Week: +45 (earned) / -5 (deducted)
🏆 Current Balance: 230 stars
📈 Level: Champion (⚔️)

Top Quests Completed:
1. Finish homework on time (x5)
2. Read for 30 minutes (x3)
3. Help with chores (x2)

Rewards Redeemed:
- 30 min screen time (x2)

Keep up the great work!

— The StarQuest Team
```

---

## UI/UX 设计指南

### 整体风格
- 现代、简洁、友好
- 适合儿童的明亮配色
- 大量使用 emoji 和图标增加趣味性

### 配色建议
```
Primary: #FFD700 (金色/星星色)
Secondary: #4F46E5 (靛蓝/冷静专业)
Success: #10B981 (绿色/正面行为)
Warning: #F59E0B (橙色/提醒)
Danger: #EF4444 (红色/扣分)
Background: #F9FAFB (浅灰白)
```

### 孩子界面
- 大字体（至少 16px body）
- 大按钮（易于点击）
- 丰富的视觉反馈（动画、emoji）
- 进度可视化（进度条、星星动画）
- 简化导航

### 家长界面
- 高效操作（一键记录）
- 清晰的数据展示
- 批量操作支持
- 快捷键支持（可选）

### 响应式设计
- 优先移动端（孩子可能用平板）
- 桌面端增强体验

---

## 开发顺序建议

### Phase 1：基础框架（Week 1）
1. Next.js 项目初始化 + Tailwind 配置
2. next-intl 国际化配置
3. Supabase 项目设置
4. 数据库建表 + RLS 策略
5. 认证流程（注册、登录、登出）
6. 基础布局组件

### Phase 2：核心功能 - 孩子端（Week 2）
7. 孩子 Dashboard（星星余额、等级显示）
8. 星星历史列表
9. 任务列表页
10. 发起星星申请功能
11. 奖励列表页
12. 发起兑换申请功能

### Phase 3：核心功能 - 家长端（Week 3）
13. 家长 Dashboard
14. 快速记录星星
15. 审批中心（星星申请）
16. 审批中心（兑换申请）
17. Quest 管理（CRUD）
18. Reward 管理（CRUD）

### Phase 4：完善功能（Week 4）
19. 等级系统 + 升级动画
20. 家庭成员管理
21. 用户 Profile 页
22. 统计报表页
23. 设置页（语言、通知偏好）

### Phase 5：增值功能（Week 5+）
24. 周报邮件（Edge Function + Resend）
25. 邀请码加入家庭
26. PWA 支持（可安装到手机）
27. 数据导出
28. 深色模式（可选）

---

## 文件结构建议
```
/app
  /[locale]
    /layout.tsx
    /page.tsx (Landing)
    /(auth)
      /login/page.tsx
      /register/page.tsx
    /(child)
      /app
        /page.tsx (Dashboard)
        /quests/page.tsx
        /rewards/page.tsx
        /history/page.tsx
        /profile/page.tsx
    /(parent)
      /admin
        /page.tsx (Dashboard)
        /record/page.tsx
        /approve/page.tsx
        /quests/page.tsx
        /rewards/page.tsx
        /levels/page.tsx
        /family/page.tsx
        /reports/page.tsx
        /settings/page.tsx

/components
  /ui (通用 UI 组件)
  /child (孩子端专用组件)
  /admin (家长端专用组件)
  /shared (共享业务组件)

/lib
  /supabase.ts (Supabase client)
  /auth.ts (认证相关)
  /utils.ts (工具函数)

/messages
  /en.json
  /zh-CN.json

/types
  /database.ts (数据库类型定义)

/hooks
  /useUser.ts
  /useStars.ts
  /useQuests.ts
  ...
```

---

## 安全注意事项

1. **永远信任 RLS**：前端可以直接调用 Supabase，RLS 保证数据隔离
2. **敏感操作验证**：审批、删除等操作在 RLS 中验证角色
3. **输入校验**：前端 + 数据库约束双重校验
4. **XSS 防护**：用户输入内容需转义显示
5. **Rate Limiting**：防止滥用（Supabase 有基础保护）

---

## 未来扩展考虑

- **多子女支持**：已在数据模型中预留
- **多家庭/SaaS**：family_id 隔离已就绪
- **成就系统**：解锁特殊徽章
- **排行榜**：家庭内或跨家庭
- **AI 建议**：根据行为模式推荐任务
- **家长协作**：多家长审批、评论
- **导出报告**：PDF 月度报告

---

## 参考资源

- [Supabase 文档](https://supabase.com/docs)
- [Next.js 文档](https://nextjs.org/docs)
- [next-intl 文档](https://next-intl-docs.vercel.app/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Resend 邮件服务](https://resend.com/docs)

---

*Document Version: 1.0*
*Last Updated: 2025 Dec 
*Product: StarQuest | 夺星大闯关*
*Brand: Beluga Tempo | 鲸律*