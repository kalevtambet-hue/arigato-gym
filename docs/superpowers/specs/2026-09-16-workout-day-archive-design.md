# Treeningpäevade arhiiv

## Eesmärk

Võimaldada aktiivse päeva peitmine ilma selle andmeid kustutamata ning taastamine
Seadete arhiivist.

## Käitumine

- Päeva detailvaates lisandub nupp **Arhiveeri päev** ja kinnitusküsimus.
- Arhiveerimine seab päeva isArchived väärtuseks true ning säilitab selle
  harjutused, sessioonid ja ajaloo.
- Arhiveeritud päev ei kuvata Kavad ega Treening vaates.
- Seaded sisaldab eraldi **Arhiiv** alajaotust, mis näitab arhiveeritud päevi
  ning pakub iga päeva jaoks nuppu **Taasta**.
- Taastamine seab isArchived väärtuseks false; päev ilmub kohe tagasi Kavad
  ja Treening vaates.
- Olemasolev nupp **Kustuta päev** jääb alles ja kustutab päeva koos selle
  päevaharjutustega püsivalt.

## Kontroll

- Testida arhiveerimist päeva detailvaates ja kontrollida, et päev kaob Kavadest.
- Testida Seadete arhiivi loendit ning taastamist.
- Testida, et taastatud päev muutub uuesti aktiivsetes loendites nähtavaks.
- Käitada lint, täielik testikomplekt ja tootmisbuild enne deployd.

