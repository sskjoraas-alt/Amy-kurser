# amy-kurser

Offentlige aksjekurser for appen Amy. En GitHub-jobb henter kurser hvert 30. minutt i børstida
og legger dem i `prices.json` på grenen `data`:

https://raw.githubusercontent.com/sskjoraas-alt/amy-kurser/data/prices.json

Filen har bare offentlige kurser, valutakurser og indekser. Aldri beholdning, antall eller beløp.

Mangler en aksje? Legg Yahoo-symbolet til i `extra.txt` (for eksempel `NOVO-B.CO`).

## Grovsil

En egen jobb siler flere tusen aksjer på Oslo, Stockholm, København, Helsingfors, Xetra og USA hver børsdag
etter at USA har stengt. De 40 med høyest poengsum for kortsiktig fart legges i `screen.json` på grenen `screen`:

https://raw.githubusercontent.com/sskjoraas-alt/amy-kurser/screen/screen.json

Filen har bare offentlige tall: avkastning, volum, omsetning og poengsum. Aldri beholdning, antall eller beløp.
