# FORGE — AI Engineering Coach

FORGE 是一个面向 AI 原生工程师与 FDE 的实战训练产品。它不是课程目录，而是一个每天重复的工程闭环：

> 真实任务 → 先做判断 → 有限提示 → 修改或 Debug → 自动验收 → AI 复盘 → 更新能力雷达

## MVP 功能

- 六个覆盖 Code Reading、Code Modification、Debug Lab、System Design、Acceptance Testing、Business Analysis 与 AI Orchestration 的工程任务
- Human First 诊断门槛和两级渐进提示
- 可编辑工程工作区、真实语义验收规则和逐项失败反馈
- 基于判断结构、提示使用与证据内容的动态复盘
- 八维 Skill Matrix、能力雷达、自适应训练建议、XP 与连续训练状态
- Neon PostgreSQL 持久化训练记录；重复完成同一任务不会重复增加 XP 或能力
- 工程日志保存第一判断、验收证据、提示使用和得分

## 本地运行

需要 Node.js `>=22.13.0`。

```bash
npm install
npm run dev
```

访问 `http://localhost:3000/`。

## 质量检查

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm test` 会验证任务规则、参考解法和错误工作区行为。

## 数据

- Vercel Marketplace 中的 Neon 集成为运行环境提供 `DATABASE_URL`
- `db/schema.ts` 保存能力档案与训练记录结构
- `app/api/progress/route.ts` 负责用户隔离、进度读取和幂等奖励
- `drizzle-vercel/` 保存 PostgreSQL 迁移文件
- 本地开发从 `.env.local` 读取开发数据库连接

Vercel 版本会为匿名设备签发独立 Cookie；旧 Sites 版本的 ChatGPT 身份识别仍保留兼容。没有数据库时界面仍可离线演示，但不会伪装成已持久化。

首次建库或更新表结构：

```bash
node --env-file=.env.local ./node_modules/drizzle-kit/bin.cjs migrate
```

## 部署

项目已适配标准 Next.js，可直接部署到独立 Vercel 项目。PWA 清单、Service Worker、Apple Web App 元数据和移动端安全区支持均位于应用源码中。
