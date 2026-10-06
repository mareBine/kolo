# Maretove ture

Statičen kolesarski dnevnik: Leaflet 1.9.4 + OpenStreetMap, brez frameworka, backenda ali npm odvisnosti.

## GitHub Pages

1. Razširi ZIP. Vsebino mape `kolo` (ne same mape) prenesi v koren svojega repozitorija: `index.html`, `app.js`, `style.css`, `data`, `scripts`, `README.md` in `.nojekyll`.
2. V Settings → Pages ohrani main → / (root).
3. Po objavi odpri svojo Pages stran. Slike in knjižnica Leaflet ter podlaga OSM se nalagajo prek interneta.

Za lokalni pregled lahko neposredno odpreš `index.html` v brskalniku. Podatki so že pripravljeni v `data/rides.js`, zato ni potreben lokalni strežnik. Alternativa: v mapi `kolo` zaženi `python -m http.server 8000`, nato odpri http://localhost:8000.

## Nove ture in druga leta

Dodaj izvirne GPX-je v `data/gpx` ali podmape (npr. `data/gpx/2025`). Nato v mapi `kolo` zaženi:

```sh
python scripts/build.py
```

Uporabi Python 3.9 ali novejši. V Windows je lahko ukaz `py scripts/build.py`. Če Windows nima časovnih pasov, namesti `py -m pip install tzdata`.

Skripta ponovno ustvari `data/rides.json`, `data/rides.js` in `data/ture.csv`. V repozitorij prenesi GPX-je in vse tri posodobljene datoteke. Imena GPX-jev naj bodo enolična, tudi med podmapami.

## Kaj pomeni statistika

Razdalja, vzpon, skupni čas in čas v gibanju se prednostno preberejo iz Locusove opisne tabele v GPX-ju. Razdalja ima zato natančnost iz izvoza (običajno 0,1 km). Kadar tabele ni, se razdalja izračuna med točkami znotraj posameznega segmenta, vzpon pa kot vsota pozitivnih razlik višin; ta vzpon ni filtriran in je lahko previsok zaradi GPS šuma. Vir je označen ob turi. Brez Locusovega časa v gibanju ta podatek ni ocenjen.

Datum je datum prve točke po časovnem pasu Europe/Ljubljana, ne datum izvoza. V tej zbirki so 72 kolesarskih sledi in ena sled označena kot hoja (Vrata). Privzeti filter vključi cycling in cycling_mountain. Če je oznaka Vrata napačna, jo lahko popraviš v GPX elementu locus:activity in ponovno zaženeš skripto.

Višinski profil uporablja točke GPX (vzorec za prikaz); njegova vodoravna os je izračunana razdalja GPS in se lahko nekoliko razlikuje od Locusove statistike. Segmenti ostanejo ločeni na karti. Kumulativni graf prikazuje vsoto do konca posameznega meseca. Filtri veljajo za karto, rekorde in vso statistiko; pri vseh letih mesečna tabela sešteje isti mesec vseh let, kumulativni graf pa leta loči. Nič v praznem mesecu pomeni odsotnost zapisov v uvoženi zbirki.

## Fotografije

Ustvari mapo `photos`. Pomanjšane slike postavi v podmape. Ustvari `data/photos.json`, ki povezuje ID ture (iz rides.json) z lokalnimi slikami:

```json
{
  "ID_TURE_IZ_RIDES_JSON": [
    {"src": "photos/2026/krma/01.jpg", "caption": "Pogled proti Triglavu"}
  ]
}
```

Po spremembi zaženi build skripto. Prva različica podpira galerijo ob turi; samodejno povezovanje prek EXIF in pravi heatmap še nista vključena. Prikaz vseh prekrivajočih se tras je pregled poti.

CSV je UTF-8 z BOM, ločen s podpičjem, z decimalno vejico za slovenski Excel. Časi v CSV so v sekundah.

Izvirni GPX ostanejo nespremenjeni in so na voljo za prenos. Ob javni objavi bodo vidne tudi izvirne koordinate in časi.
