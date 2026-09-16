# Ringtreeningu päevad

## Eesmärk

Lisada päevatüüp ringtreeningule, kus äpp liigub automaatselt harjutuste vahel
seeriate kaupa, ning võimaldada muuta harjutuste järjekorda iga päeva
muutmisvaates.

## Loomine ja andmed

- Uue treeningpäeva vorm sisaldab checkboxi **Ringtreening**.
- Valik salvestatakse WorkoutDayRecordi boolean-väljana.
- Olemasolevad päevad migreeritakse tavapäevadeks (false).
- Päeva detailvaates seda tüüpi muuta ei saa.

## Harjutuste järjekord

- Päeva detailvaade pakub iga harjutuse juures nuppe **Üles** ja **Alla**.
- Nupud muudavad päevaharjutuste püsivat sortOrderit; esimese ja viimase rea
  vastav nupp on keelatud.
- Sama järjestus on nii tavapäeva kuvajärjekord kui ringtreeningu ringi järjekord.

## Treeninguvoog

- Tavapäev jätkab olemasolevat käitumist: praeguse harjutuse kõik seeriad
  enne järgmise harjutuse juurde liikumist.
- Ringtreeningus valitakse järgmine lõpetamata harjutus väikseima tehtud
  seeriate arvuga; võrdse arvu korral kasutatakse sortOrderit.
- Näiteks järjekorras A, B, C ja kolme seeriaga sihtide puhul on voog
  A1 → B1 → C1 → A2 → B2 → C2 → A3 → B3 → C3.
- Treeningu jooksul käsitsi kasutatud **Tee järgmisena** töötab edasi ning
  muudab ainult käimasoleva sessiooni järjekorda; see ei kirjuta päevamalli
  järjekorda üle.

## Kontroll

- Lisada andmemigratsiooni, päeva loomise ja harjutuste ümberjärjestamise testid.
- Lisada puhta valikuloogika testid tavapäeva ning ringtreeningu järgmisele
  harjutusele.
- Käitada lint, täielik testikomplekt ja tootmisbuild enne deployd.

