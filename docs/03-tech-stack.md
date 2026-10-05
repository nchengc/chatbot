# 03. 技术栈一览

> 摘自计划文档：[chatgpt-inherited-marble.md](../../../../../../Users/Administrator/.claude/plans/chatgpt-inherited-marble.md)

## §2 技术栈（parse 0–3）

| 层 | 选型 | 备注 |
|---|---|---|
| 前端框架 | React 18 + TypeScript + Vite | Vercel 零配置部署 |
| 前端状态 | Zustand | 流式请求用 fetch + ReadableStream |
| 前端 UI | TailwindCSS + shadcn/ui | 暗色主题，类 ChatGPT 风格 |
| Markdown | `react-markdown` + `remark-gfm` + `react-syntax-highlighter` | 支持代码高亮、表格、任务列表 |
| 后端 | Python 3.11 + FastAPI + Uvicorn | async 全栈 |
| ORM | SQLModel | 与 FastAPI 同源 |
| 数据库 | SQLite（开发与生产同用，单实例）| 文件 `data/app.db`；提供 `DATABASE_URL` 切换 Postgres 的 hook |
| LLM | **MiniMax-M3**（OpenAI 兼容协议）| parse 2 对话款，parse 3 加推理款 |
| 鉴权（v1） | 无登录，前端生成 UUID 作为 `X-User-Id` Header | 后端校验格式 |
| 跨域 | FastAPI `CORSMiddleware` 放行 Vercel 域名 | |
| 部署 | 前端 Vercel；后端 Docker（uvicorn）→ Nginx 反代 | CORS + HTTPS 由 Nginx 处理 |
| 监控 | 后端 `loguru`；前端 Sentry（可选） | |

> Chroma / LangChain / Sentence-Transformers / Ollama 等统一从 v1 栈移除，**仅在 parse 4+ 重新引入**。

## parse 4+ 暂缓清单

- ChromaDB / 向量检索（RAG）
- LangChain / LlamaIndex（chain / agent 编排）
- Sentence-Transformers / 本地 embedding
- Ollama / 本地推理
- Function Calling 协议
- 多模态（图片上传、Vision 模型）
- 联网搜索工具

## 上一步 / 下一步

- 上一步：[02-architecture.md](./02-architecture.md)
- 下一步：[04-project-structure.md](./04-project-structure.md)