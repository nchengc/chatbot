# 09. 实施分阶段（parse 0–3）

> 摘自计划文档：[chatgpt-inherited-marble.md](../../../../../../Users/Administrator/.claude/plans/chatgpt-inherited-marble.md)

## §8 实施分阶段（parse 0 → parse 3+）

每个 parse 都是一个可独立运行验证的里程碑。

### parse 0 — 初始化项目 + 健康度联通  ≈ 0.5d

**目标**：搭好前后端骨架，浏览器和后端能互相 ping 通。

**后端**
- `backend/` 起 FastAPI 工程：`config.py`、`main.py`、`routers/health.py`
- 仅暴露 `GET /v1/health` → `{"ok": true}`
- `pyproject.toml` 锁定 fastapi / uvicorn / pydantic-settings
- `Dockerfile`、`docker-compose.yml`（仅起后端）
- `.env.example` 占位字段（暂未启用 MiniMax）

**前端**
- Vite + React + TS 脚手架（`npm create vite@latest`）
- TailwindCSS + shadcn/ui 暗色主题
- `pages/Chat.tsx`：空骨架，左侧 SessionList（占位按钮「新建会话」），中间欢迎语
- `store/userStore.ts`：首屏生成 UUID 写入 localStorage
- `api/client.ts`：封装 fetch，自动注入 `X-User-Id`

**验证**
- `curl http://localhost:8000/v1/health` → 200
- 浏览器开 `http://localhost:5173` 看到空 Chat 布局，UUID 已写入 localStorage
- CORS：前端 dev server 调用 `/v1/health` 不报跨域错

---

### parse 1 — 前端 UI 开发  ≈ 1.5d

**目标**：纯前端，**全部用 mock 数据**，把视觉与交互打磨好。**不接后端**。

**前端实现**
- `components/chat/MessageBubble.tsx`：用户 / 助手气泡样式
- `components/chat/Markdown.tsx`：`react-markdown` + `remark-gfm` + `react-syntax-highlighter`，代码块「复制」按钮
- `components/chat/ThinkingBlock.tsx`：**折叠式思考块**（默认收起，点击展开，内部用等宽字体 + 暗色背景，顶部「💭 思考过程 ▾」标签）
- `components/chat/InputBox.tsx`：textarea 自动撑高，`Enter` 发送，`Shift+Enter` 换行，发送中显示「停止」按钮
- `components/chat/ModeSelector.tsx`：占位下拉（parse 2 真实化为单选项，parse 3 真实化为互斥切换）
- `components/sidebar/SessionList.tsx`：mock 一组假会话
- `pages/Chat.tsx`：组合上述组件 + Zustand store
- 主题切换（暗色 / 亮色）
- mock 流式：写一个 `setInterval` 模拟 token 流，方便观察 UI

**验证**
- 在 UI 输入假消息，能看到气泡 + Markdown 渲染 + 代码块复制按钮
- 假数据中携带 `thinking` 字段时，**折叠式思考块**可正常展开/收起
- 模式选择器占位可见，点击有反馈（toast）

---

### parse 2 — 后端接通 MiniMax-M3 对话款  ≈ 1.5d

**目标**：去掉前端 mock，真接 MiniMax-M3 对话款；思考过程在 UI 折叠式呈现。

**后端**
- `db/models.py` + `db/engine.py`：建表 User / Session / Message
- `services/llm/minimax.py`：基于 `openai` SDK（指向 MiniMax BaseURL），支持异步流式（`chat.completions.create(stream=True)`）
- `services/llm/factory.py`：`mode="chat"` → `MINIMAX_CHAT_MODEL`
- `routers/sessions.py`：4 个 CRUD 接口（POST/GET/PATCH/DELETE/GET-messages）
- `routers/chat.py`：`POST /v1/chat/completions` 返回 SSE，事件序列：`meta` → `message`(token) → `done`
- 历史拼装：`with session_service.get_history(session_id)` 取最近 6 条 → 拼到 messages
- `.env.example` 写入 MiniMax 字段（CHAT_MODEL 已配，REASONING_MODEL 留空）

**前端**
- `api/stream.ts`：真接 `POST /v1/chat/completions`，按 `§5.1` 解析事件
- `api/client.ts` 接入真实会话接口
- `sessionStore.ts` 替换 mock，落到本地 Zustand + 后端持久化
- `ModeSelector.tsx`：去掉占位，单选项锁死「对话模式」（parse 3 再放开互斥）

**验证**
- 后端 curl 流式：`curl -N -X POST http://localhost:8000/v1/chat/completions -H 'X-User-Id: <uuid>' -H 'Content-Type: application/json' -d '{"session_id":"...","content":"你好","mode":"chat"}'` 看到逐 token 输出
- 浏览器端到端：发一条消息，气泡里逐字出现回答
- 刷新页面历史仍在（SQLite 落库）

> parse 2 暂未启用推理模式，所以前端 ThinkingBlock 在 dev → 单话题；需要在 MiniMax 端打开 `thinking=true` 才能看到。

---

### parse 3 — 推理模式接入（互斥切换）  ≈ 1d

**目标**：在同一 MiniMax-M3 基座上切换「对话 / 推理」两种模式；推理模式下思考块折叠式呈现。

**后端**
- `services/llm/factory.py`：`mode="reasoning"` → `MINIMAX_REASONING_MODEL`，并在调用时携带 MiniMax 的思考开关参数（按其 OpenAI 兼容约定传 `thinking=True`）
- `routers/chat.py`：扩展 SSE 事件序列为 `meta` → `thinking`(tokens) → `message`(tokens) → `done`
- `Message.thinking` 字段写入推理原文（折叠展示用）
- `.env.example`：补 `MINIMAX_REASONING_MODEL`

**前端**
- `ModeSelector.tsx`：改为 **互斥下拉**「对话模式 / 推理模式」，切换会带在请求里
- `MessageBubble.tsx` + `ThinkingBlock.tsx`：
  - 对话模式 → 不渲染 ThinkingBlock
  - 推理模式 → 在助手气泡顶部渲染折叠块，默认收起
- 模式状态保存在 session.mode（PATCH `/v1/sessions/{id}`）

**验证**
- 切到「推理模式」发问：先看到折叠思考块展开内容，再看到正式回答
- 切回「对话模式」发问：直接是正式回答，无思考块
- 同一个会话切换模式后，模式被持久化（刷新仍在）

---

### parse 4+ — 暂缓范围（RAG / Tool / 部署 / 账号）

不在 parse 0–3 的范围内，作为后续路线：

- **parse 4 RAG**：上传/切片/embed/Chroma；接通检索增强
- **parse 5 工具调用 / Agent**：calculator、datetime、web_search；Function Calling 循环
- **parse 6 体验打磨**：停止生成、断线重连、模型选择、Markdown 主题色
- **parse 7 部署**：Docker + Nginx + Vercel 联调
- **parse 8 账号**：JWT + 多端同步

---

### 估时合计

| parse | 内容 | 估时 |
|---|---|---|
| 0 | 项目初始化 + 健康度 | 0.5 d |
| 1 | 前端 UI（mock） | 1.5 d |
| 2 | 后端 + MiniMax 对话款 + 思考展示 | 1.5 d |
| 3 | 推理模式互斥切换 | 1 d |
| **合计** | **v1（parse 0–3）** | **≈ 4.5 d** |

## 上一步 / 下一步

- 上一步：[08-env.md](./08-env.md)
- 下一步：[10-files.md](./10-files.md)