# Jousaali Treeninglogi PWA Design

## Eesmärk

Ehita mobiilis mugavalt kasutatav offline-first PWA, millega kasutaja saab hallata jouusaali harjutusi, defineerida treeningpaevade malle, logida tanaase treeningu seeriaid eraldi ning genereerida iga `paev + harjutus` kombinatsiooni jaoks jargmise sihi topeltprogressiooni alusel.

MVP ei sisalda kasutajakontosid, pilvesunkroonimist ega sotsiaalseid funktsioone. Koik andmed elavad alguses ainult seadmes IndexedDB-s.

## Kasutaja vajadus

Kasutajal on mitu erinevat treeningpaeva, naiteks `Paev 1` ja `Paev 2`, ning sama harjutus voib eri paevadel omada erinevat seeriate arvu, kordusvahemikku, raskust ja progressi. Rakendus peab olema jouusaalis kiire kasutada, suurte puudutusaladega, minimaalse navigeerimisega ja tooma tanaase treeningu logimise keskseks tegevuseks.

## MVP ulatus

Rakendus sisaldab nelja pohivaadet:

- `Harjutused`
- `Tanane treening`
- `Ajalugu`
- `Seaded`

MVP voimekus:

1. Harjutuste registri haldus
2. Treeningpaevade mallide haldus
3. Harjutuste lisamine ja eemaldamine treeningpaevadest
4. `paev + harjutus` konfiguratsiooni haldus
5. Tanaase treeningu sessiooni loomine paeva mallist
6. Iga seeria eraldi logimine olekutega `edukas` voi `ebaonnestus`
7. Ebaonnestunud seeria korral tegelike korduste sisestamine
8. Jargmise sihi automaatne genereerimine
9. Treeningajaloo kuvamine kuupaeva ja harjutuse kaupa
10. Andmete eksport ja import / varundus
11. Installitav ja offline kasutatav PWA Androidis ja iPhone'is

## Infostruktuur ja kasutusvoog

### 1. Harjutused

`Harjutused` vaade teenindab kahte omavahel seotud tegevust:

- harjutuste baasregistri haldus
- treeningpaevade mallide haldus

Harjutuse baasandmed:

- nimi
- masina number
- valikuline markus

Treeningpaeva baasandmed:

- nimi, naiteks `Paev 1`
- jarjekord
- arhiveeritud olek

Paeva detailvaates saab kasutaja:

- lisada olemasoleva harjutuse paeva
- eemaldada harjutuse paevast
- maarata paevapohise jarjekorra
- seadistada `paev + harjutus` sihtandmed

### 2. Tanane treening

`Tanane treening` vaade on rakenduse peamine toovoog.

Kui aktiivset sessiooni ei ole:

- kasutaja valib treeningpaeva
- kasutaja kaivitab sessiooni nupuga `Alusta`

Sessiooni alustamisel luuakse aktiivne `WorkoutSession` koos paevamalli kirjetest tehtud snapshot-kirjetega, et hilisem konfiguratsiooni muutmine ei rikuks ajalugu.

Sessiooni sees:

- kuvatakse harjutuse kaart
- kuvatakse nimi, masina number ja praegune siht
- iga seeria margitakse eraldi
- seeria tegevused on `Tehtud` ja `Ei tulnud tais`
- ebaonnestumisel sisestab kasutaja tegeliku korduste arvu
- kui harjutuse koik seeriad on margitud, liigub kasutaja jargmise harjutuse juurde

Sessiooni lopus:

- naidatakse kokkuvotet
- naidatakse igale paevaharjutusele arvutatud jargmise korra sihti
- sessioon salvestatakse ajalukku
- seotud `DayExercise` kirjed uuendatakse jargmise sihiga

### 3. Ajalugu

`Ajalugu` vaade kuvab:

- treeningsessioonid kuupaeva jargi
- filtri harjutuse jargi
- sessiooni detailvaate, kus on naha koik harjutused ja seeriatulemused

