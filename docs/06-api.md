# 06. 后端 API 约定

> 摘自计划文档：[chatgpt-inherited-marble.md](../../../../../../Users/Administrator/.claude/plans/chatgpt-inherited-marble.md)

## §5 后端 API 约定

所有接口前缀 `/v1/`，请求需带 `X-User-Id` Header（v1 校验 UUID 即可通过）。

| 方法 | 路径 | 用途 |
|---|---|---|
| POST | `/v1/sessions` | 新建会话（可指定 `mode`） |
| GET | `/v1/sessions` | 列出当前用户会话（按 updated_at 倒序） |
| PATCH | `/v1/sessions/{id}` | 重命名 / 切换 mode |
| DELETE | `/v1/sessions/{id}` | 删除会话（级联消息） |
| GET | `/v1/sessions/{id}/messages` | 拉取历史消息（分页） |
| POST | `/v1/chat/completions` | **核心**：发起对话，**返回 SSE 流** |
| GET | `/v1/health` | 健康检查 |

> `/v1/knowledge/*` 与 `/v1/tools/*` 在 parse 4+ 引入；parse 0–3 不开。

## §5.1 `/v1/chat/completions` 流式协议

请求：

```json
{
  "session_id": "uuid",
  "content": "你好",
  "mode": "chat",            // "chat" | "reasoning"（parse 3）
  "stream": true
}
```

响应（SSE，`text/event-stream`）：

```
event: meta
data: {"mode": "reasoning", "session_id": "...", "message_id": "..."}

event: thinking             // 仅 reasoning 模式
data: {"delta":"先分析一下"}

event: thinking
data: {"delta":"……"}

event: message
data: {"delta":"最终回答："}

event: message
data: {"delta":"你好，我是 MiniMax。"}

event: done
data: {"finish_reason": "stop", "thinking_complete": true}
```

事件规约：

| event | 时机 | payload |
|---|---|---|
| `meta` | 流开始 | `{mode, session_id, message_id}` |
| `thinking` | 推理模式独有，逐 token | `{delta}` |
| `message` | 正向回答，逐 token | `{delta}` |
| `done` | 流结束 | `{finish_reason, thinking_complete}` |

后端用 `sse-starlette` 或手写 `EventSourceResponse`；每写一行前先 flush，前端用 `ReadableStream` + 按 `\n\n` 分块解析。

## §5.2 模式分发（parse 3）

`mode="chat"`：调用 `MiniMax-M3`（对话款，`thinking` 不开）。  
`mode="reasoning"`：调用 `MiniMax-M3`（推理款，`thinking` 开启），上游增量返回思考 token。

两者使用同一基座 + 同一 SDK，仅切换参数 / endpoint（详见 [08-env.md](./08-env.md)）。

> RAG / Tool Calling 推迟到 parse 4+：本计划不再保留 §5.2 RAG 与 §5.3 Tool Calling 决策。

## 上一步 / 下一步

- 上一步：[05-data-model.md](./05-data-model.md)
- 下一步：[07-frontend.md](./07-frontend.md)