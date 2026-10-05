# 05. 数据模型

> 摘自计划文档：[chatgpt-inherited-marble.md](../../../../../../Users/Administrator/.claude/plans/chatgpt-inherited-marble.md)

## §4 数据模型（SQLModel / SQLite）

```python
class User(BaseModel, table=True):
    id: str          # UUID，由前端生成（v1 匿名）
    created_at: datetime

class Session(BaseModel, table=True):
    id: str          # UUID
    user_id: str     # FK
    title: str       # 首条消息摘要，默认 "新会话"
    mode: str        # "chat" | "reasoning"   # parse 3 启用
    created_at: datetime
    updated_at: datetime

class Message(BaseModel, table=True):
    id: str          # UUID
    session_id: str  # FK
    role: str        # "user" | "assistant"
    content: str
    thinking: str | None   # 推理模式下的思考过程原文（折叠展示）
    created_at: datetime
```

> 索引：`(user_id, updated_at)` on Session；`(session_id, created_at)` on Message。  
> `Document` 表 / Chroma 集合推迟到 parse 4（RAG）引入；v1 不建。

## 设计取舍

- **User.id 由前端生成**：v1 不做认证，让浏览器自管身份；服务端仅校验格式。
- **Session.mode**：parse 2 写死 `"chat"`，parse 3 真正接受 `"chat" | "reasoning"`；PATCH 接口做切换。
- **Message.thinking**：parse 2 建表时就预留，parse 3 直接复用；前端折叠式组件拿到字段就展示。
- **Message 不存工具调用**：v1 不接 Function Calling，相关字段全部拿掉。

## 上一步 / 下一步

- 上一步：[04-project-structure.md](./04-project-structure.md)
- 下一步：[06-api.md](./06-api.md)