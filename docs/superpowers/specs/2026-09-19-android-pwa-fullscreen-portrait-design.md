# Androidi PWA portreeluku täisekraan

## Eesmärk

Lubada Androidi installitud PWA-l rakendada manifestis määratud portreeorientatsiooni.

## Lahendus

- Muuta PWA manifesti display väärtus standalone asemel fullscreen.
- Säilitada orientation: portrait.
- Säilitada olemasolev Screen Orientation API kutse kui toetatud keskkondade lisamehhanism.
- Täisekraanirežiim peidab rakenduse kasutamisel Androidi süsteemi ülariba.

## Kontroll

- Tootmisbuildi manifest sisaldab display: fullscreen ja orientation: portrait.
- Käitada lint, testid ja tootmisbuild enne deployd.

