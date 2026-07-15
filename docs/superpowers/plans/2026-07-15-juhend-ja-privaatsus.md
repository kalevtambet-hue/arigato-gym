# Juhend ja privaatsus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lisada põhjalik paigaldus- ja kasutusjuhend README-sse ning kokkuvolditav abi koos tugeva privaatsuse teatega `Seaded` lehele.

**Architecture:** Dokumentatsioon jaguneb kaheks: repo tasemel täielik README ja rakenduse sees kompaktne kokkuvolditav abi. Rakenduse UI kasutab lihtsaid sisseehitatud `details/summary` plokke ja olemasolevat paneelistruktuuri.

**Tech Stack:** Markdown, React 19, TypeScript, Testing Library, Vitest

---

### Task 1: README käsiraamat

**Files:**
- Modify: `README.md`

- [ ] Kirjuta README ümber nii, et seal oleks põhjalik paigaldus-, deploy- ja kasutusjuhend.
- [ ] Lisa selge privaatsuse peatükk, mis ütleb, et andmeid ei koguta ega saadeta serverisse.

### Task 2: Äpisisene abi

**Files:**
- Modify: `src/features/settings/SettingsPage.tsx`
- Modify: `src/styles.css`
- Test: `src/features/settings/SettingsPage.test.tsx`

- [ ] Lisa `Seaded` lehele kokkuvolditavad plokid `Privaatsus`, `Paigaldamine`, `Kasutamine`, `Varundus`, `Tõrkeotsing`.
- [ ] Lisa vajalik stiil, et plokid oleksid telefonis loetavad.
- [ ] Uuenda testi, et kontrollida plokkide olemasolu.

### Task 3: Verifikatsioon

**Files:**
- Modify: `docs/superpowers/plans/2026-07-15-juhend-ja-privaatsus.md`

- [ ] Käivita `npm run lint`.
- [ ] Käivita `npm run test`.
- [ ] Käivita `npm run build`.
- [ ] Commit ja push `main` harusse.
