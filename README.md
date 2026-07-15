# Treeninguabiline

Treeninguabiline on mobiilisõbralik offline-first PWA jõusaali treeningute logimiseks. Rakendus on mõeldud kiireks kasutamiseks telefoni ekraanil: valid päeva, alustad trenni, märgid seeriad ja rakendus arvutab järgmise sihi.

## Kõige tähtsam: privaatsus ja andmed

Treeninguabiline ei kogu, ei analüüsi ega saada sinu treeningandmeid kuhugi serverisse.

- Kõik andmed salvestatakse ainult sinu enda seadme brauseri kohalikku andmebaasi `IndexedDB`.
- Rakendusel ei ole kasutajakontosid.
- Rakendusel ei ole pilvesünkroonimist.
- Rakendusel ei ole analüütikat ega jälgimisskripte.
- Andmed liiguvad seadmest välja ainult siis, kui sina ise kasutad `Ekspordi CSV` või `Ekspordi varundus` funktsiooni.

See tähendab ka seda, et kasutaja vastutab ise oma andmete varundamise eest. Kui telefoni brauseri andmed kustutatakse, võib lokaalne treeningajalugu kaduda.

## Mida rakendus oskab

- baasharjutuste haldus koos masina numbri ja märkustega
- treeningpäevade loomine ja ümbernimetamine
- sama harjutuse lisamine päeva sisse mitu korda
- kordustel või kestusel põhinevad sihid
- seeriate kaupa logimine
- poole harjutuse pealt raskuse muutmine
- järgmise treeningu sihi automaatne arvutamine
- järjestikuste õnnestumiste põhine progressioon
- ajalugu kuupäeva ja harjutuse kaupa
- CSV import ja eksport
- täielik JSON varundus ja taastamine
- installitav PWA Androidis ja iPhone’is

## Tehniline ülevaade

- Vite
- React
- TypeScript
- Dexie
- IndexedDB
- vite-plugin-pwa

## Arenduses käivitamine

### Eeldused

- Node.js 20+ või uuem
- npm

### Käivitamine kohalikult

```bash
npm install
npm run dev
```

Vite näitab seejärel lokaalse aadressi, tavaliselt:

```text
http://localhost:5173
```

## Kontroll enne deployd

```bash
npm run lint
npm run test
npm run build
```

## GitHubi ülespanek

Kui projekt ei ole veel GitHubiga seotud:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<sinu-kasutaja>/arigato-gym.git
git push -u origin main
```

Kui repo on juba olemas:

```bash
git add .
git commit -m "Uuendus"
git push origin main
```

## Cloudflare Pages deploy

### Soovitatud seaded

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`

### Üldine töövoog

1. Ava Cloudflare Pages.
2. Loo uus projekt GitHub repost.
3. Vali repo `arigato-gym`.
4. Sisesta ülaltoodud buildi seaded.
5. Salvesta ja lase esimene deploy lõpuni.
6. Ava saadud HTTPS aadress telefonis.

Kui automaatne deploy on sisse lülitatud, läheb iga `main` harusse tehtud push uuesti buildi.

## Telefoni paigaldamine

### Android + Chrome

1. Ava rakenduse Cloudflare Pages URL.
2. Oota, kuni leht on täielikult laetud.
3. Ava Chrome menüü.
4. Vali `Install app` või `Add to Home Screen`.
5. Kinnita paigaldus.

Pärast seda avaneb rakendus nagu eraldi äpp.

### iPhone + Safari

1. Ava rakenduse URL Safaris.
2. Vajuta `Share`.
3. Vali `Add to Home Screen`.
4. Kinnita nimi ja lisa avakuvale.

iPhone’is peab see samm olema tehtud Safari kaudu, mitte kõigi teiste brauserite kaudu.

## Kuidas kontrollida, kas telefonis on uus versioon

Rakenduses ava:

```text
Seaded -> PWA
```

Seal kuvatakse kujul:

```text
Versioon 0.1.0 (b08d7d7)
```

- esimene osa on inimloetav versioon
- sulgudes on konkreetne build või commit

Kui telefonis kuvatav build ei ühti viimase deployga, siis vana service worker või cache ei ole veel uuenenud.

## Esmakordne kasutus

Kui avad rakenduse esimest korda, tee asjad selles järjekorras:

1. Mine lehele `Kavad`.
2. Lisa vajalikud baasharjutused.
3. Lisa treeningpäevad, näiteks `Päev 1` ja `Päev 2`.
4. Seo harjutused päevadega.
5. Määra igale päeva harjutusele:
   - seeriate arv
   - sihi tüüp
   - kordused või kestus
   - raskus või kestuse samm
   - mitu õnnestumist on vaja enne tõusu
6. Mine lehele `Treening`.
7. Vali päev ja alusta trenni.

## Igapäevane kasutamine

### 1. Päeva valimine

Lehel `Treening` vali see päev, mida täna teed.

### 2. Treeningu alustamine

Vajuta `Alusta treeningut`.

Rakendus loob aktiivse treeningsessiooni selle päeva harjutuste põhjal.

