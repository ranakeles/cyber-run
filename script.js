/* =========================================================
   SİBER UÇUŞ — script.js
   Uçak uçar → "?" kontrol noktasına gelir → e-posta sorusu açılır
   → GÜVENLİ/ŞÜPHELİ → doğru/yanlış + açıklama + puan → sonraki geçit
   Bölümler:
   1) Ayarlar + soru havuzu (Cyber Shield'dan)
   2) Skor tablosu
   3) Durum
   4) Perspektif uçuş çizimi
   5) Oyun akışı (uçuş → soru → geri bildirim)
   6) Karar + geri bildirim
   7) Bitiş + butonlar
   ========================================================= */

/* ---------- 1) AYARLAR + SORU HAVUZU ---------- */
/* Oyun SORU SAYISIYLA değil CANLA biter: oyuncu 3 canla başlar, doğru cevap
   can kazandırır, yanlış ve kaçırılan soru can götürür. Sorular bitmez —
   havuz tükenince yeniden karılır (bkz. sonrakiSoru).                     */
/* CAN GERİ GELMEZ. 3 canla başlanır, kazanma yolu yoktur — oyun ilerledikçe
   sadece azalır. (Bir ara "3 doğru üst üste = +1 can" vardı; oyunun bitmesini
   imkânsızlaştırdığı için kaldırıldı.) */
const START_LIVES = 3, MAX_LIVES = 3;
/* Can yanlış cevapta VE soruyu kaçırınca gider. Engele çarpmak sadece puan
   götürür — koşu becerisi yüzünden ölmek oyunun mesajını gölgeler. */
const PTS_CORRECT = 100, PTS_WRONG = -40, PTS_MISS = -20, STREAK_BONUS = 20;

// E-posta havuzu (Cyber Shield içeriği). safe:true => güvenli. why => açıklama.
const POOL = [
  {from:"Uçuş Operasyon", addr:"noreply@thy.com", subj:"Uçuş Planı Güncellemesi",
   text:"Değerli ekip,\nBugünkü TK1834 seferine ait uçuş planı güncellenmiştir. Detayları operasyon panelinden kontrol edebilirsiniz.\nİyi çalışmalar.", safe:true, c:"#0ea5e9",
   why:"Kurumsal alan adı (thy.com), aciliyet baskısı ve şüpheli bağlantı yok."},
  {from:"IT Security", addr:"it-security@thy.com", subj:"Şifre Güncelleme Hatırlatması",
   text:"Sistem güvenliğiniz için şifrenizi 30 gün içinde güncellemeniz gerekmektedir.\nİşlem için kurum içi IT portalını ziyaret ediniz.", safe:true, c:"#22c55e",
   why:"Resmi IT adresi; sizi dış bağlantıya değil kurum içi portala yönlendiriyor."},
  {from:"İnsan Kaynakları", addr:"ik@thy.com", subj:"Yıllık İzin Talebiniz Onaylandı",
   text:"Merhaba,\n12–16 Mayıs tarihleri için yıllık izin talebiniz yöneticiniz tarafından onaylanmıştır.\nİyi tatiller dileriz.", safe:true, c:"#6366f1",
   why:"Beklenen, kişiye özel ve kurumsal kaynaklı bir bildirim. Risk yok."},
  {from:"Catering", addr:"catering@thy.com", subj:"Yemek Listesi – 24 Mayıs",
   text:"Merhaba,\n24 Mayıs TK2420 seferi için yemek listesi ekte yer almaktadır.\nBilgilerinize.", attach:"yemek_listesi_24mayis.pdf", safe:true, c:"#f59e0b",
   why:"Tanıdık kurumsal gönderici ve beklenen, sıradan bir PDF eki. Güvenli."},
  {from:"Kurumsal Bülten", addr:"bilgi@thy.com", subj:"Aylık Operasyon Bülteni",
   text:"Bu ayın operasyon başarıları, yeni ekip üyeleri ve duyuruları bültenimizde.\nKeyifli okumalar.", safe:true, c:"#0891b2",
   why:"Bilgilendirme amaçlı kurumsal bülten; herhangi bir işlem ya da bağlantı talep etmiyor."},
  {from:"Hesap Destek", addr:"account.support@secure-info.com", subj:"Hesabınız Askıya Alındı!",
   text:"Hesabınız güvenlik nedeniyle askıya alınmıştır.\nYeniden aktif etmek için aşağıdaki bağlantıya HEMEN tıklayın.", link:"http://secure-update.com/login", safe:false, c:"#ef4444",
   why:"Sahte alan adı + aciliyet baskısı + dış giriş bağlantısı. Klasik oltalama (phishing)."},
  {from:"CEO Ofisi", addr:"ceo.office@thy-corp.net", subj:"ÖNEMLİ: Gizli Toplantı",
   text:"Yarın yapılacak yönetim kurulu toplantısı çok gizlidir.\nKatılım linki aşağıdadır. Kimseyle paylaşmayın, hemen tıklayın!", link:"http://tiny.cc/meeting-link", safe:false, c:"#dc2626",
   why:"Sahte 'CEO' adresi (thy-corp.net), gizlilik + aciliyet ve kısaltılmış link: yönetici dolandırıcılığı."},
  {from:"THY Miles", addr:"rewards@thy-miles.net", subj:"1000 Mil Kazandınız! Hemen Talep Edin",
   text:"Tebrikler! 1000 bonus mil kazandınız.\nÖdülünüzü kaybetmeden talep etmek için tıklayın.", link:"http://bit.ly/mil-odul", safe:false, c:"#ef4444",
   why:"Gerçeğe benzer ama sahte alan adı (thy-miles.net), ödül tuzağı ve kısaltılmış bağlantı."},
  {from:"Bordro Servisi", addr:"payroll@thy-hr.com", subj:"Maaş Bordronuz Hazır",
   text:"Mayıs ayı maaş bordronuz hazırdır.\nGörüntülemek için ekteki dosyayı açınız.", attach:"bordro_mayis.exe", safe:false, c:"#dc2626",
   why:"Benzer alan adı (thy-hr.com) ve .exe çalıştırılabilir ek: zararlı yazılım riski."},
  {from:"Microsoft Güvenlik", addr:"support@micr0soft-security.com", subj:"Güvenlik Uyarısı: Hesabınız Tehlikede",
   text:"Hesabınızda olağan dışı giriş tespit edildi.\nDoğrulamak için şimdi giriş yapın, aksi halde hesap kapatılacaktır.", link:"http://micr0soft-verify.com", safe:false, c:"#ef4444",
   why:"Alan adında 'o' yerine '0' var (micr0soft), korku + aciliyet. Tipik kimlik avı."}
];

/* ---------- 2) SKOR TABLOSU ---------- */
const SEED_LB = [
  {nm:"Can Uysal", sc:950}, {nm:"Ayşe Yılmaz", sc:870},
  {nm:"Mehmet Kaya", sc:760}, {nm:"Elif Demir", sc:650}, {nm:"Burak Şahin", sc:540}
];
function loadLb(){ try{ const r=localStorage.getItem('cf_lb'); if(r) return JSON.parse(r); }catch(e){} return SEED_LB.slice(); }
function saveLb(lb){ try{ localStorage.setItem('cf_lb', JSON.stringify(lb)); }catch(e){} }
let LB = loadLb();

/* ---------- 3) DURUM ---------- */
const $ = s => document.querySelector(s);
const clamp = (v,a,b)=> v<a?a:v>b?b:v;
const lerp = (a,b,t)=> a+(b-a)*t;
const rand = (a,b)=> a+Math.random()*(b-a);
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.random()*(i+1)|0; [a[i],a[j]]=[a[j],a[i]]; } return a; }
function initials(s){ return s.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(); }

let state = 'idle';        // idle | flying | question | ended
/* Soru sırası da uçaklardaki gibi "karılmış deste": havuzdaki her soru
   birer kez sorulur, deste bitince yeniden karılır. Böylece can bitmediği
   sürece oyun sürer ve aynı soru üst üste gelmez. Havuz büyüdüğünde
   burada hiçbir değişiklik gerekmez.                                      */
let soruDestesi = [], aktifSoru = null;
let lives = START_LIVES;
function sonrakiSoru(){
  if(!soruDestesi.length){
    soruDestesi = shuffle(POOL);
    // Yeni deste, bir öncekinin son sorusuyla başlamasın
    if(soruDestesi.length > 1 && soruDestesi[0] === aktifSoru){
      const j = 1 + Math.floor(Math.random()*(soruDestesi.length-1));
      [soruDestesi[0], soruDestesi[j]] = [soruDestesi[j], soruDestesi[0]];
    }
  }
  return soruDestesi.shift();
}
let score = 0, streak = 0, bestStreak = 0, correct = 0, total = 0, playerName = 'Sen';
let lastTime = 0;

/* ---------- 4) PERSPEKTİF UÇUŞ ---------- */
const canvas = $('#game'), ctx = canvas.getContext('2d');
let W=0, H=0, DPR=1, horizonY=0, vanishX=0, planeBaseY=0, worldScroll=0;
const cloudSea = [];
const plane = { bob:0, lane:0, laneVis:0, bank:0, jumpY:0, jumpV:0 };   // lane: -1 sol, 0 orta, 1 sağ

/* ---- ENGELLER ----
   İki tür: 'jump' (alçak — üstünden atlanır) ve 'dodge' (yüksek — şerit
   değiştirilir). Zeminle aynı saatte akar, çarpınca sendeleme + puan cezası. */
/* Derinlik akış hızı: zemin/ağaç/lamba ile BİREBİR aynı olmalı.
   (drawFlowingScenery `worldScroll*1.15` kullanıyor, worldScroll ise dt*1.6
   artıyor → saniyede 1.84 birim.) Tek yerden tanımlı ki asla kaymasın. */
const FLOW_SPEED = 1.6 * 1.15;
/* ================= ZORLUK =================
   Tek bir `zorluk` değeri (0 → 1) her şeyi sürüklüyor: hız, engel sıklığı
   ve çift engel ihtimali. Böylece zorluğu ayarlamak için tek yere bakılır.

   Neden bu kadar sert: önceki ayar 35 saniyede %75'te tavan yapıyordu ve
   oyuncu hızlanmayı HİÇ hissetmiyordu. Artık 95 saniye boyunca kesintisiz
   tırmanıp %170'e çıkıyor; her an bir öncekinden farklı.

   speedMul zemin, engel, zarf ve koşu animasyonuna AYNI ANDA uygulanır —
   yoksa katmanlar birbirinden kopar.                                     */
const ZORLUK_SURE = 95;                 // sn: en yüksek zorluğa ulaşma süresi
const SPEED_MAX = 2.7;                  // başlangıç hızının katı
const ARA_DARALMA = 0.30;               // engeller arası mesafe en fazla %30 kısalır
let speedMul = 1, playTime = 0, zorluk = 0;
const obstacles = [];
let obsTimer = 2.2, hitCool = 0, shake = 0;
/* Aynı şeritte üst üste yığılma olmasın: son iki seçim aynı şeritse
   üçüncüsü kesinlikle başka şeritten gelir. */
const lastLanes = [];
function pickLane(){
  const n = lastLanes.length;
  const bloke = (n >= 2 && lastLanes[n-1] === lastLanes[n-2]) ? lastLanes[n-1] : null;
  const secenek = [-1,0,1].filter(l => l !== bloke);
  const lane = secenek[Math.floor(Math.random()*secenek.length)];
  lastLanes.push(lane); if(lastLanes.length > 3) lastLanes.shift();
  return lane;
}
const OBS_PENALTY = 30;
/* kind:'jump'  → alçak, ÜSTÜNDEN atlanır
   kind:'dodge' → yüksek, atlanamaz; şerit değiştirmek gerekir
   Dosya yoksa o tür sessizce devre dışı kalır (filter ile eleniyor).      */
/* Boylar zıplama yüksekliğine (≈121 px) göre okunaklı olmalı:
   atlanabilenler zıplamadan ALÇAK, atlanamayan simit arabası belirgin YÜKSEK. */
const OBS_TYPES = {
  // Bariyer zıplama tepesinden (121) yüksek: kullanıcı böyle istedi, gözle
  // daha okunaklı buldu. Tepe anında ayaklar bariyerin üst kısmıyla çakışır,
  // bilinçli tercih — küçültme.
  barrier: { key:'barrier', kind:'jump',  h:160 },   // yol bariyeri (atlanır)
  // Yayvan nesnelerde boy yerine GENİŞLİK veriyoruz: yoksa tek şeritlik engel
  // üç şeridi birden kaplıyormuş gibi görünüp oyuncuyu yanıltıyor.
  puddle:  { key:'puddle',  kind:'jump',  w:247 },   // su birikintisi (yerde, yayvan)
  simit:   { key:'simit',   kind:'dodge', h:268 }    // simit arabası (yüksek → atlanamaz)
};
/* Soru zarfı artık DERİNLİK (u) uzayında akıyor — tıpkı engeller, ağaçlar ve
   zemin gibi. Böylece dünyayla aynı hızda gelir, önde takılıp kalmaz.
   high:true → zarf bir engelin (bariyer) ÜSTÜNDE durur; ancak zıplayarak
   yakalanabilir. high:false → yerdedir; zıplarsan üstünden geçer, kaçırırsın. */
