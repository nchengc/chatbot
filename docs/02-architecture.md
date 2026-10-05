# 02. 总体架构

> 摘自计划文档：[chatgpt-inherited-marble.md](../../../../../../Users/Administrator/.claude/plans/chatgpt-inherited-marble.md)

## §1 总体架构

```
┌──────────────────────┐        HTTPS / SSE          ┌─────────────────────────┐
│  React + Vite SPA    │  ───────────────────────▶   │   FastAPI (uvicorn)     │
│  (Vercel 静态托管)   │    ◀─────────────           │   (云服务器，:8000)    │
│  - 模式切换  对话/推理│                                │  POST /v1/chat/completions │
│  - 折叠式思考块      │                                │       SSE: meta / thinking │
│  - 流式 Markdown     │                                │            / message / done │
│  - 输入区 / 发送/取消 │                                └────────┬────────────────┘
└──────────────────────┘                                         │
                                            ┌───────────────────┼──────────────────┐
                                            ▼                                       ▼
                                   ┌─────────────────┐                     ┌──────────────────┐
                                   │  SQLite         │                     │  MiniMax-M3      │
                                   │  sessions / msgs │                     │  (OpenAI 兼容)    │
                                   │  含思考内容字段  │                     │  对话款 / 推理款  │
                                   └─────────────────┘                     └──────────────────┘
```

> parse 4+ 再加 Chroma / Tool 层；parse 0–3 不接。

## 关键链路

1. **浏览器 → FastAPI**：HTTPS，跨域由 Nginx/CORS 处理。
2. **FastAPI → MiniMax-M3**：通过 OpenAI 兼容 SDK 异步流式；`mode=chat` 与 `mode=reasoning` 仅切换模型与思考开关。
3. **FastAPI → SQLite**：同步 SQLModel 写入/读取历史与文档元信息。
4. **前端 SSE 消费**：浏览器 `fetch` + `ReadableStream` + 按 `\n\n` 分块解析 `meta / thinking / message / done`。

## 上一步 / 下一步

- 上一步：[01-context.md](./01-context.md)
- 下一步：[03-tech-stack.md](./03-tech-stack.md)