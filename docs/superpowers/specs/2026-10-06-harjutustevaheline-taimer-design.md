# Harjutustevaheline taimer

## Eesmärk

Lisada üldine harjutustevaheline puhkeaeg, mis on sõltumatu iga päevaharjutuse seeriatevahelisest puhkeajast. Kasutaja saab Seadetes otsustada, kas seda taimerit üldse käivitada ja näidata.

## Kasutajaliides

`Seaded → Treening` sisaldab omaette harjutustevahelise taimeri plokki:

- numbriväli `Harjutustevaheline puhkeaeg (sek)`;
- checkbox `Näita harjutustevahelist taimerit`;
- vaikimisi on kestus 60 sekundit ja checkbox sisse lülitatud.

Seeriatevaheline puhkeaeg jääb iga päevaharjutuse seadistusse. Seda ei asendata ega seota uue üldise seadistusega.

## Andmed

Uued väärtused talletatakse `localStorage`-is eraldi üldseadetena, samal viisil nagu praegune vaikimisi seeriatevaheline puhkeaeg. See ei muuda IndexedDB skeemi ega varunduse vormingut.

- kestus on mittenegatiivne täisarv sekundites;
- vigane või puuduv kestus kasutab vaikimisi 60 sekundit;
- vigane või puuduv nähtavuse väärtus kasutab vaikimisi `true`.

## Taimeri käitumine

1. Seeria salvestamine käivitab senise seeriatevahelise taimeri, kui päevaharjutuse `restSeconds` on suurem kui null.
2. Kui salvestatud seeria lõpetab harjutuse ja järgmine lõpetamata harjutus on olemas, käivitub üldine harjutustevaheline taimer ainult siis, kui nähtavuse seade on sees ja üldine kestus on suurem kui null.
3. Harjutustevaheline paneel on tähistatud tekstiga `Harjutuste vahel`; kasutaja saab selle vahele jätta või sulgeda samade toimingutega nagu praeguse puhkeaja paneeli.
4. Kui nähtavuse seade on väljas, ei looda ega taastata harjutustevahelist taimerit.
5. Ainult üks puhkeaja taimer saab korraga aktiivne olla. Harjutustevaheline taimer asendab viimase seeria järel seeriatevahelise taimeri.

## Testid

- Seadete testid katavad uue kestuse ja checkboxi salvestamist ning vigase sisendi taastamist.
- Treeningu testid katavad taimeri käivitumist ainult pärast harjutuse viimast seeriat, üldise kestuse kasutamist ja väljalülitatud checkboxi korral käivitamata jätmist.
- Olemasolev seeriatevahelise taimeri test jääb regressioonikatteks.