const token = { u:0, lane:0, active:false, high:false };
const TOKEN_SPAWN_U = 13;      // engellerle aynı mesafeden gelsin
const TOKEN_CATCH_HI = 1.06, TOKEN_CATCH_LO = 0.88;   // yakalama penceresi
const TOKEN_GONE_U = 0.74;     // bunu geçince kaçırıldı sayılır ve kaybolur
const randLane = ()=> [-1,0,1][Math.floor(Math.random()*3)];

/* ---- Görsel varlıklar (assets/ klasöründen) ----
   Dosya varsa oyun onu kullanır; yoksa kodla çizim (fallback). */
const IMAGES = {};
/* Tarayıcı, değiştirilen görselleri önbellekten eski haliyle verebiliyor
   (asset güncellenince oyunda görünmüyor). Her yüklemeye taze bir sürüm
   damgası ekleyerek bunu kesin olarak engelliyoruz. */
const ASSET_V = '?v=' + Date.now();
const assetURL = p => p + ASSET_V;

/* Oyun, görsellerin piksellerini okuyarak arka plan temizliyor ve boyut
   ölçüyor. Tarayıcı bunu SADECE bir sunucu üzerinden açıldığında yapabilir;
   dosyaya çift tıklayarak (file://) açılırsa engeller ve oyun bozuk görünür.
   Bu durumu sessizce geçmek yerine kullanıcıya net söylüyoruz.            */
if(location.protocol === 'file:'){
  addEventListener('DOMContentLoaded', ()=>{
    const uyari = document.createElement('div');
    uyari.style.cssText = 'position:fixed;inset:0;z-index:99;display:grid;place-items:center;'+
      'padding:28px;background:#0d1a2e;color:#fff;font:600 16px/1.6 system-ui,sans-serif;text-align:center';
    uyari.innerHTML = '<div style="max-width:420px">'+
      '<div style="font-size:44px;margin-bottom:10px">⚠️</div>'+
      '<b style="font-size:19px">Oyun bu şekilde açılamaz</b><br><br>'+
      'Dosyaya çift tıklayarak açtın. Tarayıcı bu modda oyunun görselleri '+
      'işlemesine izin vermiyor.<br><br>Bunun yerine aynı klasördeki '+
      '<b>“OYUNU BASLAT”</b> dosyasına çift tıkla.</div>';
    document.body.appendChild(uyari);
  });
}
// Stil dosyası da önbellekte takılabiliyor → sürüm damgasıyla tazele
(function(){
  const l = document.querySelector('link[rel="stylesheet"][href*="style.css"]');
  if(l) l.href = 'style.css' + ASSET_V;
})();

function loadImage(key, src){
  const img = new Image();
  img.onload  = ()=>{ IMAGES[key] = img; };   // yüklendi → kullan
  img.onerror = ()=>{};                         // yok → procedural çizim
  img.src = assetURL(src);
}
// Sokak koşusu görselleri
loadImage('street', 'assets/street.png'); // sokak arka planı (dikey)
/* Düz BEYAZ zeminli karakter/nesne görselleri için temizleyici.
   Bölge-büyütme (soft) keyer degradeleri takip ettiği için figürün içine
   sızıp parçalarını yiyebiliyor; burada MUTLAK eşik kullanılır: yalnızca
   kenardan bağlantılı ve gerçekten beyaza yakın pikseller silinir.
   Figürün içindeki beyazlar (ayakkabı, etiket) kenara bağlı olmadığı için kalır. */
function keyOutWhite(img, thr){
  thr = thr || 228;
  const W0=img.width, H0=img.height;
  const c=document.createElement('canvas'); c.width=W0; c.height=H0;
  const g=c.getContext('2d'); g.drawImage(img,0,0);
  const id=g.getImageData(0,0,W0,H0), d=id.data;
  let tr=0; for(let i=3;i<d.length;i+=4) if(d[i]<10) tr++;
  if(tr > W0*H0*0.10) return img;              // zaten şeffaf → dokunma
  const isBg = i => {
    const r=d[i], gg=d[i+1], b=d[i+2];
    const mn=Math.min(r,gg,b), mx=Math.max(r,gg,b);
    return mn >= thr && (mx-mn) <= 18;          // beyaza yakın ve renksiz
  };
  const seen=new Uint8Array(W0*H0), q=[];
  const seed=p=>{ if(!seen[p] && isBg(p*4)){ seen[p]=1; q.push(p); } };
  for(let x=0;x<W0;x++){ seed(x); seed((H0-1)*W0+x); }
  for(let y=0;y<H0;y++){ seed(y*W0); seed(y*W0+W0-1); }
  while(q.length){
    const p=q.pop(); d[p*4+3]=0;
    const x=p%W0, y=(p/W0)|0;
    if(x>0)      seed(p-1);
    if(x<W0-1)   seed(p+1);
    if(y>0)      seed(p-W0);
    if(y<H0-1)   seed(p+W0);
  }
  g.putImageData(id,0,0);
  return c;
}
function loadImageWhiteKeyed(key, src){
  const img = new Image();
  img.onload  = ()=>{ try{ IMAGES[key] = keyOutWhite(img); }
                      catch(e){ IMAGES[key] = img; } };
  img.onerror = ()=>{};
  img.src = assetURL(src);
}

function loadImageKeyedSoft(key, src){
  const img = new Image();
  img.onload  = ()=>{ try{ IMAGES[key] = keyOutBackgroundSoft(img, 18); }
                      catch(e){ IMAGES[key] = img; } };
  img.onerror = ()=>{};
  img.src = assetURL(src);
}
loadImageWhiteKeyed('child', 'assets/child.png');
// Koşu animasyonu kareleri: child.png tek başına yeter (hareket koda gömülü).
// assets/ içine child2.png / child3.png / child4.png eklersen otomatik olarak
// gerçek kare kare koşu animasyonuna geçer.
/* Koşu döngüsü sırası: temas(sağ) → geçiş → temas(sol) → geçiş.
   child/child2 temas kareleri, child3/child4 aralarındaki geçiş kareleri
   olduğu için dizilim böyle sıralanır (dosya adı sırası değil).          */
const RUN_KEYS = ['child','child3','child2','child4'];
['child2','child3','child4'].forEach(k => loadImageWhiteKeyed(k, 'assets/'+k+'.png'));

/* ================= KATMANLI SAHNE GÖRSELLERİ =================
   bg_far (gökyüzü+uzak şehir) + ground_tile (tam genişlik zemin) varsa
   oyun katmanlı moda geçer: zemin akar, binalar/ağaçlar yanından geçer.
   Yoksa eski street.png moduna düşer.                                  */
loadImage('bg_far', 'assets/bg_far.png');
loadImage('ground', 'assets/ground_tile.png');
// Sahil bulvarı dekoru (şeffaf PNG'ler)
// Toplanacak soru simgesi (siber güvenlik temalı). Şeffaf geliyor → işlem yok.
loadImage('token', 'assets/token_question.png');
loadImageKeyedSoft('barrier', 'assets/barrier.png');     // yol bariyeri (koyu zeminli geldi)
loadImageKeyedSoft('puddle', 'assets/su_birikintisi.png');  // su birikintisi (koyu zeminli)
loadImageKeyedSoft('simit',  'assets/simit_arabasi.png');   // simit arabası (koyu zeminli)
loadImage('prop_tree', 'assets/prop_tree.png');
loadImage('prop_lamp', 'assets/prop_lamp.png');
// Duba beyaz zeminli gelebiliyor → yüklerken arka planı şeffaflaştır
(function(){
  const img = new Image();
  img.onload  = ()=>{ try{ IMAGES.prop_bollard = keyOutWhite(img); }
                      catch(e){ IMAGES.prop_bollard = img; } };
  img.onerror = ()=>{};
  img.src = assetURL('assets/prop_bollard.png');
})();

/* Bina görsellerinin arka planı şeffaf gelmemiş olabiliyor. Yüklerken
   kenarlardan bağlantılı arka plan piksellerini şeffaflaştırıyoruz
   (görselin İÇİNDEKİ beyaz pencereler kenara bağlı olmadığı için korunur). */
function keyOutBackground(img){
  const W0=img.width, H0=img.height;
  const c=document.createElement('canvas'); c.width=W0; c.height=H0;
  const g=c.getContext('2d'); g.drawImage(img,0,0);
  const id=g.getImageData(0,0,W0,H0), d=id.data;
  let tr=0; for(let i=3;i<d.length;i+=4) if(d[i]<10) tr++;
  if(tr > W0*H0*0.05) return img;              // zaten gerçekten şeffaf → dokunma
  // 4 köşe rengini referans al (gradyanlı zeminler için hepsiyle karşılaştır)
  const refs=[0,(W0-1)*4,(H0-1)*W0*4,((H0-1)*W0+W0-1)*4].map(i=>[d[i],d[i+1],d[i+2]]);
  const TOL2=55*55;
  const match=i=>refs.some(r=>{const a=d[i]-r[0],b=d[i+1]-r[1],e=d[i+2]-r[2];return a*a+b*b+e*e<TOL2;});
  const seen=new Uint8Array(W0*H0), stack=[];
  for(let x=0;x<W0;x++){ stack.push(x,(H0-1)*W0+x); }
  for(let y=0;y<H0;y++){ stack.push(y*W0, y*W0+W0-1); }
  while(stack.length){
    const p=stack.pop(); if(seen[p]) continue; seen[p]=1;
    if(!match(p*4)) continue;
    d[p*4+3]=0;
    const x=p%W0, y=(p/W0)|0;
    if(x>0)stack.push(p-1); if(x<W0-1)stack.push(p+1);
    if(y>0)stack.push(p-W0); if(y<H0-1)stack.push(p+W0);
  }
  g.putImageData(id,0,0);
  return c;
}
function loadImageKeyed(key, src){
  const img = new Image();
  img.onload  = ()=>{ try{ IMAGES[key]=keyOutBackground(img); }catch(e){ IMAGES[key]=img; } };
  img.onerror = ()=>{};
  img.src = assetURL(src);
}
const BUILD_KEYS = ['building_a','building_b','building_c'];
BUILD_KEYS.forEach(k => loadImageKeyed(k, 'assets/'+k+'.png'));

/* Kareler birbirinden farklı boyutta/konumda üretilmiş olabiliyor (AI görselleri
   genelde öyle). Her karenin içindeki figürü ölçüp ekranda aynı boyda ve
   ayakları aynı yerde çiziyoruz — yoksa çocuk her adımda büyüyüp küçülür. */
const SPRITE_FIT = new Map();
function spriteFit(img){
  if(SPRITE_FIT.has(img)) return SPRITE_FIT.get(img);
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img,0,0);
  let fit = { cx:0.5, headCx:0.5, feet:0.84, hRatio:0.73, left:0.1, top:0.1, wRatio:0.8 };   // ölçüm başarısız olursa makul varsayılan
  try{
    const d = g.getImageData(0,0,img.width,img.height).data;
    let x0=img.width, y0=img.height, x1=-1, y1=-1;
    for(let y=0;y<img.height;y++) for(let x=0;x<img.width;x++){
      if(d[(y*img.width+x)*4+3] > 25){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
    }
    if(x1>x0 && y1>y0){
      /* Yatay hiza için kutu ortası GÜVENİLMEZ: bavul/kollar sağa sola oynayınca
         kutu ortası kayar ve karakter karelerde titrer. Bunun yerine KAFA
         merkezini kullanıyoruz — koşarken en sabit nokta odur. */
      const ch = y1-y0;
      const hb0 = y0, hb1 = y0 + Math.max(1, Math.round(ch*0.14));
      let hx0 = img.width, hx1 = -1;
      for(let y=hb0; y<=hb1; y++) for(let x=x0; x<=x1; x++){
        if(d[(y*img.width+x)*4+3] > 25){ if(x<hx0)hx0=x; if(x>hx1)hx1=x; }
      }
      const headCx = hx1 > hx0 ? ((hx0+hx1)/2)/img.width : ((x0+x1)/2)/img.width;
      fit = {
        cx: ((x0+x1)/2)/img.width,      // figürün yatay ortası (kutu)
        headCx,                          // kafa merkezi (karakter hizası için)
        feet: y1/img.height,            // yere değen en alt nokta (ayak/tekerlek)
        hRatio: ch/img.height,          // figürün görsele oranla boyu
        left: x0/img.width,             // içerik kutusu (şeffaf kenar payını atmak için)
        top:  y0/img.height,
        wRatio: (x1-x0)/img.width
      };
    }
  }catch(e){}
  SPRITE_FIT.set(img, fit);
  return fit;
}

