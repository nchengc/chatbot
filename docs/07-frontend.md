# 07. 前端模块

> 摘自计划文档：[chatgpt-inherited-marble.md](../../../../../../Users/Administrator/.claude/plans/chatgpt-inherited-marble.md)

## §6 前端模块

### §6.1 关键 Store

```ts
// userStore.ts
const userId = localStorage.getItem('user_id') ?? crypto.randomUUID();
localStorage.setItem('user_id', userId);

// sessionStore.ts (zustand)
sessions: Session[]
currentId: string | null
messagesBySession: Record<string, Message[]>   // Message 含 thinking 字段
mode: 'chat' | 'reasoning'                      // parse 3 切换
```

### §6.2 流式消费

`api/stream.ts` 包装 `fetch`，使用 `getReader()` + `TextDecoder`，按 `\n\n` 切片事件，分发到 Zustand：

```ts
for await (const ev of readSSE(resp)) {
  if (ev.event === 'meta')   setMeta(ev.data);
  if (ev.event === 'thinking') appendThinking(ev.data.delta);  // parse 2/3
  if (ev.event === 'message') appendDelta(ev.data.delta);
  if (ev.event === 'done')   finalize();
}
```

### §6.3 UI 关键交互

- **顶部栏**：左侧模型/模式选择器（parse 2 单选项；parse 3 改为「对话模式 / 推理模式」二选一互斥下拉）+ 主题切换。
- **中间对话窗**：用户消息右对齐，助手消息左对齐；**折叠式思考块**位于助手气泡顶部（默认收起，可展开），推理模式下可见，对话模式隐藏整块。
- **代码块**：带「复制」+「运行」按钮（运行仅前端 mock 执行 JS/Python via Pyodide）。
- **输入区**：textarea 自动撑高，`Enter` 发送，`Shift+Enter` 换行；发送中显示「停止生成」按钮。
- **侧栏**（parse 0 简化为按钮，parse 2+ 接真实接口）：新建会话、会话列表、重命名、删除。

### §6.4 折叠式思考块（核心 UI）

- 位置：助手气泡顶部。
- 默认收起；点击「💭 思考过程 ▾」展开（旋转 ▴）。
- 内部样式：等宽字体 + 暗色背景块，区分于正文。
- 模式门控：`mode === 'reasoning'` 才渲染；`mode === 'chat'` 整块不挂载（节省 DOM）。
- 流式写入：`appendThinking(delta)` 与 `appendDelta(delta)` 各自维护独立字符串，避免互相覆盖。

### §6.5 Vercel 部署要点

- 根目录 `frontend/`，build command `npm run build`，output `dist/`。
- 环境变量 `VITE_API_BASE` 指向云服务器域名。
- Nginx 在云服务器上为 `/api/*` 反代到 `127.0.0.1:8000`，并加 CORS 头放行 Vercel 域名。

## 上一步 / 下一步

- 上一步：[06-api.md](./06-api.md)
- 下一步：[08-env.md](./08-env.md)