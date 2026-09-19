# Treeningu katkestamise käitumise disain

## Eesmärk

Katkestamise tegevus peab alati lõpetama aktiivse treeningu ja tagastama kasutaja päevavaatesse, säilitades juba tehtud seeriatega treeningu ajaloos ning eemaldades testimiseks või ekslikult käivitatud tühja sessiooni.

## Käitumine

- Kasutaja kinnitab olemasolevas katkestamise dialoogis tegevuse.
- Kui aktiivsel sessioonil on vähemalt üks salvestatud `setResults` kirje, uuendatakse sessiooni olekuks `aborted`, lisatakse lõppaeg ja uuendamisaeg ning sessioon koos harjutuste ja seeriatega jääb ajalukku.
- Kui aktiivsel sessioonil ei ole ühtegi salvestatud seeriat, kustutatakse sessioon ning selle sessiooni harjutused. Selle tulemusel ei jää ajalukku tühja test- ega kogemata alustatud sessiooni.
- Mõlemal juhul ei ole sessioon pärast katkestamist enam `active`, seega Treeningu leht kuvab valitud päeva eelvaadet ja võimaldab uut treeningut alustada.

## Tehniline lahendus

- `cancelWorkout` loendab esmalt sessiooni seeriad.
- Salvestatud seeriate korral tehakse ainult `sessions` tabeli olekuuuendus; olemasolev Ajaloo leht toetab juba `aborted` oleku kuvamist.
- Tühja sessiooni korral säilib olemasolev kustutamise haru. Sellega seotud seeriad puuduvad, kuid eemaldatakse sessiooni harjutused ja sessioon ühes transaktsioonis.
- Andmebaasi skeemi ei muudeta, sest `WorkoutSessionStatus` sisaldab juba väärtust `aborted`.

## Testimine

- Täienda aktiivse treeningu katkestamise testi ühe salvestatud seeriaga ning kinnita, et sessioon jääb alles olekuga `aborted`, selle seeria andmed jäävad alles ja kasutajale kuvatakse päevavaade.
- Lisa eraldi test tühjale aktiivsele sessioonile: kinnitamise järel on sessioon ja sessiooni harjutused kustutatud ning päevavaade kuvatakse.
- Käivita täielik testikomplekt, lint ja tootmisbuild.
