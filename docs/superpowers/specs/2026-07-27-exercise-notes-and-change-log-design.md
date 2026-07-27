# Harjutuse Märkmed Ja Muudatuste Logi

## Eesmärk

Lisada aktiivse või parajasti valitud harjutuse juurde `Märkmed` nupp, mis avab sama treeninguvaate sees inline-paneeli. Paneel peab võimaldama:

- lisada uue kasutaja märkme konkreetse harjutuse kohta
- näha sama harjutuse varasemaid märkmeid kuupäevaliselt
- näha sama harjutuse sihtväärtuste muutuste logi
- eristada, kas muudatuse tegi kasutaja või automaatika

See peab töötama olemasoleva offline-first arhitektuuri sees ilma kontode, serveri või pilvesünkroonimiseta.

## Kasutajakäik

Treeningu aktiivse harjutuse kaardile lisatakse `Märkmed` nupp. Vajutamisel avaneb sama kaardi alla inline-paneel.

Paneel koosneb kahest osast:

1. `Lisa märkus` sisestusväli ja salvestusnupp
2. ajalugu, kus kuvatakse sama harjutuse märkmed ja muudatused

Ajalugu kuvatakse uusim eespool, sest treeningu ajal on värskeim info kõige kasulikum. Iga rida sisaldab:

- kuupäeva ja kellaaega
- tüüpi: `Märkus` või `Muudatus`
- allikat: `Kasutaja` või `Automaatika`
- sisu

Näited:

- `27.07.2026 18:42 • Kasutaja • Märkus: õlg andis tunda`
- `27.07.2026 18:45 • Kasutaja • Raskus 65 kg -> 60 kg`
- `27.07.2026 18:47 • Automaatika • Raskus 60 kg -> 65 kg`
- `27.07.2026 18:47 • Automaatika • Kordused 10-15 -> 10-15, järgmine põhiraskus 65 kg`

## Ulatus

MVP-s logitakse ainult need muudatused, mida kasutaja konkreetselt küsis:

- seeriate arv
- kordused või korduste vahemik
- raskus

MVP-st jäävad välja:

- märkmete muutmine
- märkmete kustutamine
- logi filtreerimine
- logi otsing
- märkmete või logi kuvamine eraldi detailvaates

## Soovitatud lahendus

### Variant A

Inline-paneel aktiivse harjutuse kaardi all.

Plussid:

- kõige vähem navigeerimist
- sobib olemasoleva treeninguflow’ga
- kiire mobiilikasutus

Miinused:

- treeningukaart muutub sisukamaks
- WorkoutPage saab veel ühe vastutuse juurde

### Variant B

Eraldi modal või drawer.

Plussid:

- põhi-UI jääb puhtam
- mahutab pikemat logi

Miinused:

- trenni ajal lisaklõps
- katkestab töövoolu rohkem

### Variant C

Eraldi harjutuse detailvaade.

Plussid:

- puhtam arhitektuur
- lihtne hiljem laiendada

Miinused:

- liiga raske MVP jaoks
- ei vasta minimaalse navigeerimise eesmärgile

Valik: Variant A.

## Andmemudel

Lisatakse uus tabel `exerciseEvents`.

Väljad:

- `id: string`
- `exerciseId: string`
- `sessionExerciseId?: string | null`
- `createdAt: string`
- `type: 'note' | 'change'`
- `actor: 'user' | 'automation'`
- `field?: 'targetSets' | 'targetReps' | 'currentWeight'`
- `fromValue?: string | null`
- `toValue?: string | null`
- `noteText?: string | null`

Selgitus:

- `exerciseId` seob sündmuse püsiva baasharjutusega, et logi oleks nähtav üle treeningute
- `sessionExerciseId` võimaldab vajadusel viidata konkreetsele sessioonihetkele
- `field` on ainult muudatuse tüübi puhul
- `fromValue` ja `toValue` salvestatakse stringina, et ühe väljaga katta nii fikseeritud kordused, vahemik kui raskus
- `noteText` on ainult märkuse tüübi puhul

## Sündmuste loomise reeglid

### Kasutaja märkus

Kui kasutaja lisab märkuse `Märkmed` paneelist:

- luuakse `exerciseEvents` rida
- `type = 'note'`
- `actor = 'user'`
- `noteText` sisaldab sisestatud sisu

### Kasutaja tehtud muudatus

Kui kasutaja muudab aktiivse treeningu ajal raskust:

- luuakse `exerciseEvents` rida
- `type = 'change'`
- `actor = 'user'`
- `field = 'currentWeight'`
- `fromValue` on eelmine raskus
- `toValue` on uus raskus

Kui hiljem lisatakse treeninguvaatesse ka seeriate või korduste käsitsi muutmine, kasutatakse sama mehhanismi.

