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
OUT = sys.argv[2] if len(sys.argv) > 2 else "/Users/ranakeles/Desktop/SIBER KOSU (tek dosya).html"
print("Kaynak klasör:", SRC)

# ---- Çözünürlük ----
# Eskiden HER görsel 900 px genişliğe indiriliyordu. 1080x1920 kioskta bu
# bazı görselleri okunmaz hâle getirdi: nasıl oynanır görselinde iki kart
# yan yana olduğu için her kart 376 px kalıyor, ekranda ise 864 px'e (2.3
# kat) büyütülüyordu. Kural artık görselin EKRANDA ne kadar büyük
# çizildiğine göre:
#   TAM  = kaynağın kendi çözünürlüğü, hiç küçültme. Kioskta ekran
#          genişliğine yakın çizilenler: kartlar, tam ekran sayfalar,
#          arka plan ve duvar dokuları.
#   900  = kioskta en fazla birkaç yüz piksel çizilenler: karakter kareleri,
#          engeller, ağaç/lamba, HUD parçaları. Bunlarda 900 bol bol yeter,
#          tam çözünürlük sadece paketi şişirir.
TAM = None
SES = "ses"      # görsel değil: dönüştürülmeden gömülür
HAM = SES        # SVG gibi sips'in dokunmaması gereken dosyalar da aynı yoldan
# Kodda geçen asset yolu -> (paketteki ad, tür, azami genişlik)
MAP = {
    "assets/bg_far.png": ("bg_far.jpg", "image/jpeg", TAM),
    "assets/ground_tile.png": ("ground_tile.jpg", "image/jpeg", TAM),
    "assets/home_page3.png": ("home_page3.jpg", "image/jpeg", TAM),   # iki karakter birlikte
    "assets/missed_question.png": ("missed_question.png", "image/png", TAM),   # kaçırılan soru kartı
    "assets/answers.png": ("answers.png", "image/png", TAM),   # doğru/yanlış kartları
    "assets/mail_body.png": ("mail_body.png", "image/png", TAM),   # e-posta kartı (eksiz)
    "assets/mail_file.png": ("mail_file.png", "image/png", TAM),   # e-posta kartı (dosya ekli)
    "assets/enter_name.png": ("enter_name.png", "image/png", TAM),   # isim ekranı (klavye dahil)
    "assets/pause_card.png": ("pause_card.png", "image/png", TAM),   # duraklama kartı (şeffaf)
    "assets/pause_button.png": ("pause_button.png", "image/png", 900),   # HUD duraklatma butonu
    "assets/pause_card_girl.png": ("pause_card_girl.png", "image/png", TAM),   # duraklama kartı (kız)
    "assets/end_page7.png": ("end_page7.jpg", "image/jpeg", TAM),   # bitiş ekranı (oğlan)
    "assets/end_page_girl.png": ("end_page_girl.jpg", "image/jpeg", TAM),   # bitiş ekranı (kız)
    "assets/logo_8524edad42.svg": ("logo.svg", "image/svg+xml", HAM),   # ana ekran logosu (vektör, olduğu gibi)
    "assets/character_page2.png": ("character_page2.jpg", "image/jpeg", TAM),   # karakter seçim ekranı (9:16)
    "assets/how_to_play_boy.png": ("how_to_play_boy.png", "image/png", TAM),   # nasıl oynanır (oğlan)
    "assets/how_to_play_girl.png": ("how_to_play_girl.png", "image/png", TAM),   # nasıl oynanır (kız)
    "assets/wall_strip.png": ("wall_strip.png", "image/png", TAM),
    "assets/wall_strip2.png": ("wall_strip2.png", "image/png", TAM),
    "assets/wall_front.png": ("wall_front.png", "image/png", TAM),
    "assets/child.png": ("child.png", "image/png", 900),
    "assets/child2.png": ("child2.png", "image/png", 900),
    "assets/child3.png": ("child3.png", "image/png", 900),
    "assets/child4.png": ("child4.png", "image/png", 900),
    "assets/girl.png": ("girl.png", "image/png", 900),   # kız koşu kareleri
    "assets/girl2.png": ("girl2.png", "image/png", 900),
    "assets/girl3.png": ("girl3.png", "image/png", 900),
    "assets/girl4.png": ("girl4.png", "image/png", 900),
    "assets/prop_tree.png": ("prop_tree.png", "image/png", 900),
    "assets/prop_lamp.png": ("prop_lamp.png", "image/png", 900),
    "assets/prop_bollard.png": ("prop_bollard.png", "image/png", 900),
    "assets/token_question2.png": ("token_question2.png", "image/png", 900),   # soru simgesi: tablet
    "assets/life.png": ("life.png", "image/png", 900),   # dolu kalp şeridi
    "assets/life2.png": ("life2.png", "image/png", 900),   # boş kalp şeridi
    "assets/skor_tablosu.png": ("skor_tablosu.png", "image/png", 900),   # puan sayacı çerçevesi
    "assets/score_numbers.png": ("score_numbers.png", "image/png", TAM),   # 0-9 rakam şeridi (3-2-1 sayımında ekran boyunun %20si)
    "assets/ucak_thy.png": ("ucak_thy.png", "image/png", 900),
    "assets/ucak_ajet.png": ("ucak_ajet.png", "image/png", 900),
    "assets/ucak_sunexpress.png": ("ucak_sunexpress.png", "image/png", 900),
    "assets/ucak_turkishcargo.png": ("ucak_turkishcargo.png", "image/png", 900),
    "assets/barrier.png": ("barrier.png", "image/png", 900),
    "assets/su_birikintisi.png": ("su_birikintisi.png", "image/png", 900),
    "assets/simit_arabasi.png": ("simit_arabasi.png", "image/png", 900),
    # Ses efektleri: olduğu gibi gömülür (sips görsel aracı, seslere dokunmaz)
    "assets/sounds/tik.wav": ("tik.wav", "audio/wav", SES),
    "assets/sounds/geri_sayim.wav": ("geri_sayim.wav", "audio/wav", SES),
    "assets/sounds/basla.wav": ("basla.wav", "audio/wav", SES),
    "assets/sounds/zipla.wav": ("zipla.wav", "audio/wav", SES),
    "assets/sounds/serit.wav": ("serit.wav", "audio/wav", SES),
    "assets/sounds/mesaj.wav": ("mesaj.wav", "audio/wav", SES),
    "assets/sounds/dogru.wav": ("dogru.wav", "audio/wav", SES),
    "assets/sounds/yanlis.wav": ("yanlis.wav", "audio/wav", SES),
    "assets/sounds/kacti.wav": ("kacti.wav", "audio/wav", SES),
    "assets/sounds/carpma.wav": ("carpma.wav", "audio/wav", SES),
    "assets/sounds/seri.wav": ("seri.wav", "audio/wav", SES),
    "assets/sounds/bitis.wav": ("bitis.wav", "audio/wav", SES),
    "assets/sounds/muzik.ogg": ("muzik.ogg", "audio/ogg", SES),   # arka plan müziği
}

