#!/usr/bin/env python3
"""Locus GPX → static data + CSV. Python 3.9+, no external dependencies."""
import csv, json, math, re, html
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
NS = {'g': 'http://www.topografix.com/GPX/1/1', 'l': 'http://www.locusmap.eu'}
def number(s):
    m = re.search(r'[-−]?\d[\d\s]*(?:[,.]\d+)?', s)
    return float(m[0].replace(' ', '').replace('\u00a0', '').replace(',', '.').replace('−', '-')) if m else None
def seconds(s):
    v = [int(x) for x in s.split(':')]
    return sum(x * 60 ** i for i, x in enumerate(reversed(v)))
def distance(a, b):
    lat1, lat2 = map(math.radians, [a[0], b[0]])
    dl, dn = math.radians(b[0]-a[0]), math.radians(b[1]-a[1])
    return 6371000 * 2 * math.asin(min(1, math.sqrt(math.sin(dl/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dn/2)**2)))
rides = []
for path in sorted((ROOT/'data/gpx').rglob('*.gpx')):
    tree = ET.parse(path)
    for index, trk in enumerate(tree.findall('g:trk', NS)):
        raw_name = trk.findtext('g:name', path.stem, NS)
        name = re.sub(r'^\d{4}-\d{2}-\d{2}(?:[ _]\d{2}[:_-]\d{2})?\s*', '', raw_name)
        rows = {}
        for row in re.findall(r'<tr[^>]*>(.*?)</tr>', trk.findtext('g:desc', '', NS), re.S):
            cells = [html.unescape(re.sub('<[^>]+>', '', s)).strip() for s in re.findall(r'<td[^>]*>(.*?)</td>', row, re.S)]
            if len(cells)>1: rows[cells[0]] = cells[1:]
        segments, profile, times = [], [], []
        dist, ascent = 0, 0
        for seg in trk.findall('g:trkseg', NS):
            coords, prev, prev_ele = [], None, None
            points = seg.findall('g:trkpt', NS)
            stride = max(1, len(points)//250)
            for i, p in enumerate(points):
                pos = [float(p.attrib['lat']), float(p.attrib['lon'])]
                if prev is not None: dist += distance(prev, pos)
                ele = p.findtext('g:ele', None, NS)
                if ele is not None:
                    ele = float(ele)
                    if prev_ele is not None: ascent += max(0, ele-prev_ele)
                    if i%stride==0 or i==len(points)-1: profile.append([round(dist/1000, 3), round(ele, 1)])
                    prev_ele = ele
                stamp = p.findtext('g:time', None, NS)
                if stamp: times.append(datetime.fromisoformat(stamp.replace('Z', '+00:00')))
                coords.append([round(pos[0], 6), round(pos[1], 6)])
                prev = pos
            if coords: segments.append(coords)
        if not segments: raise ValueError(f'No points: {path}')
        date = min(times).astimezone(ZoneInfo('Europe/Ljubljana')).date().isoformat() if times else raw_name[:10]
        durations = rows.get('Čas sledi', [])
        km = number(rows['Razdalja'][0]) if 'Razdalja' in rows else dist/1000
        up = number(rows['Navzgor'][0]) if 'Navzgor' in rows else round(ascent)
        elapsed = seconds(durations[0]) if durations else (max(times)-min(times)).total_seconds() if times else None
        moving = seconds(durations[1]) if len(durations)>1 else None
        rides.append(dict(id=path.stem+f'-{index}', name=name, originalName=raw_name, date=date,
                          activity=trk.findtext('.//l:activity', 'unknown', NS), km=round(km, 3), ascent=up,
                          seconds=elapsed, movingSeconds=moving, segments=segments, profile=profile,
                          gpx=path.relative_to(ROOT).as_posix(),
                          source='Locus' if 'Razdalja' in rows and 'Navzgor' in rows else 'GPX izračun', photos=[]))
rides.sort(key=lambda r: (r['date'], r['id']), reverse=True)
photo_file = ROOT/'data/photos.json'
if photo_file.exists():
    photo_map = json.loads(photo_file.read_text())
    for r in rides: r['photos'] = photo_map.get(r['id'], [])
payload = json.dumps(rides, ensure_ascii=False, separators=(',', ':'))
(ROOT/'data/rides.json').write_text(payload, encoding='utf-8')
# A JS data file also permits opening index.html directly without fetch/file restrictions.
(ROOT/'data/rides.js').write_text('window.RIDES='+payload+';\n', encoding='utf-8')
with (ROOT/'data/ture.csv').open('w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f, delimiter=';')
    writer.writerow(['Datum', 'Tura', 'Dejavnost', 'km', 'Vzpon m', 'Skupni čas s', 'Čas v gibanju s', 'Vir'])
    for r in rides: writer.writerow([r['date'], r['name'], r['activity'], str(r['km']).replace('.', ','), r['ascent'], r['seconds'], r['movingSeconds'], r['source']])
print(f'{len(rides)} sledi; {sum(r["km"] for r in rides):.1f} km; {sum(r["ascent"] for r in rides):.0f} m vzpona')