Ajaloos kasutatakse alati sessiooni snapshot-andmeid, mitte jooksvaid seadistusi.

### 4. Seaded

`Seaded` vaates on:

- CSV eksport
- CSV import
- JSON taisvarundus eksport ja import
- lokaalse andmebaasi tuhjendamine kinnitusega
- PWA installi ja offline oleku info

JSON varundus kuulub MVP-sse lisaks CSV-le, sest see annab usaldusvaarse taastamise tee koigi seotud tabelite jaoks. CSV jaab inimloetavaks ning lihtsaks valjaviimiseks.

## Andmemudel

### Exercise

- `id`
- `name`
- `machineNumber`
- `notes?`
- `createdAt`
- `updatedAt`

`Exercise` sisaldab ainult globaalseid baasandmeid, mis ei tohi sisaldada paevapohist progressi.

### WorkoutDay

- `id`
- `name`
- `sortOrder`
- `isArchived`
- `createdAt`
- `updatedAt`

`WorkoutDay` kirjeldab kasutaja treeningmalle nagu `Paev 1`, `Paev 2`, `Paev 3`.

### DayExercise

- `id`
- `workoutDayId`
- `exerciseId`
- `sortOrder`
- `targetSets`
- `repMode` - `fixed` voi `range`
- `targetRepsMin`
- `targetRepsMax`
- `currentWeight`
- `weightStep`
- `restSeconds?`
- `createdAt`
- `updatedAt`

`DayExercise` on peamine konfiguratsiooni- ja progressiuksus. Koik jargmise korra sihid kirjutatakse tagasi siia tabelisse.

### WorkoutSession

- `id`
- `workoutDayId`
- `performedAt`
- `status` - `active` voi `completed`
- `createdAt`
- `updatedAt`

`WorkoutSession` esindab uhte tegelikku treeningkorda.

### WorkoutSessionExercise

- `id`
- `workoutSessionId`
- `dayExerciseId`
- `exerciseName`
- `machineNumber`
- `targetSets`
- `repMode`
- `targetRepsMin`
- `targetRepsMax`
- `currentWeight`
- `weightStep`
- `orderIndex`

See on sessiooni snapshot `DayExercise` kirjest. Snapshot on vajalik, et ajalugu ei muutuks, kui kasutaja hiljem harjutust voi paeva konfiguratsiooni muudab.

### SetResult

- `id`
- `workoutSessionExerciseId`
- `setNumber`
- `status` - `success` voi `failed`
- `completedReps`

`completedReps` salvestatakse alati. `success` puhul on see vordne sihiks loetud kordustega, `failed` puhul kasutaja tegelik sisestus.

## Progressioonireeglid

### Range mood

Kui `repMode = range`, naiteks `3 x 10-15 x 50 kg`:

- kui koik seeriad jouavad `targetRepsMax`, siis
  - jargmine raskus = `currentWeight + weightStep`
  - jargmise korra siht taastub `targetRepsMin` peale
- kui vahemalt uks seeria ei joua `targetRepsMax`, siis
  - raskus jaab samaks
  - jargmise korra siht jaab samaks

MVP-s ei lisata vahepealset automaatset sammu stiilis `10 -> 11 -> 12`, sest kasutaja noue kirjeldab vaikimisi lihtsamat topeltprogressiooni: max repi taissaamisel tostetakse raskust, muidu siht ei muutu.

### Fixed mood

Kui `repMode = fixed`, naiteks `3 x 12 x 40 kg`:

- kui koik seeriad on edukad ja taitud kordustega, siis
  - jargmine raskus = `currentWeight + weightStep`
  - korduste siht jaab samaks
- kui moni seeria ebaonnestub, siis
  - jargmine siht jaab samaks

### Uuendamise koht

Jargmise sihi arvutus toimub sessiooni lopetamisel ning uuendab ainult seotud `DayExercise` kirjeid. Ajalugu ise ei muutu.

## UI disaini printsiibid

