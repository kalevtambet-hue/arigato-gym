# Raskuse muutmine treeningu ajal

## Eesmärk

Lubada aktiivse treeningu käigus muuta käesoleva harjutuse raskust nii, et:

- uus raskus kehtib kohe järgmistest tegemata seeriatest alates;
- harjutus jääb progressiooni mõttes üheks tervikuks;
- sama uus raskus salvestub ka järgmise treeningu baasväärtuseks;
- ajalugu ei kaota infot selle kohta, mis raskusega konkreetsed seeriad tegelikult tehti.

## Kasutajalugu

Kasutaja teeb aktiivses trennis harjutust ja märkab, et valitud raskus on liiga kerge või liiga raske. Ta vajutab harjutuse kaardil nuppu `Muuda raskust`, sisestab uue raskuse ning jätkab samast harjutusest edasi. Juba tehtud seeriad jäävad vana raskusega, järgmised seeriad kasutavad uut raskust.

## Soovitatud lahendus

Rakendame ühe lihtsa töövoo:

- aktiivse harjutuse kaardile lisandub nupp `Muuda raskust`;
- nupule vajutades avaneb modal väljaga `Uus raskus (kg)`;
- salvestamisel uuendatakse aktiivse sessiooni harjutuse `currentWeight`;
- järgmise seeria märkimine kasutab juba uut raskust;
- treeningu lõpetamisel salvestatakse päeva harjutuse `currentWeight` sama viimase sessiooni raskuse järgi;
- progressiooni loogika käsitleb kogu harjutust ühe katsena, isegi kui raskus vahetus keskel.

## Andmemudel

Praegune mudel vajab üht lisatäpsustust:

- `SetResultRecord` saab uue välja `usedWeight: number | null`

Reegel:

- raskusega harjutuse korral salvestatakse iga seeria juurde selle hetke aktiivne raskus;
- kestuspõhiste harjutuste korral jääb `usedWeight` väärtuseks `null`.

See võimaldab ajaloos näha, et sama harjutuse esimesed seeriad võisid olla näiteks `50 kg` ja viimased `45 kg`.

## Käitumisreeglid

### Aktiivses treeningus

- `Muuda raskust` kuvatakse ainult raskusega harjutustel.
- Kui kasutaja sisestab uue raskuse, uuendatakse ainult aktiivse sessiooni käesolevat harjutust.
- Juba salvestatud seeriad ei muutu.
- Tulevaste seeriate `Tehtud` ja `Ei tulnud täis` salvestused kasutavad uut raskust.

### Treeningu lõpetamisel

- päeva harjutuse `currentWeight` kirjutatakse üle sessiooni harjutuse lõppväärtusega;
- kui progressioonireegel ütleb, et sihti tuleb tõsta, lisatakse samm sellele viimasele sessiooni raskusele;
- kui sihti ei tõsteta, jääb järgmise korra raskuseks kasutaja poolt viimati valitud raskus.

Näide:

- algus `3 x 10-15 x 50 kg`
- pärast 1. seeriat muudetakse raskus `45 kg`
- treening lõpeb ilma progressioonitõusuta
- järgmine siht on `3 x 10-15 x 45 kg`

Kui sama harjutus täidab tõusureegli:

- algus `3 x 10-15 x 50 kg`
- pärast 1. seeriat muudetakse raskus `45 kg`
- treening kvalifitseerub tõusuks
- järgmine siht on `3 x 10-15 x 50 kg`, kui samm on `5 kg`

## Ajalugu

Ajaloo vaates ei pea MVP-s kogu raskuse muutmise logi eraldi tekstina näitama, kuid andmed peavad olema salvestatud nii, et hiljem saab seda kuvada. Käesoleva muudatuse minimaalne eesmärk on korrektne salvestus andmemudelis.

## Veakäsitlus

- tühi või mittesobiv väärtus ei salvesta midagi;
- raskus peab olema `>= 0`;
- kestuspõhiste harjutuste korral raskuse muutmise nuppu ei kuvata.

## Testimine

Lisame testid järgmistele juhtudele:

- aktiivses treeningus saab raskust muuta;
- pärast muutust salvestub järgmine seeria uue raskusega;
- treeningu lõpetamisel kandub viimane raskus järgmise korra baasiks;
- progressioonitõus rakendub viimasele sessiooni raskusele, mitte algsele raskusele;
- kestusharjutusel `Muuda raskust` nuppu ei kuvata.