### Automaatika tehtud muudatus

Kui treeningu lõpetamisel topeltprogressioon uuendab päevakava sihti:

- võrreldakse eelmisi ja uusi väärtusi
- iga päriselt muutunud välja kohta luuakse eraldi `exerciseEvents` rida
- `actor = 'automation'`

Automaatika logib ainult siis, kui väärtus muutus. Kui siht jäi samaks, logirida ei looda.

## Muudatuste esitamine logis

`field` väärtuste kuvatekst:

- `targetSets` -> `Seeriad`
- `targetReps` -> `Kordused`
- `currentWeight` -> `Raskus`

Korduste vormindus:

- fikseeritud kordused: `12`
- korduste vahemik: `10-15`
- kestuse põhised sihid: sama olemasoleva sihi vorminduse järgi

Raskuse vormindus:

- `60 kg`

Näidisrenderdus:

- `Raskus 60 kg -> 65 kg`
- `Seeriad 3 -> 4`
- `Kordused 10-15 -> 8-12`

## UI käitumine

### Treeninguvaade

Aktiivse harjutuse kaardile lisatakse uus `Märkmed` nupp olemasolevate tegevusnuppude lähedale.

Nupu vajutamine:

- avab või sulgeb inline-paneeli
- kui kasutaja liigub järgmisele harjutusele, paneel sulgub automaatselt

Inline-paneelis:

- on üks mitmerealine tekstiväli märkme lisamiseks
- `Salvesta märkus` nupp loob sündmuse
- all kuvatakse logi kirjed

Kui logi puudub:

- kuvatakse tühi olek, näiteks `Selle harjutuse kohta veel märkmeid ega muudatusi ei ole.`

### Ajaloo järjestus

Kõik kirjed sorteeritakse `createdAt` järgi kahanevalt.

### Visuaalne eristus

Soovituslik:

- kasutaja märkus neutraalse kaardina
- kasutaja muudatus kergelt sinise aktsendiga
- automaatika muudatus kergelt teise aktsendiga, näiteks hallikas või lilla-sinine

Selle eesmärk on teha allika vahe kiiresti loetavaks ilma uut navigeerimist lisamata.

## Arhitektuur

Lisatakse uus väike andmekiht sündmuste logimiseks, mitte ei kirjutata seda olemasolevate märkmete või sessiooniridade sisse. Põhjused:

- märkmed ja muudatused on mõlemad ajaliselt järjestatud sündmused
- üks tabel katab mõlemad kasutusjuhtumid
- see jääb laiendatavaks, kui hiljem tekib vajadus logida ka teisi välju

Soovituslik vastutuste jaotus:

- `db/types.ts`: uue kirjetüübi definitsioon
- `db/appDb.ts`: Dexie migratsioon
- `db/repositories.ts` või eraldi väike helper: sündmuse lisamise funktsioonid
- `features/workout/WorkoutPage.tsx`: nupu ja paneeli UI
- väike vormindushelper, kui logi tekst hakkab kasvama

## Migratsioon Ja Varundus

Kuna rakendus on offline-first ja toetab JSON/CSV eksporti-importi, peab uus tabel minema kaasa:

- Dexie versioonitõus koos uue tabeliga
- JSON varundus peab sisaldama `exerciseEvents`
- CSV eksport peab looma ka `harjutuse-sundmused.csv`
- CSV import peab suutma selle faili tagasi lugeda

Vanade andmete puhul ei ole migratsiooniks vaja tagantjärele sündmusi luua. Tabel võib alata tühjana.

## Veakäitlus

- tühi märkus ei salvestu
- kui harjutuse `exerciseId` ei ole kättesaadav, `Märkmed` nuppu ei kuvata või paneel jääb suletuks
- kui automaatika võrdluses ei leita muutust, sündmust ei kirjutata

## Testimine

Vajalikud testid:

- aktiivse harjutuse juures kuvatakse `Märkmed` nupp
- nupust avaneb inline-paneel
- kasutaja saab lisada märkuse ja see ilmub ajalukku
- kasutaja käsitsi raskuse muutus loob `actor=user` muudatuse kirje
- treeningu lõpetamise automaatika loob `actor=automation` muudatuse kirje ainult muutunud väljadele
- logi sorteerub kuupäevaliselt
- JSON export/import säilitab `exerciseEvents` read
- CSV export/import säilitab `exerciseEvents` read

## Edukriteerium

Lahendus on valmis siis, kui kasutaja saab aktiivse harjutuse juures:

- avada sama harjutuse märkmete ja muudatuste ajaloo
- lisada uue märkme
- näha, millal ja kuidas harjutuse sihtväärtused muutusid
- aru saada, kas muudatuse tegi kasutaja või automaatika

Kõik see peab töötama lokaalselt seadmes ka ilma internetita.
