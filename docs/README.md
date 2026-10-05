# Chatbot 项目文档索引

> 项目：类 ChatGPT 对话问答系统（**MiniMax-M3**）  
> 主计划：`C:\Users\Administrator\.claude\plans\chatgpt-inherited-marble.md`

## 文档地图

1. [Context & 背景](./01-context.md) — 需求背景、parse 0–3 范围、技术栈对比理由
2. [总体架构](./02-architecture.md) — 架构图 + 跨域/部署拓扑
3. [技术栈](./03-tech-stack.md) — parse 0–3 选型一览 + parse 4+ 暂缓清单
4. [目录结构](./04-project-structure.md) — 完整目录树与文件职责
5. [数据模型](./05-data-model.md) — User / Session / Message + thinking 字段
6. [API 约定](./06-api.md) — 接口表 + SSE 协议（含 thinking 事件）
7. [前端模块](./07-frontend.md) — Store、SSE 消费、UI 交互（含折叠式思考块）、Vercel 部署
8. [环境变量](./08-env.md) — `.env.example` MiniMax 字段说明
9. [实施阶段 (parse 0–3)](./09-phases.md) — 4 个 parse 的任务 + 估时
10. [关键文件](./10-files.md) — 按 parse 切分的待新建文件清单
11. [验证清单](./11-verification.md) — 每个 parse 的验收清单 + curl 冒烟示例
12. [后续增强 (parse 4+)](./12-future.md) — RAG / Tool / 体验 / 部署 / 账号 路线图

## 快速开始

1. 看 [Context](./01-context.md) 了解目标
2. 看 [总体架构](./02-architecture.md) 把握全貌
3. 按 [parse 0–3 阶段](./09-phases.md) 推进
4. 用 [验证清单](./11-verification.md) 验收

## 上一步 / 下一步

- 上一步：主计划文档 [chatgpt-inherited-marble.md](../../../../../../Users/Administrator/.claude/plans/chatgpt-inherited-marble.md)
- 下一步：[01-context.md](./01-context.md)