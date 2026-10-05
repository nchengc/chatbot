# 08. 环境变量

> 摘自计划文档：[chatgpt-inherited-marble.md](../../../../../../Users/Administrator/.claude/plans/chatgpt-inherited-marble.md)

## §7 环境变量（后端 `.env.example`）

```
APP_ENV=dev
DATABASE_URL=sqlite:///./data/app.db        # 生产可改为 postgresql://...

# MiniMax-M3（OpenAI 兼容协议）
MINIMAX_BASE_URL=https://api.minimaxi.com/v1
MINIMAX_API_KEY=...
# parse 2：仅配 CHAT_MODEL
# parse 3：再放开 REASONING_MODEL
MINIMAX_CHAT_MODEL=MiniMax-M3-mini
MINIMAX_REASONING_MODEL=MiniMax-M3-reasoning

CORS_ORIGINS=http://localhost:5173,https://your-app.vercel.app
LOG_LEVEL=INFO
```

## 字段说明

| 字段 | 必填 | 说明 |
|---|---|---|
| `DATABASE_URL` | 是 | SQLAlchemy URL；`sqlite:///./data/app.db` 或 `postgresql://...` |
| `MINIMAX_BASE_URL` | 是 | MiniMax OpenAI 兼容端点 |
| `MINIMAX_API_KEY` | 是 | MiniMax 平台密钥 |
| `MINIMAX_CHAT_MODEL` | parse 2 起 | 对话款模型 ID |
| `MINIMAX_REASONING_MODEL` | parse 3 起 | 推理款模型 ID |
| `CORS_ORIGINS` | 是 | 逗号分隔允许来源；本地 dev + Vercel 都放行 |
| `LOG_LEVEL` | 否 | `DEBUG` / `INFO` / `WARNING` / `ERROR` |

## 前端环境变量

```
VITE_API_BASE=http://localhost:8000    # dev；生产指向云服务器
```

## 模式与 model_id 取舍

- 「对话模式 / 推理模式」通过 `MINIMAX_CHAT_MODEL` 与 `MINIMAX_REASONING_MODEL` 两个 ID 区分；
- 同强度时只需配置两个 ID，由前端互斥下拉切换；
- 强度差异（mini / standard / pro）由模型 ID 本身承载，例如 `MiniMax-M3-mini`、`MiniMax-M3-pro`，未来可扩展为多选项下拉（parse 6 体验打磨阶段再考虑）。

## 上一步 / 下一步

- 上一步：[07-frontend.md](./07-frontend.md)
- 下一步：[09-phases.md](./09-phases.md)