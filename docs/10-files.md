# 10. 关键文件清单

> 摘自计划文档：[chatgpt-inherited-marble.md](../../../../../../Users/Administrator/.claude/plans/chatgpt-inherited-marble.md)

## §9 关键文件清单（按 parse 切分）

仅列出 parse 0–3 会新建的文件（目录当前为空）。RAG / Tool / 部署相关放到 parse 4+ 阶段。

### parse 0 必备

- `backend/app/main.py`
- `backend/app/config.py`
- `backend/app/routers/health.py`
- `backend/.env.example`
- `backend/pyproject.toml`
- `backend/Dockerfile`, `backend/docker-compose.yml`
- `frontend/index.html`, `frontend/package.json`, `frontend/vite.config.ts`
- `frontend/src/main.tsx`
- `frontend/src/api/client.ts`
- `frontend/src/store/userStore.ts`
- `frontend/src/pages/Chat.tsx`
- `.gitignore`, `README.md`

### parse 1 必备（仅前端）

- `frontend/src/components/chat/MessageBubble.tsx`
- `frontend/src/components/chat/Markdown.tsx`
- `frontend/src/components/chat/ThinkingBlock.tsx`
- `frontend/src/components/chat/InputBox.tsx`
- `frontend/src/components/chat/ModeSelector.tsx`（占位）
- `frontend/src/components/sidebar/SessionList.tsx`
- `frontend/src/store/sessionStore.ts`

### parse 2 必备（后端 + 前端接通）

- `backend/app/db/engine.py`, `backend/app/db/models.py`
- `backend/app/schemas/{chat,session}.py`
- `backend/app/routers/{chat,sessions}.py`
- `backend/app/services/llm/{base,minimax,factory}.py`
- `backend/app/services/{prompt,session_service}.py`
- `backend/app/utils/{uuid,sse}.py`
- `backend/app/deps.py`
- `frontend/src/api/stream.ts`
- `frontend/src/components/chat/ModeSelector.tsx`（真实化为单选项）
- 测试：`backend/tests/test_health.py`, `backend/tests/test_chat_sse.py`

### parse 3 必备

- `backend/app/services/llm/factory.py`（支持 reasoning 分支）
- `backend/app/routers/chat.py`（新增 `thinking` 事件）
- `frontend/src/components/chat/ModeSelector.tsx`（互斥下拉）
- `frontend/src/components/chat/MessageBubble.tsx`（按模式渲染 ThinkingBlock）
- `frontend/src/components/chat/ThinkingBlock.tsx`（默认折叠、点击展开）
- 测试：`backend/tests/test_chat_modes.py`

### 复用约定

- 前端 SSE 解析器 `frontend/src/lib/sse.ts` 在 parse 1（mock） → parse 2（真） → parse 3（增加 thinking 事件）一路复用，事件类型在 `frontend/src/lib/sse-events.ts` 用 union type 集中管理。
- 后端 `services/llm/base.py` 的 `LLMClient.stream` 协议在 parse 2 / parse 3 一致，仅上层 router 根据 mode 选不同实现。
- `Message.thinking` 字段在 parse 2 建表时就预留，parse 3 直接复用，无需迁移。

## 上一步 / 下一步

- 上一步：[09-phases.md](./09-phases.md)
- 下一步：[11-verification.md](./11-verification.md)