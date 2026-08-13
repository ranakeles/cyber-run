#!/bin/bash
# =====================================================================
#  SİBER KOŞU — oyunu başlat (Mac)
#
#  Neden bu dosya var?
#  Tarayıcılar, doğrudan dosyaya çift tıklayarak açılan sayfalarda
#  görsellerin piksellerini okumayı güvenlik gereği engeller. Oyun
#  görselleri işlerken bunu yaptığı için "index.html"e çift tıklayınca
#  bozuk görünüyor. Bu dosya küçük bir yerel sunucu (sunucu.py) başlatıp
#  oyunu onun üzerinden açar.
#
#  İki tuzak, iki önlem:
#  1) Portta BAŞKA bir klasörün sunucusu çalışıyor olabilir → sadece
#     "port dolu mu" bakmıyoruz, işaret dosyasıyla doğruluyoruz.
#  2) Tarayıcı ESKİ dosyaları önbellekten verebiliyor (oyun bomboş açılıp
#     hiçbir tuş çalışmıyor) → yalnızca "önbellekleme kapalı" başlığı
#     gönderen kendi sunucumuzu kabul ediyoruz; hazır http.server ile
#     açılmış eski bir sunucu bulunursa görmezden gelinip yenisi kurulur.
# =====================================================================

cd "$(dirname "$0")" || exit 1

BEKLENEN="SIBER-KOSU"
PORT=""

# --- Bu klasörü sunan ve önbelleklemeyi kapatan sunucumuz zaten var mı? ---
for p in $(seq 8123 8140); do
  YANIT="$(curl -s -m 1 -i "http://localhost:$p/siberkosu.marker" 2>/dev/null)"
  if printf '%s' "$YANIT" | grep -q "$BEKLENEN" && printf '%s' "$YANIT" | grep -qi "no-store"; then
    PORT=$p
    echo "Çalışan sunucu bulundu (port $PORT)."
    break
  fi
done

# --- Yoksa boş bir port bulup kendi sunucumuzu başlat ---
if [ -z "$PORT" ]; then
  for p in $(seq 8123 8140); do
    if ! curl -s -m 1 -o /dev/null "http://localhost:$p/" 2>/dev/null; then
      PORT=$p
      break
    fi
  done
  if [ -z "$PORT" ]; then
    echo "HATA: Boş port bulunamadı (8123-8140 dolu)."
    read -r -p "Kapatmak için Enter'a bas..." _
    exit 1
  fi

  echo "Sunucu başlatılıyor (port $PORT)..."
  python3 "$(pwd)/sunucu.py" "$PORT" >/dev/null 2>&1 &

  # Sabit süre beklemek yerine gerçekten ayağa kalkmasını bekle
  HAZIR=""
  for _ in $(seq 1 25); do
    if curl -s -m 1 "http://localhost:$PORT/siberkosu.marker" 2>/dev/null | grep -q "$BEKLENEN"; then
      HAZIR="evet"; break
    fi
    sleep 0.2
  done
  if [ -z "$HAZIR" ]; then
    echo ""
    echo "HATA: Sunucu başlatılamadı."
    echo "Bilgisayarda python3 kurulu mu diye bakalım; şunu çalıştır:"
    echo "    python3 --version"
    read -r -p "Kapatmak için Enter'a bas..." _
    exit 1
  fi
fi

# --- Tarayıcıda aç (zaman damgası: adres de tazelensin) ---
URL="http://localhost:$PORT/index.html?t=$(date +%s)"
echo "Oyun açılıyor: $URL"
open "$URL"

echo ""
echo "Oyun tarayıcıda açıldı. Bu pencereyi kapatabilirsin."
sleep 2
