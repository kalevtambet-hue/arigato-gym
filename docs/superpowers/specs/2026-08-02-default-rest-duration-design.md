# Vaikimisi puhkeaja disain

## Eesmärk

Kasutaja saab Seadetes määrata vaikimisi pausi pikkuse seeriate vahel. Seda väärtust kasutatakse ainult uute päeva-harjutuste loomisel.

## Kasutajakogemus

- Seadete lehel on uus plokk **Treening**.
- Plokis on numbriväli **Vaikimisi puhkeaeg (sek)**.
- Algväärtus on 60 sekundit.
- Väärtus peab olema täisarv, mis on 0 või suurem; 0 tähendab, et automaatset puhketaimerit ei käivitata.
- Muudatus salvestub kohe pärast kehtiva väärtuse sisestamist.

## Andmed ja töövoog

- Eelistus salvestatakse seadme `localStorage`-isse, samamoodi nagu välimuse eelistus.
- Kui kasutaja lisab harjutuse treeningpäeva, võetakse eelistus uue `DayExerciseRecord.restSeconds` väärtuseks.
- Olemasolevate päeva-harjutuste `restSeconds` väärtusi ei muudeta.
- Harjutuse detailis ja aktiivse treeningu sihiredaktoris jääb individuaalne puhkeaja muutmine alles ning see väärtus on vaikimisi seadest ülimuslik.
- Seade ei liigu JSON- ega CSV-varundusega kaasa; need varundavad treeningandmeid, mitte seadme eelistusi.

## Vead ja piirid

- Kui `localStorage` puudub, on blokeeritud või sisaldab sobimatut väärtust, kasutatakse turvalist 60-sekundilist algväärtust.
- Sisestus ei salvesta tühja, negatiivset ega murdarvulist väärtust.

## Testimine

- Eelistuse lugemine, salvestamine ja vigane-andmete 60-sekundiline varuväärtus.
- Seadete välja algväärtus ja kehtiva väärtuse salvestamine.
- Uue päeva-harjutuse lisamisel seadetes valitud puhkeaja kasutamine.
- Olemasoleva päeva-harjutuse puhkeaja muutumatuks jäämine.