// Bir resmi tuvali tamamen kaplayacak şekilde çiz (CSS 'cover' gibi)
function drawCover(img){
  const s = Math.max(W/img.width, H/img.height);
  const w = img.width*s, h = img.height*s;
  ctx.drawImage(img, (W-w)/2, (H-h)/2, w, h);
}

const STAGE_AR = 941/1672;   // sokak görselinin oranı (~9:16). Sahne bu orana kilitli.
const END_AR = 853/1844;     // bitiş ekranı tasarımının oranı (daha dar)
const AD_AR  = 1024/1536;    // isim ekranı tasarımının oranı (daha geniş)
function resize(){
  DPR = Math.min(window.devicePixelRatio||1, 2);
  // Pencereye sığan en büyük 9:16 dikey sahneyi hesapla (kırpma olmasın diye)
  let cw = window.innerWidth, ch = window.innerHeight;
  if(cw/ch > STAGE_AR) cw = ch*STAGE_AR; else ch = cw/STAGE_AR;
  W = Math.round(cw); H = Math.round(ch);
  canvas.width = W*DPR; canvas.height = H*DPR;
  canvas.style.width = W+'px'; canvas.style.height = H+'px';
  // Sahneyi ekranda ortala (yatay/geniş pencerelerde yanlarda koyu boşluk kalır)
  canvas.style.position='fixed'; canvas.style.left='50%'; canvas.style.top='50%';
  canvas.style.transform='translate(-50%,-50%)';
  // Üst bar sahneyle aynı genişlikte olsun: skor sahnenin sağ kenarına otursun
  const hud = document.getElementById('hud');
  if(hud) hud.style.width = W + 'px';
  /* Bitiş ekranı tasarımı 853:1844 — oyun sahnesinden daha dar. Kendi
     oranıyla ölçülendiriliyor ki kutular görselin üstüne birebir otursun.
     Yazı boyu da yüksekliğe bağlanıyor: ekran büyüyünce yazı da büyür. */
  const es = document.getElementById('endStage');
  if(es){
    let ew = window.innerWidth, eh = window.innerHeight;
    if(ew/eh > END_AR) ew = eh*END_AR; else eh = ew/END_AR;
    es.style.width = ew+'px'; es.style.height = eh+'px';
    es.style.fontSize = (eh*0.02)+'px';
  }
  // İsim ekranı da kendi oranıyla: tuş alanları görselin üstüne birebir otursun
  const ns = document.getElementById('nameStage');
  if(ns){
    let nw = window.innerWidth, nh = window.innerHeight;
    if(nw/nh > AD_AR) nw = nh*AD_AR; else nh = nw/AD_AR;
    ns.style.width = nw+'px'; ns.style.height = nh+'px';
    ns.style.fontSize = (nh*0.02)+'px';
  }
  ctx.setTransform(DPR,0,0,DPR,0,0);
  // perspektif değerleri computePerspective() içinde hesaplanıyor
}
window.addEventListener('resize', resize);

// Şerit değiştirme: sağa/sola kaydırma + klavye (sadece uçuş sırasında)
function goLeft(){  if(state==='flying') plane.lane = clamp(plane.lane-1,-1,1); }
function goRight(){ if(state==='flying') plane.lane = clamp(plane.lane+1,-1,1); }
// Zıplama: yukarı kaydır / yukarı ok / boşluk
/* Zıplama ~120 px tepe, ~0.86 sn. Bariyeri (112) rahat aşar ama simit
   arabasını (250) asla aşamaz — hangi engelin atlanabildiği gözle anlaşılsın. */
/* Tepe ~121 px, süre 0.86 sn. Bir ara 620'ye (tepe 148) çıkarıldı ki büyüyen
   bariyerin üstünden temiz geçilsin, ama zıplama havada fazla asılı kaldı —
   kullanıcı eski hissi tercih etti. DEĞİŞTİRME: buradaki mesele yükseklik
   değil, zıplamanın ne kadar sürdüğü.                                     */
const JUMP_V0 = 560, GRAVITY = 1300;
const JUMP_PEAK = (JUMP_V0*JUMP_V0)/(2*GRAVITY);   // tepe yüksekliği (px)
function doJump(){
  if(state==='flying' && plane.jumpY <= 0){ plane.jumpV = JUMP_V0; }
}
/* Hızlı iniş (Subway Surfers'daki gibi): havadayken aşağı kaydırınca ya da
   aşağı ok/S ile zıplama kesilir, karakter yola çakılır. Takla yok — sadece
   iniş. Zıplamayı erken bitirebilmek gerçek bir beceri: yanlış zamanda
   zıplayan oyuncu kendini kurtarabiliyor.                                */
const DROP_V = -1150;          // aşağı hız (yerçekiminden bağımsız, ani)
function doDrop(){
  if(state==='flying' && plane.jumpY > 0) plane.jumpV = Math.min(plane.jumpV, DROP_V);
}
let swX=null, swY=null;
canvas.addEventListener('pointerdown', e=>{ swX=e.clientX; swY=e.clientY; });
canvas.addEventListener('pointerup', e=>{
  if(swX===null) return;
  const dx=e.clientX-swX, dy=e.clientY-swY;
  if(Math.abs(dx) > Math.abs(dy)){
    if(Math.abs(dx) > 26){ dx>0 ? goRight() : goLeft(); }          // yana kaydır
  } else {
    if(dy < -26)      doJump();                                     // yukarı kaydır = zıpla
    else if(dy > 26)  doDrop();                                     // aşağı kaydır = hızlı in
  }
  swX=swY=null;
});
window.addEventListener('keydown', e=>{
  if(e.key==='ArrowLeft'  || e.key==='a') goLeft();
  if(e.key==='ArrowRight' || e.key==='d') goRight();
  if(e.key==='ArrowUp' || e.key===' ' || e.key==='w'){ e.preventDefault(); doJump(); }
  if(e.key==='ArrowDown' || e.key==='s'){ e.preventDefault(); doDrop(); }
});

// Yol perspektifi: görseldeki gerçek yola göre kaçış (uzak) ve yakın noktalar.
// Oranlar street.png'ye göre ölçüldü (0-1 arası, görselin içinde).
// Değerler street.png'nin pikselleri taranarak ÖLÇÜLDÜ (beyaz şerit ayırıcılarının
// konumundan). laneOffset = şerit merkezleri arası mesafe: ayırıcılar merkez ±0.237'de,
// dolayısıyla sol/sağ şerit merkezleri ±0.474'te (ayırıcıların dışında).
const ROAD = { vanishX:0.510, vanishY:0.508, nearX:0.499, nearY:0.80, laneOffset:0.474 };
// Katmanlı mod: ufuk bg_far'daki su çizgisine oturur, yol simetriktir
const LROAD = { vanishX:0.500, vanishY:0.512, nearX:0.500, nearY:0.80, laneOffset:0.474 };
const layeredMode = ()=> !!(IMAGES.bg_far && IMAGES.ground);
let nearCenterX=0, laneSpreadPx=0;
function computePerspective(){
  const ref = layeredMode() ? { img:IMAGES.bg_far, R:LROAD }
            : IMAGES.street ? { img:IMAGES.street, R:ROAD } : null;
  if(ref){
    // drawCover ile ekrana çizilen görselin dikdörtgenini hesapla
    const img=ref.img, R=ref.R, s=Math.max(W/img.width, H/img.height);
    const dw=img.width*s, dh=img.height*s, dx=(W-dw)/2, dy=(H-dh)/2;
    vanishX     = dx + R.vanishX*dw;   // yolun kaybolduğu nokta (x)
    horizonY    = dy + R.vanishY*dh;   // yolun kaybolduğu nokta (y)
    nearCenterX = dx + R.nearX*dw;     // yolun yakın ucunda merkez
    planeBaseY  = dy + R.nearY*dh;     // yolun yakın ucu (karakter)
    laneSpreadPx= R.laneOffset*dw;     // yakın uçta şerit açıklığı
  } else {
    vanishX=W*0.5; horizonY=H*0.40; nearCenterX=W*0.5; planeBaseY=H*0.80; laneSpreadPx=Math.min(W*0.26,300);
  }
}
/* scale : eski karışık ölçek (tabanı 0.10 — ufukta bile %10 büyüklük bırakır)
   e     : SAF perspektif ölçeği; şerit genişliğiyle birebir orantılı, ufukta 0.
   Yol üstündeki nesneler (engel, zarf, ağaç...) `e` kullanmalı; yoksa uzakta
   olduğundan çok daha iri görünüp yaklaştıkça küçülüyormuş gibi olur.       */
function project(lane, t){
  const e = t*t;
  const nearX = nearCenterX + lane*laneSpreadPx;   // yakın uçtaki x
  return { x: vanishX + (nearX - vanishX)*e, y: horizonY + (planeBaseY - horizonY)*e, scale: 0.10 + 1.05*e, e };
}
function seedClouds(){ cloudSea.length=0; for(let i=0;i<8;i++) cloudSea.push({ t:Math.random(), off:rand(-1.4,1.4), sz:rand(0.7,1.3) }); }

function puff(x,y,r,color){
  ctx.fillStyle=color; ctx.beginPath();
  ctx.arc(x,y,r,0,7); ctx.arc(x+r*0.85,y+r*0.15,r*0.75,0,7); ctx.arc(x-r*0.9,y+r*0.2,r*0.68,0,7); ctx.arc(x+r*0.1,y-r*0.55,r*0.7,0,7);
  ctx.fill();
}

/* ================= AKAN YOL — DOKU KAYDIRMA (Mode-7) =================
   assets/road_tile.png (kullanıcının çizdiği, tepeden bakış yol dokusu)
   perspektife oturtulup satır satır kaydırılır. Mario Kart'ın (SNES) yol
   tekniğinin aynısı. KOD HİÇBİR ŞEY ÇİZMEZ — kullanıcının dokusunu
   yerleştirir ve akıtır. Dosya yoksa yol resimdeki haliyle sabit kalır. */
loadImage('road', 'assets/road_tile.png');
/* Doku kalibrasyonu (road_tile.png pikselleri taranarak ÖLÇÜLDÜ):
   kesikli şerit çizgileri dokunun x=0.3454 ve x=0.6456'sında, yol merkezi 0.4955.
   Oyunda çizgiler ±0.5 şerit-biriminde olmalı → ölçek 0.5/0.1501 = 3.331.
   Böylece dokudaki çizgiler oyunun şeritleriyle birebir çakışır. */
const TEX_CENTER = 0.4955, TEX_SCALE = 3.331;
const TEX_L = (0 - TEX_CENTER) * TEX_SCALE;   // ≈ −1.651 (dokunun sol kenarı)
const TEX_R = (1 - TEX_CENTER) * TEX_SCALE;   // ≈ +1.681 (dokunun sağ kenarı)
const TILE_WORLD = 3.4;    // bir doku karosunun kapladığı derinlik
const FADE_T0 = 0.26, FADE_T1 = 0.44;  // ufka yakınken sabit resme yumuşak geçiş

// Doku dikişsiz olmasa bile sorun çıkmasın diye ayna sarmalı okuyoruz
function pingpong(v, n){ const m = ((v % (2*n)) + 2*n) % (2*n); return m < n ? m : 2*n - m; }

function drawRoadTextured(){
  const img = IMAGES.road; if(!img) return;
  const texH = img.height;
  const scroll = worldScroll * 1.15;             // akış hızı ("?" ikonlarıyla uyumlu his)
  for(let y = Math.ceil(horizonY)+1; y < H; y++){
    const t = Math.sqrt((y - horizonY) / (planeBaseY - horizonY));
    if(t <= FADE_T0) continue;                   // ufka çok yakın: sabit resim kalsın
    const u = 1/(t*t);                           // derinlik (büyük = uzak)
    const texY = pingpong((u + scroll) / TILE_WORLD * texH, texH - 1);
    const xL = project(TEX_L, t).x, xR = project(TEX_R, t).x;
    ctx.globalAlpha = clamp((t - FADE_T0)/(FADE_T1 - FADE_T0), 0, 1);
    ctx.drawImage(img, 0, texY, img.width, 1, xL, y, xR - xL, 1);
  }
  ctx.globalAlpha = 1;
}

/* ================= KATMANLI MOD: TAM GENİŞLİK ZEMİN =================
   ground_tile.png (kaldırım+yol+kaldırım, tepeden) Mode-7 ile akıtılır.
   Kalibrasyon: dokudaki kesikli çizgiler oyunun ±0.5 şeritlerine oturtulur. */
/* Ölçüldü (ground_tile.png piksel taraması): kesikli çizgiler x=0.394 ve 0.610
   → merkez 0.502, yarı-aralık 0.108 → ölçek 0.5/0.108 = 4.63.
   Doku kenarları böylece ±2.3 şerit-birimine denk gelir (kaldırım dışı). */
