---
name: git-commit-pro
description: 通读 git 变更并给出提交建议、拆分为 atomic commits、生成并执行规范的 Conventional Commits。适用于整理 Git 历史、代码提交及 Review 前的准备。
---

# 核心流程

1. **读取状态**：执行以下命令获取完整上下文，不做任何假设：
   ```bash
   git status --porcelain=v1
   git diff --staged --stat
   git diff --staged
   git diff
   git log --oneline -5
   ```
2. **分析变更**：识别变更意图，区分逻辑、UI、重构及杂项，特别注意破坏性变更（Breaking Changes）。
3. **输出 Plan**：按以下格式输出 Commit Plan，**禁止**在此阶段执行提交：
   ```text
   Commit Plan:

   1. <type>(<scope>): <简要说明>
      - 文件：[path/to/file]
      - 原因：说明为何独立提交，若是破坏性变更需标注
   ```
4. **用户确认**：等待用户确认 Plan 或根据反馈调整。
5. **逐条执行**：确认后，使用明确的 `git add <file>` 指令逐条提交。

# 关键规则

- **原子提交**：每个提交仅解决一个逻辑点。严禁将 UI 调整与逻辑修复、重构与新功能混合提交。
- **提交分类**：
  - `feat`: 新功能 | `fix`: 修复 | `refactor`: 重构 | `style`: 格式/样式 | `perf`: 性能 | `docs`: 文档 | `test`: 测试 | `chore`: 杂项
- **消息规范**：
  - **格式**：`<type>(<scope>): <description>`，如果是破坏性变更，在 `scope` 后加 `!`。
  - **内容**：使用祈使句（add/fix/reduce），首字母大写，末尾不加句号。侧重“为什么”而非“做了什么”。
  - **破坏性变更**：必须在 Body 中以 `BREAKING CHANGE:` 开头详细说明。
- **操作安全**：严禁 `git add .`，必须指定具体文件；未经授权不得执行 `amend`, `force push`。

# 检查清单 (自检用)

- [ ] 是否实现了原子提交？（一事一议）
- [ ] 类型（type）和范围（scope）是否准确？
- [ ] 标题是否控制在 50 字符以内？
- [ ] 破坏性变更是否已标注 `!` 并附带说明？
- [ ] 是否避开了重复的文件或逻辑描述？
