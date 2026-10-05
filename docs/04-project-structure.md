# 04. 项目目录结构

> 摘自计划文档：[chatgpt-inherited-marble.md](../../../../../../Users/Administrator/.claude/plans/chatgpt-inherited-marble.md)

## §3 项目目录结构（parse 0–3）

```
chatbot/
├── frontend/                    # Vite + React + TS
│   ├── src/
│   │   ├── api/                 # fetch 封装，自动注入 X-User-Id；stream.ts 解析 SSE
│   │   ├── components/
│   │   │   ├── chat/ChatWindow.tsx
│   │   │   ├── chat/MessageBubble.tsx
│   │   │   ├── chat/ThinkingBlock.tsx       # 折叠式思考块（parse 2 起）
│   │   │   ├── chat/Markdown.tsx
│   │   │   ├── chat/InputBox.tsx
│   │   │   ├── chat/ModeSelector.tsx        # parse 3 起
│   │   │   └── sidebar/SessionList.tsx
│   │   ├── store/
│   │   │   ├── sessionStore.ts
│   │   │   └── userStore.ts     # 持久化 UUID 到 localStorage
│   │   ├── pages/Chat.tsx
│   │   ├── lib/sse.ts           # 流式解析
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── backend/                     # FastAPI
│   ├── app/
│   │   ├── main.py              # FastAPI() + 路由挂载 + CORS
│   │   ├── config.py            # pydantic-settings 读 env
│   │   ├── deps.py              # get_current_user 依赖（UUID 校验）
│   │   ├── db/
│   │   │   ├── engine.py        # SQLModel engine
│   │   │   └── models.py        # User / Session / Message
│   │   ├── schemas/             # Pydantic 请求/响应模型
│   │   │   ├── chat.py
│   │   │   └── session.py
│   │   ├── routers/
│   │   │   ├── chat.py          # /v1/chat/completions (SSE)
│   │   │   ├── sessions.py      # CRUD
│   │   │   └── health.py
│   │   ├── services/
│   │   │   ├── llm/
│   │   │   │   ├── base.py      # LLMClient 协议 (async stream)
│   │   │   │   ├── minimax.py   # MiniMax-M3 OpenAI 兼容客户端
│   │   │   │   └── factory.py   # 根据 mode 选 chat / reasoning
│   │   │   ├── prompt.py        # system 提示词 + 历史消息拼装
│   │   │   └── session_service.py
│   │   └── utils/
│   │       ├── uuid.py
│   │       └── sse.py           # async → SSE 格式化
│   ├── data/                    # .gitignore: SQLite 文件
│   ├── tests/                   # pytest + httpx AsyncClient
│   ├── pyproject.toml
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── .env.example
│
├── docs/                        # 拆分后的子文档
│
├── .gitignore
├── README.md
└── deploy/
    ├── nginx.conf.example
    └── systemd/chatbot-api.service
```

> `services/rag/`、`services/tools/`、`Document` 表、`Chroma` 目录在 parse 4+ 再创建；当前结构里看不到这些。

## 各模块职责一句话

- `routers/`：HTTP 边界，只做参数校验与响应序列化。
- `services/llm/`：LLM 抽象 + MiniMax 客户端 + 模式分发。
- `services/prompt.py`：system 提示词与历史消息拼装。
- `services/session_service.py`：会话 / 消息 CRUD 业务逻辑。
- `db/`：SQLModel 表与 engine。
- `schemas/`：Pydantic 请求/响应模型。
- `utils/`：横切工具（UUID 校验、SSE 格式化）。
- `frontend/src/api/`：fetch 与 SSE 解析。
- `frontend/src/store/`：跨组件状态与会话缓存。
- `frontend/src/components/chat/`：聊天窗内的可复用 UI 单元（含折叠式思考块）。

## 上一步 / 下一步

- 上一步：[03-tech-stack.md](./03-tech-stack.md)
- 下一步：[05-data-model.md](./05-data-model.md)