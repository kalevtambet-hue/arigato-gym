# Jõusaali progressioonituuma 1. etapi kujundus

## Eesmärk

Lisada offline-andmebaasi juurde harjutuse vabatekstilised sihtgrupid, sessiooni
muutmatud snapshotid, seeriatulemuste revisioonid ja üldised auditisündmused.
Progressioonireeglid elavad eraldi puhtas domeenimoodulis ning ei muuda selles
etapis kasutajaliidest, CSV importi/eksporti ega varunduse vormingut.

## Andmemudel

`ExerciseRecord` saab `primaryTargetGroup` ning `secondaryTargetGroups` väljad.
Esimene on üks vabatekst ja teine vabatekstiliste abirühmade loend. Olemasolevad
harjutused migreeritakse tühja põhirühma ning tühja abirühmade loendiga.

`WorkoutSessionExerciseRecord` hoiab sessiooni algushetke harjutuse,
sihtgruppide ja sihi välju. Lisaks luuakse `sessionSnapshots` tabel, kus üks
kirje kirjeldab sessiooni alguse või lõpetuse hetke terviksnapshoti.
`setResultRevisions` säilitab seeriatulemuse versiooni ja väärtuste snapshoti;
`auditEvents` on ühtne, entiteedipõhine muudatuste jälg.

Dexie versioon 7 lisab tabelid ning täidab olemasolevate harjutuste ja sessiooni
harjutuste uued väljad tagasiühilduvate vaikeväärtustega.

## Progressioon

`evaluateProgression` võtab sisendiks ühe harjutuse sihi ja katse seisundi.
Põhirühm on harjutuse `primaryTargetGroup`, mida tulemus kannab kaasa ilma
lisamõjuta muu harjutuse progressioonile. Edukas täielik katse kasvatab
järjestikuste õnnestumiste loendurit; vahelejätmine, osaline harjutus või
käsitsi muudetud siht nullib selle. Kui vajalik järjestikuste õnnestumiste arv
on täis, tõstetakse sihti olemasoleva progressioonifunktsiooniga. Kui raskus on
ülempiiril, tagastatakse külmutatud otsus ja kaal ei muutu.

## Kontroll

Uued Vitest-testid kirjutatakse enne implementatsiooni. Need katavad
migratsiooni vaikeväärtused, mudelite salvestamise ning kõik kirjeldatud
progressiooniharud. Lõpus käivitatakse `npm test`, `npm run lint` ja `npm run
build`.
