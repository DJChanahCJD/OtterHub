# Technical Decision: <Topic>

## Decision Scope
- Topic: <简要说明本次技术选型问题>
- Status: Draft | Accepted | Rejected
- Update Time: YYYY-MM-DD

---

## Constraints (Non-negotiable)
- <性能 / 成本 / 平台 / 复杂度等硬约束>
- <不允许的设计或技术>

---

## Evaluation Criteria
Each option must be evaluated against:
1. Data model simplicity
2. Operational complexity
3. Scalability and future extension
4. Failure isolation
5. Cost and maintenance overhead
6. LLM regenerability (can files be safely rewritten?)

---

## Options

### Option A
- Summary: <一句话描述方案>
- Core Design:
  - <关键设计点 1>
  - <关键设计点 2>
- Pros:
  - <明确优势>
- Cons:
  - <明确代价>
- Risks:
  - <已知或潜在风险>
- Implementation Notes:
  - <实现时必须遵守的规则>

---

### Option B
- Summary: <一句话描述方案>
- Core Design:
  - <关键设计点 1>
  - <关键设计点 2>
- Pros:
  - <明确优势>
- Cons:
  - <明确代价>
- Risks:
  - <已知或潜在风险>
- Implementation Notes:
  - <实现时必须遵守的规则>

---

## Comparison Summary
| Option | Simplicity | Scalability | Cost | Risk | Overall |
|------|------------|-------------|------|------|---------|
| A    | High       | Medium      | Low  | Low  | ✅      |
| B    | Medium     | Medium      | Low  | Medium | ⚠️   |

---

## Decision
- Selected Option: <A / B / C>
- Reason:
  - <不超过 3 条，说明为什么>
- Rejected Options:
  - <为什么现在不选>

---

## Mandatory Rules (For Future LLMs)
- <必须遵守的实现约束 1>
- <禁止行为 1>
- <不能“优化掉”的设计决策>

---

## Re-evaluation Trigger
This decision must be revisited if:
- <条件 1>
- <条件 2>
