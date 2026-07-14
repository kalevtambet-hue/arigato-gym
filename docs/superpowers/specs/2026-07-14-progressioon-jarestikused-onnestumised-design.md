# Progressioon: järjestikused õnnestumised

## Eesmärk

Lisada võimalus määrata iga päevakava harjutuse kohta eraldi, mitme järjestikuse õnnestumise järel tõstetakse järgmist sihti.

Praegu tõuseb siht kohe pärast ühte edukat treeningukorda. Uus reegel peab võimaldama näiteks:

- `1` edukas kord enne tõusu
- `2` edukat korda enne tõusu
- `3` edukat korda enne tõusu

See peab töötama nii raskuspõhiste kui ajapõhiste harjutuste jaoks.

## Ulatus

Seadistus lisatakse päevakava kirje tasemele, mitte baasharjutuse ega globaalse seadistusena.

Põhjus:

- sama baasharjutus võib eri päevadel olla erineva eesmärgiga
- päevakava kirje juba kannab sihte ja progressiooniga seotud välju

## Andmemudel

`DayExerciseRecord` saab uue välja:

- `successesRequired: number`

`WorkoutSessionExerciseRecord` saab samuti sama välja snapshotina:

- `successesRequired: number`

Vaikimisi väärtus on `1`.

See tuleb kaasata ka:

- Dexie skeemi/migratsiooni
- varundusse
- CSV import/exporti
- sessiooni snapshoti loomisesse

## Eduka soorituse definitsioon

Harjutus loetakse edukaks samadel tingimustel nagu praegu progressiooni puhul:

- `range`: kõik seeriad jõuavad `targetRepsMax`
- `fixed`: kõik seeriad jõuavad `targetRepsMin`
- `duration-range`: kõik seeriad jõuavad `targetRepsMax`
- `duration-fixed`: kõik seeriad jõuavad `targetRepsMin`

Kui tingimus ei täitu, on harjutus selle treeningu lõikes ebaõnnestunud.

## Järjestikuste õnnestumiste loogika

Progressioon ei tohi enam sõltuda ainult viimasest sessioonist. Selle asemel tuleb vaadata sama päevakava kirje varasemaid lõpetatud sessioone.

Loogika:

1. leia konkreetse päevakava kirje (`dayExerciseId`) sessioonikirjed lõpetatud trennidest
2. arvuta iga sessiooni kohta, kas see oli edukas või ebaõnnestunud
3. loe tagantpoolt järjestikused edukad sessioonid kuni esimese ebaõnnestumiseni
4. lisa praeguse lõpetatava treeningu tulemus sellesse jadasse
5. kui järjestikuseid õnnestumisi on vähemalt `successesRequired`, siis tõsta sihti
6. kui tõus toimub, alustab loendur järgmisel sihil uuesti nullist
7. kui praegune treening ebaõnnestub, katkeb jada ja siht jääb samaks

## Oluline käitumine pärast sihitõusu

Kui siht muutub:

- raskuspõhisel harjutusel tõuseb raskus
- ajapõhisel harjutusel tõuseb kestus

Pärast sihitõusu ei tohi vana sihi all kogunenud õnnestumised enam edasi kanduda. Uus siht algab uue jadana.

See tähendab, et ajaloo läbitöötamisel tuleb arvestada mitte ainult edu/ebaedu, vaid ka seda, millise sihi all konkreetne sessioon tehti.

## Kavad Leht

Iga päevakava kirje juurde lisatakse uus sisend:

- `Õnnestumisi enne tõusu`

See on täisarvuline väli.

Vaikimisi:

- väärtus `1`

MVP piirang:

- minimaalne väärtus `1`
- maksimaalne väärtus võib olla lihtsalt kasutaja sisestatav number, kuid UI võib piirata praktiliselt näiteks `1-10`

## Treeningu Lõpetamine

Treeningu lõpetamisel:

- praeguse sessiooni tulemused salvestatakse nagu praegu
- uue sihi arvutamisel võetakse arvesse `successesRequired`
- kokkuvõttes näidatav `Järgmine siht` peab peegeldama juba uut loogikat

## Ajalugu

Ajaloo leht ei vaja tingimata uut UI-d, kuid sisemine loogika peab olema kooskõlas sellega, et siht ei pruugi tõusta iga eduka korra järel.

MVP-s piisab, kui ajalugu jääb informatiivseks ega kuva vale sihti.

## Import / Eksport

CSV:

- `paevaharjutused.csv` saab uue veeru `successesRequired`
- `sessiooni-harjutused.csv` saab sama veeru snapshoti jaoks

Varundus:

- JSON varundus peab sisaldama uut välja mõlemas kirjetüübis

Tagurpidi ühilduvus:

- kui importfailis väli puudub, eelda väärtust `1`

## Migratsioon

Olemasolevates kirjetes tuleb uuele väljale anda vaikimisi väärtus `1`.

See peab toimuma Dexie migratsioonis nii, et olemasolev kasutaja andmestik jääb tööle.

## Testimine

Vajalik minimaalne kate:

- progressioon tõuseb väärtusega `1` nagu seni
- progressioon ei tõuse väärtusega `2` pärast ainult üht edukat korda
- progressioon tõuseb väärtusega `2` pärast kahte järjestikust edukat korda
- ebaõnnestumine nullib jada
- ajapõhine harjutus järgib sama reeglit
- `Kavad` lehel saab välja muuta
- import ilma väljata kasutab vaikeväärtust `1`

## Otsused

- seade on päevakava kirje tasemel
- vaikeväärtus on `1`
- loogika põhineb järjestikustel edukatel lõpetatud sessioonidel
- ebaõnnestumine katkestab jada
- sihi muutus nullib vana sihi all kogunenud jada