def data_uri(yol, fname, mime, azami):
    """Pakete girecek kopyayı okur; yoksa kaynaktan üretir.

    Böylece assets/ içine yeni bir görsel eklenince MAP'e bir satır yazmak
    yeterli olur. Önbellekteki dosyanın adında genişlik de var (ör.
    child@900.png, answers@tam.png): kural değişince eski çözünürlükteki
    kopya yanlışlıkla yeniden kullanılmasın."""
    if azami == SES:
        with open(os.path.join(SRC, yol), "rb") as f:
            return "data:%s;base64,%s" % (mime, base64.b64encode(f.read()).decode())
    kok, uzanti = os.path.splitext(fname)
    hedef = os.path.join(OPT, "%s@%s%s" % (kok, "tam" if azami is None else azami, uzanti))
    if not os.path.isfile(hedef):
        os.makedirs(OPT, exist_ok=True)
        kaynak = os.path.join(SRC, yol)
        fmt = "jpeg" if mime == "image/jpeg" else "png"
        komut = ["sips", "-s", "format", fmt]
        if fmt == "jpeg":
            komut += ["-s", "formatOptions", "92"]      # yazılı ekranlarda JPEG bozulması olmasın
        gen = int(subprocess.run(["sips", "-g", "pixelWidth", kaynak], capture_output=True,
                                 text=True).stdout.split()[-1])
        if azami is not None and gen > azami:
            komut += ["--resampleWidth", str(azami)]
            print("  küçültülüyor: %s (%d -> %d px)" % (yol, gen, azami))
        else:
            print("  tam çözünürlük: %s (%d px)" % (yol, gen))
        subprocess.run(komut + [kaynak, "--out", hedef], check=True, capture_output=True)
    with open(hedef, "rb") as f:
        return "data:%s;base64,%s" % (mime, base64.b64encode(f.read()).decode())

html = open(os.path.join(SRC, "index.html"), encoding="utf-8").read()
css  = open(os.path.join(SRC, "style.css"),  encoding="utf-8").read()

# --- CSS içindeki yazı tiplerini göm ---
# Görseller koddaki metinlerden bulunup gömülüyor ama fontlar CSS'te
# url(...) ile duruyor; gömülmezlerse tek dosya sürümünde yazılar yedek
# yazı tipiyle çıkar. Kioskta internet olmayacağı için bu şart.
def font_göm(m):
    with open(os.path.join(SRC, m.group(1)), "rb") as f:
        return "url(data:font/woff2;base64,%s)" % base64.b64encode(f.read()).decode()
