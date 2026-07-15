# Juhend ja privaatsus

## Eesmärk

Lisada rakendusele väga selge paigaldus- ja kasutusjuhend nii, et uus kasutaja saaks rakenduse telefoni paigaldada ja seda kohe kasutada ilma lisaküsimusteta.

## Nõuded

- `README` peab sisaldama põhjalikku paigaldus- ja kasutusjuhendit.
- `Seaded` lehel peab olema kokkuvolditav abi.
- Privaatsuse osa peab väga selgelt ütlema, et rakendus ei kogu ega saada kasutaja andmeid kuhugi.
- Tuleb rõhutada, et kõik andmed salvestatakse ainult kasutaja enda telefoni või brauseri kohalikku andmebaasi.
- Tuleb selgitada, et andmed liiguvad välja ainult siis, kui kasutaja teeb ise ekspordi või varunduse.

## Soovitatud lahendus

Teeme kahekihilise juhendi:

- `README` on täielik käsiraamat arvutis lugemiseks;
- `Seaded` lehel on lühem, kuid sisuline kokkuvolditav abi telefoni jaoks.

## README sisu

README peab katma:

- rakenduse eesmärgi;
- privaatsuse ja andmete paiknemise;
- arenduskeskkonna käivitamise;
- deploy GitHubi ja Cloudflare Pagesi kaudu;
- PWA paigaldamise Androidis;
- PWA paigaldamise iPhone’is;
- esmakordse kasutuse sammud;
- treeningu igapäevase kasutuse;
- varunduse ja taastamise;
- versiooni kontrollimise;
- levinud probleemid ja lahendused.

## Äpisisene abi

`Seaded` lehel lisame kokkuvolditavad plokid:

- `Privaatsus`
- `Paigaldamine`
- `Kasutamine`
- `Varundus`
- `Tõrkeotsing`

## UX reeglid

- Kõige tähtsam info peab olema eespool.
- `Privaatsus` plokk peab olema eriti selge ja usaldust loov.
- Tekst peab olema eesti keeles.
- Telefonis peab see jääma kergesti loetavaks, ilma liiga pika ühe plokina tekstimassiivita.

## Testimine

- Lisada test, et `Seaded` lehel kuvatakse kokkuvolditavate plokkide pealkirjad.
- Kontrollida `lint`, `test`, `build`.
