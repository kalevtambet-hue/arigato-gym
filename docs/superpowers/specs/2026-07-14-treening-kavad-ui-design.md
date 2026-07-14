# Treening / Kavad UI Eraldamine

## Eesmärk

Rakenduse kasutusvoog tuleb lahutada kaheks:

- `Treening` on igapäevane kasutusvaade.
- `Kavad` on haldusvaade, kus hallatakse baasharjutusi ja treeningpäevi.

See vähendab segadust mobiilis, sest treenima minnes ei pea kasutaja sisenema halduskuva loogikasse.

## Navigatsioon

Alumine navigeerimine muutub kujule:

- `Treening`
- `Kavad`
- `Ajalugu`
- `Seaded`

Rakenduse vaikimisi avaleht muutub marsruudile `/treening`.

Praegune `Harjutused` leht nimetatakse ümber `Kavad` leheks ning selle route muutub `/kavad`.

## Treening Leht

Kui aktiivset treeningut ei ole, näidatakse:

1. päeva valikut
2. valitud päeva märkust
3. valitud päeva harjutuste nimekirja
4. suurt nuppu `Alusta treeningut`

### Päeva valik

- Päevad kuvatakse puutetundlike sakkide või nuppudena.
- Kui päevad puuduvad, kuvatakse tühi olek, mis suunab kasutaja `Kavad` lehele.

### Päeva märkus

- Valitud päeva märkus kuvatakse enne harjutuste nimekirja.
- Kui märkus puudub, eraldi tühja märguse plokki ei näidata.

### Päeva harjutused

Iga harjutuse real kuvatakse:

- harjutuse nimi
- masina number
- siht kokkuvõtlikul kujul

Näited:

- `3 x 10-15 x 50 kg`
- `3 x 12 x 60 kg`
- `2 x 10-15 min`
- `1 x 20 min`

See on ainult eelvaade. Treeningu lehel ei muudeta päevakava seadeid.

### Aktiivne treening

Kui aktiivne treening on olemas:

- säilib praegune aktiivse treeningu töövoog
- progressmeeter jääb alles
- järgmise harjutuse kaart jääb alles
- lõpetamise kokkuvõte jääb alles

See tähendab, et `Treening` lehel on kaks olekut:

- treeningu eelvaade
- aktiivne treening

## Kavad Leht

`Kavad` leht koondab kogu seadistamise.

Seal jäävad kaks peamist plokki:

- `Baasharjutused`
- `Treeningpäevad`

### Baasharjutused

Siin saab:

- lisada harjutuse
- muuta harjutust
- kustutada harjutust

### Treeningpäevad

Siin saab:

- lisada treeningpäeva
- valida päeva
- muuta päeva nime
- muuta päeva märkust
- duplikeerida päeva
- kustutada päeva
- lisada päevaga seotud harjutusi
- eemaldada päevast harjutusi
- muuta iga päevakirje sihte

See tähendab, et kogu `päeva koostamine` jääb ainult `Kavad` lehele.

## Andmevoog

Uut andmemudelit ei lisata.

Olemasolevad tabelid jäävad samaks:

- `workoutDays`
- `dayExercises`
- `exercises`
- `sessions`
- `sessionExercises`
- `setResults`

Lisandub ainult UI-taseme eraldus:

- `Treening` loeb `workoutDays` ja `dayExercises`, et näidata valitud päeva eelvaadet
- `Kavad` haldab samu kirjeid muutmisrežiimis

Valitud päeva hoidmiseks `Treening` lehel kasutatakse lokaalset UI state'i. Eraldi püsivat seadistust selles muudatuses ei lisata.

## Tühjad Olekud

Treeningu lehel:

- kui treeningpäevi pole, kuvatakse suunav tühi olek
- kui valitud päeval pole harjutusi, kuvatakse selle päeva kohta tühi olek ja `Alusta treeningut` nuppu ei näidata

Kavade lehel:

- olemasolevad tühjad olekud jäävad alles, aga pealkirjad ja tekst kohandatakse uue nime järgi

## Testimine

Muutus vajab vähemalt järgmisi kontrolle:

- `App` navigeerimine kasutab `Treening / Kavad / Ajalugu / Seaded`
- vaikimisi route viib `/treening` lehele
- `Treening` leht näitab ilma aktiivse sessioonita valitud päeva märkust ja harjutusi
- `Treening` leht ei kuva haldusvälju
- `Kavad` leht säilitab olemasoleva lisamise, muutmise, kustutamise ja päevaga sidumise käitumise
- aktiivse treeningu workflow ei regressi

## Otsused

- `Treening` on uus avaleht
- `Kavad` on ainus koht, kus muudetakse päevakava
- päeva märkus kuvatakse `Treening` lehel
- selle muudatuse käigus ei lisata püsivat `viimati valitud päev` salvestust
