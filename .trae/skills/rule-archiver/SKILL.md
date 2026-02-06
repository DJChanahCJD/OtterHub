---
name: rule-archiver
description: 归纳开发经验、错误复盘、关键决策
---
# 核心流程
1. 分析上下文：从对话中识别高频错误、非直观逻辑、关键技术决策
2. 提炼经验：转化为简洁可执行的通用规则，按代码规范/技术栈/部署/通用经验分类
3. 读取规则文件：路径c:\Users\DJCHAN\SE\2_GithubProject\OtterHub\.trae\rules。识别是否创建独立的 rule 文件。rule 头部格式：
```md
---
alwaysApply: false # 全局生效移至project_rules
globs: frontend/*,*.tsx # 文件匹配触发
description: 前端相关规则
---
```
4. 更新规则文件：去重，新类别建标题，新规则按Markdown列表（* [类别]: 内容）追加至对应位置

# 关键规则
- 只记干货，简配范例除外，不录具体代码
- 规则去重，精简准确, 保持原子性