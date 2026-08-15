#!/usr/bin/env python3
"""SİBER KOŞU — tek dosyalık dağıtım paketi üretir.

Görselleri, CSS'i ve JS'i tek bir HTML'in içine gömer. Sonuç dosya
herhangi bir bilgisayarda çift tıklanarak açılır: sunucu gerekmez.
(Görseller data: URI olarak gömüldüğü için tarayıcının 'file://'
piksel okuma kısıtı da devreye girmez.)
"""
import base64, os, re, subprocess, sys

# Oyun klasörü komut satırından verilebilir; verilmezse bilinen yerlerde aranır
# (klasör taşınırsa script bozulmasın diye).
OLASI = [
    "/Users/ranakeles/Desktop/cyber-flight",
    "/Users/ranakeles/Desktop/siber-kosu",
    "/Users/ranakeles/Desktop/bag-globe/cyber-flight",
]
if len(sys.argv) > 1:
    SRC = sys.argv[1]
else:
    SRC = next((p for p in OLASI if os.path.isfile(os.path.join(p, "script.js"))), OLASI[-1])
OPT = "/tmp/sk_opt"
OUT = "/Users/ranakeles/Desktop/SIBER KOSU (tek dosya).html"
print("Kaynak klasör:", SRC)

# Kodda geçen asset yolu -> optimize edilmiş dosya
MAP = {
    "assets/bg_far.png":        ("bg_far.jpg",        "image/jpeg"),
    "assets/ground_tile.png":   ("ground_tile.jpg",   "image/jpeg"),
    "assets/home_page2.png":    ("home_page2.jpg",    "image/jpeg"),
    "assets/missed_question.png":("missed_question.png","image/png"),  # kaçırılan soru kartı
    "assets/answers.png":      ("answers.png",      "image/png"),   # doğru/yanlış kartları
    "assets/mail_body.png":    ("mail_body.png",    "image/png"),   # e-posta kartı (eksiz)
    "assets/mail_file.png":    ("mail_file.png",    "image/png"),   # e-posta kartı (dosya ekli)
    "assets/enter_name.png":   ("enter_name.png",    "image/png"),   # isim ekranı (klavye dahil)
    "assets/end_page5.png":     ("end_page5.jpg",     "image/jpeg"),   # bitiş ekranı tasarımı
    "assets/wall_strip.png":    ("wall_strip.png",    "image/png"),
    "assets/wall_strip2.png":   ("wall_strip2.png",   "image/png"),
    "assets/wall_front.png":    ("wall_front.png",    "image/png"),
    "assets/child.png":         ("child.png",         "image/png"),
    "assets/child2.png":        ("child2.png",        "image/png"),
    "assets/child3.png":        ("child3.png",        "image/png"),
    "assets/child4.png":        ("child4.png",        "image/png"),
    "assets/prop_tree.png":     ("prop_tree.png",     "image/png"),
    "assets/prop_lamp.png":     ("prop_lamp.png",     "image/png"),
    "assets/prop_bollard.png":  ("prop_bollard.png",  "image/png"),
    "assets/token_question.png":("token_question.png","image/png"),
    "assets/life.png":          ("life.png",          "image/png"),   # dolu kalp şeridi
    "assets/life2.png":         ("life2.png",         "image/png"),   # boş kalp şeridi
    "assets/skor_tablosu.png":  ("skor_tablosu.png",  "image/png"),   # puan sayacı çerçevesi
    "assets/score_numbers.png": ("score_numbers.png", "image/png"),   # 0-9 rakam şeridi
    "assets/ucak_thy.png":      ("ucak_thy.png",      "image/png"),
    "assets/ucak_ajet.png":     ("ucak_ajet.png",     "image/png"),
    "assets/ucak_sunexpress.png":("ucak_sunexpress.png","image/png"),
    "assets/ucak_turkishcargo.png":("ucak_turkishcargo.png","image/png"),
    "assets/barrier.png":       ("barrier.png",       "image/png"),
    "assets/su_birikintisi.png":("su_birikintisi.png","image/png"),
    "assets/simit_arabasi.png": ("simit_arabasi.png", "image/png"),
}

