# Treeninguabiline

Treeninguabiline on telefonis kasutamiseks mõeldud jõusaalipäevik. Valid päeva, alustad trenni, märgid iga seeria ühe puudutusega ja rakendus arvutab järgmise korra sihi.

Rakendus töötab brauseris ja selle saab paigaldada telefoni avakuvale. Pärast esimest avamist töötab see ka ilma internetita.

## Privaatsus ja andmed

Treeninguabiline ei kogu, ei analüüsi ega saada sinu treeningandmeid kuhugi serverisse.

- Kõik andmed salvestatakse ainult selle seadme brauseri kohalikku andmebaasi.
- Kasutajakontosid ei ole.
- Pilvesünkroonimist ei ole: teise telefoni või brauserisse andmed ise üle ei liigu.
- Analüütikat ega jälgimisskripte ei ole.
- Andmed liiguvad seadmest välja ainult siis, kui sa ise kasutad `Ekspordi varundus` või `Ekspordi CSV` nuppu.

Varundamine on sinu enda vastutus. Kui brauseri andmed kustutatakse, kaob ka treeningajalugu. Vaata jaotist [Varundus ja taastamine](#varundus-ja-taastamine).

## Kiirstart

1. Ava leht `Harjutused` ja vajuta `Lisa harjutus`. Lisa kõik harjutused, mida teed.
2. Ava leht `Kavad`. Seal on juba päevad `Päev 1` ja `Päev 2`; ava üks neist või loo uus nupuga `Lisa treeningpäev`.
3. Vali päeva lehel `Vali harjutus` ja vajuta `Lisa harjutus`. Vajuta harjutuse juures `Ava` ja sea siht (seeriad, kordused või kestus, raskus).
4. Ava leht `Treening`, vali päev ja vajuta `Alusta treeningut`.
5. Märgi iga seeria alumisel ribal. Kui kõik seeriad on kirjas, vajuta `Lõpeta treening`.

Põhinavigatsioon on ekraani allservas: `Treening`, `Kavad`, `Harjutused`, `Ajalugu` ja `Veel`. Seaded leiad lehelt `Veel` → `Seaded`.

## Paigaldamine telefoni

### Android ja Chrome

1. Ava rakenduse aadress Chrome'is.
2. Oota, kuni leht on täielikult laetud.
3. Ava Chrome'i menüü ja vali `Install app` või `Add to Home Screen`.
4. Kinnita paigaldus.

### iPhone ja Safari

1. Ava rakenduse aadress Safaris.
2. Vajuta `Share`.
3. Vali `Add to Home Screen` ja kinnita.

iPhone'is tee see Safari kaudu.

Paigaldatud rakendus avaneb täisekraanil ja püstpaigutuses, kui seade seda toetab.

## Harjutused ja kavad

### Harjutuste register

Lehel `Harjutused` on kõik sinu harjutused.

- `Lisa harjutus` avab vormi. Kohustuslik on ainult `Harjutuse nimi`. Lisaks saad sisestada `Masina number` ja `Märkus`.
- `Otsi harjutust` filtreerib nimekirja nime järgi.
- Iga harjutuse juures on viimase treeningu tulemus (`Viimane: …`) ja järgmine siht (`Järgmine siht: …`). Kui harjutus on mitmes treeningpäevas, näidatakse viimati muudetud päeva sihti.

Harjutusele vajutades avaneb harjutuse leht:

- `Muuda harjutust` muudab nime, masina numbrit ja märkust.
- `Vaata ajalugu` avab selle harjutuse ajaloo koos rekorditega.
- `Kustuta harjutus` küsib kinnitust ja eemaldab harjutuse ka kõigist treeningpäevadest. Varasemad treeningud jäävad ajalukku alles.

### Treeningpäevad

Lehel `Kavad` on sinu treeningpäevad. `Lisa treeningpäev` küsib päeva nime. Märkeruut `Ringtreening` määrab, et treeningu ajal liigutakse pärast iga seeriat järgmise harjutuse juurde (vt [Ringtreening](#ringtreening)). Ringtreeningu valiku saad teha ainult päeva loomisel.

Päevale vajutades avaneb päeva leht:

- `Päeva nimi` ja `Päeva märkus` salvestuvad nupuga `Salvesta nimi`. Märkust näidatakse lehel `Treening` päeva valimisel.
- `Vali harjutus` + `Lisa harjutus` lisab harjutuse päeva lõppu. Sama harjutuse võib päeva lisada mitu korda.
- `Üles` ja `Alla` muudavad järjekorda.
- `Ava` näitab harjutuse sihti. Väljad salvestuvad kohe, eraldi salvestusnuppu pole.
- `Eemalda` eemaldab harjutuse sellelt päevalt.
- `Duplikeeri päev` loob koopia nimega `<päev> koopia` koos harjutuste ja sihtidega.
- `Arhiveeri päev` peidab päeva lehtedelt `Kavad` ja `Treening`. Taastada saad selle lehel `Seaded` → `Arhiiv` → `Taasta`.
- `Kustuta päev` kustutab päeva ja selle harjutuste sihid. Varasemad treeningud jäävad ajalukku alles.

### Harjutuse siht päevas

Uus harjutus lisatakse päeva sihiga `3 x 10-15 x 40 kg`, raskuse sammuga 5 kg. Muuda need kohe enda järgi.

| Väli | Tähendus |
| --- | --- |
| `Seeriate arv` | Mitu seeriat teed. |
| `Õnnestumisi enne tõusu` | Mitu järjestikust õnnestunud treeningut on vaja, enne kui siht tõuseb. |
| `Sihi tüüp` | `Kordused vahemik`, `Kordused fikseeritud`, `Kestus vahemik` või `Kestus fikseeritud`. |
| `Min kordused` / `Max kordused` | Korduste vahemik, näiteks 10–15. |
| `Kordused` | Kindel korduste arv. |
| `Raskus (kg)` | Järgmise treeningu raskus. |
| `Raskuse samm (kg)` | Kui palju raskus tõuseb ja kui palju muutub raskus treeningu ajal `−`/`+` nupuga. |
| `Kestus (min)`, `Min kestus (min)`, `Max kestus (min)` | Kestusel põhineva harjutuse siht minutites. |
| `Kestuse samm (min)` | Kui palju kestussiht tõuseb. |

Iga päeva harjutus areneb eraldi. Kui sama harjutus on kahes päevas, on neil oma sihid ja oma progressioon.

Puhkeaega päeva lehel muuta ei saa. Uus harjutus saab puhkeaja seadest `Vaikimisi puhkeaeg (sek)`. Hiljem saad seda muuta treeningu ajal nupuga `Muuda sihti`.

## Treeningu alustamine

1. Ava leht `Treening`.
2. Vali ülevalt päev. All näed selle päeva harjutusi ja sihte. Silt näitab sihi tüüpi: `Vahemik`, `Kindel`, `Kestuse vahemik` või `Kindel kestus`.
3. Vajuta `Alusta treeningut`.

Treeningu ajal on navigatsiooniribal `Treening` juures roheline täpp. Võid vahepeal teistele lehtedele minna või rakenduse sulgeda: pooleli treening jääb alles ja jätkub samast kohast.

Kui brauser seda toetab, ei lähe ekraan treeningu ajal lukku, kuni `Treening` leht on lahti.

## Seeriate logimine

Aktiivse harjutuse kaardil on harjutuse nimi, masina number, siht (näiteks `3 x 10-15 x 40 kg`) ja `Seeria 2 / 3`. All on iga seeria rida: `✓ tehtud`, `✕ puudu`, `sinu kord` või `ootel`.

Seeria tulemuse märgid ekraani alumisel ribal.

### Korduste vahemik

Ribal on nupp iga korduste arvu kohta, näiteks `10 11 12 13 14 15`. Vajuta tehtud korduste arvu: seeria salvestub selle arvuga kohe, ühe puudutusega. Eraldi korduste valijat ega `Tehtud` nuppu vahemiku puhul pole.

Iga vahemiku nupp märgib seeria õnnestunuks. Sihi tõusuks peavad aga kõik seeriad jõudma vahemiku ülemise piirini (vt [Järgmine siht ja progressioon](#järgmine-siht-ja-progressioon)).

### Kindel korduste arv

Kaardil on korduste arv ilma muutmisnuputa. Vajuta `Tehtud`, kui tegid kõik kordused.

### Kestus

- Kindla kestuse puhul vajuta `Tehtud`.
- Kestuse vahemiku puhul vali `−`/`+` nupuga minutid (vahemiku piires, vaikimisi ülemine piir) ja vajuta `Tehtud`.

Kestusel põhineval harjutusel raskust pole.

### Ei tulnud täis

1. Vajuta `Ei tulnud täis`.
2. Kaardil avaneb väli `Tegelikud kordused` (kestuse puhul `Tegelik kestus (min)`). Kursor on juba väljas.
3. Sisesta tegelik tulemus ja vajuta `Salvesta seeria`. `Loobu` sulgeb vormi ilma salvestamata.

Tühja või negatiivset väärtust ei salvestata. Siis näed teadet `Sisesta kehtiv tegelik tulemus.`

### Raskuse muutmine treeningu ajal

Raskuse `−`/`+` nupp muudab raskust päeva harjutuse `Raskuse samm` võrra.

- Uus raskus kehtib kohe järgmistest seeriatest. Juba salvestatud seeriad jäävad oma raskusega.
- Uus raskus salvestub kohe ka päeva sihiks, isegi kui treening hiljem katkestatakse.
- Kui ühe harjutuse seeriad tehti eri raskustega, ei tõsta rakendus selle treeningu põhjal raskust. Järgmine siht kasutab viimati valitud raskust.

### Salvestatud seeria parandamine treeningu ajal

Jooksva harjutuse salvestatud seeria real vajutades avaneb `Muuda seeriat N`:

- vali `Tehtud` või `Ei tulnud täis`;
- `Ei tulnud täis` puhul sisesta tegelik tulemus;
- vajuta `Salvesta muudatus`.

Pane tähele:

- `Tehtud` salvestab alati sihi väärtuse. Vahemiku puhul on see ülemine piir.
- `Ei tulnud täis` puhul ei salvestata tühja ega negatiivset väärtust. Siis näed teadet `Sisesta kehtiv tegelik tulemus.`
- `Kustuta seeria` küsib kinnitust. Kustutatud seeriat tagasi võtta ei saa.

Eelmiste harjutuste seeriaid saad parandada pärast treeningut lehel `Ajalugu`.

### Muuda sihti

`Muuda sihti` aktiivse harjutuse kaardil muudab käimasoleva harjutuse sihti: seeriate arvu, tüüpi, kordusi või kestust, raskust ja `Puhkeaeg seeriate vahel (sek)`. Vajuta `Salvesta siht`.

Muudatus kehtib kohe ja salvestub ka järgmise korra sihiks. Seeriate arv ei saa olla väiksem kui juba salvestatud seeriate arv. Kui mõni väli on tühi või väärtus vigane, ei salvestata midagi ja vormis on kirjas, mida parandada.

### Märkmed

`Märkmed` näitab selle harjutuse märkmeid ja sihimuutuste ajalugu (kes muutis: `Kasutaja` või `Automaatika`). `Lisa märkus` + `Salvesta märkus` lisab uue märkme.

### Järjekorra muutmine

Plokis `Tulemas` on ülejäänud harjutused. Kui masin on kinni, vajuta harjutuse juures `Tee järgmisena` või tõmba rida vasakule.

Ploki kohal on edenemine kujul `Tehtud 1 / 4` ja `Jäänud 3`. Need arvud näitavad harjutusi, mitte seeriaid.

### Ringtreening

Kui päev on loodud märkega `Ringtreening`, liigub rakendus pärast iga seeriat järgmise harjutuse juurde. Esimesena tuleb harjutus, millel on kõige vähem seeriaid tehtud. Tavalisel päeval tehakse harjutuse kõik seeriad järjest.

## Puhkeaja taimer ja tagasivõtmine

### Puhkeaja taimer

Pärast iga salvestatud seeriat, ka `Ei tulnud täis` järel, käivitub taimer `Puhkus`, näiteks `1:00`.

- Taimer kasutab selle harjutuse puhkeaega. Kui puhkeaeg on 0, taimerit ei käivitata.
- `Jätan vahele` lõpetab taimeri.
- Taimer jääb nähtavaks ka siis, kui liigud järgmise harjutuse juurde.
- Taimer jätkab õige ajaga ka pärast lehe uuesti laadimist või rakenduse uuesti avamist.
- Uue seeria salvestamine käivitab taimeri uuesti.
- Kui aeg saab täis, kaob taimer vaatest. Heli ega vibratsiooni pole.

### Võta tagasi

Pärast seeria salvestamist ilmub nupp `Võta tagasi`. See kustutab viimati salvestatud seeria ja lõpetab puhkeaja taimeri.

- Tagasi saab võtta ainult kõige viimase seeria. Järgmine salvestus asendab selle.
- Nupp jääb alles ka siis, kui viimane seeria viis sind järgmise harjutuse juurde või tõi ette teate `Treening valmis`. Tagasivõtmise järel naased selle seeria juurde.
- Raskuse ega sihi muudatusi tagasivõtmine ei taasta.
- Kui lahkud lehelt `Treening` või laadid lehe uuesti, nupp kaob. Seeria saad siis parandada seeria real vajutades või pärast treeningut lehel `Ajalugu`.

## Järgmine siht ja progressioon

Aktiivse harjutuse kaardil on reegel kirjas, näiteks:

> Kui kõik seeriad jõuavad vahemiku ülemise piirini 2 järjestikusel sama sihiga treeningul, suureneb järgmisel sihil raskus 5 kg võrra.

### Millal siht tõuseb

Siht tõuseb, kui kehtivad kõik tingimused:

1. Treening lõpetati nupuga `Lõpeta treening`.
2. Kõik planeeritud seeriad on märgitud õnnestunuks.
   - Korduste vahemikus jõudis iga seeria ülemise piirini. Näiteks sihi `10-15` puhul on vaja igas seerias 15 kordust.
   - Kindla korduste arvu või kestuse puhul tehti iga seeria täis.
   - Kestuse vahemikus jõudis iga seeria ülemise piirini.
3. Kõik seeriad tehti sama raskusega.
4. Selliseid treeninguid on järjest nii palju, kui nõuab `Õnnestumisi enne tõusu`. Järjestikuseks loetakse ainult täpselt sama sihiga treeninguid: sama tüüp, samad kordused või kestus ja sama raskus.

Tõus:

- kordustega harjutusel suureneb raskus `Raskuse samm` võrra, kordused jäävad samaks;
- kestusel põhineval harjutusel pikenevad mõlemad kestuse piirid `Kestuse samm` võrra.

### Millal siht ei tõuse

- Mõni seeria oli `Ei tulnud täis`.
- Vahemiku puhul jäi mõni seeria alla ülemise piiri. Ajaloos on seeria ikkagi „õnnestus“, aga tõusuks sellest ei piisa.
- Järjestikuseid õnnestumisi on veel vähem kui vaja.
- Ühe harjutuse seeriad tehti eri raskustega.
- Treening lõpetati poolikuna või katkestati. Siis järgmist sihti ei arvutata.

Kui siht ei tõuse, jääb järgmiseks korraks sama siht. Kui muutsid treeningu ajal raskust, jääb sihiks viimati valitud raskus.

Kui muudad sihi tüüpi, kordusi, kestust või raskust käsitsi (lehel `Kavad`, nupuga `Muuda sihti` või raskuse `−`/`+` nupuga), hakatakse järjestikuseid õnnestumisi uue sihiga otsast lugema.

## Treeningu lõpetamine

### Kõik seeriad tehtud

Kui kõik seeriad on kirjas, ilmub `Treening valmis`. Vajuta `Lõpeta treening`.

Lehe `Treening` ülaossa ilmub plokk `Järgmine siht`. Iga harjutuse juures on:

- järgmine siht, näiteks `3 x 10-15 x 45 kg`;
- selgitus, näiteks „Kõik planeeritud seeriad täitsid sihi; järgmine siht tõuseb.“ või „Vähemalt üks planeeritud seeria ei täitnud sihti.“

Plokk on nähtav, kuni oled lehel `Treening`. Kui lahkud lehelt või laadid selle uuesti, plokk kaob. Järgmise sihi leiad siis lehelt `Harjutused` või päeva valikust lehel `Treening`.

### Treening jäi poolikuks

Kui mõni planeeritud seeria pole korrektselt kirjas, näed teadet `Treening jäi poolikuks` ja nuppu `Lõpeta poolikuna`. Selline treening läheb ajalukku märkega `Pooleli lõpetatud`. Järgmist sihti ei arvutata.

### Katkesta treening

`Katkesta treening` küsib kinnitust.

- Kui ühtegi seeriat pole salvestatud, kustutatakse treening jäljetult. Sobib, kui valisid vale päeva.
- Kui seeriaid on salvestatud, jääb treening ajalukku märkega `Katkestatud`. Järgmist sihti ei arvutata.

## Ajalugu ja rekordid

Lehel `Ajalugu` on kõik treeningud, uuemad eespool. Iga treening on kokku volditud: näed kuupäeva, päeva nime ja tulemust, näiteks `2/3 edukat`, `Pooleli lõpetatud` või `Katkestatud`. Vajuta reale, et näha harjutusi.

Iga harjutuse juures on siht, seeriate tulemused (näiteks `15 / 12 / 10`) ja olek:

- `✓ õnnestus`: kõik seeriad märgiti õnnestunuks;
- `✕ jäi puudu`: vähemalt üks seeria oli `Ei tulnud täis`;
- `○ pooleli`: kõik seeriad pole kirjas.

### Filtreerimine ja rekordid

`Filtreeri harjutuse järgi` näitab ainult neid harjutusi, mille nimes on sisestatud tekst.

Rekordite kokkuvõte ilmub, kui:

- avad harjutuse lehel nupu `Vaata ajalugu`; või
- kirjutad filtrisse harjutuse täpse nime (suur- ja väiketäht pole olulised).

Kordustega harjutuse kokkuvõte:

- `Parim raskus: … kg`
- `Parim … kg juures: … kordust`
- `Edukaid tööseeriaid: …`
- `Treeninguid: …`

Kestusel põhineva harjutuse puhul on esimese kahe rea asemel `Pikim kestus: … min`.

Kokkuvõttes arvestatakse ainult õnnestunud seeriaid treeningutest, mis lõpetati nupuga `Lõpeta treening`.

## Lõpetatud seeriate muutmine

Kui treeningu seeria läks valesti kirja, paranda see ajaloos.

1. Ava lehel `Ajalugu` treening.
2. Vajuta harjutuse juures `Muuda seeriaid`.
3. Vali seeria, näiteks `2. seeria: 9 · 40 kg · ebaõnnestus`.
4. Muuda välju `Tulemus` (`Õnnestus` või `Ebaõnnestus`), `Tegelikud kordused` (või `Tegelik kestus (min)`) ja `Tegelik raskus (kg)`.
5. Vajuta `Salvesta`.

Tegeliku tulemuse väli ei tohi olla tühi ega negatiivne. Raskuse välja võib jätta tühjaks.

Muuta saab ainult treeninguid, mis lõpetati nupuga `Lõpeta treening`. Seeriaid lisada ega kustutada ei saa. Samuti ei saa muuta treeningu kuupäeva, harjutust ega planeeritud sihti.

Pärast salvestamist uuenevad automaatselt:

- ajaloo olekud ja rekordite kokkuvõte;
- selle päeva harjutuse järgmine siht, mis arvutatakse viimase lõpetatud treeningu põhjal uuesti.

> Hoiatus: kui oled pärast viimast treeningut harjutuse sihti käsitsi muutnud, asendab ajaloo parandus selle sihi uuesti arvutatud sihiga. Kontrolli siht pärast parandust lehel `Kavad` üle.

## Seaded

Lehel `Veel` → `Seaded` on:

- `Välimus`: `Süsteemi järgi`, `Hele` või `Tume`;
- `Vaikimisi puhkeaeg (sek)`: puhkeaeg, mille saavad edaspidi päevadesse lisatud harjutused (vaikimisi 60). Olemasolevaid harjutusi see ei muuda;
- `Arhiiv`: arhiveeritud treeningpäevad ja nupp `Taasta`;
- `Andmed`: varundus, import, eksport ja andmete kustutamine;
- `PWA`: versioon kujul `Versioon 0.1.2 (bdebace)`;
- `Abi`: lühike juhend rakenduses.

## Varundus ja taastamine

### JSON varundus

`Ekspordi varundus` laadib alla faili `treeninguabiline-varundus.json`. Selles on harjutused, päevad, sihid, kogu treeningajalugu, märkmed ja muudatuste ajalugu.

`Impordi varundus` asendab kõik selle seadme andmed valitud faili sisuga. Sobib uude telefoni kolimiseks või andmete taastamiseks.

### CSV eksport ja import

`Ekspordi CSV` laadib alla seitse faili:

- `harjutused.csv`
- `treeningpaevad.csv`
- `paevaharjutused.csv`
- `sessioonid.csv`
- `sessiooni-harjutused.csv`
- `seeriad.csv`
- `harjutuse-sundmused.csv`

`Impordi CSV` tunneb faile ära nime järgi. Valitud failide sisu asendab vastavad andmed. Valimata failide andmed jäävad alles.

Kui muudad CSV-faile käsitsi, ära muuda failinimesid ega veerunimesid ja hoia numbrid numbritena.

### Kõigi andmete kustutamine

`Kustuta kõik lokaalsed andmed` küsib kinnitust ja kustutab selle seadme kõik treeningandmed. Seda ei saa tagasi võtta, seega tee enne JSON-varundus.

### Soovitus

Tee JSON-varundus vähemalt kord nädalas, enne telefoni vahetust ja enne brauseri andmete puhastamist.

## Telefon ja arvuti

- Rakendus on tehtud eelkõige telefonile. Seeria nupud ja navigatsioon on alati ekraani allservas.
- Laial ekraanil (arvutis) on treeningu vaade kahes veerus: vasakul aktiivne harjutus, paremal edenemine ja `Tulemas`.
- Telefonis saad `Tulemas` rea vasakule tõmmata. Arvutis kasuta nuppu `Tee järgmisena`.

## Ilma internetita

- Pärast esimest avamist töötab rakendus ka ilma internetita. Andmed on niikuinii seadmes.
- Uus versioon laaditakse taustal, kui rakendus on internetiga avatud. Versiooni näed lehel `Seaded` → `PWA`.

## Teadaolevad piirangud

- Andmed on ainult ühes seadmes ja brauseris. Teise seadmesse saad need viia ainult JSON-varundusega.
- Ploki `Järgmine siht` näed ainult kohe pärast treeningu lõpetamist.
- `Võta tagasi` võtab tagasi ainult viimase seeria ja kaob, kui lahkud lehelt `Treening`.
- Puhkeaja lõpust ei anta heli ega vibratsiooniga märku.
- Raskuse `−`/`+` muudatus salvestub päeva sihiks kohe, ka siis, kui treening katkestatakse.
- Ringtreeningu valikut ja harjutuse puhkeaega päeva lehel muuta ei saa.

## Tõrkeotsing ja küsimused

### Vajutasin vale korduste arvu

Kui see oli viimane salvestatud seeria, vajuta `Võta tagasi`. Muul juhul vajuta jooksva harjutuse seeria real või paranda seeria pärast treeningut lehel `Ajalugu` nupuga `Muuda seeriaid`.

### Miks raskus ei tõusnud, kuigi kõik seeriad olid rohelised?

Vahemiku puhul on tõusuks vaja igas seerias ülemist piiri. Vaata ka `Õnnestumisi enne tõusu` väärtust ja seda, kas muutsid treeningu ajal raskust. Põhjust selgitab plokk `Järgmine siht` treeningu lõpus.

### Valisin vale päeva

Kui ühtegi seeriat pole veel salvestatud, vajuta `Katkesta treening`. Treening kustutatakse jäljetult.

### Telefonis ei paista uus versioon

1. Vaata versiooni lehelt `Seaded` → `PWA`.
2. Sulge rakendus täielikult ja ava see internetiühendusega uuesti.
3. Oota hetk ja ava uuesti.
4. Vajadusel eemalda rakendus avakuvalt ja paigalda uuesti. Enne seda tee JSON-varundus.

### Andmed on kadunud

Kõige sagedasem põhjus on brauseri andmete kustutamine. Taasta andmed lehel `Seaded` nupuga `Impordi varundus` või `Impordi CSV`.

### iPhone ei paku paigaldust

Kontrolli, et kasutad Safarit, aadress algab `https://` ja valid `Share` → `Add to Home Screen`.

---

## Arendajale

Tehnoloogia: Vite, React, TypeScript, Dexie (IndexedDB) ja vite-plugin-pwa. Vaja on Node.js 20+ ja npm.

```bash
npm install
npm run dev     # arendusserver, tavaliselt http://localhost:5173
npm run lint
npm test
npm run build   # tulemus kaustas dist/
```

Enne muudatuse pakkumist käivita `npm test`, `npm run lint` ja `npm run build`.

### Cloudflare Pages

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`

Kui automaatne deploy on sisse lülitatud, ehitatakse iga `main` harusse tehtud push uuesti.

Rakenduses on teadlikult kasutajakontod, pilveandmebaas ja serveripoolsed profiilid välja jäetud. Eesmärk on kiire kasutus jõusaalis ja täielik kontroll oma andmete üle.
