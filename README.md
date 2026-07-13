# Jousaali Logi

Offline-first mobiilisobiv PWA jousaali treeningute logimiseks. Rakendus kasutab IndexedDB-d Dexie kaudu ja tootab peale esmast laadimist ka ilma internetita.

## Funktsioonid

- harjutuste register koos masina numbri ja markustega
- treeningpaevad nagu `Paev 1`, `Paev 2`, `Paev 3`
- paevapohised sihid ja progress `paev + harjutus` kombinatsioonina
- tanaase treeningu seeriate eraldi logimine
- topeltprogressioon vaikimisi `range` moodis
- ajalugu kuupaeva ja harjutuse kaupa
- CSV eksport/import
- JSON varundus eksport/import
- installitav PWA

## Kaivitamine

```bash
npm install
npm run dev
```

## Kontroll

```bash
npm run test
npm run lint
npm run build
```

## GitHub ja Cloudflare Pages

1. Loo GitHubis repo `arigato-gym`.
2. Seo kohalik kaust repoga:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<sinu-kasutaja>/arigato-gym.git
git push -u origin main
```

3. Cloudflare Pagesis loo uus projekt ja vali see GitHub repo.
4. Build seaded:

```text
Framework preset: Vite
Build command: npm run build
Build output directory: dist
```

5. Pärast deployd ava saadud HTTPS URL telefonis ja lisa äpp avakuvale.

## PWA

- Ava rakendus mobiilibrauseris.
- Lisa see avakuvale brauseri `Install` voi `Add to Home Screen` valikuga.
- Pärast esmast laadimist cache'ib service worker rakenduse shelli offline kasutuseks.

## Andmete eksport ja taastamine

- `Ekspordi CSV` salvestab tabelid eraldi CSV failidena.
- `Impordi CSV` ootab samu failinimesid, mida eksport tekitab.
- `Ekspordi varundus` loob taieliku JSON varukoopia.
- `Impordi varundus` taastab kogu andmebaasi JSON failist.