### 3. Seeriate märkimine

Iga harjutuse juures saad:

- vajutada `Tehtud`, kui seeria sai sihi järgi tehtud
- vajutada `Ei tulnud täis`, kui seeria jäi pooleli

Ebaõnnestunud seeria puhul küsib rakendus tegelikku korduste arvu või kestust.

### 4. Järjekorra muutmine

Kui järgmine trenažöör on kinni, saad vajutada tulevaste harjutuste juures `Tee järgmisena`.

### 5. Raskuse muutmine trenni ajal

Kui valitud raskus tundub liiga kerge või liiga raske:

1. ava aktiivse harjutuse juures `Muuda raskust`
2. sisesta uus raskus
3. salvesta

Uus raskus kehtib kohe järgmistest tegemata seeriatest. Sama lõpp-raskus läheb aluseks ka järgmise korra sihile.

### 6. Treeningu katkestamine

Kui valisid vale päeva või tahad treeningu pooleli jätta, kasuta `Katkesta treening`.

See eemaldab aktiivse poolelioleva sessiooni.

### 7. Treeningu lõpetamine

Kui kõik päeva harjutused on märgitud:

1. vajuta `Lõpeta treening`
2. rakendus arvutab järgmise sihi
3. see salvestatakse päeva harjutuse uueks baasiks

## Progressiooni loogika

Rakendus kasutab vaikimisi topeltprogressiooni.

Näide:

- siht: `3 x 10-15 x 50 kg`
- kui kõik seeriad jõuavad sihi ülemisse otsa, näiteks `15`, loetakse harjutus edukaks
- kui vajalik arv järjestikuseid edukaid kordi on täis, tõstab rakendus raskust

Näide:

- `Õnnestumisi enne tõusu = 2`
- 1. edukas trenn sama sihiga: raskus veel ei tõuse
- 2. edukas trenn sama sihiga: raskus tõuseb sammuga edasi

Kui siht ei täitu, jääb järgmine siht samaks, välja arvatud kasutaja enda käsitsi tehtud raskusemuutus aktiivse treeningu ajal, mis jääb uueks baasiks.

## Ajalugu

Lehel `Ajalugu` näed varasemaid trenne kuupäeva ja harjutuse kaupa.

Rakendus salvestab ka selle, mis raskusega konkreetne seeria tegelikult tehti. See on kasulik eriti siis, kui muudad raskust poole harjutuse pealt.

## Varundus ja taastamine

### JSON varundus

`Ekspordi varundus` loob ühe täieliku JSON faili.

Kasuta seda siis, kui tahad:

- teha täieliku varukoopia
- viia kogu andmestiku teise seadmesse
- taastada äpi seis hiljem täpselt samal kujul

`Impordi varundus` kirjutab olemasolevad lokaalsed andmed üle imporditava failiga.

### CSV eksport

`Ekspordi CSV` teeb mitu eraldi faili:

- `harjutused.csv`
- `treeningpaevad.csv`
- `paevaharjutused.csv`
- `sessioonid.csv`
- `sessiooni-harjutused.csv`
- `seeriad.csv`

See sobib siis, kui tahad andmeid arvutis vaadata või muuta.

### CSV import

`Impordi CSV` ootab samu failinimesid, mida eksport ise loob.

Kui muudad CSV-sid käsitsi:

- ära muuda veerunimesid
- ära riku failinimesid
- hoia numbriväljad numbritena

## Soovituslik varundamise harjumus

Kui kasutad rakendust päriselt iga nädal, tee vähemalt üks järgmistest:

- JSON varundus kord nädalas
- JSON varundus enne telefoni vahetust
- JSON varundus enne brauseri andmete puhastamist

## Tõrkeotsing

### Telefonis ei paista uus versioon

Vaata `Seaded` lehelt versiooninumbrit.

Kui see on vana:

1. sulge äpp täielikult
2. ava uuesti URL brauseris
3. oota mõni hetk, et service worker saaks uuenduse kätte
4. vajadusel eemalda äpp avakuvalt ja lisa uuesti

### Leht avaneb, aga andmed on kadunud

Kõige tavalisem põhjus on brauseri lokaalse andmebaasi kustutamine.

Taasta andmed:

- `Impordi varundus` abil JSON failist
- või `Impordi CSV` abil eksporditud CSV-dest

### iPhone ei paku paigaldust

Kontrolli:

- kas kasutad Safarit
- kas leht on avatud HTTPS aadressilt
- kas valid `Share -> Add to Home Screen`

### Androidis on vana cache

Kui deploy on uus, aga telefon näitab vana buildi:

- ava äpp brauseris otse URL-ilt
- tee lehele uus laadimine
- ava `Seaded` ja kontrolli buildi uuesti

## Arendaja märkus

Rakendus on teadlikult hoitud lihtsana:

- ei mingeid kontosid
- ei mingeid pilveandmebaase
- ei mingeid sotsiaalseid funktsioone
- ei mingeid serveripoolseid treeninguprofiile

Fookus on kiirel kasutusel jõusaalis ja täielikul kontrollil oma andmete üle.