let GTEX_CENTER = 0.502, GTEX_SCALE = 4.63;
// Zemin ufka ÇOK yakın solmalı; erken solarsa binalar havada asılı görünüyor
const GTILE_WORLD = 3.4, GFADE0 = 0.10, GFADE1 = 0.22;
function drawGroundTextured(){
  const img = IMAGES.ground; if(!img) return;
  const texH = img.height;
  const scroll = worldScroll * 1.15;
  const L = (0-GTEX_CENTER)*GTEX_SCALE, R = (1-GTEX_CENTER)*GTEX_SCALE;
  for(let y = Math.ceil(horizonY)+1; y < H; y++){
    const t = Math.sqrt((y - horizonY) / (planeBaseY - horizonY));
    if(t <= GFADE0) continue;
    const u = 1/(t*t);
    const texY = pingpong((u + scroll) / GTILE_WORLD * texH, texH - 1);
    const xL = project(L, t).x, xR = project(R, t).x;
    ctx.globalAlpha = clamp((t - GFADE0)/(GFADE1 - GFADE0), 0, 1);
    ctx.drawImage(img, 0, texY, img.width, 1, xL, y, xR - xL, 1);
    // Dokunun dışında kalan kenarları, dokunun en dış sütunuyla uzat
    // (kaldırım ekran kenarına kadar sürsün, altından deniz görünmesin)
    if(xL > 0) ctx.drawImage(img, 0, texY, 3, 1, 0, y, xL+1, 1);
    if(xR < W) ctx.drawImage(img, img.width-3, texY, 3, 1, xR-1, y, W-xR+1, 1);
  }
  ctx.globalAlpha = 1;
}

/* ---- Akan yan dekor: binalar DUVAR olarak + ağaç/lamba (zeminle AYNI hızda) ----
   Binalar yol boyunca uzanan cephe duvarlarıdır: görsel düz (karşıdan),
   perspektifi motor verir — yolun yatay satırlarla eğilmesinin DİKEY karşılığı.
   Her cephe dikey şeritlere bölünür; her şerit kendi derinliğinde
   projeksiyonlanır → yakın ucu büyük, uzak ucu kaçış noktasına küçülen
   gerçek koridor duvarı çıkar.                                            */
/* ================= SÜREKLİ DOKU DUVARI (iki yaka) =================
   Sokağın her yakası TEK, kesintisiz dikey düzlemdir. Kullanıcının çizdiği
   yatay "cephe şeridi" (bitişik binaların düz önden görünümü) bu düzleme
   ekran KOLONU başına giydirilir — yolun satır satır çizilmesinin dikey eşi.
   Kolon x için: off=|x-vanishX|, derinlik u=S·C/off, taban=horizon+span/u,
   tepe=horizon+span·K/u (K<0). Dikeyler dik kalır, çatı/taban çizgileri
   kaçış noktasına yakınsar, uzak cepheler kendiliğinden daralır. Obje yok,
   dikiş yok. worldScroll ile yol/zeminle AYNI saatte akar.
   Asset: assets/wall_strip.png (kullanıcı üretecek). O gelene dek mevcut
   bina görselleri yan yana MONTAJLANIP geçici şerit yapılır (sanat değil,
   montaj). Uzak mesafede parlama olmasın diye yarıya küçültülmüş mip
   kademeleri kullanılır; kolon başına gerçek texel aralığı kadar kaynak
   genişliği verilir (drawImage kutu filtresi görevi görür).            */
/* Duvar şeridinin arka planı düz renk olmayabilir (degrade vb.). Bölge-büyütme
   ile temizlenir: kenardan başlayıp komşusuna yeterince benzeyen pikseller
   arka plan sayılır — degradeyi izler, keskin bina hatlarında durur. */
function keyOutBackgroundSoft(img, tol){
  tol = tol || 16;
  const W0=img.width, H0=img.height;
  const c=document.createElement('canvas'); c.width=W0; c.height=H0;
  const g=c.getContext('2d'); g.drawImage(img,0,0);
  const id=g.getImageData(0,0,W0,H0), d=id.data;
  let tr=0; for(let i=3;i<d.length;i+=4) if(d[i]<10) tr++;
  if(tr > W0*H0*0.10) return img;              // zaten gerçekten şeffaf → dokunma
  const seen=new Uint8Array(W0*H0), q=[];
  const seed=p=>{ if(!seen[p]){ seen[p]=1; q.push(p); } };
  for(let x=0;x<W0;x++){ seed(x); seed((H0-1)*W0+x); }
  for(let y=0;y<H0;y++){ seed(y*W0); seed(y*W0+W0-1); }
  const t2=tol*tol;
  while(q.length){
    const p=q.pop(), i=p*4;
    d[i+3]=0;
    const x=p%W0, y=(p/W0)|0;
    const nbs=[];
    if(x>0)nbs.push(p-1); if(x<W0-1)nbs.push(p+1);
    if(y>0)nbs.push(p-W0); if(y<H0-1)nbs.push(p+W0);
    for(const n of nbs){
      if(seen[n]) continue;
      const j=n*4, dr=d[j]-d[i], dg=d[j+1]-d[i+1], db=d[j+2]-d[i+2];
      if(dr*dr+dg*dg+db*db < t2){ seen[n]=1; q.push(n); }
    }
  }
  g.putImageData(id,0,0);
  return c;
}
for(const [key,src] of [['wall','assets/wall_strip.png'],['wall2','assets/wall_strip2.png'],['wall_front','assets/wall_front.png']]){
  const img=new Image();
  img.onload = ()=>{ try{ IMAGES[key] = keyOutBackgroundSoft(img,16); }catch(e){ IMAGES[key] = img; } };
  img.onerror = ()=>{};
  img.src = assetURL(src);
}
/* DERİNLİK YAPISI: sokak TEK düzlem değil — İKİ duvar düzlemi var.
   Ön sıra yola yakın; arka sıra dünyada daha uzak ve daha YÜKSEK olduğundan
   çatıları ön sıranın üstünden görünür → basamaklı silüet + katmanlar arası
   parallax (ön, arkadan hızlı akar) + örtme. street.png'nin derinlik hissi bu.
   wall_front.png (boşluklu kümeler) gelirse ön katman o olur ve arka duvar
   sokak seviyesinde de boşluklardan görünür (tam etki).                    */
/* Binalar artık AĞAÇLARIN ARKASINDA tek sürekli sıra: kaldırımın dış kenarında
   dizili, ağaç hattının (1.78) gerisinde. Tek katman yeterli — önlerinden akan
   ağaçlar zaten örtme/parallax sağlıyor.                                    */
let WALL_S  = 2.55;        // duvar düzlemi: kaldırım dış kenarı (ağaçların gerisi)
let WALL_K  = -2.45;       // bina yüksekliği (göz yüksekliğinin katı)
const WALL_FACADES = { wall:7, wall2:5, wall_front:8 };   // şerit başına cephe sayısı (boşluklar dahil, cephe-eşdeğeri)
const FACADE_WORLD = 1.8;  // bir cephenin dünya-birimi uzunluğu
let PSIDE = 1.62;          // ağaç/lamba hattı (duvarın önü, bordür)
// Saf perspektife (p.e) geçildiği için boylar 1.15 ile yeniden ölçeklendi;
// yakındaki görünüm aynı kalır, uzaktaki abartılı irilik düzelir.
let TREE_H = 308, LAMP_H = 308, BOLLARD_H = 71;   // lamba boyu = ağaç boyu (kullanıcı isteği)

let wallData = null;       // { mips:[...], texH }
function compositeWallStrip(imgs){
  // Kullanıcının bina görsellerini taban hizasında yan yana birleştir
  const H0 = 1024, CH = Math.round(H0*0.94);
  let widths = [], total = 0;
  for(const img of imgs){
    const f = spriteFit(img);
    const w = Math.round((f.wRatio*img.width) * CH / (f.hRatio*img.height));
    widths.push(w); total += w;
  }
  if(total < 100) return null;
  const c = document.createElement('canvas'); c.width = total; c.height = H0;
  const g = c.getContext('2d');
  let x = 0;
  imgs.forEach((img,i)=>{
    const f = spriteFit(img);
    g.drawImage(img, f.left*img.width, f.top*img.height,
                f.wRatio*img.width, f.hRatio*img.height,
                x, H0-CH, widths[i], CH);
    x += widths[i];
  });
  return c;
}
/* Şeridin kenarlarındaki yarım/solgun binaları kırp — pingpong birleşme
   noktasında boşluk/dikiş görünmesin (kolon doluluk oranı eşiği). */
function trimSolidEdges(band){
  const W0=band.width, H0=band.height;
  let d;
  try{ d = band.getContext('2d').getImageData(0,0,W0,H0).data; }
  catch(e){ return band; }        // piksel okuma engelliyse kırpmadan devam et

  const colFrac = x => { let n=0; for(let y=0;y<H0;y++) if(d[(y*W0+x)*4+3]>25) n++; return n/H0; };
  let L=0, R=W0-1;
  while(L < W0*0.3 && colFrac(L) < 0.55) L++;
  while(R > W0*0.7 && colFrac(R) < 0.55) R--;
  L=Math.min(L+4, W0-1); R=Math.max(R-4, 0);
  if(R-L < 64) return band;
  const c=document.createElement('canvas'); c.width=R-L+1; c.height=H0;
  c.getContext('2d').drawImage(band, L,0,R-L+1,H0, 0,0,R-L+1,H0);
  return c;
}

let wallSig = '', frontData = null;
function buildMips(band){
  const mips=[band]; let cur=band;
  for(let i=0; i<4; i++){
    const c=document.createElement('canvas');
    c.width=Math.max(64, Math.round(cur.width/2)); c.height=cur.height;
    const g=c.getContext('2d'); g.imageSmoothingEnabled=true;
    g.drawImage(cur, 0,0,c.width,c.height);
    mips.push(c); cur=c;
  }
  return mips;
}
function ensureWall(){
  // Kaynaklar değişince (örn. wall_strip2 sonradan yüklendi) yeniden kur
  const sig = (IMAGES.wall?'1':'0') + (IMAGES.wall2?'1':'0') + (IMAGES.wall_front?'1':'0') + BUILD_KEYS.filter(k=>IMAGES[k]).length;
  if(wallData && wallSig === sig) return true;

  // ÖN katman (boşluklu kümeler) — varsa ayrı işlenir (kenar kırpma YOK: boşluklar kasıtlı)
  frontData = null;
  if(IMAGES.wall_front){
    const src = IMAGES.wall_front, f = spriteFit(src);
    const sx=Math.round(f.left*src.width), sy=Math.round(f.top*src.height);
    const sw=Math.max(64, Math.round(f.wRatio*src.width));
    const sh=Math.max(64, Math.round(f.hRatio*src.height));
    const band=document.createElement('canvas'); band.width=sw; band.height=sh;
    band.getContext('2d').drawImage(src, sx,sy,sw,sh, 0,0,sw,sh);
    frontData = { mips: buildMips(band), texH: sh, ppw: (sw/(WALL_FACADES.wall_front||6))/FACADE_WORLD };
  }

  // 1) Mevcut şeritleri topla: içerik bandını kes + kenarları sağlamlaştır
  const strips=[]; let facades=0;
  for(const key of ['wall','wall2']){
    const src = IMAGES[key]; if(!src) continue;
    const f = spriteFit(src);
    const sx=Math.round(f.left*src.width), sy=Math.round(f.top*src.height);
    const sw=Math.max(64, Math.round(f.wRatio*src.width));
    const sh=Math.max(64, Math.round(f.hRatio*src.height));
    let band = document.createElement('canvas'); band.width=sw; band.height=sh;
    band.getContext('2d').drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
    band = trimSolidEdges(band);
    strips.push(band); facades += (WALL_FACADES[key] || 6);
  }
  if(!strips.length){
    const bs = BUILD_KEYS.map(k=>IMAGES[k]).filter(Boolean);
    if(bs.length < 2) return false;
    const comp = compositeWallStrip(bs);
    if(!comp) return false;
    strips.push(comp); facades = bs.length;
  }

  // 2) Ortak yüksekliğe getirip yan yana birleştir (çeşitlilik: strip1+strip2)
  const Hn = Math.max(...strips.map(s=>s.height));
  let totalW = 0;
  const scaled = strips.map(s=>{ const w=Math.round(s.width*Hn/s.height); totalW+=w; return {s,w}; });
  const merged = document.createElement('canvas'); merged.width=totalW; merged.height=Hn;
  { const g=merged.getContext('2d'); let x=0;
    for(const {s,w} of scaled){ g.drawImage(s, 0,0,s.width,s.height, x,0,w,Hn); x+=w; } }

  // 3) Mip kademeleri (uzak mesafe parlamasına karşı)
  wallData = { mips: buildMips(merged), texH: Hn, ppw: (totalW/facades)/FACADE_WORLD };
  wallSig = sig;
  return true;
}

