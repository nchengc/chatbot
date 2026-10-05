# 11. 验证清单

> 摘自计划文档：[chatgpt-inherited-marble.md](../../../../../../Users/Administrator/.claude/plans/chatgpt-inherited-marble.md)

## §10 验证（端到端，按 parse 跑）

> 每个 parse 都先在本计划内 curl 命令行能跑通，再做 UI 端到端。

### parse 0 验证

- `curl http://localhost:8000/v1/health` → `{"ok": true}`
- 浏览器 `http://localhost:5173` 看到空布局，UUID 已落 `localStorage`

### parse 1 验证

- 仅前端，输入 fake 消息 → 气泡 + Markdown + 代码块复制按钮可用
- mock 数据中带 `thinking` → **折叠式思考块**可展开/收起
- `ModeSelector` 占位可见，点击有反馈

### parse 2 验证

- 后端：见下方「后端流式冒烟」curl 样例
- 前端端到端：
  - 发「你好」→ 流式出现回答
  - 刷新页面历史仍在
  - SQLite `data/app.db` 中能查到对应 session / message 行

### parse 3 验证

- 「对话模式」发问：直接是正式回答（无思考块）
- 「推理模式」发问：先看到折叠思考块展开内容，再看到正式回答
- 同会话切换 mode → PATCH `/v1/sessions/{id}` → 刷新仍在所选模式

### 后端流式冒烟（parse 2/3 通用）

```bash
curl -N -X POST http://localhost:8000/v1/chat/completions \
  -H 'X-User-Id: 11111111-1111-1111-1111-111111111111' \
  -H 'Content-Type: application/json' \
  -d '{"session_id":"<sid>","content":"你好","mode":"chat"}'
# 期望：逐 token 输出 event: message → event: done
```

```bash
curl -N -X POST http://localhost:8000/v1/chat/completions \
  -H 'X-User-Id: 11111111-1111-1111-1111-111111111111' \
  -H 'Content-Type: application/json' \
  -d '{"session_id":"<sid>","content":"鸡兔同笼，头共35，足共94，几鸡几兔？","mode":"reasoning"}'
# 期望：先 event: thinking（折叠展示），再 event: message，再 event: done
```

## 验收 Checklist（parse 0–3）

- [ ] parse 0：`/v1/health` 返回 200；浏览器看到空布局，UUID 已落 localStorage
- [ ] parse 1：前端 mock 消息流、Markdown、代码块复制、折叠式思考块均可交互
- [ ] parse 2：浏览器端到端对话能跑通；刷新历史仍在；SQLite 有数据
- [ ] parse 2：curl 流式返回正确
- [ ] parse 3：对话模式不显示思考块；推理模式显示折叠思考块
- [ ] parse 3：会话模式 PATCH 后刷新仍在所选模式

## 上一步 / 下一步

- 上一步：[10-files.md](./10-files.md)
- 下一步：[12-future.md](./12-future.md)