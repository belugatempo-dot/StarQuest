# StarQuest 项目信息卡 | Project Info Card

---

## 中文版

**项目名称**: StarQuest (星之任务)

**一句话描述**: 一个游戏化的家庭行为追踪系统，让孩子通过完成任务赚星星换奖励

**解决的问题**: 当爹妈太累了！每天催孩子做作业、刷牙、整理房间... 与其唠叨一百遍，不如把这些变成"任务"，完成了就能攒星星换奖励。孩子有动力，家长省口舌，双赢。

**类型**: 个人项目 / 家庭实用工具

**技术栈**:
- 前端: Next.js 15 + React 18 + TypeScript + Tailwind CSS
- 后端: Supabase (PostgreSQL + Auth + RLS)
- 分析: PostHog
- 邮件: Resend
- 国际化: next-intl (中英双语)

**开发时间**: 断断续续几个月，核心功能大概两周

**完成度**: 已上线使用 (https://starquest-kappa.vercel.app)

**最得意的地方**:
1. **任务分类系统** — 二维分类（类型×范围），不是简单的"做了加分不做扣分"，而是区分了日常责任、额外加分、违规扣分三种类型
2. **信用系统** — 孩子可以"借星星"提前兑换奖励，学习理财概念
3. **测试覆盖率 ~99%** — 3050+ 测试用例，TDD 开发
4. **星空夜景主题** — 玻璃拟态设计，看起来很酷

**踩过的坑**:
- Next.js Auth + Cookie 的坑：登录后用 `router.push()` 会导致无限循环，必须用 `window.location.href` 硬跳转
- Supabase RLS 配合 Demo 模式：为了让演示用户只能看不能改，写了一堆数据库级别的只读策略

---

## English Version

**Project Name**: StarQuest

**One-liner**: A gamified family behavior tracking system where kids earn stars by completing quests and redeem them for rewards

**Problem It Solves**: Parenting is exhausting! Instead of nagging kids a hundred times to do homework, brush teeth, or clean their room, turn those into "quests" that earn stars for rewards. Kids get motivated, parents save their breath. Win-win.

**Type**: Personal Project / Family Tool

**Tech Stack**:
- Frontend: Next.js 15 + React 18 + TypeScript + Tailwind CSS
- Backend: Supabase (PostgreSQL + Auth + RLS)
- Analytics: PostHog
- Email: Resend
- i18n: next-intl (English + Chinese)

**Dev Time**: On and off for a few months, core features ~2 weeks

**Status**: Live in production (https://starquest-kappa.vercel.app)

**Proudest Achievements**:
1. **Quest Classification System** — Two-dimensional (type × scope). Not just "do it = points, skip it = no points". It distinguishes between duties (miss = penalty), bonuses (do = reward), and violations (occur = penalty)
2. **Credit System** — Kids can "borrow stars" to redeem rewards early, learning basic finance concepts
3. **~99% Test Coverage** — 3050+ test cases, TDD all the way
4. **Cosmic Night Theme** — Glass morphism design that looks pretty cool

**Lessons Learned**:
- Next.js Auth + Cookie trap: Using `router.push()` after login causes infinite loop. Must use `window.location.href` for hard navigation
- Supabase RLS for Demo Mode: Wrote a bunch of database-level read-only policies to let demo users browse but not modify

---

**Brand**: Beluga Tempo | 鲸律

**Live Demo**: https://starquest-kappa.vercel.app (Try the demo mode!)

**Last Updated**: 2026-02-27