css, kac = re.subn(r"url\((assets/fonts/[^)]+\.woff2)\)", font_göm, css)
print("Gömülen yazı tipi dosyası:", kac)
js   = open(os.path.join(SRC, "script.js"),  encoding="utf-8").read()

# --- JS'i tek dosya moduna uyarla ---
# 0) Koşu kareleri kodda dinamik üretiliyor ('assets/'+k+'.png'); gömme
#    yapabilmek için önce düz yazıya çeviriyoruz.
js = js.replace(
    "['child2','child3','child4'].forEach(k => loadImageWhiteKeyed(k, 'assets/'+k+'.png'));",
    "loadImageWhiteKeyed('child2','assets/child2.png');\n"
    "loadImageWhiteKeyed('child3','assets/child3.png');\n"
    "loadImageWhiteKeyed('child4','assets/child4.png');")
#    Binalar da aynı şekilde birleştirilen bir yol kullanıyor. Bunlar pakete
#    ALINMIYOR (duvar şeritleri varken hiç çizilmiyorlar, yalnızca onlar
#    yüklenemezse devreye giren yedek). Düz yazıya çevirince aşağıdaki
#    "kalanları boşalt" adımı onları da yakalıyor ve paket açılırken üç
#    tane 404 istemekten kurtuluyor.
js = js.replace(
    "BUILD_KEYS.forEach(k => loadImageKeyed(k, 'assets/'+k+'.png'));",
    "loadImageKeyed('building_a','assets/building_a.png');\n"
    "loadImageKeyed('building_b','assets/building_b.png');\n"
    "loadImageKeyed('building_c','assets/building_c.png');")
#    Kızın koşu kareleri de aynı şekilde birleştirilen bir yol kullanıyor.
js = js.replace(
    "RUN_KEYS_KIZ.forEach(k => loadImage(k, 'assets/'+k+'.png'));",
    "loadImage('girl','assets/girl.png');\n"
    "loadImage('girl2','assets/girl2.png');\n"
    "loadImage('girl3','assets/girl3.png');\n"
    "loadImage('girl4','assets/girl4.png');")
# 1) Sürüm damgası gereksiz (data: URI'ye ?v= eklenemez)
js = js.replace("const ASSET_V = '?v=' + Date.now();", "const ASSET_V = '';")
# 2) CSS artık gömülü; link tazeleme bloğunu çıkar
js = re.sub(r"// Stil dosyası da önbellekte.*?\n\}\)\(\);\n", "", js, flags=re.S)
# 3) file:// uyarısı bu pakette geçersiz (zaten öyle çalışacak)
js = re.sub(r"if\(location\.protocol === 'file:'\)\{.*?\n\}\n", "", js, flags=re.S)
# 4) Asset yollarını gömülü verilerle değiştir
eksik = []
for yol, (fname, mime, azami) in MAP.items():
    if yol not in js:
        eksik.append(yol); continue
    js = js.replace("'%s'" % yol, "'%s'" % data_uri(yol, fname, mime, azami))
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

# --- Finder simgesi ---
# Paket 60 MB'ın üzerinde bir HTML. macOS bu kadar büyük bir dosyaya
# önizleme üretmeye çalışırken zaman aşımına uğruyor ve masaüstünde
# ESKİ, önbellekte kalmış önizleme görünmeye devam ediyor. Çözüm:
# dosyaya kendi simgemizi vermek. Simge açılış ekranından üretiliyor,
# yani görsel değişirse simge de kendiliğinden güncelleniyor.
# (Simge dosyanın resource fork'unda durur; FAT/exFAT bir USB'ye
# kopyalanırsa kaybolur. Kiosk Windows olduğu için orada zaten önemsiz.)
def simge_ver(dosya):
    kaynak = os.path.join(SRC, "assets/home_page3.png")
    if not os.path.isfile(kaynak):
        return "açılış ekranı bulunamadı"
    os.makedirs(OPT, exist_ok=True)
    ikon = os.path.join(OPT, "ikon.png")
    # Dikey görsel kareye sığdırılıp boşluklar açılış ekranının lacivertiyle dolduruluyor
    subprocess.run(["sips", "-Z", "1024", "--padToHeightWidth", "1024", "1024",
                    "--padColor", "0A2E6E", kaynak, "--out", ikon],
                   check=True, capture_output=True)
    betik = ('ObjC.import("AppKit");'
             'var i=$.NSImage.alloc.initWithContentsOfFile(%r);'
             '$.NSWorkspace.sharedWorkspace.setIconForFileOptions(i,%r,0)?"tamam":"olmadı"'
             % (ikon, dosya))
    s = subprocess.run(["osascript", "-l", "JavaScript", "-e", betik],
                       capture_output=True, text=True)
    return s.stdout.strip() or s.stderr.strip()

print("Masaüstü simgesi:", simge_ver(OUT))
