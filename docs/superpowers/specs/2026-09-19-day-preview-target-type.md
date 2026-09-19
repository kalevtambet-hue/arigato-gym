# Päevavaate korduse sihitüübi eristus – disain

## Eesmärk

Treeningu lehe „Päeva harjutused” loend peab enne treeningu alustamist selgelt näitama, kas iga harjutuse siht on korduste vahemik või kindel arv, ilma kasutaja määratud harjutuste järjekorda muutmata.

## Kasutajaliides

- Iga harjutuse real jääb harjutuse nimi esimeseks elemendiks.
- Nime järel kuvatakse loetav silt:
  - `Vahemik` korduste vahemiku (`range`) korral;
  - `Kindel` kindla korduste arvu (`fixed`) korral;
  - `Kestuse vahemik` kestuse vahemiku (`duration-range`) korral;
  - `Kindel kestus` kindla kestuse (`duration-fixed`) korral.
- Sildi all kuvatakse ka olemasolevat andmemudelit kasutav sihttekst, näiteks `3 x 8-12 x 50 kg` või `3 x 10 x 50 kg`. See teeb sildi tähenduse kontrollitavaks, ilma et kasutaja peaks avama harjutuse redigeerimist.
- Sildid on telefoni ekraanil kompaktsed, tekstiga ja piisava kontrastiga; värv on vaid täiendav visuaalne vihje, mitte ainus eristusviis.

## Andmed ja käitumine

- Andmemudelisse, andmebaasi ega treeningu käivitamise loogikasse muudatusi ei tule.
- Harjutuste sortimine ja ringtreeningu järjestus jäävad muutmata.
- Eristus tuleneb olemasolevast `repMode` väärtusest ning sihttekst olemasolevast `formatTarget` formaadist.

## Testimine

- `WorkoutPage` test valmistab ette samal päeval ühe `range` ja ühe `fixed` harjutuse ning kinnitab mõlema nime, sihitüübi sildi ja vormindatud sihtteksti nähtavust.
- Test kinnitab siltide teksti kaudu ka seda, et erinevus ei sõltu ainult värvist.