- tume reziim vaikimisi
- suured puudutusalad
- minimaalne navigeerimine
- alumine tab-riba nelja vaatega
- koige olulisem tegevus alati alumises pooles poidla jaoks mugavalt kattesaaadav
- modaalaknaid kasutatakse vaid vajadusel, peamiselt lisamiseks, muutmiseks ja ebaonnestunud seeria korduste sisestamiseks

`Tanane treening` vaates peab iga harjutuse kaart olema kiiresti loetav:

- harjutuse nimi suures kirjas
- masina number teisese tekstina
- siht kujul `3 x 10-15 x 50 kg`
- seeria edenemine visuaalselt arusaadav
- kaks suurt toimingunuppu

## Offline-first ja PWA arhitektuur

Tehniline stack:

- `Vite`
- `React`
- `TypeScript`
- `Dexie`
- `vite-plugin-pwa`

Rakendus peab tootama offline-reziimis peale esmast laadimist.

Arhitektuurilised pohimotted:

- IndexedDB on ainus andmeallikas MVP-s
- React komponendid loevad ja uuendavad andmeid Dexie kaudu
- service worker cache'ib rakenduse shelli ja staatilised varad
- aktiivse sessiooni seis taastub taaskivituse jarel IndexedDB-st

## Impordi ja ekspordi disain

### CSV eksport

Eksporditakse eraldi tabelite kaupa:

- harjutused
- treeningpaevad
- paevaharjutused
- sessioonid
- sessiooni harjutused
- seeriatulemused

See hoiab formaadi lihtsana ja lubab vajadusel andmeid valiselt analuusida.

### Import

MVP-s toetatakse kahte importi:

- JSON taisvarunduse taastamine
- CSV failide import samade tabelite struktuuriga

JSON on peamine taastamise mehhanism. CSV import on kasulik edasijoudnuma kasitsi halduse jaoks, kuid nouab valideerimist ja seoste taastamist.

## Tehniline jaotus

Soovituslik rakenduse jaotus:

- andmebaasi kiht Dexie skeemi ja CRUD utiliitidega
- domeeniloogika kiht progressiooni, sessiooni loomise ja import/ekspordi jaoks
- vaadete kiht nelja pohiekraani jaoks
- jagatud UI komponendid nagu vormivjad, kaardid, tab-riba ja tegevusnupud

See hoiab progressioonireeglid UI-st eraldi testitavana.

## Testimisstrateegia

MVP testimise fookus:

1. uksustestid progressiooniloogikale
2. uksustestid sessiooni snapshot-loogikale
3. uksustestid impordi ja ekspordi teisendustele
4. komponenditestid `Tanane treening` pohivoo jaoks
5. lint ja tootmisbuild

Kriitilised kontrolljuhtumid:

- `range` progressioon tostab raskust ainult siis, kui koik seeriad on maksimumi tais
- `fixed` progressioon tostab raskust ainult siis, kui koik seeriad on edukad
- ebaonnestunud seeria puhul salvestatakse tegelik korduste arv
- sessiooni snapshot ei muutu, kui paevaharjutuse konfiguratsioon muutub hiljem
- aktiivne sessioon taastub peale lehe uuendust
- import ei loo katkiseid seoseid

## Valja jaetav

MVP-st jaavad teadlikult valja:

- kasutajakontod
- pilvesunkroonimine
- jagamine
- sotsiaalsed funktsioonid
- treeningstatistika graafikud
- keerukam automaatne repi-sammuline topeltprogressioon
- puhkeaja taimer kui kohustuslik toovoog

## Edukriteeriumid

MVP on edukas, kui kasutaja saab:

1. luua `Paev 1` ja `Paev 2` mallid
2. lisada harjutused nende paevade alla erinevate sihtidega
3. alustada tanaast treeningut valitud paeva pohjal
4. logida iga seeria eraldi paari puudutusega
5. naha jargmise korra sihti automaatselt arvutatuna
6. vaadata varasemaid treeninguid
7. eksportida ja taastada andmeid
8. kasutada rakendust mobiilis offline-reziimis ning installida see PWA-na