// Tek bir duvar katmanının kolonunu çiz (katman verisi, yanal S, tepe K)
function drawWallColumn(data, x, off, S, K, span, scrollU, alpha, extraHaze){
  const u = S * laneSpreadPx / off;
  const yB = horizonY + span/u;
  const yT = horizonY + span*K/u;
  const texStep = data.ppw * S * laneSpreadPx / (off*off);
  let lvl = 0, ts = texStep;
  while(ts > 2 && lvl < data.mips.length-1){ ts /= 2; lvl++; }
  const m = data.mips[lvl], mw = m.width;
  const ppwL = data.ppw / Math.pow(2, lvl);
  let tx = (u + scrollU) * ppwL;
  let mm = tx % (2*mw); if(mm < 0) mm += 2*mw;
  const sx = mm < mw ? mm : 2*mw - mm;            // pingpong: dikişsizlik şart değil
  const sw = clamp(ts, 1, 32);
  ctx.globalAlpha = alpha;
  ctx.drawImage(m, Math.min(sx, mw - sw), 0, sw, data.texH, x, yT, 1.05, yB - yT);
  // Atmosferik pus: uzaklaşan kolonlar mavi-griye gömülür (arka katmanda daha çok)
  const haze = clamp(0.30 * (1 - (off - 26)/(170 - 26)), 0, 0.30) + extraHaze;
  if(haze > 0.02){
    ctx.globalAlpha = alpha * Math.min(haze, 0.55);
    ctx.fillStyle = '#9db8d9';
    ctx.fillRect(x, yT, 1.05, yB - yT);
  }
}

function drawWalls(){
  if(!ensureWall()) return;
  const span = planeBaseY - horizonY;
  const scroll = worldScroll * 1.15;              // yol/zeminle aynı saat
  const OFF_MIN = 14, FADE0 = 26, FADE1 = 64;     // kaçış noktasına yakın sisle karış
  const B = wallData;                             // birleşik cephe şeridi (12 cephe)
  for(const side of [-1, 1]){
    for(let i = OFF_MIN; ; i++){
      const x = vanishX + side*i;
      if(x < 0 || x > W) break;
      const off = i;
      const alpha = clamp((off - FADE0)/(FADE1 - FADE0), 0, 1);
      if(alpha <= 0) continue;
      drawWallColumn(B, x, off, WALL_S, WALL_K, span, scroll, alpha, 0.06);
    }
  }
  // Duvar dibi temas gölgesi: binaları zemine "oturtur" (3B ipucu)
  const span2 = planeBaseY - horizonY;
  for(const side of [-1, 1]){
    for(const [alpha, k] of [[0.20, 0.055], [0.10, 0.11]]){
      ctx.globalAlpha = alpha; ctx.fillStyle = '#141021';
      ctx.beginPath();
      let started = false;
      const maxOff = side>0 ? (W - vanishX) : vanishX;
      const pts = [];
      for(let off = 26; off <= maxOff; off += 7){
        const x = vanishX + side*off;
        const u = WALL_S * laneSpreadPx / off;
        pts.push([x, horizonY + span2/u]);
      }
      if(pts.length > 1){
        ctx.moveTo(pts[0][0], pts[0][1]);
        for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0], pts[i][1]);
        for(let i=pts.length-1;i>=0;i--){
          const drop = (pts[i][1] - horizonY) * k;   // yakında kalın, uzakta ince
          ctx.lineTo(pts[i][0], pts[i][1] + drop);
        }
        ctx.closePath(); ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
}

/* Sahil bulvarı dekoru: iki yanda düzenli ritimle ağaçlar, aralarında
   sokak lambaları — hepsi zeminle aynı saatte akar, pustan çıkıp gelir. */
let DECO_DU = 3.4;         // ağaç aralığı (derinlik); lambalar tam ortalarında
let BOLLARD_DU = 0.85;     // dubalar sık dizilir (kaldırım kenarı boyunca)
let TREE_SIDE = 1.84, LAMP_SIDE = 1.62, BOLLARD_SIDE = 1.70;
function drawFlowingScenery(){
  const hasTree = !!IMAGES.prop_tree, hasLamp = !!IMAGES.prop_lamp, hasBol = !!IMAGES.prop_bollard;
  if(!hasTree && !hasLamp && !hasBol) return;
  const scroll = worldScroll * 1.15;
  const kMin = Math.floor((scroll - 1.0)/DECO_DU) - 1;
  const items = [];
  for(let k = kMin; k < kMin + 12; k++){
    const uT = k*DECO_DU - scroll + 1.0;             // ağaç derinliği
    const uL = uT + DECO_DU/2;                       // lamba: iki ağacın ortası
    for(const side of [-1,1]){
      if(hasTree && uT > 0.55 && uT < 16)
        items.push({ img:IMAGES.prop_tree, side, u:uT, h:TREE_H, s:TREE_SIDE });
      if(hasLamp && uL > 0.55 && uL < 16)
        items.push({ img:IMAGES.prop_lamp, side, u:uL, h:LAMP_H, s:LAMP_SIDE });
    }
  }
  // Dubalar: kaldırım kenarında sık ve düzenli dizi
  if(hasBol){
    const bMin = Math.floor((scroll - 1.0)/BOLLARD_DU) - 1;
    for(let k = bMin; k < bMin + 26; k++){
      const u = k*BOLLARD_DU - scroll + 1.0;
      if(u < 0.55 || u > 12) continue;
      for(const side of [-1,1])
        items.push({ img:IMAGES.prop_bollard, side, u, h:BOLLARD_H, s:BOLLARD_SIDE, fit:true });
    }
  }
  items.sort((a,b)=> b.u - a.u);                     // uzaktan yakına
  for(const it of items){
    const t = 1/Math.sqrt(it.u); if(t > 2.4) continue;
    const pos = project(it.side*it.s, t);
    ctx.globalAlpha = clamp((t - 0.24)/0.08, 0, 1);  // pustan yumuşak çıkış
    if(it.fit){
      // İçerik kutusunu ölç: görselin boş kenar payı boyutu küçültmesin
      const f = spriteFit(it.img);
      const sw = f.wRatio*it.img.width, sh = f.hRatio*it.img.height;
      const h = it.h*pos.e, w = h*sw/sh;
      if(pos.x + w/2 < 0 || pos.x - w/2 > W) continue;
      ctx.drawImage(it.img, f.left*it.img.width, f.top*it.img.height, sw, sh,
                    pos.x - w/2, pos.y - h, w, h);
    } else {
      const h = it.h*pos.e, w = h*it.img.width/it.img.height;
      if(pos.x + w/2 < 0 || pos.x - w/2 > W) continue;
      ctx.drawImage(it.img, pos.x - w/2, pos.y - h, w, h);
    }
  }
  ctx.globalAlpha = 1;
}

/* ================= GÖKYÜZÜNDE UÇAN UÇAK =================
   Arada bir gökyüzünü bir yolcu uçağı geçer (Turkish Technology'nin işine
   bir göz kırpma). Uçak binaların ARKASINDA çizilir — bg_far'ın hemen
   üstünde, zeminden/duvarlardan önce.

   YENİ HAVAYOLU EKLEMEK: görseli assets/ içine koy, aşağıdaki listeye bir
   satır ekle. İki kural:
   1) Görselin arka planı ŞEFFAF gelmeli. Koda temizleyici KOYMA — denendi,
      beyaz gövdeli uçaklarda gövdenin bir kısmını da siliyor.
   2) `dir` = uçağın BURNUNUN baktığı yön: -1 sola (varsayılan), +1 sağa.
      Uçak burnu nereye bakıyorsa oraya uçar. Görsel ASLA aynalanmaz —
      aynalanınca gövdedeki yazı ve logo ters çıkıyor. İki yönlü trafik
      isteniyorsa görselin sağa bakan sürümü üretilir (SunExpress ve
      Turkish Cargo'da böyle yapıldı).                                    */
const SKY_PLANES = [
  { key:'sky_thy',   src:'assets/ucak_thy.png'                                 },  // burnu solda
  { key:'sky_ajet',  src:'assets/ucak_ajet.png'                                },  // burnu solda
  { key:'sky_sun',   src:'assets/ucak_sunexpress.png',   dir: 1                },  // burnu sağda
  { key:'sky_cargo', src:'assets/ucak_turkishcargo.png', dir: 1, olcek:1.08    }   // sağda + daha iri uçak
];
SKY_PLANES.forEach(p => loadImage(p.key, p.src));   // hiçbir işlem yok: görsel olduğu gibi
const SKY_GAP_MIN = 11, SKY_GAP_MAX = 22;   // iki uçuş arası bekleme (sn)
let skyPlane = null, skyTimer = rand(3, 7);

/* ---- Uçak sırası: KARILMIŞ DESTE ----
   Her uçak turda bir kez uçar; deste bitmeden aynısı tekrar gelmez.
   Deste boşalınca yeniden karılıp dolar, yani uçuşlar sonsuza kadar döner.
   (İleride sorular bitince oyunun bitmesi kalkıp CAN sistemine geçilirse
   burada hiçbir değişiklik gerekmez: oyuncu ne kadar uzun oynarsa oynasın
   uçaklar sırayla uçmaya devam eder.)                                   */
let skyDeck = [], sonUcakKey = null;
function cekSkyPlane(){
  const havuz = SKY_PLANES.filter(p => IMAGES[p.key]);   // yüklenebilmiş olanlar
  if(!havuz.length) return null;
  if(!skyDeck.length){
    skyDeck = shuffle(havuz);
    // Yeni deste, bir öncekinin SON uçağıyla başlamasın (arka arkaya aynısı gelmesin)
    if(skyDeck.length > 1 && skyDeck[0].key === sonUcakKey){
      const j = 1 + Math.floor(Math.random()*(skyDeck.length-1));
      [skyDeck[0], skyDeck[j]] = [skyDeck[j], skyDeck[0]];
    }
  }
  const p = skyDeck.shift();
  sonUcakKey = p.key;
  return p;
}

function spawnSkyPlane(){
  const p = cekSkyPlane();
  if(!p){ skyTimer = 5; return; }   // görseller henüz yüklenmedi → birazdan tekrar dene
  const w0 = rand(0.26, 0.34) * (p.olcek || 1);   // ekran genişliğine oranla uçağın boyu
  skyPlane = {
    key: p.key,
    dir: p.dir || -1,                 // uçuş yönü = burnun baktığı yön
    t: 0, dur: rand(11, 16),          // ekranı baştan sona geçme süresi (sn)
    y0: rand(0.10, 0.25),             // giriş yüksekliği (sahne oranı)
    y1: rand(0.10, 0.25),             // çıkış yüksekliği → hafif tırmanış/alçalış
    w0, w1: w0 * rand(0.84, 1.0)      // uzaklaşırken hafifçe küçülür (derinlik hissi)
  };
}

function updateSkyPlane(dt){
  if(skyPlane){
    skyPlane.t += dt / skyPlane.dur;
    if(skyPlane.t >= 1){ skyPlane = null; skyTimer = rand(SKY_GAP_MIN, SKY_GAP_MAX); }
    return;
  }
  skyTimer -= dt;
  if(skyTimer <= 0) spawnSkyPlane();
}

function drawSkyPlane(){
  if(!skyPlane) return;
  const img = IMAGES[skyPlane.key]; if(!img) return;
  // İçerik kutusu: görselin şeffaf kenar payı boyutu küçültmesin
  const f = spriteFit(img);
  const sw = f.wRatio*img.width, sh = f.hRatio*img.height;
  const t = skyPlane.t;
  const w = W * lerp(skyPlane.w0, skyPlane.w1, t), h = w*sh/sw;
  // Burnu sola bakan uçak sağdan girip sola çıkar; sağa bakan tam tersi
  const disari = w/2 + W*0.08;                    // ekran dışındaki giriş/çıkış payı
  const xBas = skyPlane.dir < 0 ?  W + disari : -disari;
  const xSon = skyPlane.dir < 0 ? -disari     :  W + disari;
  const cx = lerp(xBas, xSon, t);
  // Çok hafif bir süzülme: mekanik bir kaydırma gibi durmasın
  const cy = H * lerp(skyPlane.y0, skyPlane.y1, t) + Math.sin(t*Math.PI*2)*H*0.006;
  ctx.drawImage(img, f.left*img.width, f.top*img.height, sw, sh, cx-w/2, cy-h/2, w, h);
}

function drawScene(){
  computePerspective();   // perspektifi görseldeki yola göre ayarla
  // Engele çarpınca kısa bir sarsıntı
  ctx.save();
  if(shake > 0) ctx.translate(rand(-1,1)*shake*7, rand(-1,1)*shake*5);
  if(layeredMode()){
    // KATMANLI MOD: her şey birlikte akar (gök+uzak şehir sabit — uzaktır)
    drawCover(IMAGES.bg_far);
    drawSkyPlane();           // gökyüzündeki uçak: binaların ARKASINDA kalsın
    drawGroundTextured();     // kaldırım+yol zemini akar
    drawWalls();              // binalar: ağaçların ARKASINDA, arka plan dokusu gibi
    drawFlowingScenery();     // ağaçlar + lambalar binaların ÖNÜNDEN geçer
  } else if(IMAGES.street){
    drawCover(IMAGES.street);
    drawSkyPlane();
    drawRoadTextured();       // eski mod: sabit sokak + akan yol
  } else {
    ctx.fillStyle='#bfe3ff'; ctx.fillRect(0,0,W,horizonY);          // gök
    ctx.fillStyle='#9aa0ab'; ctx.fillRect(0,horizonY,W,H-horizonY); // asfalt
  }
  drawWorldObjects();         // engeller + zarf, DERİNLİK sırasına göre çizilir
  // Koşan çocuk — başlangıç ekranında çizilmez (orada kahraman görseli var,
  // yoksa ekranda iki çocuk birden görünüyor)
  if(state !== 'idle') drawRunner();
  ctx.restore();
  // Çarpma anında kırmızı kenar parlaması
  if(hitCool > 0.75){
    ctx.save();
    const a = (hitCool-0.75)/0.35*0.45;
    const g = ctx.createRadialGradient(W/2,H/2,H*0.28, W/2,H/2,H*0.62);
    g.addColorStop(0,'rgba(220,40,40,0)'); g.addColorStop(1,`rgba(220,40,40,${a})`);
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.restore();
  }
}

/* Toplanacak SORU SİMGESİ (assets/token_question.png): siber güvenlik
   temalı küme — kapüşonlu figür, kilitli ekranlar ve büyük sarı "?".
   Uzaktayken okunan şey sarı soru işaretidir, gerisi dokusudur.
   Görsel enine (1.19:1) olduğu için boy eski zarftan küçük tutuldu;
   yoksa şeridin neredeyse tamamını kaplıyor.                            */
let TOKEN_H = 118;         // simgenin ekrandaki boyu (genişlik ~1.19 katı)
const TOKEN_LOW_Y = 108, TOKEN_HIGH_Y = 214;  // yerde / engel üstünde süzülme yüksekliği
function drawToken(){
  const tt = 1/Math.sqrt(Math.max(0.4, token.u));
  const p = project(token.lane, tt);
  const t = performance.now()/1000;
  const bobY  = Math.sin(t*2.6)*7*p.e;              // havada süzülme
  const pulse = 1 + Math.sin(t*4.2)*0.05;           // hafif nabız
  const liftY = (token.high ? TOKEN_HIGH_Y : TOKEN_LOW_Y) * p.e;
  const cx = p.x, cy = p.y - liftY + bobY;

  /* Çizim ölçüsünü ÖNCE hesaplıyoruz: hâle simgenin gerçek genişliğine
     göre büyümezse (simge enine olduğu için) tamamen arkasında kalıyor. */
  const img = IMAGES.token, f = img ? spriteFit(img) : null;
  const th = TOKEN_H*p.e*pulse;
  const tw = img ? th*(f.wRatio*img.width)/(f.hRatio*img.height) : th;

  ctx.save();
  // Mavi hâle: simgeyi sarıp "toplanacak şey" olduğunu belli eder
  const R = Math.max(tw, th)*0.66;
  const g = ctx.createRadialGradient(cx, cy, R*0.15, cx, cy, R);
  g.addColorStop(0,   'rgba(140,222,255,.80)');
  g.addColorStop(0.55,'rgba(56,170,255,.32)');
  g.addColorStop(1,   'rgba(56,170,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();

  if(img){
    ctx.drawImage(img, f.left*img.width, f.top*img.height,
                  f.wRatio*img.width, f.hRatio*img.height, cx-tw/2, cy-th/2, tw, th);
  } else {
    // Yer tutucu: sıcak renkli basit zarf (asset gelince silinecek)
    const w = 74*p.e*pulse, h = w*0.66;
    ctx.translate(cx, cy);
    ctx.fillStyle='#fffdf6'; ctx.strokeStyle='#c9a86a'; ctx.lineWidth=Math.max(1,2*p.e);
    ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h, 6*p.e); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-w/2,-h/2); ctx.lineTo(0,h*0.12); ctx.lineTo(w/2,-h/2); ctx.stroke();
  }
  ctx.restore();
}

