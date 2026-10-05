# 01. Context & 背景

> 摘自计划文档：[chatgpt-inherited-marble.md](../../../../../../Users/Administrator/.claude/plans/chatgpt-inherited-marble.md)

## Context

新建一个类 ChatGPT 的对话问答系统。**LLM 统一使用 MiniMax-M3**（同一基座，通过「强度 / 思考开关」区分对话款与推理款；parse 2 接对话款，parse 3 切换为推理款，二者互斥）。前端用 **React + Vite + TS**（Web SPA），后端用 **Python + FastAPI**。

## v1 范围：parse 0–3

| parse | 标题 | 估时 |
|---|---|---|
| parse 0 | 初始化项目 + 前后端健康度联通 | 0.5 d |
| parse 1 | 前端 UI（消息流、折叠式思考块、模式选择器、输入区）— 用 mock 数据 | 1.5 d |
| parse 2 | 后端接通 MiniMax-M3 对话款，SSE 流式返回，UI 真实呈现思考过程（折叠式） | 1.5 d |
| parse 3 | 在同一基座 M3 上切换「对话模式 / 推理模式」，互斥下拉切换 | 1 d |
| **合计** | **v1（parse 0–3）** | **≈ 4.5 d** |

## v1 范围之外（推到 parse 4+）

- RAG 知识库（上传 → 切片 → embed → Chroma）
- 工具调用 / Agent（calculator、datetime、web_search；Function Calling 循环）
- 体验打磨（停止生成、断线重连、模型强度切换）
- 部署（Docker + Nginx + Vercel 联调）
- 账号（JWT + 多端同步）

## v1 内已确认的取舍

- **不做账号**：v1 用匿名 `user_id`（UUID 存 localStorage），无登录。
- **LLM 单源**：仅 MiniMax-M3（OpenAI 兼容协议），不再支持 Ollama / 多 provider 切换。
- **不做 RAG / Tool**：整个 §5.2 / §5.3 协议和 Chroma / 工具目录全部从 v1 计划中拿掉，parse 4+ 再补。
- **思考过程 UI**：固定走折叠式（默认收起，顶部「💭 思考过程 ▾」标签，点击展开）。

## 技术栈对比理由（不变）

> 选 "React+Vite+FastAPI" 而非 "Next.js 全栈"：Python LLM 生态更优、FastAPI async SSE 更顺手、AI 主线 Python 写更省事。

## 上一步 / 下一步

- 上一步：[README.md](./README.md)
- 下一步：[02-architecture.md](./02-architecture.md)