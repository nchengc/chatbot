# Chatbot — 类 ChatGPT 对话问答系统

> parse 0：项目骨架 + 前后端健康度联通（已完成）。
> parse 1–3：前端 UI → MiniMax-M3 对话款 → 推理模式互斥切换。
> 详细规划见 [`docs/`](./docs/) 索引；主计划位于
> [`chatgpt-inherited-marble.md`](C:\Users\Administrator\.claude\plans\chatgpt-inherited-marble.md)。

## 当前进度

| Parse | 内容 | 状态 |
|---|---|---|
| 0 | 项目初始化 + 健康度联通 | ✅ 完成 |
| 1 | 前端 UI（mock） | ⏳ 待开始 |
| 2 | 后端接通 MiniMax-M3 对话款 | ⏳ 待开始 |
| 3 | 推理模式互斥切换 | ⏳ 待开始 |
| 4+ | RAG / Tool / 体验 / 部署 / 账号 | 📦 暂缓 |

## 仓库结构

```
chatbot/
├── backend/                # FastAPI
│   ├── app/
│   │   ├── main.py         # FastAPI() + CORS
│   │   ├── config.py       # pydantic-settings
│   │   └── routers/health.py
│   ├── pyproject.toml
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── .env.example
├── frontend/               # Vite + React + TS
│   ├── src/
│   │   ├── api/client.ts   # fetch wrapper，自动注入 X-User-Id
│   │   ├── store/userStore.ts # 匿名 UUID
│   │   ├── pages/Chat.tsx
│   │   └── components/sidebar/SessionList.tsx
│   ├── package.json
│   ├── tailwind.config.ts
│   └── .env.example
├── docs/                   # 拆分后的计划文档
└── README.md
```

## 本地启动（parse 0）

### 后端

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -e .[dev]
copy .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

或 Docker：

```bash
cd backend
docker compose up --build
```

健康度验证：

```bash
curl http://localhost:8000/v1/health
# {"ok":true,"service":"chatbot-backend","env":"dev","version":"0.1.0","time":"..."}
```

### 前端

```bash
cd frontend
npm install
cp .env.example .env.local     # 可选，覆盖 VITE_API_BASE
npm run dev
# 打开 http://localhost:5173
```

前端会向 `http://localhost:8000/v1/health` 发起一次探测；右上角状态点会从「连接后端…」切到「/v1/health OK」即代表前后端联通成功。

## 关键约定

- **匿名身份**：首次访问自动生成 UUID 写入 `localStorage` 的 `user_id`；每次请求带 `X-User-Id` Header。
- **LLM**：parse 2 起统一使用 **MiniMax-M3**（OpenAI 兼容协议），不再支持多 provider。
- **CORS**：`.env` 中 `CORS_ORIGINS` 必须包含前端地址；本地默认 `http://localhost:5173`。
- **折叠式思考块**：parse 2/3 起启用，默认收起，仅推理模式可见。

## 路线图

参见 [`docs/12-future.md`](./docs/12-future.md)（parse 4+ RAG / Tool / 体验 / 部署 / 账号）。