function drawRunner(){
  const S = clamp(H/620, 0.85, 1.5);
  const x = project(plane.laneVis, 1).x;
  const footY = planeBaseY - plane.jumpY;                  // zıplayınca yukarı kalkar

  /* --- Koşu döngüsü ---
     plane.bob sürekli artıyor; her π'lik dilim bir adım (ayak vuruşu).
     lift: 0 = ayak yerde, 1 = havada (adımın tepesi)                      */
  const phase  = ((plane.bob % Math.PI) + Math.PI) % Math.PI;
  const lift   = Math.sin(phase);
  const bounce = lift * 10 * S;                    // yukarı zıplama
  const sway   = Math.sin(plane.bob/2) * 3 * S;    // sağa-sola hafif salınım
  const tilt   = Math.sin(plane.bob/2) * 0.025;    // gövdenin hafif eğilmesi
  /* Havadayken koşu ezilmesi olmamalı; aksine hafifçe uzayıp incelir.
     jAir: 0 = yerde, 1 = zıplamanın tepesinde. */
  const jAir   = clamp(plane.jumpY / JUMP_PEAK, 0, 1);
  const squash = (1 - 0.07*(1-lift)*(1-jAir)) * (1 + 0.10*jAir);
  const widen  = (1 + 0.05*(1-lift)*(1-jAir)) * (1 - 0.05*jAir);

  const frames = RUN_KEYS.filter(k => IMAGES[k]);
  if(frames.length){
    // Bir tam adım çifti (stride) = 2π. Kareler bu süreye eşit bölünür:
    // 2 kare → adım başına 1 kare, 4 kare → adım başına 2 kare.
    const step = (2*Math.PI) / frames.length;
    const idx  = ((Math.floor(plane.bob/step) % frames.length) + frames.length) % frames.length;
    const img  = IMAGES[ frames[idx] ];
    // Kareyi ölçüp normalize et: her karede figür aynı boyda, ayaklar aynı yerde
    const fit = spriteFit(img);
    const charH = 145*S;                              // ekrandaki karakter boyu (sabit)
    const k  = charH / (img.height * fit.hRatio);
    const dw = img.width*k, dh = img.height*k;

    /* Gölge YERDE kalır (planeBaseY), karakterle yükselmez — zıpladığını
       anlamanın en güçlü ipucu budur. Yükseldikçe küçülüp soluklaşır. */
    const jN = clamp(plane.jumpY / JUMP_PEAK, 0, 1);          // 0 = yerde, 1 = tepede
    ctx.save();
    ctx.globalAlpha = 0.22 * clamp(1 - bounce/(13*S), 0.3, 1) * (1 - 0.62*jN);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x + sway*0.5, planeBaseY,
                charH*0.24*(1-0.18*lift)*(1-0.42*jN),
                charH*0.07*(1-0.18*lift)*(1-0.42*jN), 0, 0, 7);
    ctx.fill(); ctx.restore();

    // çocuk: ayak noktasından ölçeklenir (bas-esne), hafif eğilir ve salınır
    ctx.save();
    ctx.translate(x + sway, footY - bounce);
    ctx.rotate(tilt);
    ctx.scale(widen, squash);
    // Yatay hiza kafaya göre: karakter karelerde sağa sola titremez
    ctx.drawImage(img, -(fit.headCx != null ? fit.headCx : fit.cx)*dw, -fit.feet*dh, dw, dh);
    ctx.restore();
    return;
  }
  // fallback: basit çocuk (kafa + gövde + bacaklar)
  const y = footY - bounce;
  ctx.fillStyle='#f1c27d'; ctx.beginPath(); ctx.arc(x, y-70*S, 15*S,0,7); ctx.fill();
  ctx.fillStyle='#ef4444'; ctx.fillRect(x-14*S, y-56*S, 28*S, 40*S);
  ctx.fillStyle='#1e3a8a'; ctx.fillRect(x-12*S, y-18*S, 10*S, 20*S); ctx.fillRect(x+2*S, y-18*S, 10*S, 20*S);
}

/* ---------- ENGELLER: akış, çarpışma, çizim ---------- */
function updateJump(dt){
  if(plane.jumpV !== 0 || plane.jumpY > 0){
    plane.jumpV -= GRAVITY*dt;
    plane.jumpY += plane.jumpV*dt;
    if(plane.jumpY <= 0){ plane.jumpY = 0; plane.jumpV = 0; }
  }
}

function updateObstacles(dt){
  if(hitCool > 0) hitCool -= dt;
  if(shake  > 0) shake  = Math.max(0, shake - dt*2.2);

  const types = Object.values(OBS_TYPES).filter(t => IMAGES[t.key]);
  for(let i=obstacles.length-1; i>=0; i--){
    const o = obstacles[i];
    o.u -= dt * FLOW_SPEED * speedMul;             // zemin/ağaçlarla aynı hız
    if(o.u <= 0.55){ obstacles.splice(i,1); continue; }
    // Çarpışma penceresi: oyuncunun hizasından geçerken
    if(!o.done && o.u < 1.06 && o.u > 0.88 && Math.abs(o.lane - plane.laneVis) < 0.5){
      const atlandi = o.kind === 'jump' && plane.jumpY > 26;   // yeterince yüksekte mi
      if(!atlandi){ o.done = true; hitObstacle(); }
    }
  }
  if(!types.length) return;
  obsTimer -= dt;
  if(obsTimer <= 0){
    /* Hız arttıkça bekleme süresini kısaltıyoruz: böylece engeller arasındaki
       DÜNYA mesafesi sabit kalır (yoksa hızlandıkça seyrekleşip kolaylaşırdı),
       ama oyuncuya kalan tepki süresi kısalır. `zorluk` ayrıca mesafeyi de
       kısaltıyor: oyun ilerledikçe engeller hem hızlı hem SIK geliyor.     */
    obsTimer = rand(1.9, 3.1) * (1 - ARA_DARALMA*zorluk) / speedMul;
    const lane = pickLane();
    if(!engelKoy(lane, types)) return;
    /* Zorluk yükseldikçe bazen İKİ şerit birden kapanır; üçüncü şerit her
       zaman açık kalır, yani çaresiz durum oluşmaz. */
    if(zorluk > 0.5 && Math.random() < 0.35*zorluk){
      const digerleri = [-1,0,1].filter(l => l !== lane);
      engelKoy(digerleri[Math.floor(Math.random()*digerleri.length)], types);
    }
  }
}

/* Bir şeride engel koyar. Zarfa fazla yakınsa koymaz ve false döner —
   oyuncunun ulaşamayacağı soru oluşmasın diye. */
function engelKoy(lane, types){
  if(!zarfaUygun(lane, 14)) return false;
  const t = types[Math.floor(Math.random()*types.length)];
  obstacles.push({ key:t.key, kind:t.kind, h:t.h, w:t.w, lane, u:14, done:false });
  return true;
}

/* ---- Zarfın etrafındaki güvenli alan ----
   Soru simgesiyle engel çok yakın doğduğunda oyuncu ikisini birden
   halledemiyor ve kendi hatası olmadan soruyu kaçırıyordu. Kural:
   AYNI şeritte zarfa 3 birimden, KOMŞU şeritte 1.3 birimden yakın engel
   olmaz. (Yüksek zarfın altındaki bariyer bilerek konur, o ayrı.) */
const ZARF_GUVENLI = 3.0, ZARF_GUVENLI_YAN = 1.3;
function zarfaUygun(lane, u){
  if(!token.active) return true;
  const d = Math.abs(u - token.u);
  if(lane === token.lane) return d >= ZARF_GUVENLI;
  return d >= ZARF_GUVENLI_YAN;
}

function hitObstacle(){
  if(hitCool > 0) return;
  hitCool = 1.1; shake = 1;
  // Engele çarpmak SADECE puan götürür, can götürmez: canlar soru kararlarına ait
  score = Math.max(0, score - OBS_PENALTY);
  updateHud();
}

function drawOneObstacle(o){
  const img = IMAGES[o.key]; if(!img) return;
  const t = 1/Math.sqrt(o.u); if(t > 2.4) return;
  const p = project(o.lane, t);
  const f = spriteFit(img);
  const sw = f.wRatio*img.width, sh = f.hRatio*img.height;
  // Saf perspektif (p.e): şerit genişliğiyle orantılı büyür/küçülür
  const h = o.w ? (o.w*p.e)*sh/sw : o.h*p.e;
  const w = o.w ?  o.w*p.e        : h*sw/sh;
  if(p.x + w/2 < 0 || p.x - w/2 > W) return;
  ctx.globalAlpha = clamp((t - 0.22)/0.10, 0, 1);
  ctx.drawImage(img, f.left*img.width, f.top*img.height, sw, sh, p.x - w/2, p.y - h, w, h);
  ctx.globalAlpha = 1;
}

/* Engeller ve zarf AYNI dünyada; ayrı ayrı çizilirse zarf her zaman üstte
   kalıyor ve arkadaki zarf öndeymiş gibi görünüyordu. Hepsini tek listede
   derinliğe göre (uzaktan yakına) sıralayıp öyle çiziyoruz.
   Eşit derinlikte zarf sonra çizilir: engelin ÜSTÜNDE duruyor demektir. */
