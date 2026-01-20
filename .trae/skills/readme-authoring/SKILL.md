---
name: readme-authoring
description: High-quality README authoring standards for software projects. Focus on clarity, onboarding speed, visual readability, and maintainability.
---

# README Authoring Skill

## 🎯 Core Principle
README is the **project’s entry contract**. Optimize for **first-time users**, not authors.  
It should allow a newcomer to **understand, install, and run the project quickly**.

---

## ✅ Mandatory Goals
- Explain **what the project is** and **why it exists**
- Provide **quick start instructions** (<10 min setup)
- Clearly state **usage boundaries**, **how to contribute**, and **how to get help**
- Convey **trust, stability, and maintenance expectations**

---

## 🏗 Structure Guidelines
Follow this order for clarity:

1. Project Title + Short Value Proposition
2. Language Switch / Key Links
3. Visual Identity (Logo / Banner / Tagline)
4. Overview / Introduction
5. Features (bullet points)
6. Quick Start / Installation
7. Usage / Behavior Notes (optional)
8. Tech Stack / Requirements
9. Technical Principles
10. FAQ / Common Questions
11. TODO / Roadmap (High / Low Priority)
12. Credits / References
13. License

> [!TIP] Keep sections **skimmable**; use `<details>` for long explanations or edge cases.

---

## 🎨 Visual & Style
- **Top section clean**: center logos, tagline, minimal text
- **Emoji usage**: only in section titles, meaningful only
  - 👋 Introduction
  - ⬇️ Installation
  - ⚠️ Warning / Caution
  - 🤝 Contribution
  - ❤️ Credits
- **Images**:
  - Show UI results or critical dialogs
  - Medium width (300–700px)
  - Include `alt` text
  - Avoid overloading with screenshots

---

## 📢 Callouts & Emphasis
Use GitHub callouts for safety, trust, or critical guidance:

```md
> [!IMPORTANT] Scope, philosophy, or hard constraints
> [!CAUTION] Security, privacy, or responsibility boundaries
> [!WARNING] Required actions to avoid malfunction
> [!TIP] Recommendations to improve experience
> [!NOTE] Platform or version requirements
```
---

## ✍️ Writing Rules

* Assume **zero context** for the reader
* Use **copy-paste-ready commands**
* Prefer **bullets** over paragraphs, **examples** over text
* Clearly separate:

  * What the project **does**
  * What it **does NOT do**
* Keep content **up-to-date** and remove obsolete info

---

## 🧩 Advanced Readability

* Use `<details>` for alternative flows, edge cases, or long explanations
* Keep main flow **linear and scannable**
* Advanced users expand `<details>`; beginners can skim quickly

---

## ✅ Quality Checklist

* [ ] Can a newcomer install/run it without asking questions?
* [ ] Are commands, links, and paths accurate?
* [ ] Is the top 30% visually clean and informative?
* [ ] Are warnings, limitations, and permissions explicit?
* [ ] Does README reflect **current code behavior**?

---

## ❌ Anti-Patterns

* One-line README
* Decorative emojis without semantic meaning
* Walls of text without bullets or visuals
* Missing installation / permission notes
* Hidden limitations or risks
* Outdated commands, screenshots, or links
