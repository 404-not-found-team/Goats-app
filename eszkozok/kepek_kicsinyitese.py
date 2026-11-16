"""Az italformák és -minták kicsinyített példányai a ranglistához.

A ranglistán egy ital kb. 90 pixel magas, ezért ott az 512x512-es eredetik helyett 256x256-os
másolatokat használunk (img/formak-kicsi/, img/mintak-kicsi/): kevesebb letöltés, és a telefonnak
is sokkal kevesebb munka a rétegek kicsomagolása és egymásra rajzolása. A nagy nézet (#modal-kep)
továbbra is az eredetiket használja.

Használat (a projekt gyökeréből, Pillow kell hozzá: pip install pillow):
    python eszkozok/kepek_kicsinyitese.py

Ha egy képet átrajzolsz az img/formak/ vagy img/mintak/ mappában: futtasd újra, és emeld eggyel
a KEP_VERZIO értékét a js/pages/ranglista/ital-kep.js-ben, hogy a telefonok is letöltsék az újat.
"""
from pathlib import Path

from PIL import Image

MERET = 256
GYOKER = Path(__file__).resolve().parent.parent

for forras_nev, cel_nev in (('formak', 'formak-kicsi'), ('mintak', 'mintak-kicsi')):
    forras = GYOKER / 'img' / forras_nev
    cel = GYOKER / 'img' / cel_nev
    cel.mkdir(exist_ok=True)
    # a forrásból már törölt képek kicsi példánya se maradjon meg
    for regi in cel.glob('*.webp'):
        if not (forras / regi.name).exists():
            regi.unlink()
    for kep_ut in sorted(forras.glob('*.webp')):
        with Image.open(kep_ut) as kep:
            kep = kep.convert('RGBA').resize((MERET, MERET), Image.LANCZOS)
            kep.save(cel / kep_ut.name, 'WEBP', quality=80, method=4)
    print(f'{cel_nev}: {len(list(cel.glob("*.webp")))} kép')