function drawWorldObjects(){
  const liste = obstacles.map(o => ({ u:o.u, oncelik:0, ciz:()=>drawOneObstacle(o) }));
  if(token.active) liste.push({ u:token.u, oncelik:1, ciz:drawToken });
  liste.sort((a,b) => (b.u - a.u) || (a.oncelik - b.oncelik));
  for(const it of liste) it.ciz();
}

/* ---------- CAN + PUAN GÖSTERGESİ ----------
   Can tavanı sabit (3) olduğu için hep 3 kalp yeri görünür: kalanlar dolu,
   kaybedilenler sönük. Böylece çocuk "bir canım gitti"yi anında görür —
   sadece kalp sayısı azalsaydı fark etmesi zordu.

   Kalpler KULLANICININ GÖRSELİ (kodla çizilmiş şekil değil): life.png dolu,
   life2.png boş. İkisi de 3 kalplik şerit ve her kalp tam kare olduğu için
   her yuvaya şeridin kendi üçte biri gösteriliyor (CSS background-position).
   Yollar burada düz metin olarak geçmeli — paketleyici tek dosya sürümünde
   bu metinleri gömülü görselle değiştiriyor.                              */
const CAN_DOLU_SRC = 'assets/life.png', CAN_BOS_SRC = 'assets/life2.png';
const PUAN_CERCEVE_SRC = 'assets/skor_tablosu.png', PUAN_RAKAM_SRC = 'assets/score_numbers.png';

/* ---- Puan rakamları kullanıcının görselinden kesilir ----
   score_numbers.png: iki satır (üstte 0-4, altta 5-9). Rakamlar EŞİT
   aralıklı ve eşit genişlikte DEĞİL (elle çizilmiş gibi), o yüzden yerleri
   tahmin edilmiyor, alfa kanalı taranarak ölçülüyor. Dikey hizada her
   rakam kendi kutusunu değil SATIRININ kutusunu kullanır — yoksa "1" ile
   "0" farklı ölçeklenip sayı zıplardı.                                   */
let RAKAM_KUTU = null;                     // { '0':{x,y,w,h}, ... } (piksel)
function rakamlariOlc(img){
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  let d;
  try{ d = g.getImageData(0, 0, img.width, img.height).data; }catch(e){ return null; }
  const dolu = (x,y) => d[(y*img.width + x)*4 + 3] > 60;
  // 1) Satır bantlarını bul
  const bantlar = []; let bas = -1;
  for(let y = 0; y < img.height; y++){
    let n = 0; for(let x = 0; x < img.width; x++) if(dolu(x,y)) n++;
    const varMi = n > 2;
    if(varMi && bas < 0) bas = y;
    if((!varMi || y === img.height-1) && bas >= 0){ if(y - bas > 20) bantlar.push([bas, y]); bas = -1; }
  }
  // 2) Her bantta soldan sağa rakam bloklarını bul
  const kutular = [];
  for(const [y0, y1] of bantlar){
    let b = -1;
    for(let x = 0; x < img.width; x++){
      let n = 0; for(let y = y0; y <= y1; y++) if(dolu(x,y)) n++;
      const varMi = n > 2;
      if(varMi && b < 0) b = x;
      if((!varMi || x === img.width-1) && b >= 0){
        if(x - b > 20) kutular.push({ x:b, y:y0, w:x-b, h:y1-y0 });
        b = -1;
      }
    }
  }
  if(kutular.length !== 10) return null;     // beklenen düzen değil → yazıya düş
  const tablo = {};
  '0123456789'.split('').forEach((ch, i) => tablo[ch] = kutular[i]);
  return tablo;
}
/* Rakam görseli yüklenince puanı yeniden diz (o ana kadar düz yazı görünür) */
(function(){
  const img = new Image();
  img.onload = ()=>{
    IMAGES.puanRakam = img; RAKAM_KUTU = null;
    const k = $('#scoreVal'); if(k) k.dataset.puan = '';
    updateHud();
  };
  img.onerror = ()=>{};
  img.src = assetURL(PUAN_RAKAM_SRC);
})();
let canYuvalari = [];
function buildHearts(){
  const el = $('#lifeVal');
  if(!el) return;
  el.innerHTML = ''; canYuvalari = [];
  for(let i = 0; i < MAX_LIVES; i++){
    const yuva = document.createElement('i');
    yuva.className = 'can';
    // Şeritteki i. kalbi göster (3 yuva → %0, %50, %100)
    yuva.style.backgroundPosition = (MAX_LIVES > 1 ? i*100/(MAX_LIVES-1) : 0) + '% 50%';
    el.appendChild(yuva); canYuvalari.push(yuva);
  }
}
/* Puanı rakam görsellerinden dizer. Görsel henüz yüklenmediyse (ya da düzeni
   beklenenden farklıysa) düz yazıya düşer — puan her hâlükârda görünür. */
const RAKAM_Y = 26;                        // HUD'daki rakam yüksekliği (px)
/* Bir sayıyı rakam görselinden dizer. Hem HUD sayacı hem bitiş ekranındaki
   kurdele bunu kullanır. Kutuya sığmıyorsa rakamlar orantılı küçültülür. */
function rakamlariDiz(kutu, sayi, yukseklik){
  const img = IMAGES.puanRakam;
  if(img && !RAKAM_KUTU) RAKAM_KUTU = rakamlariOlc(img);
  const yazi = String(sayi);
  if(!img || !RAKAM_KUTU){ kutu.textContent = yazi; return; }   // görsel yoksa düz yazı
  kutu.textContent = '';
  const alan = kutu.clientWidth || 1e5;
  let toplam = 0;
  for(const ch of yazi){ const k = RAKAM_KUTU[ch]; if(k) toplam += yukseklik*k.w/k.h + 1; }
  const h = toplam > alan ? yukseklik * (alan/toplam) : yukseklik;
  for(const ch of yazi){
    const k = RAKAM_KUTU[ch]; if(!k) continue;
    const s = h / k.h;                                 // görselden ekrana ölçek
    const el = document.createElement('i');
    el.style.width  = (k.w * s) + 'px';
    el.style.height = h + 'px';
    el.style.backgroundImage    = 'url(' + assetURL(PUAN_RAKAM_SRC) + ')';
    el.style.backgroundSize     = (img.width*s) + 'px ' + (img.height*s) + 'px';
    el.style.backgroundPosition = (-k.x*s) + 'px ' + (-k.y*s) + 'px';
    kutu.appendChild(el);
  }
}
function renderScore(){
  const kutu = $('#scoreVal'); if(!kutu) return;
  const yazi = String(score);
  if(kutu.dataset.puan === yazi) return;   // aynı sayı → yeniden dizme
  kutu.dataset.puan = yazi;
  rakamlariDiz(kutu, score, RAKAM_Y);
}

function updateHud(degisim){
  renderScore();
  const kutu = $('#scoreBox');
  if(kutu && !kutu.style.backgroundImage)
    kutu.style.backgroundImage = 'url(' + assetURL(PUAN_CERCEVE_SRC) + ')';
  const el = $('#lifeVal');
  if(!el) return;
  if(canYuvalari.length !== MAX_LIVES) buildHearts();
  canYuvalari.forEach((yuva, i) => {
    yuva.style.backgroundImage = 'url(' + assetURL(i < lives ? CAN_DOLU_SRC : CAN_BOS_SRC) + ')';
  });
  if(degisim){
    // Kısa darbe: canın arttığı/azaldığı gözden kaçmasın
    el.classList.remove('vur');
    void el.offsetWidth;                       // animasyonu baştan tetikle
    el.classList.add('vur');
    setTimeout(()=> el.classList.remove('vur'), 500);
  }
}

/* ---------- 5) OYUN AKIŞI ---------- */
function loop(now){
  const dt = Math.min(0.05, (now-lastTime)/1000 || 0); lastTime = now;
  if(state==='flying'){
    // Oyun ilerledikçe hızlanır (bkz. SPEED_* sabitleri)
    playTime += dt;
    zorluk  = clamp(playTime/ZORLUK_SURE, 0, 1);
    speedMul = 1 + (SPEED_MAX - 1) * zorluk;
    plane.bob += dt*7*speedMul; worldScroll += dt*1.6*speedMul;   // koşu + yol akışı
    plane.laneVis += (plane.lane - plane.laneVis) * Math.min(1, dt*12);  // şerit kaydır
    updateJump(dt);
    updateObstacles(dt);
    if(token.active){
      token.u -= dt*FLOW_SPEED*speedMul;         // zarf dünyayla aynı hızda yaklaşır
      const ayniSerit = Math.abs(token.lane - plane.laneVis) < 0.5;
      const havada    = plane.jumpY > 60;        // zıplamanın belirgin kısmı
      if(token.u < TOKEN_CATCH_HI && token.u > TOKEN_CATCH_LO && ayniSerit){
        // Yüksek zarf ancak HAVADAYKEN, alçak zarf ancak YERDEYKEN yakalanır
        if(token.high ? havada : !havada){ token.active=false; openQuestion(); }
      } else if(token.u <= TOKEN_GONE_U){
        token.active = false; missQuestion();     // kaçırıldı — geri gelmez
      }
    }
  } else if(state==='idle' || state==='ended'){
    // Bekleme/bitiş ekranı: sahne arkada canlı akmaya devam eder (attract mod)
    plane.bob += dt*7; worldScroll += dt*1.6;
    plane.laneVis += (plane.lane - plane.laneVis) * Math.min(1, dt*12);
  } else if(state==='naming'){
    // İsim yazılırken manzara yavaşça aksın — donmuş kare bozuk görünüyor
    worldScroll += dt*1.6*0.45; plane.bob += dt*7*0.45;
  } else if(state==='question'){
    plane.bob += dt*2;
  }
  // Gökyüzündeki uçak oyun hızından bağımsız akar (çok uzakta, kendi seyrinde)
  if(state !== 'idle') updateSkyPlane(dt);
  // Başlangıç ekranında sahne tamamen kapalı (tam ekran tasarım) → boşuna çizme
  if(state !== 'idle') drawScene();
  requestAnimationFrame(loop);
}

function startGame(){
  resize();
  plane.lane=0; plane.laneVis=0; plane.bob=0; plane.jumpY=0; plane.jumpV=0;
  obstacles.length=0; obsTimer=2.4; hitCool=0; shake=0;
  speedMul=1; playTime=0;                 // her oyun normal hızda başlar
  skyPlane=null; skyTimer=rand(3,7);      // gökyüzü uçağı da baştan başlasın
  skyDeck.length=0; sonUcakKey=null;      // uçak sırası yeniden karılsın
  soruDestesi.length=0; aktifSoru=null;    // soru destesi yeniden karılsın
  lives = START_LIVES;
  score=0; streak=0; bestStreak=0; correct=0; total=0;
  updateHud();
  $('#startScreen').classList.add('hidden'); $('#endScreen').classList.add('hidden');
  $('#hud').classList.remove('hidden');
  nextFlight();
  lastTime = performance.now(); requestAnimationFrame(loop);
}

// Bir sonraki soruya doğru koşu (oyun canla biter, soru sayısıyla değil)
function nextFlight(){
  if(lives <= 0){ endGame(); return; }
  aktifSoru = sonrakiSoru();
  token.u = TOKEN_SPAWN_U;
  token.lane = pickLane();
  token.active = true;
  /* Zarf doğduğu anda etrafını temizle: o sırada akmakta olan engellerden
     zarfa fazla yakın olanlar kaldırılır. Aksi halde zarf ulaşılamaz doğar
     ve oyuncu kendi hatası olmadan soruyu kaçırırdı. */
  for(let i = obstacles.length-1; i >= 0; i--){
    if(!zarfaUygun(obstacles[i].lane, obstacles[i].u)) obstacles.splice(i,1);
  }
  /* Soruların bir kısmı bir BARİYERİN üstünde gelir: oyuncu ancak engelin
     üstünden atlayarak o zarfı yakalayabilir. Bariyer zarfla aynı şerit ve
     aynı derinlikte doğar. */
  token.high = !!IMAGES.barrier && Math.random() < 0.35;
  if(token.high){
    const t = OBS_TYPES.barrier;
    obstacles.push({ key:t.key, kind:t.kind, h:t.h, lane:token.lane, u:TOKEN_SPAWN_U, done:false });
    lastLanes.push(token.lane); if(lastLanes.length>3) lastLanes.shift();
  }
  state = 'flying';
  $('#questionScreen').classList.add('hidden');
}

/* Kaçırılan soru bir can götürür. Bu bir ara kaldırılmıştı çünkü soru ile
   engel üst üste doğabiliyor ve oyuncu kendi hatası olmadan can
   kaybedebiliyordu; `zarfaUygun` o durumu imkânsız hale getirdiği için
   ceza geri kondu — artık kaçırmak gerçekten oyuncunun tercihi.
   Puan cezası yine de yanlış cevaptan hafif: kaçırmak refleks hatası,
   kanmak bilgi hatası.                                                  */
