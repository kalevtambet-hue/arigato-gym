# Abi ja lokaalsete andmete kustutamine

## Eesmärk

Selgitada rakenduse kasutamist pärast progressiooni- ja varundusmuudatusi ning anda kasutajale võimalus oma seadme lokaalsed treeningandmed teadlikult kustutada.

## Andmete piir

Treeninguabiline ei saada treeningandmeid serverisse. Harjutused, kavad ja treeningajalugu asuvad brauseri IndexedDB andmebaasis. Avaldatud veebirakenduse build ei sisalda kasutaja treeningandmeid; sama seadme brauser näitab varem salvestatud kohalikke andmeid.

## Kasutajaliides

Seadete lehel täiendatakse Abi sektsiooni nelja teemaga:

- kasutamine ja raskuse muutmine treeningu ajal;
- automaatse progressiooni seadistused päevakava-harjutuse tasandil;
- JSON- ja CSV-varunduse mõju ning õnnestumise kinnitus;
- versiooni ja buildi numbri tähendus.

Andmete sektsiooni lisatakse nupp „Kustuta kõik lokaalsed andmed”. Nupu vajutamine küsib brauseri kinnitust. Kinnitamisel tühjendatakse kõik IndexedDB tabelid ja kasutaja suunatakse avalehele; järgmine avamine loob vaid rakenduse üldised algpäevad. Tühistamisel ei muudeta midagi.

## Turvalisus ja tõrked

Kustutamine on ainult lokaalne ja pöördumatu, kui kasutajal pole eelnevat varukoopiat. Kinnituse tekst ütleb selle selgelt ning soovitab enne kustutamist eksportida JSON-varunduse. Kustutamisnupp ei tee võrguühendust ega muuda avaldatud buildi.

## Testimine

Seadete komponendi testid kontrollivad Abi uusi kirjeldusi, kinnituse tühistamist ning kinnitatud kustutamist: kõik andmetabelid on tühjad ja kasutaja näeb kustutamise kinnitust.
