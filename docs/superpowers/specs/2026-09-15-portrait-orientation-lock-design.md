# Portreeasendi lukustus

## Eesmärk

Hoida Treeninguabiline toetatud telefonides portreeasendis, nii et telefoni
pööramine ei ava rakendust maastikuvaates.

## Lahendus

- PWA manifest saab `orientation: 'portrait'` väärtuse. Installitud PWA-d
  toetavates brauserites on see esmane lukustusmehhanism.
- Rakenduse käivitumisel proovitakse `screen.orientation.lock('portrait')`
  abil orientatsiooni lukustada ka API-d toetavates keskkondades.
- API puudumise, kasutajaagendi piirangu või lukustamise vea korral jätkub
  rakendus tavapäraselt. Viga ei jõua kasutajani ega katkesta käivitust.

## Piirangud

iOS-i Safari ja iOS-i avakuvale lisatud veebirakendused ei toeta
orientatsioonilukku ühtlaselt. Seal ei saa PWA pööramist usaldusväärselt
takistada, kuid Androidi installitud PWA-del rakendub manifesti lukustus.

## Kontroll

- Lisada väike test puhtale orientatsiooniluku abifunktsioonile: puuduv API ja
  lukustamisest visatud viga ei tekita erindit; toetatud API saab väärtuse
  `portrait`.
- Käitada lint, testid ja tootmisbuild.
