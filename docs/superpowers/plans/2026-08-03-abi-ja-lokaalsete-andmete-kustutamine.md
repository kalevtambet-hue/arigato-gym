# Abi ja lokaalsete andmete kustutamine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Selgitada Abi all aktuaalset kasutust ja lubada kasutajal oma seadme kõik treeningandmed teadlikult kustutada.

**Architecture:** Andmete kustutamine elab `repositories.ts`-is ning Seaded kutsub seda vaid pärast brauseri kinnitust. Abi sisu jääb seadete komponendi juurde.

**Tech Stack:** React, TypeScript, Dexie, Vitest, Testing Library.

---

### Task 1: Kustuta kõik lokaalsed tabelid

**Files:**
- Modify: `src/db/repositories.ts`
- Modify: `src/db/repositories.test.ts`

- [ ] Kirjuta ebaõnnestuv test `clearLocalData()` jaoks: lisa vähemalt harjutus, sessioon ja auditikirje ning kontrolli, et pärast funktsiooni käivitamist on nende tabelite arv 0.
- [ ] Käivita `npm test -- --run src/db/repositories.test.ts` ja kinnita punane tulemus.
- [ ] Lisa `clearLocalData()`, mis ühe kirjutustehinguna tühjendab kõik 11 Dexie tabelit: harjutused, päevad, päevaharjutused, sessioonid, sessiooniharjutused, seeriad, sündmused, snapshotid, seeriamuudatused, auditikirjed ja progressioonigrupid.
- [ ] Käivita sama test ja kinnita roheline tulemus.

### Task 2: Täienda Abi ja lisa kinnitatud kustutamine

**Files:**
- Modify: `src/features/settings/SettingsPage.tsx`
- Modify: `src/features/settings/SettingsPage.test.tsx`

- [ ] Kirjuta ebaõnnestuvad testid, mis kontrollivad uut Abi sisu, tühistatud kustutamise korral säilinud andmeid ja kinnitatud kustutamise korral tühje tabeleid ning olekuteadet `Kõik lokaalsed andmed on kustutatud`.
- [ ] Käivita `npm test -- --run src/features/settings/SettingsPage.test.tsx` ja kinnita punane tulemus.
- [ ] Lisa Abi alla tekstid: raskuse muutmine; progressiooni seadistused päevakava-harjutusel; JSON/CSV impordi- ja eksporditulemused; versiooni ja buildi erinevus; andmete lokaalne hoidmine.
- [ ] Lisa Andmed paneeli nupp `Kustuta kõik lokaalsed andmed`. Enne `clearLocalData()` kutsumist nõua `window.confirm` abil kinnitust, mis hoiatab pöördumatuse eest ja soovitab JSON-varundust.
- [ ] Käivita Settingsi test ja kinnita roheline tulemus.

### Task 3: Versioon, kontroll ja avaldamine

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] Tõsta versioon `0.1.0` → `0.1.1` käsuga `npm version 0.1.1 --no-git-tag-version`.
- [ ] Käivita `npm run lint`, `npm test -- --run` ja `npm run build`.
- [ ] Kommiti muudatused sõnumiga `feat: document and clear local training data`, push’i haru, loo draft-PR ning kontrolli Cloudflare’i previewd.