def data_uri(yol, fname, mime):
    """Küçültülmüş kopyayı okur; yoksa kaynaktan üretir.

    Böylece assets/ içine yeni bir görsel eklenince (örn. yeni havayolu
    uçağı) MAP'e bir satır yazmak yeterli olur — elle küçültme derdi yok.
    Ham görseller 1.5-2.5 MB; hepsini gömersek paket 60 MB'ı geçer."""
    hedef = os.path.join(OPT, fname)
    if not os.path.isfile(hedef):
        os.makedirs(OPT, exist_ok=True)
        kaynak = os.path.join(SRC, yol)
        fmt = "jpeg" if mime == "image/jpeg" else "png"
        print("  küçültülüyor:", yol)
        subprocess.run(["sips", "-s", "format", fmt, "--resampleWidth", "900",
                        kaynak, "--out", hedef], check=True, capture_output=True)
    with open(hedef, "rb") as f:
        return "data:%s;base64,%s" % (mime, base64.b64encode(f.read()).decode())

html = open(os.path.join(SRC, "index.html"), encoding="utf-8").read()
css  = open(os.path.join(SRC, "style.css"),  encoding="utf-8").read()
js   = open(os.path.join(SRC, "script.js"),  encoding="utf-8").read()

# --- JS'i tek dosya moduna uyarla ---
# 0) Koşu kareleri kodda dinamik üretiliyor ('assets/'+k+'.png'); gömme
#    yapabilmek için önce düz yazıya çeviriyoruz.
js = js.replace(
    "['child2','child3','child4'].forEach(k => loadImageWhiteKeyed(k, 'assets/'+k+'.png'));",
    "loadImageWhiteKeyed('child2','assets/child2.png');\n"
    "loadImageWhiteKeyed('child3','assets/child3.png');\n"
    "loadImageWhiteKeyed('child4','assets/child4.png');")
# 1) Sürüm damgası gereksiz (data: URI'ye ?v= eklenemez)
js = js.replace("const ASSET_V = '?v=' + Date.now();", "const ASSET_V = '';")
# 2) CSS artık gömülü; link tazeleme bloğunu çıkar
js = re.sub(r"// Stil dosyası da önbellekte.*?\n\}\)\(\);\n", "", js, flags=re.S)
# 3) file:// uyarısı bu pakette geçersiz (zaten öyle çalışacak)
js = re.sub(r"if\(location\.protocol === 'file:'\)\{.*?\n\}\n", "", js, flags=re.S)
# 4) Asset yollarını gömülü verilerle değiştir
eksik = []
for yol, (fname, mime) in MAP.items():
    if yol not in js:
        eksik.append(yol); continue
    js = js.replace("'%s'" % yol, "'%s'" % data_uri(yol, fname, mime))
if eksik:
    print("UYARI: kodda bulunamayan yollar:", eksik)

# Kullanılmayan/eksik assetleri isteyen satırlar hata vermesin diye kalanları temizle
kalan = re.findall(r"'assets/[^']+'", js)
for k in set(kalan):
    js = js.replace(k, "''")
if kalan:
    print("Bilgi: pakete alınmayan assetler boş bırakıldı:", sorted(set(kalan)))

# --- HTML'e göm ---
# DİKKAT: re.sub, yerine koyulan metindeki ters bölü dizilerini işler.
# JS metinlerinde geçen "\n" gerçek satır başına dönüşüp kodu bozuyordu.
# Bu yüzden yerine koyma bir lambda ile yapılır (ham metin korunur).
html = re.sub(r'\s*<link rel="stylesheet" href="style\.css">',
              lambda m: "\n  <style>\n%s\n  </style>" % css, html)
html = re.sub(r'<script src="script\.js"></script>',
              lambda m: "<script>\n%s\n</script>" % js, html)

with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)

mb = os.path.getsize(OUT) / (1024*1024)
print("Oluşturuldu: %s" % OUT)
print("Boyut: %.1f MB" % mb)