function missQuestion(){
  const m = aktifSoru;
  total++;                       // doğruluk oranına yansısın
  streak = 0;
  lives--;
  score = Math.max(0, score + PTS_MISS);
  updateHud(-1);
  state = 'feedback';
  const f = $('#flash');
  $('#fTag').className = 'ftag no';
  $('#fTag').textContent = 'KAÇIRDIN ✕';
  $('#fWhy').textContent = (m.safe ? 'Bu e-posta güvenliydi. ' : 'Bu e-posta şüpheliydi. ') + m.why;
  $('#fPts').textContent = PTS_MISS + ' puan  •  −1 can';
  $('#fPts').style.color = 'var(--danger)';
  f.classList.add('show');
  setTimeout(()=>{ f.classList.remove('show'); sonrakiAdim(); }, 1700);
}

/* Geri bildirimden sonra: can bittiyse oyun biter, bitmediyse devam. */
function sonrakiAdim(){
  if(lives <= 0) endGame(); else nextFlight();
}

// Kontrol noktasına varınca soruyu aç
function openQuestion(){
  state = 'question';
  const m = aktifSoru;
  const linkHtml = m.link ? `<div class="link">${m.link}</div>` : '';
  const attachHtml = m.attach ? `<div class="attach">📎 ${m.attach}</div>` : '';
  $('#stage').innerHTML = `
    <div class="mail">
      <div class="mh">
        <div class="av" style="background:${m.c}">${initials(m.from)}</div>
        <div class="from"><div class="name">${m.from}</div><div class="addr">${m.addr}</div></div>
        <div class="when">şimdi</div>
      </div>
      <div class="mb">
        <div class="subj">${m.subj}</div>
        <div class="text">${m.text}</div>
        ${linkHtml}${attachHtml}
      </div>
    </div>`;
  $('#questionScreen').classList.remove('hidden');
}

/* ---------- 6) KARAR + GERİ BİLDİRİM ---------- */
function decide(decision){
  if(state!=='question') return;
  state = 'feedback';
  const m = aktifSoru;
  const isCorrect = (decision==='safe') === m.safe;
  total++;
  let delta;
  if(isCorrect){
    correct++; streak++; bestStreak = Math.max(bestStreak, streak);
    delta = PTS_CORRECT + (streak>=3 ? STREAK_BONUS : 0);
  } else {
    streak = 0; delta = PTS_WRONG; lives--;
  }
  score = Math.max(0, score+delta);
  updateHud(isCorrect ? 0 : -1);
  $('#questionScreen').classList.add('hidden');
  flash(isCorrect, m, delta);
}

function flash(ok, m, delta){
  const f = $('#flash');
  $('#fTag').className = 'ftag '+(ok?'ok':'no');
  $('#fTag').textContent = ok ? 'DOĞRU KARAR ✓' : 'YANLIŞ ✕';
  const truth = m.safe ? 'Bu e-posta GÜVENLİ idi. ' : 'Bu e-posta ŞÜPHELİ idi. ';
  $('#fWhy').textContent = (ok?'':truth) + m.why;
  // Can satırı sadece yanlış cevapta yazılır — can başka türlü değişmiyor
  const canYazi = ok ? '' : '  •  −1 can';
  $('#fPts').textContent = (delta>=0?'+':'')+delta+' puan' + canYazi
                         + (ok&&streak>=3?'  •  '+streak+'li seri! 🔥':'');
  $('#fPts').style.color = delta>=0 ? 'var(--safe)' : 'var(--danger)';
  f.classList.add('show');
  setTimeout(()=>{ f.classList.remove('show'); sonrakiAdim(); }, 1700);
}

/* ---------- İSİM GİRİŞİ ----------
   OYNA'ya basınca açılır; oyun ancak isim yazılıp BAŞLA'ya basılınca başlar.
   Kioskta fiziksel klavye olmayacağı için tuşlar sayfanın kendi klavyesi.
   Türkçe Q düzeni: Ğ Ü Ş İ Ö Ç dahil.                                    */
const AD_MIN = 2, AD_MAX = 12;     // 12'den uzun isim skor tablosuna sığmıyor
let yazilanAd = '';

/* Klavye enter_name.png'nin İÇİNDE çizili. Aşağıdaki koordinatlar görselin
   pikselleri taranarak ölçüldü (1024×1536 uzayında) ve yüzdeye çevrilerek
   görünmez dokunma alanlarına dönüştürülüyor. Görsel değişirse yeniden
   ölçülmeli. Shift / 123 / küre tuşları bilinçli olarak işlevsiz: isim
   yalnızca büyük harf, rakam ve dil değişimine gerek yok.                */
const AD_GORSEL_W = 1024, AD_GORSEL_H = 1536;
const TUS_YERI = (()=>{
  const liste = [];
  const satir = (harfler, xler, y, w, h) =>
    harfler.forEach((harf, i) => liste.push({ harf, x:xler[i], y, w, h }));
  satir('QWERTYUIOPĞÜ'.split(''), [60,136,212,288,366,442,518,594,670,748,824,900], 910, 64, 80);
  satir('ASDFGHJKLŞİ'.split(''),  [96,172,250,328,404,482,558,634,712,788,866],    1018, 64, 80);
  satir('ZXCVBNMÖÇ'.split(''),    [178,254,330,408,484,560,636,712,788],           1128, 64, 84);
  liste.push({ islev:'sil',   x:864, y:1128, w:108, h:84  });   // ⌫
  liste.push({ harf:' ',      x:306, y:1242, w:414, h:78  });   // Boşluk
  liste.push({ islev:'tamam', x:740, y:1242, w:232, h:78  });   // Tamam = BAŞLA
  liste.push({ islev:'tamam', x:236, y:696,  w:564, h:170 });   // BAŞLA butonu
  return liste;
})();

function klavyeKur(){
  const sahne = $('#nameStage');
  if(!sahne || sahne.querySelector('.tus-hit')) return;      // bir kez kurulur
  const yuzde = (v, tam) => (100*v/tam) + '%';
  for(const t of TUS_YERI){
    const b = document.createElement('button');
    b.className = 'tus-hit'; b.type = 'button';
    b.style.left   = yuzde(t.x, AD_GORSEL_W);
    b.style.top    = yuzde(t.y, AD_GORSEL_H);
    b.style.width  = yuzde(t.w, AD_GORSEL_W);
    b.style.height = yuzde(t.h, AD_GORSEL_H);
    b.setAttribute('aria-label', t.harf === ' ' ? 'Boşluk' : (t.harf || t.islev));
    b.addEventListener('click',
      t.islev === 'sil'   ? adSil :
      t.islev === 'tamam' ? isimOnayla :
                            ()=> adYaz(t.harf));
    sahne.appendChild(b);
  }
}

function adGuncelle(){
  $('#nameText').textContent = yazilanAd;
  const yeterli = yazilanAd.trim().length >= AD_MIN;
  $('#nameLock').classList.toggle('acik', yeterli);
}
function adYaz(harf){
  if(yazilanAd.length >= AD_MAX) return;
  // Baştan ya da arka arkaya boşluk kabul etme
  if(harf === ' ' && (!yazilanAd || yazilanAd.endsWith(' '))) return;
  yazilanAd += harf; adGuncelle();
}
function adSil(){ yazilanAd = yazilanAd.slice(0, -1); adGuncelle(); }

function isimEkraniAc(){
  klavyeKur();
  yazilanAd = ''; adGuncelle();
  $('#startScreen').classList.add('hidden');
  $('#endScreen').classList.add('hidden');
  $('#nameScreen').classList.remove('hidden');
  /* 'naming' durumunda sahne çiziliyor ve yavaşça akıyor: arkada donmuş bir
     kare durmasın. Oyun mantığı çalışmıyor, sadece manzara. */
  state = 'naming';
  lastTime = performance.now(); requestAnimationFrame(loop);
}
function isimOnayla(){
  const ad = yazilanAd.trim();
  if(ad.length < AD_MIN) return;
  playerName = ad;
  $('#nameScreen').classList.add('hidden');
  startGame();
}
/* Geliştirirken (ve varsa gerçek klavyede) yazmayı da destekle */
window.addEventListener('keydown', e => {
  if($('#nameScreen').classList.contains('hidden')) return;
  if(e.key === 'Backspace'){ e.preventDefault(); adSil(); return; }
  if(e.key === 'Enter'){ e.preventDefault(); isimOnayla(); return; }
  if(e.key === ' '){ e.preventDefault(); adYaz(' '); return; }
  if(e.key.length === 1){
    const h = e.key.toLocaleUpperCase('tr');
    if(/^[A-ZÇĞİÖŞÜ]$/.test(h)) adYaz(h);
  }
});

/* ---------- 7) BİTİŞ + BUTONLAR ---------- */
/* Skor tablosu: ilk 5. Oyuncu ilk 5'e giremediyse kendi satırı GERÇEK
   sırasıyla en alta eklenir — yoksa çocuk kendi puanını hiç göremezdi.
   `kayit` bu oyunun kaydı (nesne kimliğiyle bulunur, aynı puanlı başka
   satırla karışmaz), `sira` ise listeye eklendikten sonraki 0 tabanlı sırası. */
const LB_SATIR = 8;          // panelde kaç sıra (end_page5 paneli daha büyük)
function renderLb(target, kayit, sira){
  const sirali = LB.slice().sort((a,b)=>b.sc-a.sc);
  const satirlar = sirali.slice(0, LB_SATIR).map((r,i)=>({ r, i }));
  if(sira >= LB_SATIR) satirlar.push({ r:kayit, i:sira });
  $(target).innerHTML = satirlar.map(({r,i}) =>
    `<div class="lb-satir ${r===kayit?'ben':''}">` +
      `<div class="rk">${i+1}</div><div class="nm">${r.nm}</div><div class="sc">${r.sc}</div>` +
    `</div>`).join('');
}

/* Bitiş ekranı: tasarımın kendisi görselde (başlık, ikonlar, butonlar).
   Kod yalnızca üç boş alanı doldurur: en uzun seri, doğruluk oranı ve
   skor tablosu.                                                        */
function endGame(){
  state = 'ended';
  $('#hud').classList.add('hidden');
  $('#questionScreen').classList.add('hidden');
  /* Kayıt eklenir, sıralanır; oyuncunun gerçek sırası KIRPMADAN ÖNCE alınır.
     Liste ilk 20'ye kırpılıyor: kioskta gün boyu oynanınca localStorage
     sonsuza kadar büyümesin. */
  const kayit = { nm:playerName, sc:score };
  LB.push(kayit);
  LB.sort((a,b) => b.sc - a.sc);
  const sira = LB.indexOf(kayit);
  if(LB.length > 20) LB.length = 20;
  saveLb(LB);
  renderLb('#lbRows', kayit, sira);
  /* Ekranı ÖNCE göster: kurdeledeki rakamlar kutunun ölçüsüne göre
     boyutlanıyor, gizliyken ölçü sıfır çıkıyor.                        */
  $('#endScreen').classList.remove('hidden');
  const skorEl = $('#endSkor');
  if(skorEl) rakamlariDiz(skorEl, score, skorEl.clientHeight * 0.62);
}

// Butonlar
$('#zoneSafe').addEventListener('click', ()=> decide('safe'));
$('#zoneDanger').addEventListener('click', ()=> decide('danger'));
// OYNA → önce isim, sonra oyun (BAŞLA/Tamam tuşları klavyeKur içinde bağlanır)
$('#startBtn').addEventListener('click', isimEkraniAc);
/* TEKRAR DENE ismi korur: aynı çocuk yeniden oynuyor demektir. Sıradaki
   çocuk için ANA SAYFA'dan girilince isim yeniden sorulur. */
$('#againBtn').addEventListener('click', startGame);
// Görseldeki "ANA SAYFA" butonu: başlangıç ekranına dön (sahne arkada akmaya devam eder)
$('#homeBtn').addEventListener('click', ()=>{
  $('#endScreen').classList.add('hidden');
  $('#startScreen').classList.remove('hidden');
  state = 'idle';
});

/* ---- Açılış: başlangıç ekranının ARKASINDA sahne canlı aksın (attract mod) ---- */
resize();
{
  // Başlangıç ekranı: kullanıcının hazırladığı tam ekran tasarım
  const home = assetURL('assets/home_page2.png');
  const a = $('#homeImg'), b = $('#homeBg');
  if(a) a.src = home;
  if(b) b.src = home;
  // Bitiş ekranı tasarımı: sahnenin zemini + arkasında bulanık kopya
  const son = assetURL('assets/end_page5.png');
  const es = $('#endStage'), eb = $('#endBg');
  if(es) es.style.backgroundImage = 'url(' + son + ')';
  if(eb) eb.src = son;
  // İsim ekranı tasarımı (klavye dahil görselin içinde)
  const isim = assetURL('assets/enter_name.png');
  const ns = $('#nameStage'), nb = $('#nameBg');
  if(ns) ns.style.backgroundImage = 'url(' + isim + ')';
  if(nb) nb.src = isim;
}
state = 'idle';
lastTime = performance.now();
requestAnimationFrame(loop);
