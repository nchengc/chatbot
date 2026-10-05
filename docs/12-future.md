# 12. 后续可选增强（parse 4+）

> 摘自计划文档：[chatgpt-inherited-marble.md](../../../../../../Users/Administrator/.claude/plans/chatgpt-inherited-marble.md)

## §12 后续可选增强（parse 4+）

> 以下条目**不在 parse 0–3 范围**，作为 v1 之后的迭代路线。

- **parse 4 RAG 知识库**：上传 PDF/TXT/MD → 切片 → embed → Chroma 检索增强
- **parse 5 工具调用 / Agent**：calculator / datetime / web_search 工具，Function Calling 循环
- **parse 6 体验打磨**：停止生成、断线重连、模型/强度切换、Markdown 主题色、键盘快捷键
- **parse 7 部署**：Docker + Nginx 反代 + Vercel 联调 + HTTPS
- **parse 8 账号**：JWT + Refresh Token + 多端同步
- **parse 9 多模态**：图片上传 + Vision 模型
- **parse 10 配额 / 计费**：Redis 滑动窗口
- **parse 11 可观测性**：OpenTelemetry + Prometheus + Grafana
- **parse 12 存储升级**：PG + pgvector + S3

## 演进建议

- parse 3 完成后立刻接 parse 6 体验打磨，让对话 / 推理模式切换更顺手。
- 用户量上来后再做 parse 8 账号（解决多端同步）。
- RAG（parse 4）和 Tool（parse 5）按业务优先级决定先后。
- 部署（parse 7）建议与 parse 6 并行（前端先部署 Demo）。

## 上一步 / 下一步

- 上一步：[11-verification.md](./11-verification.md)
- 返回索引：[README.md](./README.md)