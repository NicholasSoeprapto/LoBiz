'use strict';

/* =============================================================
   0. CONSTANTS
   ============================================================= */
var KATEGORI_LIST = ['Kuliner', 'Fashion & Kriya', 'Kerajinan Tangan', 'Pertanian & Perikanan', 'Jasa', 'Lainnya'];
var EMOJI_BY_KATEGORI = {
  'Kuliner':                '☕',
  'Fashion & Kriya':        '🧵',
  'Kerajinan Tangan':       '🧺',
  'Pertanian & Perikanan':  '🌶️',
  'Jasa':                   '📷',
  'Lainnya':                '🏪'
};
var DB_KEY      = 'LoBiz_db_v1';
var SESSION_KEY = 'LoBiz_session_v1';

/* =============================================================
   1. UTILITIES
   ============================================================= */
function escapeHtml(str){
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function uid(prefix){ return prefix+'_'+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4); }
function formatRupiah(n){ n=Math.round(n||0); return 'Rp'+n.toLocaleString('id-ID'); }
function formatDateShort(iso){
  var d=new Date(iso);
  if(isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
}
function isoDateOnly(d){ return d.toISOString().slice(0,10); }
function daysAgoIso(n){ var d=new Date(); d.setDate(d.getDate()-n); return isoDateOnly(d); }
function clampStars(n){ n=parseInt(n,10)||0; return Math.max(0,Math.min(5,n)); }

async function hashPassword(pw){
  try{
    if(window.crypto&&window.crypto.subtle){
      var enc=new TextEncoder().encode(pw);
      var buf=await window.crypto.subtle.digest('SHA-256',enc);
      return Array.prototype.map.call(new Uint8Array(buf),function(b){ return b.toString(16).padStart(2,'0'); }).join('');
    }
  }catch(e){}
  var h=0,s=pw||'';
  for(var i=0;i<s.length;i++){ h=(h<<5)-h+s.charCodeAt(i); h|=0; }
  return 'fallback_'+Math.abs(h).toString(16);
}

function showToast(message,type){
  var wrap=document.getElementById('toast-wrap');
  var el=document.createElement('div');
  el.className='toast'+(type?' '+type:'');
  el.textContent=message;
  wrap.appendChild(el);
  setTimeout(function(){ el.remove(); },3200);
}

/* =============================================================
   2. DATA LAYER
   ============================================================= */
var DB=null;

function loadDB(){
  try{ var raw=localStorage.getItem(DB_KEY); if(raw) return JSON.parse(raw); }
  catch(e){ console.warn('Gagal membaca database lokal.',e); }
  return null;
}
function saveDB(){ try{ localStorage.setItem(DB_KEY,JSON.stringify(DB)); return true; }catch(e){ showToast('Penyimpanan browser penuh. Hapus beberapa foto lalu coba lagi.','error'); return false; } }

function genTransaksi(produkIds,days,avgPerDay){
  var out=[];
  for(var d=days-1;d>=0;d--){
    var tanggal=daysAgoIso(d);
    var txToday=Math.random()<0.82?Math.max(0,Math.round(avgPerDay+(Math.random()*2-1)*avgPerDay*0.7)):0;
    for(var t=0;t<txToday;t++){
      var pid=produkIds[Math.floor(Math.random()*produkIds.length)];
      out.push({id:uid('tx'),tanggal:tanggal,produkId:pid,jumlah:1+Math.floor(Math.random()*3)});
    }
  }
  return out;
}

async function buildSeedDB(){
  var passHash={};
  var demos=['admin123','siti123','made123'];
  for(var i=0;i<demos.length;i++) passHash[demos[i]]=await hashPassword(demos[i]);

  var seeds=[
    {id:'m1',ownerUsername:'siti',nama:'Kopi Kertas',kategori:'Kuliner',kota:'Bandung',
     deskripsi:'Kedai kopi rumahan dengan biji lokal Jawa Barat, disangrai kecil setiap minggu agar selalu segar.',
     status:'terverifikasi',produk:[
       {id:'p1',nama:'Kopi Susu Gula Aren',harga:18000},
       {id:'p2',nama:'V60 Single Origin',harga:25000},
       {id:'p3',nama:'Es Kopi Kertas Signature',harga:22000}]},
    {id:'m2',ownerUsername:'made',nama:'Rumah Tenun Alit',kategori:'Fashion & Kriya',kota:'Denpasar',
     deskripsi:'Kain dan selendang tenun ikat khas Bali, ditenun tangan oleh perajin keluarga selama tiga generasi.',
     status:'terverifikasi',produk:[
       {id:'p4',nama:'Selendang Tenun Motif Patra',harga:185000},
       {id:'p5',nama:'Kain Tenun Endek 2m',harga:320000}]},
    {id:'m3',ownerUsername:null,nama:'Kebun Rempah Ibu',kategori:'Pertanian & Perikanan',kota:'Malang',
     deskripsi:'Rempah dan bumbu dapur kering hasil panen kebun keluarga di lereng Bromo, tanpa pengawet.',
     status:'terverifikasi',produk:[
       {id:'p6',nama:'Bubuk Cabai Rawit 100g',harga:15000},
       {id:'p7',nama:'Paket Bumbu Dapur Lengkap',harga:35000}]},
    {id:'m4',ownerUsername:null,nama:'Sepatu Kulit Bapak',kategori:'Kerajinan Tangan',kota:'Yogyakarta',
     deskripsi:'Sepatu dan sandal kulit asli buatan tangan, dikerjakan satu per satu di bengkel kecil Kotagede.',
     status:'terverifikasi',produk:[
       {id:'p8',nama:'Sepatu Loafer Kulit Sapi',harga:425000},
       {id:'p9',nama:'Sandal Kulit Kasual',harga:195000}]},
    {id:'m5',ownerUsername:null,nama:'Jasa Foto Kenangan',kategori:'Jasa',kota:'Surabaya',
     deskripsi:'Layanan foto acara keluarga dan UMKM, termasuk produk katalog untuk kebutuhan usaha kecil.',
     status:'terverifikasi',produk:[
       {id:'p10',nama:'Paket Foto Produk (20 foto)',harga:250000},
       {id:'p11',nama:'Sesi Foto Keluarga 1 jam',harga:400000}]},
    {id:'m6',ownerUsername:null,nama:'Sambal Bu Ratih',kategori:'Kuliner',kota:'Semarang',
     deskripsi:'Sambal botolan rumahan dengan lima varian level pedas, dimasak segar tiap dua hari sekali.',
     status:'terverifikasi',produk:[
       {id:'p12',nama:'Sambal Bawang 250ml',harga:28000},
       {id:'p13',nama:'Sambal Terasi 250ml',harga:28000},
       {id:'p14',nama:'Paket Coba 3 Varian',harga:75000}]},
    {id:'m7',ownerUsername:null,nama:'Batik Lereng Biru',kategori:'Fashion & Kriya',kota:'Surakarta',
     deskripsi:'Batik tulis dan cap dengan pewarna alami, motif klasik lereng dan modern kontemporer.',
     status:'terverifikasi',produk:[
       {id:'p15',nama:'Kemeja Batik Tulis',harga:275000},
       {id:'p16',nama:'Kain Batik Cap 2.5m',harga:165000}]},
    {id:'m8',ownerUsername:null,nama:'Anyaman Rotan Kalimantan',kategori:'Kerajinan Tangan',kota:'Banjarmasin',
     deskripsi:'Keranjang dan tas anyaman rotan asli Kalimantan, dianyam oleh kelompok perajin ibu-ibu setempat.',
     status:'menunggu',produk:[
       {id:'p17',nama:'Tas Anyaman Rotan Kecil',harga:145000},
       {id:'p18',nama:'Keranjang Serbaguna',harga:95000}]},
    {id:'m9',ownerUsername:null,nama:'Kedai Jamu Segar',kategori:'Kuliner',kota:'Medan',
     deskripsi:'Jamu tradisional racikan turun-temurun, diracik segar setiap pagi tanpa bahan pengawet.',
     status:'menunggu',produk:[
       {id:'p19',nama:'Jamu Kunyit Asam 500ml',harga:12000},
       {id:'p20',nama:'Jamu Beras Kencur 500ml',harga:12000}]}
  ];

  var reviewerNames=['Budi Santoso','Ayu Lestari','Rian Pratama','Dewi Anjani','Fajar Nugroho','Sri Wahyuni','Agus Salim','Nadia Putri'];
  var komentarPositif=[
    'Kualitasnya bagus, sesuai deskripsi.',
    'Pelayanan ramah, pesanan datang tepat waktu.',
    'Akan beli lagi, harga juga bersahabat.',
    'Rasanya autentik, khas banget.',
    'Rapi dan dikemas dengan baik.',
    'Sudah langganan dari tahun lalu, konsisten kualitasnya.'
  ];

  var users=[{id:'u-admin',role:'admin',username:'admin',passwordHash:passHash['admin123'],nama:'Admin LoBiz'}];
  var umkm=[], ratings=[];

  seeds.forEach(function(seed){
    var produkIds=seed.produk.map(function(p){ return p.id; });
    var transaksi=seed.status==='terverifikasi'?genTransaksi(produkIds,14,3):[];
    var record={
      id:seed.id, ownerId:null, nama:seed.nama, kategori:seed.kategori,
      kota:seed.kota, deskripsi:seed.deskripsi, status:seed.status,
      emoji:EMOJI_BY_KATEGORI[seed.kategori]||'🏪',
      dibuat:daysAgoIso(20+Math.floor(Math.random()*40)),
      produk:seed.produk, transaksi:transaksi
    };
    umkm.push(record);

    if(seed.ownerUsername){
      var ownerId='u-'+seed.ownerUsername;
      users.push({
        id:ownerId, role:'owner', username:seed.ownerUsername,
        passwordHash:passHash[seed.ownerUsername+'123'],
        nama:seed.ownerUsername==='siti'?'Siti Amara':'Made Wirawan',
        umkmId:record.id
      });
      record.ownerId=ownerId;
    }

    if(seed.status==='terverifikasi'){
      var rc=2+Math.floor(Math.random()*3);
      for(var r=0;r<rc;r++){
        ratings.push({
          id:uid('r'), umkmId:record.id,
          nama:reviewerNames[Math.floor(Math.random()*reviewerNames.length)],
          rating:3+Math.floor(Math.random()*3),
          komentar:komentarPositif[Math.floor(Math.random()*komentarPositif.length)],
          tanggal:daysAgoIso(Math.floor(Math.random()*25))
        });
      }
    }
  });

  return {users:users,umkm:umkm,ratings:ratings};
}

async function ensureDemoCustomer(){
  if(DB.users.some(function(u){ return u.username==='budi'; })) return;
  DB.users.push({id:'u-cust-budi',role:'customer',username:'budi',passwordHash:await hashPassword('budi123'),nama:'Budi'});
  saveDB();
}
async function initDB(){
  var existing=loadDB();
  if(existing){ DB=existing; return; }
  DB=await buildSeedDB();
  saveDB();
}

/* =============================================================
   3. DERIVED DATA HELPERS
   ============================================================= */
function findUmkm(id){ return DB.umkm.find(function(u){ return u.id===id; }); }
function findUser(id){ return DB.users.find(function(u){ return u.id===id; }); }
function ratingsFor(umkmId){ return DB.ratings.filter(function(r){ return r.umkmId===umkmId; }); }
function avgRating(umkmId){
  var list=ratingsFor(umkmId);
  if(!list.length) return 0;
  return list.reduce(function(a,r){ return a+r.rating; },0)/list.length;
}
function starString(avg){
  var full=Math.round(avg);
  return '★★★★★'.slice(0,full)+'☆☆☆☆☆'.slice(0,5-full);
}
function produkTerjual(umkm,produkId){
  return umkm.transaksi.filter(function(t){ return t.produkId===produkId; })
    .reduce(function(a,t){ return a+t.jumlah; },0);
}
function totalPendapatan(umkm){
  return umkm.transaksi.reduce(function(a,t){
    var p=umkm.produk.find(function(x){ return x.id===t.produkId; });
    return a+(p?p.harga*t.jumlah:0);
  },0);
}
function totalTerjualUnit(umkm){ return umkm.transaksi.reduce(function(a,t){ return a+t.jumlah; },0); }
function trend14Hari(umkm){
  var byDate={};
  umkm.transaksi.forEach(function(t){
    var p=umkm.produk.find(function(x){ return x.id===t.produkId; });
    var v=p?p.harga*t.jumlah:0;
    byDate[t.tanggal]=(byDate[t.tanggal]||0)+v;
  });
  var out=[];
  for(var d=13;d>=0;d--){
    var iso=daysAgoIso(d);
    var dt=new Date(iso);
    out.push({label:dt.toLocaleDateString('id-ID',{day:'numeric',month:'short'}),value:byDate[iso]||0});
  }
  return out;
}
function produkTerlarisData(umkm){
  return umkm.produk
    .map(function(p){ return {label:p.nama,value:produkTerjual(umkm,p.id)}; })
    .sort(function(a,b){ return b.value-a.value; });
}

/* =============================================================
   4. SESSION / AUTH
   ============================================================= */
function getSession(){ try{ return JSON.parse(localStorage.getItem(SESSION_KEY)||'null'); }catch(e){ return null; } }
function setSession(userId){ localStorage.setItem(SESSION_KEY,JSON.stringify({userId:userId})); }
function clearSession(){ localStorage.removeItem(SESSION_KEY); }
function currentUser(){ var s=getSession(); if(!s) return null; return findUser(s.userId)||null; }

async function login(username,password){
  var user=DB.users.find(function(u){ return u.username.toLowerCase()===String(username).toLowerCase(); });
  if(!user) return {ok:false};
  var hash=await hashPassword(password);
  if(hash!==user.passwordHash) return {ok:false};
  setSession(user.id);
  return {ok:true,user:user};
}
function logout(){
  clearSession();
  showToast('Anda telah keluar.');
  navigateTo('home');
  renderNavAuthArea();
}

/* =============================================================
   5. VALIDATION HELPERS
   ============================================================= */
function setFieldError(inputEl,hasError){
  var group=inputEl.closest('.form-group');
  if(group) group.classList.toggle('error',!!hasError);
}
function requiredValid(inputEl){
  var ok=inputEl.value.trim().length>0;
  setFieldError(inputEl,!ok);
  return ok;
}

/* =============================================================
   6. NAVIGATION / ROUTER
   ============================================================= */
var state={
  view:'home', detailUmkmId:null, ownerTab:'ringkasan', adminTab:'verifikasi',
  filters:{q:'',kategori:'',kota:'',sort:'terbaru',minRating:0,official:false}
};

function navigateTo(view,opts){
  opts=opts||{};
  var user=currentUser();
  if(view==='owner'&&(!user||user.role!=='owner')){
    showToast('Silakan masuk sebagai pemilik UMKM terlebih dahulu.','error');
    openAuthModal('login'); return;
  }
  if(view==='admin'&&(!user||user.role!=='admin')){
    showToast('Halaman ini khusus admin.','error');
    openAuthModal('login'); return;
  }
  state.view=view;
  if(opts.detailUmkmId) state.detailUmkmId=opts.detailUmkmId;
  document.querySelectorAll('.view').forEach(function(v){ v.classList.remove('active'); });
  var el=document.getElementById('view-'+view);
  if(el) el.classList.add('active');
  if(view==='home')   renderDirectory();
  if(view==='detail') renderDetail(state.detailUmkmId);
  if(view==='owner')  renderOwnerDashboard();
  if(view==='admin')  renderAdminDashboard();
  window.scrollTo({top:0,behavior:'auto'});
}

/* =============================================================
   7. RENDER: NAVBAR
   ============================================================= */
var MSGBTN='<button type="button" class="btn btn-ghost btn-sm msg-nav-btn" id="msg-open">💬 Pesan <span class="msg-badge" style="display:none">0</span></button>';
function renderNavAuthArea(){
  var wrap=document.getElementById('nav-actions');
  var user=currentUser();
  if(!user){
    wrap.innerHTML=
      '<button class="btn btn-outline btn-sm" data-action="open-login">Masuk</button>'+
      '<button class="btn btn-ghost btn-sm" data-action="open-register-customer">Daftar Pelanggan</button>'+
      '<button class="btn btn-primary btn-sm" data-action="open-register-umkm">Daftarkan UMKM</button>';
    if(window.updateMsgBadge) window.updateMsgBadge();
    return;
  }
  var label=user.role==='admin'?'Dashboard Admin':'Dashboard Toko';
  var target=user.role==='admin'?'admin':'owner';
  wrap.innerHTML=MSGBTN+
    '<div class="nav-user">'+
      '<div><div class="nav-user-name">'+escapeHtml(user.nama)+'</div>'+
      '<div class="nav-user-role">'+({admin:'Administrator',owner:'Pemilik UMKM',customer:'Pelanggan'}[user.role]||'')+'</div></div>'+
      (user.role==='customer'?'':'<button class="btn btn-primary btn-sm" data-navto="'+target+'">'+label+'</button>')+
      '<button class="btn btn-ghost btn-sm" data-action="logout">Keluar</button>'+
    '</div>';
  if(window.updateMsgBadge) window.updateMsgBadge();
}

/* =============================================================
   8. RENDER: HOME / DIRECTORY
   ============================================================= */
function populateKategoriSelects(){
  ['search-kategori','reg-kategori','profil-kategori'].forEach(function(id){
    var sel=document.getElementById(id);
    if(!sel) return;
    var keepFirst=id==='search-kategori';
    var html=keepFirst?'<option value="">Semua kategori</option>':'';
    KATEGORI_LIST.forEach(function(k){ html+='<option value="'+escapeHtml(k)+'">'+escapeHtml(k)+'</option>'; });
    sel.innerHTML=html;
  });
  var kotaSel=document.getElementById('search-kota');
  var kotaSet=Array.from(new Set(DB.umkm.filter(function(u){ return u.status==='terverifikasi'; }).map(function(u){ return u.kota; }))).sort();
  var kotaHtml='<option value="">Semua kota</option>';
  kotaSet.forEach(function(k){ kotaHtml+='<option value="'+escapeHtml(k)+'">'+escapeHtml(k)+'</option>'; });
  kotaSel.innerHTML=kotaHtml;
}

function renderHeroStats(){
  renderTicker();
  var verified=DB.umkm.filter(function(u){ return u.status==='terverifikasi'; });
  var kota=new Set(verified.map(function(u){ return u.kota; }));
  var wrap=document.getElementById('hero-stats');
  wrap.innerHTML=
    '<div class="hero-stat"><b>'+verified.length+'</b><span>UMKM terverifikasi</span></div>'+
    '<div class="hero-stat"><b>'+kota.size+'</b><span>Kota terjangkau</span></div>'+
    '<div class="hero-stat"><b>'+DB.ratings.length+'</b><span>Ulasan pembeli</span></div>';
}

function renderKategoriPills(){
  var wrap=document.getElementById('kategori-pills');
  var html='<button type="button" class="pill'+(state.filters.kategori===''?' active':'')+'" data-pill="">Semua</button>';
  KATEGORI_LIST.forEach(function(k){
    html+='<button type="button" class="pill'+(state.filters.kategori===k?' active':'')+'" data-pill="'+escapeHtml(k)+'">'+escapeHtml(k)+'</button>';
  });
  wrap.innerHTML=html;
}

function renderDirectory(){
  renderHeroStats();
  populateKategoriSelects();
  renderKategoriPills();
  var f=state.filters;
  var list=DB.umkm.filter(function(u){ return u.status==='terverifikasi'; });
  computeDirectoryMetrics(list); renderSortChips();
  if(f.q){ var q=f.q.toLowerCase(); list=list.filter(function(u){ return u.nama.toLowerCase().indexOf(q)!==-1; }); }
  if(f.kategori) list=list.filter(function(u){ return u.kategori===f.kategori; });
  if(f.kota)     list=list.filter(function(u){ return u.kota===f.kota; });
  if(f.minRating) list=list.filter(function(u){ return METR[u.id].avg>=f.minRating; });
  if(f.official)  list=list.filter(function(u){ return ratingsFor(u.id).some(function(r){ return r.official; }); });
  list=sortList(list,f.sort);

  var grid=document.getElementById('directory-grid');
  if(!list.length){
    grid.innerHTML='<div class="empty-state"><h4>Belum ada UMKM yang cocok</h4><p>Coba ubah kata kunci, kategori, atau kota pencarian Anda.</p></div>';
    return;
  }
  grid.innerHTML=list.map(function(u){
    var avg=avgRating(u.id), count=ratingsFor(u.id).length;
    return (
      '<div class="umkm-card">'+
        '<a href="#" class="umkm-card-link" data-detail="'+u.id+'">'+
          '<div class="umkm-card-top"><img loading="lazy" src="'+(u.cover||stockImg(u.kategori,0,u.id))+'" alt="'+escapeHtml(u.nama)+'"><div class="umkm-tags">'+(TAGS[u.id]||[]).map(function(t){ return '<span>'+t+'</span>'; }).join('')+'</div><span class="umkm-card-emoji">'+u.emoji+'</span></div>'+
        '</a>'+
        '<div class="umkm-card-body">'+
          '<span class="umkm-card-cat">'+escapeHtml(u.kategori)+' · '+escapeHtml(u.kota)+'</span>'+
          '<a href="#" data-detail="'+u.id+'" style="text-decoration:none;color:inherit;"><h3>'+escapeHtml(u.nama)+'</h3></a>'+
          '<p class="umkm-card-desc">'+escapeHtml(truncate(u.deskripsi,90))+'</p>'+
          '<div class="umkm-card-stats">👥 '+METR[u.id].buyers+' pembeli · 🛒 '+METR[u.id].units+' terjual</div>'+
          '<div class="umkm-card-foot">'+
            '<span><span class="stars">'+starString(avg)+'</span> <span class="rating-count">('+count+')</span></span>'+
            '<span class="badge badge-verified">✓ Terverifikasi</span>'+
          '</div>'+
        '</div>'+
      '</div>'
    );
  }).join('');
}

function truncate(s,n){ return s.length>n?s.slice(0,n-1)+'…':s; }
function cardTint(kategori){
  var map={
    'Kuliner':'linear-gradient(135deg,#F3E3D3,#EDD5BE)',
    'Fashion & Kriya':'linear-gradient(135deg,#E4E6EF,#D4D8EE)',
    'Kerajinan Tangan':'linear-gradient(135deg,#EFE6D8,#E4D8C4)',
    'Pertanian & Perikanan':'linear-gradient(135deg,#E1EBDD,#D1E6CA)',
    'Jasa':'linear-gradient(135deg,#E6EDF2,#D4E4EF)',
    'Lainnya':'linear-gradient(135deg,#FBEAE2,#F0D9D0)'
  };
  return map[kategori]||'linear-gradient(135deg,#FBEAE2,#F0D9D0)';
}

/* =============================================================
   9. RENDER: DETAIL UMKM
   ============================================================= */
function renderDetail(id){
  var u=findUmkm(id);
  if(!u){ navigateTo('home'); return; }
  renderDetailVisuals(u);
  document.getElementById('detail-nama').textContent=u.nama;
  document.getElementById('detail-kategori').textContent=u.kategori;
  document.getElementById('detail-kota').textContent=u.kota;
  document.getElementById('detail-desc').textContent=u.deskripsi;
  var avg=avgRating(u.id), count=ratingsFor(u.id).length;
  document.getElementById('detail-stars').textContent=starString(avg);
  document.getElementById('detail-rating-text').textContent=count?(avg.toFixed(1)+' dari '+count+' ulasan'):'Belum ada ulasan';
  document.getElementById('detail-produk').innerHTML=u.produk.map(function(p){
    return '<div class="product-row"><div class="product-left"><img class="product-thumb" src="'+produkImg(u,p)+'" alt=""><div><div class="product-name">'+escapeHtml(p.nama)+'</div><div class="product-sold">'+produkTerjual(u,p.id)+' terjual</div></div></div><div class="product-price">'+formatRupiah(p.harga)+'</div></div>';
  }).join('')||'<p class="form-hint">Belum ada produk terdaftar.</p>';
  var reviews=ratingsFor(u.id).slice().sort(function(a,b){ return (b.official?1:0)-(a.official?1:0) || new Date(b.tanggal)-new Date(a.tanggal); });
  document.getElementById('detail-review-count').textContent=reviews.length;
  document.getElementById('detail-reviews').innerHTML=reviews.length?reviews.map(function(r){
    return '<div class="review'+(r.official?' review-official':'')+'"><div class="review-top"><span class="review-name">'+escapeHtml(r.nama)+(r.official?' <span class="official-badge">✔ Ulasan Resmi</span>':'')+'</span><span class="review-date">'+formatDateShort(r.tanggal)+'</span></div><div class="stars">'+starString(r.rating)+'</div>'+(r.komentar?'<div class="review-text">'+escapeHtml(r.komentar)+'</div>':'')+'</div>';
  }).join(''):'<p class="form-hint">Jadilah yang pertama memberi ulasan.</p>';
  document.getElementById('rating-form').reset();
  (function(){
    var cu=currentUser(), role=cu?cu.role:'guest', adm=role==='admin', cust=role==='customer';
    var form=document.getElementById('rating-form'), gate=document.getElementById('review-gate');
    var nm=document.getElementById('rating-nama'), btn=document.getElementById('review-submit-btn');
    form.style.display=(adm||cust)?'block':'none';
    if(adm||cust){ nm.value=adm?'Tim LoBiz':cu.nama; nm.readOnly=true; }
    document.getElementById('review-form-title').textContent=adm?'Beri ulasan resmi Tim LoBiz':'Beri rating & ulasan';
    btn.textContent=adm?'Kirim ulasan resmi':'Kirim ulasan';
    if(cust){
      var ex=DB.ratings.find(function(r){ return r.umkmId===u.id&&r.userId===cu.id; });
      if(ex){ document.getElementById('rating-star-input').dataset.value=String(ex.rating); updateStarInputUI(); document.getElementById('rating-komentar').value=ex.komentar||''; btn.textContent='Perbarui ulasan'; }
    }
    gate.style.display=(adm||cust)?'none':'block';
    if(!adm&&!cust) gate.innerHTML=(role==='owner'?'<p>Akun pemilik UMKM tidak bisa menulis ulasan. Masuk dengan akun pelanggan untuk memberi ulasan.</p>':'<p>Untuk menulis ulasan, Anda perlu masuk dengan akun pelanggan. Gratis dan hanya butuh satu menit.</p>')+'<div class="review-gate-btns"><button type="button" class="btn btn-primary btn-sm" data-action="open-login">Masuk</button><button type="button" class="btn btn-outline btn-sm" data-action="open-register-customer">Daftar Pelanggan</button></div>';
  })();
  var si=document.getElementById('rating-star-input');
  si.dataset.value='0';
  updateStarInputUI();
  document.querySelectorAll('#view-detail .form-group').forEach(function(g){ g.classList.remove('error'); });
}

/* =============================================================
   10. CHARTS (canvas — no external dependency)
   ============================================================= */
function setupCanvasHiDPI(canvas,cssHeight){
  var cssWidth=canvas.parentElement.clientWidth;
  var dpr=window.devicePixelRatio||1;
  canvas.style.width=cssWidth+'px'; canvas.style.height=cssHeight+'px';
  canvas.width=Math.round(cssWidth*dpr); canvas.height=Math.round(cssHeight*dpr);
  var ctx=canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  return {ctx:ctx,w:cssWidth,h:cssHeight};
}

function drawBarChart(canvasId,items,color){
  var canvas=document.getElementById(canvasId);
  if(!canvas) return;
  var s=setupCanvasHiDPI(canvas,220), ctx=s.ctx, w=s.w, h=s.h;
  ctx.clearRect(0,0,w,h);
  var pL=8,pR=8,pT=12,pB=36,cW=w-pL-pR,cH=h-pT-pB;
  var max=Math.max.apply(null,items.map(function(i){ return i.value; }).concat([1]));
  var n=items.length||1, gap=14;
  var barW=Math.max(10,(cW-gap*(n-1))/n);
  ctx.strokeStyle='#F7E7E0'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(pL,pT+cH); ctx.lineTo(pL+cW,pT+cH); ctx.stroke();
  items.forEach(function(item,i){
    var barH=max>0?(item.value/max)*(cH-18):0;
    var x=pL+i*(barW+gap), y=pT+cH-barH;
    ctx.fillStyle=color;
    var r=Math.min(6,barW/2);
    roundRectPath(ctx,x,y,barW,barH,r); ctx.fill();
    ctx.fillStyle='#2A1216'; ctx.font='600 12px "Plus Jakarta Sans",sans-serif'; ctx.textAlign='center';
    ctx.fillText(String(item.value),x+barW/2,y-6>=pT?y-6:pT+10);
    ctx.fillStyle='#7A6168'; ctx.font='600 10.5px "Plus Jakarta Sans",sans-serif';
    var lbl=item.label.length>12?item.label.slice(0,11)+'…':item.label;
    ctx.fillText(lbl,x+barW/2,pT+cH+16);
  });
}

function roundRectPath(ctx,x,y,w,h,r){
  if(h<=0) h=0.0001;
  ctx.beginPath();
  ctx.moveTo(x,y+h); ctx.lineTo(x,y+r);
  ctx.arcTo(x,y,x+r,y,r); ctx.lineTo(x+w-r,y);
  ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h);
  ctx.closePath();
}

function drawTrendChart(canvasId,points,color){
  var canvas=document.getElementById(canvasId);
  if(!canvas) return;
  var s=setupCanvasHiDPI(canvas,220), ctx=s.ctx, w=s.w, h=s.h;
  ctx.clearRect(0,0,w,h);
  var pL=10,pR=10,pT=16,pB=30,cW=w-pL-pR,cH=h-pT-pB;
  var max=Math.max.apply(null,points.map(function(p){ return p.value; }).concat([1]));
  var n=points.length, stepX=n>1?cW/(n-1):0;
  ctx.strokeStyle='#F7E7E0'; ctx.lineWidth=1;
  for(var g=0;g<=3;g++){ var gy=pT+(cH/3)*g; ctx.beginPath(); ctx.moveTo(pL,gy); ctx.lineTo(pL+cW,gy); ctx.stroke(); }
  function xy(i){ return [pL+i*stepX, pT+cH-(max>0?(points[i].value/max)*cH:0)]; }
  ctx.beginPath();
  points.forEach(function(p,i){ var v=xy(i); if(i===0) ctx.moveTo(v[0],v[1]); else ctx.lineTo(v[0],v[1]); });
  ctx.lineTo(pL+cW,pT+cH); ctx.lineTo(pL,pT+cH); ctx.closePath();
  ctx.fillStyle=color+'22'; ctx.fill();
  ctx.beginPath();
  points.forEach(function(p,i){ var v=xy(i); if(i===0) ctx.moveTo(v[0],v[1]); else ctx.lineTo(v[0],v[1]); });
  ctx.strokeStyle=color; ctx.lineWidth=2.2; ctx.lineJoin='round'; ctx.stroke();
  points.forEach(function(p,i){ var v=xy(i); ctx.beginPath(); ctx.arc(v[0],v[1],2.6,0,Math.PI*2); ctx.fillStyle=color; ctx.fill(); });
  ctx.fillStyle='#7A6168'; ctx.font='600 10px "Plus Jakarta Sans",sans-serif'; ctx.textAlign='center';
  points.forEach(function(p,i){ if(n>8&&i%2!==0) return; var v=xy(i); ctx.fillText(p.label,v[0],pT+cH+18); });
}

/* =============================================================
   11. RENDER: OWNER DASHBOARD
   ============================================================= */
function currentOwnerUmkm(){ var u=currentUser(); if(!u||u.role!=='owner') return null; return findUmkm(u.umkmId); }

function renderOwnerDashboard(){
  var u=currentOwnerUmkm();
  if(!u) return;
  document.getElementById('owner-toko-nama').textContent=u.nama;
  var badge=document.getElementById('owner-status-badge');
  if(u.status==='terverifikasi')    { badge.className='badge badge-verified'; badge.textContent='✓ Terverifikasi'; }
  else if(u.status==='menunggu')    { badge.className='badge badge-pending';  badge.textContent='⏳ Menunggu verifikasi'; }
  else                              { badge.className='badge badge-rejected'; badge.textContent='✕ Ditolak'; }
  document.getElementById('stat-pendapatan').textContent=formatRupiah(totalPendapatan(u));
  document.getElementById('stat-terjual').textContent=totalTerjualUnit(u)+' unit';
  var avg=avgRating(u.id);
  document.getElementById('stat-rating').textContent=ratingsFor(u.id).length?(avg.toFixed(1)+' ★'):'Belum ada';
  document.getElementById('stat-produk').textContent=u.produk.length;
  drawTrendChart('chart-trend',trend14Hari(u),'#8A0A25');
  drawBarChart('chart-produk',produkTerlarisData(u).slice(0,5),'#FFAA00');
  renderHalamanTab(u);
  renderProdukTable(u);
  document.getElementById('profil-nama').value=u.nama;
  document.getElementById('profil-kategori').value=u.kategori;
  document.getElementById('profil-kota').value=u.kota;
  document.getElementById('profil-deskripsi').value=u.deskripsi;
  setOwnerTab(state.ownerTab);
}

function renderProdukTable(u){
  var body=document.getElementById('produk-table-body');
  if(!u.produk.length){ body.innerHTML='<tr><td colspan="5"><p class="form-hint">Belum ada produk. Tambahkan produk pertama Anda di atas.</p></td></tr>'; return; }
  body.innerHTML=u.produk.map(function(p){
    return '<tr><td>'+escapeHtml(p.nama)+'</td><td>'+formatRupiah(p.harga)+'</td><td>'+produkTerjual(u,p.id)+'</td>'+
      '<td><div class="table-actions"><input type="number" min="1" value="1" style="width:64px;padding:6px 8px;" id="qty-'+p.id+'"><button class="icon-btn" data-catat="'+p.id+'">Catat jual</button></div></td>'+
      '<td><button class="icon-btn danger" data-hapus-produk="'+p.id+'">Hapus</button></td></tr>';
  }).join('');
}

function setOwnerTab(tab){
  state.ownerTab=tab;
  document.querySelectorAll('#owner-nav [data-dashtab]').forEach(function(a){ a.classList.toggle('active',a.dataset.dashtab===tab); });
  document.querySelectorAll('#view-owner .dash-tab').forEach(function(t){ t.classList.remove('active'); });
  document.getElementById('owner-tab-'+tab).classList.add('active');
}

/* =============================================================
   12. RENDER: ADMIN DASHBOARD
   ============================================================= */
function renderAdminDashboard(){
  var pending=DB.umkm.filter(function(u){ return u.status==='menunggu'; });
  document.getElementById('admin-pending-list').innerHTML=pending.length?pending.map(function(u){
    return '<div class="panel" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">'+
      '<div><div style="font-weight:700;font-size:16px;">'+escapeHtml(u.nama)+' <span class="badge badge-pending" style="margin-left:6px;">Menunggu</span></div>'+
      '<div class="form-hint" style="margin-top:4px;">'+escapeHtml(u.kategori)+' · '+escapeHtml(u.kota)+' · diajukan '+formatDateShort(u.dibuat)+'</div>'+
      '<p style="font-size:13.5px;color:var(--muted);margin-top:8px;max-width:60ch;">'+escapeHtml(u.deskripsi)+'</p></div>'+
      '<div class="table-actions"><button class="btn btn-primary btn-sm" data-verify="'+u.id+'">Setujui</button>'+
      '<button class="btn btn-danger-outline btn-sm" data-reject="'+u.id+'">Tolak</button></div></div>';
  }).join(''):'<div class="empty-state"><h4>Tidak ada yang menunggu</h4><p>Semua pengajuan UMKM sudah diproses.</p></div>';

  document.getElementById('admin-all-table-body').innerHTML=DB.umkm.map(function(u){
    var sb=u.status==='terverifikasi'?'<span class="badge badge-verified">✓ Terverifikasi</span>':
           u.status==='menunggu'?'<span class="badge badge-pending">⏳ Menunggu</span>':
           '<span class="badge badge-rejected">✕ Ditolak</span>';
    return '<tr><td>'+escapeHtml(u.nama)+'</td><td>'+escapeHtml(u.kategori)+'</td><td>'+escapeHtml(u.kota)+'</td><td>'+sb+'</td>'+
           '<td><button class="icon-btn danger" data-hapus-umkm="'+u.id+'">Hapus</button></td></tr>';
  }).join('');

  var vc=DB.umkm.filter(function(u){ return u.status==='terverifikasi'; }).length;
  var pc=DB.umkm.filter(function(u){ return u.status==='menunggu'; }).length;
  document.getElementById('admin-stat-total').textContent=DB.umkm.length;
  document.getElementById('admin-stat-verified').textContent=vc;
  document.getElementById('admin-stat-pending').textContent=pc;
  document.getElementById('admin-stat-ratings').textContent=DB.ratings.length;

  drawBarChart('chart-admin-kategori',KATEGORI_LIST.map(function(k){
    return {label:k,value:DB.umkm.filter(function(u){ return u.kategori===k&&u.status==='terverifikasi'; }).length};
  }),'#8A0A25');
  setAdminTab(state.adminTab);
}

function setAdminTab(tab){
  state.adminTab=tab;
  document.querySelectorAll('#view-admin [data-dashtab-admin]').forEach(function(a){ a.classList.toggle('active',a.dataset.dashtabAdmin===tab); });
  document.querySelectorAll('#view-admin .dash-tab').forEach(function(t){ t.classList.remove('active'); });
  document.getElementById('admin-tab-'+tab).classList.add('active');
}

/* =============================================================
   13. STAR INPUT
   ============================================================= */
function updateStarInputUI(){
  var input=document.getElementById('rating-star-input');
  var val=parseInt(input.dataset.value,10)||0;
  input.querySelectorAll('button').forEach(function(btn){ btn.classList.toggle('on',parseInt(btn.dataset.star,10)<=val); });
}

/* =============================================================
   14. MODAL CONTROL
   ============================================================= */
function openAuthModal(tab){
  var overlay=document.getElementById('auth-overlay');
  overlay.classList.remove('hidden');
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ overlay.classList.add('modal-visible'); }); });
  setAuthTab(tab||'login');
}
function closeModal(){
  var overlay=document.getElementById('auth-overlay');
  overlay.classList.remove('modal-visible');
  overlay.addEventListener('transitionend',function handler(e){
    if(e.propertyName==='backdrop-filter'||e.propertyName==='background'){
      overlay.classList.add('hidden');
      overlay.removeEventListener('transitionend',handler);
    }
  });
}
function setAuthTab(tab){
  document.querySelectorAll('[data-authtab]').forEach(function(b){ b.classList.toggle('active',b.dataset.authtab===tab); });
  document.getElementById('login-form').classList.toggle('hidden',tab!=='login');
  document.getElementById('register-form').classList.toggle('hidden',tab!=='register');
  document.getElementById('register-customer-form').classList.toggle('hidden',tab!=='customer');
  document.getElementById('auth-title').textContent=tab==='login'?'Masuk':tab==='customer'?'Daftar Pelanggan':'Daftarkan UMKM';
}

/* =============================================================
   15. EVENT WIRING
   ============================================================= */
function wireEvents(){
  document.addEventListener('click',function(e){
    var t=e.target;

    var navto=t.closest('[data-nav]');
    if(navto){ e.preventDefault(); navigateTo(navto.dataset.nav); return; }

    var navtoBtn=t.closest('[data-navto]');
    if(navtoBtn){ e.preventDefault(); navigateTo(navtoBtn.dataset.navto); return; }

    var scrollLink=t.closest('[data-scroll]');
    if(scrollLink&&state.view!=='home'){ e.preventDefault(); navigateTo('home'); setTimeout(function(){ document.getElementById(scrollLink.dataset.scroll).scrollIntoView({behavior:'smooth'}); },30); return; }

    var detailLink=t.closest('[data-detail]');
    if(detailLink){ e.preventDefault(); navigateTo('detail',{detailUmkmId:detailLink.dataset.detail}); return; }

    var action=t.closest('[data-action]');
    if(action){
      e.preventDefault();
      var a=action.dataset.action;
      if(a==='open-login')         openAuthModal('login');
      else if(a==='open-register-umkm') openAuthModal('register');
      else if(a==='open-register-customer') openAuthModal('customer');
      else if(a==='close-modal')   closeModal();
      else if(a==='logout')        logout();
      else if(a==='reset-demo'){
        if(confirm('Reset seluruh data demo (akun, UMKM, rating) ke kondisi awal?')){
          localStorage.removeItem(DB_KEY); localStorage.removeItem(SESSION_KEY); location.reload();
        }
      }
      return;
    }

    var authTabBtn=t.closest('[data-authtab]');
    if(authTabBtn){ setAuthTab(authTabBtn.dataset.authtab); return; }

    var pill=t.closest('[data-pill]');
    if(pill){ state.filters.kategori=pill.dataset.pill; renderDirectory(); return; }

    var star=t.closest('#rating-star-input button');
    if(star){ document.getElementById('rating-star-input').dataset.value=star.dataset.star; updateStarInputUI(); return; }

    var ownerTab=t.closest('#owner-nav [data-dashtab]');
    if(ownerTab){ e.preventDefault(); setOwnerTab(ownerTab.dataset.dashtab); return; }

    var adminTab=t.closest('[data-dashtab-admin]');
    if(adminTab){ e.preventDefault(); setAdminTab(adminTab.dataset.dashtabAdmin); return; }

    var verifyBtn=t.closest('[data-verify]');
    if(verifyBtn){ setUmkmStatus(verifyBtn.dataset.verify,'terverifikasi'); return; }
    var rejectBtn=t.closest('[data-reject]');
    if(rejectBtn){ setUmkmStatus(rejectBtn.dataset.reject,'ditolak'); return; }
    var deleteUmkmBtn=t.closest('[data-hapus-umkm]');
    if(deleteUmkmBtn){ deleteUmkm(deleteUmkmBtn.dataset.hapusUmkm); return; }
    var deleteProdukBtn=t.closest('[data-hapus-produk]');
    if(deleteProdukBtn){ deleteProduk(deleteProdukBtn.dataset.hapusProduk); return; }
    var catatBtn=t.closest('[data-catat]');
    if(catatBtn){ catatPenjualan(catatBtn.dataset.catat); return; }
  });

  document.getElementById('auth-overlay').addEventListener('click',function(e){ if(e.target.id==='auth-overlay') closeModal(); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeModal(); });
  document.getElementById('nav-toggle').addEventListener('click',function(){
    var links=document.querySelector('.nav-links');
    links.style.display=links.style.display==='flex'?'none':'flex';
  });

  document.getElementById('search-form').addEventListener('submit',function(e){
    e.preventDefault();
    state.filters.q=document.getElementById('search-q').value.trim();
    state.filters.kategori=document.getElementById('search-kategori').value;
    state.filters.kota=document.getElementById('search-kota').value;
    if(state.view!=='home') navigateTo('home'); else renderDirectory();
    setTimeout(function(){ document.getElementById('direktori').scrollIntoView({behavior:'smooth'}); },20);
  });
  document.getElementById('sort-select').addEventListener('change',function(){ state.filters.sort=this.value; renderDirectory(); });

  document.getElementById('login-form').addEventListener('submit',async function(e){
    e.preventDefault();
    var userEl=document.getElementById('login-username'), passEl=document.getElementById('login-password');
    if(!requiredValid(userEl)||!requiredValid(passEl)) return;
    document.getElementById('login-error').style.display='none';
    var result=await login(userEl.value.trim(),passEl.value);
    if(!result.ok){ setFieldError(passEl,true); document.getElementById('login-error').style.display='block'; return; }
    closeModal(); renderNavAuthArea();
    showToast('Selamat datang kembali, '+result.user.nama+'.','success');
    if(result.user.role==='customer'){ if(state.view==='detail') renderDetail(state.detailUmkmId); }
    else navigateTo(result.user.role==='admin'?'admin':'owner');
    this.reset();
  });

  document.getElementById('register-customer-form').addEventListener('submit',async function(e){
    e.preventDefault();
    var ok=true;
    ['cust-nama','cust-username','cust-password'].forEach(function(id){ if(!requiredValid(document.getElementById(id))) ok=false; });
    var uEl=document.getElementById('cust-username'), pEl=document.getElementById('cust-password'), er=document.getElementById('cust-username-error');
    er.style.display='none';
    if(DB.users.some(function(x){ return x.username.toLowerCase()===uEl.value.trim().toLowerCase(); })){ setFieldError(uEl,true); er.style.display='block'; ok=false; }
    if(pEl.value.length<6){ setFieldError(pEl,true); ok=false; }
    if(!ok) return;
    var id=uid('u'), hash=await hashPassword(pEl.value);
    DB.users.push({id:id,role:'customer',username:uEl.value.trim(),passwordHash:hash,nama:document.getElementById('cust-nama').value.trim().slice(0,40)});
    saveDB(); setSession(id); closeModal(); renderNavAuthArea();
    showToast('Akun pelanggan berhasil dibuat. Selamat datang!','success');
    this.reset(); if(state.view==='detail') renderDetail(state.detailUmkmId);
  });

  document.getElementById('register-form').addEventListener('submit',async function(e){
    e.preventDefault();
    var fields=['reg-nama-usaha','reg-kategori','reg-kota','reg-deskripsi','reg-username','reg-password'];
    var allOk=true;
    fields.forEach(function(id){ if(!requiredValid(document.getElementById(id))) allOk=false; });
    var usernameEl=document.getElementById('reg-username'), passEl=document.getElementById('reg-password');
    var taken=DB.users.some(function(u){ return u.username.toLowerCase()===usernameEl.value.trim().toLowerCase(); });
    document.getElementById('reg-username-error').style.display='none';
    if(taken){ setFieldError(usernameEl,true); document.getElementById('reg-username-error').style.display='block'; allOk=false; }
    if(passEl.value.length<6){ setFieldError(passEl,true); allOk=false; }
    if(!allOk) return;

    var newUmkmId=uid('m'), newUserId=uid('u'), hash=await hashPassword(passEl.value);
    var kat=document.getElementById('reg-kategori').value;
    DB.umkm.push({
      id:newUmkmId, ownerId:newUserId,
      nama:document.getElementById('reg-nama-usaha').value.trim(),
      kategori:kat, kota:document.getElementById('reg-kota').value.trim(),
      deskripsi:document.getElementById('reg-deskripsi').value.trim(),
      status:'menunggu', emoji:EMOJI_BY_KATEGORI[kat]||'🏪',
      dibuat:isoDateOnly(new Date()), produk:[], transaksi:[]
    });
    DB.users.push({id:newUserId,role:'owner',username:usernameEl.value.trim(),passwordHash:hash,nama:usernameEl.value.trim(),umkmId:newUmkmId});
    saveDB(); setSession(newUserId); closeModal(); renderNavAuthArea();
    showToast('UMKM berhasil didaftarkan! Menunggu verifikasi admin.','success');
    this.reset(); navigateTo('owner');
  });

  document.getElementById('rating-form').addEventListener('submit',function(e){
    e.preventDefault();
    var namaEl=document.getElementById('rating-nama');
    var okNama=requiredValid(namaEl);
    var starVal=clampStars(document.getElementById('rating-star-input').dataset.value);
    document.getElementById('rating-star-error').style.display=starVal>0?'none':'block';
    if(!okNama||starVal===0) return;
    var cu2=currentUser(), isAdm=!!(cu2&&cu2.role==='admin');
    if(!cu2||cu2.role==='owner'){ showToast('Masuk atau daftar sebagai pelanggan untuk menulis ulasan.','error'); openAuthModal('login'); return; }
    if(!isAdm){
      var ex2=DB.ratings.find(function(r){ return r.umkmId===state.detailUmkmId&&r.userId===cu2.id; });
      if(ex2){ ex2.rating=starVal; ex2.komentar=document.getElementById('rating-komentar').value.trim().slice(0,400); ex2.tanggal=isoDateOnly(new Date()); saveDB(); showToast('Ulasan Anda diperbarui.','success'); renderDetail(state.detailUmkmId); return; }
    }
    DB.ratings.push({id:uid('r'),umkmId:state.detailUmkmId,userId:cu2.id,nama:isAdm?'Tim LoBiz':cu2.nama,official:isAdm,rating:starVal,komentar:document.getElementById('rating-komentar').value.trim().slice(0,240),tanggal:isoDateOnly(new Date())});
    saveDB(); showToast(isAdm?'Ulasan resmi Tim LoBiz terkirim!':'Terima kasih atas ulasan Anda!','success'); renderDetail(state.detailUmkmId);
  });

  document.getElementById('add-produk-form').addEventListener('submit',function(e){
    e.preventDefault();
    var namaEl=document.getElementById('produk-nama'), hargaEl=document.getElementById('produk-harga');
    var okNama=requiredValid(namaEl), harga=parseInt(hargaEl.value,10), okHarga=harga>0;
    setFieldError(hargaEl,!okHarga);
    if(!okNama||!okHarga) return;
    var u=currentOwnerUmkm();
    u.produk.push({id:uid('p'),nama:namaEl.value.trim().slice(0,60),harga:harga});
    saveDB(); this.reset(); showToast('Produk ditambahkan.','success'); renderOwnerDashboard();
  });

  document.getElementById('profil-form').addEventListener('submit',function(e){
    e.preventDefault();
    var fields=['profil-nama','profil-kategori','profil-kota','profil-deskripsi'];
    var allOk=true;
    fields.forEach(function(id){ if(!requiredValid(document.getElementById(id))) allOk=false; });
    if(!allOk) return;
    var u=currentOwnerUmkm();
    u.nama=document.getElementById('profil-nama').value.trim().slice(0,60);
    u.kategori=document.getElementById('profil-kategori').value;
    u.kota=document.getElementById('profil-kota').value.trim().slice(0,40);
    u.deskripsi=document.getElementById('profil-deskripsi').value.trim().slice(0,280);
    u.emoji=EMOJI_BY_KATEGORI[u.kategori]||u.emoji;
    saveDB(); showToast('Profil toko diperbarui.','success'); renderOwnerDashboard();
  });

  window.addEventListener('resize',debounce(function(){
    if(state.view==='owner') renderOwnerDashboard();
    if(state.view==='admin') renderAdminDashboard();
  },200));
}

function debounce(fn,wait){
  var t;
  return function(){ var args=arguments,ctx=this; clearTimeout(t); t=setTimeout(function(){ fn.apply(ctx,args); },wait); };
}

function setUmkmStatus(id,status){
  var u=findUmkm(id); if(!u) return;
  u.status=status;
  if(status==='terverifikasi'&&u.transaksi.length===0&&u.produk.length)
    u.transaksi=genTransaksi(u.produk.map(function(p){ return p.id; }),14,2);
  saveDB();
  showToast(status==='terverifikasi'?'UMKM disetujui dan kini tampil di direktori.':'UMKM ditolak.',status==='terverifikasi'?'success':'error');
  renderAdminDashboard();
}

function deleteUmkm(id){
  if(!confirm('Hapus UMKM ini beserta produk dan ulasannya? Tindakan ini tidak bisa dibatalkan.')) return;
  DB.umkm=DB.umkm.filter(function(u){ return u.id!==id; });
  DB.ratings=DB.ratings.filter(function(r){ return r.umkmId!==id; });
  saveDB(); showToast('UMKM dihapus.','success'); renderAdminDashboard();
}

function deleteProduk(produkId){
  var u=currentOwnerUmkm(); if(!u) return;
  if(!confirm('Hapus produk ini?')) return;
  u.produk=u.produk.filter(function(p){ return p.id!==produkId; });
  u.transaksi=u.transaksi.filter(function(t){ return t.produkId!==produkId; });
  saveDB(); showToast('Produk dihapus.','success'); renderOwnerDashboard();
}

function catatPenjualan(produkId){
  var u=currentOwnerUmkm(); if(!u) return;
  var qtyEl=document.getElementById('qty-'+produkId);
  var qty=parseInt(qtyEl.value,10);
  if(!qty||qty<1){ showToast('Jumlah tidak valid.','error'); return; }
  u.transaksi.push({id:uid('tx'),tanggal:isoDateOnly(new Date()),produkId:produkId,jumlah:qty});
  saveDB(); showToast('Penjualan dicatat.','success'); renderOwnerDashboard();
}

/* =============================================================
   16. SCROLL ANIMATIONS & VISUAL ENHANCEMENTS
   ============================================================= */
function initNavbarScroll(){
  var navbar=document.querySelector('.navbar');
  window.addEventListener('scroll',function(){ navbar.classList.toggle('scrolled',window.scrollY>10); },{passive:true});
}

function initScrollReveal(){
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){ if(entry.isIntersecting){ entry.target.classList.add('visible'); io.unobserve(entry.target); } });
  },{threshold:0.12});

  function observeTargets(){
    document.querySelectorAll('.section-head,.umkm-card,.stat-card,.chart-card,.panel').forEach(function(el){
      if(!el.classList.contains('anim-fade-up')){ el.classList.add('anim-fade-up'); io.observe(el); }
    });
    var stepsEl=document.querySelector('.steps');
    if(stepsEl&&!stepsEl.classList.contains('anim-stagger')){
      stepsEl.classList.add('anim-stagger');
      var sIo=new IntersectionObserver(function(entries){
        entries.forEach(function(entry){ if(entry.isIntersecting){ entry.target.classList.add('visible'); sIo.unobserve(entry.target); } });
      },{threshold:0.15});
      sIo.observe(stepsEl);
    }
    ['hero-side','cta-band'].forEach(function(cls){
      var el=document.querySelector('.'+cls);
      if(el&&!el.classList.contains('anim-fade-up')){ el.classList.add('anim-fade-up'); io.observe(el); }
    });
  }

  observeTargets();
  var origRD=window._origRenderDirectory||renderDirectory;
  window._origRenderDirectory=origRD;
  renderDirectory=function(){ origRD.apply(this,arguments); setTimeout(observeTargets,40); };
}

function initHeroParallax(){
  var pattern=document.querySelector('.hero-pattern');
  if(!pattern) return;
  window.addEventListener('scroll',function(){ pattern.style.transform='translateY('+(window.scrollY*0.18)+'px)'; },{passive:true});
}

function animateCounter(el,target,duration){
  var start=null;
  function step(ts){
    if(!start) start=ts;
    var p=Math.min((ts-start)/duration,1), ease=1-Math.pow(1-p,3);
    el.textContent=Math.round(target*ease);
    if(p<1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function initHeroStatCounters(){
  var statsEl=document.getElementById('hero-stats');
  if(!statsEl) return;
  var observed=false;
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting&&!observed){
        observed=true;
        statsEl.querySelectorAll('b').forEach(function(b){ var v=parseInt(b.textContent,10); if(!isNaN(v)) animateCounter(b,v,900); });
        io.unobserve(entry.target);
      }
    });
  },{threshold:0.5});
  io.observe(statsEl);
  var origRHS=renderHeroStats;
  renderHeroStats=function(){ origRHS.apply(this,arguments); observed=false; io.observe(statsEl); };
}

function initRipple(){
  document.addEventListener('click',function(e){
    var btn=e.target.closest('.btn');
    if(!btn) return;
    var rect=btn.getBoundingClientRect();
    var size=Math.max(rect.width,rect.height)*1.4;
    var ripple=document.createElement('span');
    ripple.className='btn-ripple';
    ripple.style.cssText='width:'+size+'px;height:'+size+'px;left:'+(e.clientX-rect.left-size/2)+'px;top:'+(e.clientY-rect.top-size/2)+'px;';
    btn.appendChild(ripple);
    ripple.addEventListener('animationend',function(){ ripple.remove(); });
  });
}

/* =============================================================
   17. PASSWORD TOGGLE
   ============================================================= */
function initPasswordToggle(){
  var eyeOpen='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var eyeOff ='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  document.addEventListener('click',function(e){
    var btn=e.target.closest('[data-pw-toggle]');
    if(!btn) return;
    var input=document.getElementById(btn.dataset.pwToggle);
    if(!input) return;
    var showing=input.type==='text';
    input.type=showing?'password':'text';
    btn.innerHTML=showing?eyeOpen:eyeOff;
    btn.setAttribute('aria-label',showing?'Tampilkan kata sandi':'Sembunyikan kata sandi');
  });
}

/* =============================================================
   18. DARK MODE  —  circular reveal (transform:scale) from toggle origin
   ============================================================= */
function initDarkMode(){
  var btn   = document.getElementById('theme-toggle');
  var track = btn.querySelector('.theme-toggle-track');
  var wipe  = document.getElementById('theme-wipe');
  var circle = wipe.querySelector('.wipe-circle');
  var saved = localStorage.getItem('LoBiz_theme');

  // Apply saved or system preference
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if(saved === 'dark' || (!saved && prefersDark)) document.body.classList.add('dark');

  // Keep wipe layer background in sync so it shows the NEW theme colour
  function syncWipeBg(){
    var goingDark = !document.body.classList.contains('dark'); // about to toggle TO dark
    circle.style.background = goingDark
      ? 'linear-gradient(135deg, #1A0509 60%, #1C0D10)'
      : 'linear-gradient(135deg, #FFF8F4 60%, #FCEBE3)';
  }

  btn.addEventListener('click', function(e){
    var rect   = btn.getBoundingClientRect();
    var xPct   = ((rect.left + rect.width  / 2) / window.innerWidth  * 100).toFixed(2) + '%';
    var yPct   = ((rect.top  + rect.height / 2) / window.innerHeight * 100).toFixed(2) + '%';

    syncWipeBg();
    wipe.style.setProperty('--wx', xPct);
    wipe.style.setProperty('--wy', yPct);

    // Little pulse ring on the switch itself, for tactile feedback at the origin
    track.classList.remove('pulse');
    void track.offsetWidth; // force reflow so the animation can re-fire
    track.classList.add('pulse');

    // Reset wipe animation so it can re-fire
    wipe.classList.remove('wipe-active');
    void circle.offsetWidth;               // force reflow
    wipe.classList.add('wipe-active');

    // Toggle theme once the circle has covered enough of the screen to hide the switch
    // (tuned to the new, slightly longer .68s duration)
    setTimeout(function(){
      document.body.classList.toggle('dark');
      localStorage.setItem('LoBiz_theme', document.body.classList.contains('dark') ? 'dark' : 'light');
    }, 190);

    // Clean up after animation
    wipe.addEventListener('animationend', function handler(){
      wipe.classList.remove('wipe-active');
      wipe.removeEventListener('animationend', handler);
    });
  });
}

/* =============================================================
   19. INIT
   ============================================================= */
async function init(){
  await initDB();
  await ensureDemoCustomer();
  wireEvents();
  setupExtras();
  renderNavAuthArea();
  navigateTo('home');
  initNavbarScroll();
  initHeroParallax();
  initRipple();
  initPasswordToggle();
  initDarkMode();
  setTimeout(function(){
    initScrollReveal();
    initHeroStatCounters();
  }, 60);
}

/* =============================================================
   LOBIZ EXTRAS: gambar bawaan, upload, halaman toko, filter, ticker
   ============================================================= */
var STOCK={
  'Kuliner':[['#FF7A1A','#F2142B'],['🍜','🧋','🥟','🍢']],
  'Fashion & Kriya':[['#8A0A25','#D81B60'],['👗','🧵','👜','👚']],
  'Kerajinan Tangan':[['#D98500','#8A0A25'],['🧶','🏺','🪡','🎨']],
  'Pertanian & Perikanan':[['#2E8B57','#9ACD32'],['🌾','🐟','🥬','🍅']],
  'Jasa':[['#2F6DB5','#8A0A25'],['🛠️','💇','🧺','📦']],
  'Lainnya':[['#F2142B','#FFAA00'],['🏪','🛍️','🎁','⭐']]
};
var TEMA={merah:['58,6,19','138,10,37'],oranye:['120,40,0','242,80,30'],amber:['110,60,0','217,133,0'],hijau:['10,60,30','46,139,87']};
var METR={}, TAGS={};
function hashStr(s){ var h=0; for(var i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))|0; return Math.abs(h); }
function stockImg(kat,v,seed){
  var d=STOCK[kat]||STOCK['Lainnya'], h=hashStr(String(seed||'x')+v), c=d[0], em=d[1][(h+v)%4], ang=(h%60)+v*25;
  var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><defs><linearGradient id="g" gradientTransform="rotate('+ang+' .5 .5)"><stop offset="0" stop-color="'+c[0]+'"/><stop offset="1" stop-color="'+c[1]+'"/></linearGradient></defs><rect width="800" height="500" fill="url(#g)"/><circle cx="'+(120+h%500)+'" cy="'+(60+h%120)+'" r="'+(120+v*30)+'" fill="#fff" opacity=".13"/><circle cx="'+(650-h%300)+'" cy="430" r="'+(90+h%80)+'" fill="#fff" opacity=".1"/><rect x="0" y="390" width="800" height="110" fill="#000" opacity=".12"/><text x="400" y="320" font-size="210" text-anchor="middle">'+em+'</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function produkImg(u,p){ return p.foto||stockImg(u.kategori,2,p.id); }
function dayDiff(iso){ return Math.floor((Date.now()-new Date(iso).getTime())/864e5); }
function metrics(u){
  var tx=u.transaksi||[], r3=0, p4=0, t7=0, units=0;
  tx.forEach(function(t){ var d=dayDiff(t.tanggal); units+=t.jumlah; if(d<=2) r3++; else if(d<=6) p4++; if(d<=6) t7++; });
  var avg=avgRating(u.id);
  return {buyers:tx.length, units:units, trend:r3-p4*0.75, hot:t7*(0.6+avg/5)+r3*1.5, ulasan:ratingsFor(u.id).length, avg:avg};
}
function computeDirectoryMetrics(ver){
  METR={}; TAGS={};
  ver.forEach(function(u){ METR[u.id]=metrics(u); TAGS[u.id]=[]; });
  function top(key,n,min){ return ver.slice().sort(function(a,b){ return METR[b.id][key]-METR[a.id][key]; }).slice(0,n).filter(function(u){ return METR[u.id][key]>min; }); }
  top('hot',3,0).forEach(function(u){ TAGS[u.id].push('🔥 Hot'); });
  top('trend',3,0).forEach(function(u){ TAGS[u.id].push('📈 Trending'); });
  top('units',1,0).forEach(function(u){ TAGS[u.id].push('🏆 Terlaris'); });
  ver.slice().sort(function(a,b){ return new Date(b.dibuat)-new Date(a.dibuat); }).slice(0,2).forEach(function(u){ TAGS[u.id].push('🆕 Baru'); });
}
var SORT_CHIPS=[['hot','🔥 Hot'],['trending','📈 Trending'],['terlaris','🏆 Terlaris'],['pembeli','👥 Pembeli terbanyak'],['terbaru','🆕 Terbaru'],['rating','⭐ Rating tertinggi'],['ulasan','💬 Ulasan terbanyak']];
function renderSortChips(){
  var f=state.filters, el=document.getElementById('sort-chips');
  el.innerHTML=SORT_CHIPS.map(function(c){ return '<button type="button" class="sort-chip'+(f.sort===c[0]?' active':'')+'" data-sort="'+c[0]+'">'+c[1]+'</button>'; }).join('');
  document.getElementById('sort-select').value=f.sort;
  document.getElementById('filter-minrating').value=String(f.minRating||0);
  document.getElementById('filter-official').checked=!!f.official;
}
function sortList(list,sort){
  var key={hot:'hot',trending:'trend',terlaris:'units',pembeli:'buyers',rating:'avg',ulasan:'ulasan'}[sort];
  if(key) return list.slice().sort(function(a,b){ return METR[b.id][key]-METR[a.id][key] || new Date(b.dibuat)-new Date(a.dibuat); });
  if(sort==='nama') return list.slice().sort(function(a,b){ return a.nama.localeCompare(b.nama); });
  return list.slice().sort(function(a,b){ return new Date(b.dibuat)-new Date(a.dibuat); });
}

/* ---- upload gambar (dikompres di browser, disimpan di localStorage) ---- */
function readImage(file,maxW,cb){
  if(!file||!/^image\//.test(file.type)){ showToast('File harus berupa gambar.','error'); cb(null); return; }
  var fr=new FileReader();
  fr.onerror=function(){ cb(null); };
  fr.onload=function(){
    var im=new Image();
    im.onerror=function(){ showToast('Gambar tidak bisa dibaca.','error'); cb(null); };
    im.onload=function(){
      var s=Math.min(1,maxW/im.width), c=document.createElement('canvas');
      c.width=Math.max(1,Math.round(im.width*s)); c.height=Math.max(1,Math.round(im.height*s));
      c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      cb(c.toDataURL('image/jpeg',0.72));
    };
    im.src=fr.result;
  };
  fr.readAsDataURL(file);
}
function setPrev(id,src,fallback){
  var el=document.getElementById(id);
  el.style.backgroundImage='url("'+(src||fallback)+'")';
  el.classList.toggle('is-stock',!src);
}
function galeriItemHtml(g,removable){
  return '<div class="galeri-item"><img loading="lazy" src="'+g.src+'" alt="'+escapeHtml(g.caption||g.tipe||'Foto')+'"><span class="galeri-tag">'+escapeHtml(g.tipe||'Foto')+'</span>'+
    (removable?'<button type="button" class="galeri-del" data-rm="galeri:'+g.id+'" aria-label="Hapus foto">✕</button>':'')+
    (g.caption?'<small>'+escapeHtml(g.caption)+'</small>':'')+'</div>';
}
function renderHalamanTab(u){
  setPrev('prev-cover',u.cover,stockImg(u.kategori,0,u.id));
  setPrev('prev-logo',u.logo,stockImg(u.kategori,1,u.id));
  setPrev('prev-aboutFoto',u.aboutFoto,stockImg(u.kategori,3,u.id));
  var act=document.activeElement;
  if(!(act&&act.closest&&act.closest('#halaman-form'))){
    document.getElementById('hal-tagline').value=u.tagline||'';
    document.getElementById('hal-about').value=u.about||'';
    document.getElementById('hal-wa').value=u.wa||'';
    document.getElementById('hal-tema').value=u.tema||'merah';
  }
  var gl=u.galeri||[];
  document.getElementById('owner-galeri').innerHTML=gl.length?gl.map(function(g){ return galeriItemHtml(g,true); }).join(''):'<p class="form-hint">Belum ada foto galeri. Unggah foto toko, produk, atau suasana usaha Anda.</p>';
  document.getElementById('owner-produk-foto').innerHTML=u.produk.length?u.produk.map(function(p){
    return '<div class="pf-row"><img class="product-thumb" src="'+produkImg(u,p)+'" alt=""><div class="pf-name"><b>'+escapeHtml(p.nama)+'</b><small>'+(p.foto?'Foto Anda':'Gambar contoh')+'</small></div>'+
      '<label class="btn btn-outline btn-sm up-btn">📷 Unggah<input type="file" accept="image/*" hidden data-upload="produk" data-pid="'+p.id+'"></label>'+
      (p.foto?'<button type="button" class="btn btn-ghost btn-sm" data-rm="produk:'+p.id+'">Hapus</button>':'')+'</div>';
  }).join(''):'<p class="form-hint">Tambahkan produk dulu di tab Produk.</p>';
}
function renderDetailVisuals(u){
  if(window.setupDetailChatBtn) window.setupDetailChatBtn(u);
  var pal=TEMA[u.tema]||TEMA.merah, hero=document.querySelector('#view-detail .detail-hero');
  hero.style.backgroundImage='linear-gradient(120deg,rgba('+pal[0]+',.93),rgba('+pal[1]+',.68)),url("'+(u.cover||stockImg(u.kategori,0,u.id))+'")';
  hero.style.backgroundSize='cover'; hero.style.backgroundPosition='center';
  document.getElementById('detail-emoji').innerHTML='<img src="'+(u.logo||stockImg(u.kategori,1,u.id))+'" alt="">';
  var tg=document.getElementById('detail-tagline'); tg.textContent=u.tagline||''; tg.style.display=u.tagline?'block':'none';
  var wa=document.getElementById('detail-wa');
  if(u.wa){ wa.href='https://wa.me/'+u.wa; wa.style.display='inline-flex'; } else wa.style.display='none';
  document.getElementById('detail-about').innerHTML=
    (u.about?'<p class="about-text">'+escapeHtml(u.about).replace(/\n/g,'<br>')+'</p>':'')+
    (u.aboutFoto?'<img class="about-photo" src="'+u.aboutFoto+'" alt="Tentang '+escapeHtml(u.nama)+'">':'');
  var gl=(u.galeri&&u.galeri.length)?u.galeri:[0,1,2].map(function(i){ return {src:stockImg(u.kategori,i,u.id),tipe:['Toko','Produk','Suasana'][i],caption:'Gambar contoh'}; });
  document.getElementById('detail-galeri').innerHTML=gl.map(function(g){ return galeriItemHtml(g,false); }).join('');
  document.getElementById('detail-galeri-note').style.display=(u.galeri&&u.galeri.length)?'none':'block';
}
function openLightbox(src){
  var lb=document.getElementById('lightbox');
  if(!lb){ lb=document.createElement('div'); lb.id='lightbox'; lb.addEventListener('click',function(){ lb.classList.remove('open'); }); document.body.appendChild(lb); }
  lb.innerHTML='<img src="'+src+'" alt="">'; requestAnimationFrame(function(){ lb.classList.add('open'); });
}

/* ---- ticker kanan-ke-kiri (data buatan) ---- */
function renderTicker(){
  var ver=DB.umkm.filter(function(u){ return u.status==='terverifikasi'; });
  var key=DB.umkm.length+'|'+ver.length;
  if(window._tickKey===key||!ver.length) return;
  window._tickKey=key;
  var buyers=['Budi','Ayu','Rian','Dewi','Fajar','Sri','Agus','Nadia','Rina','Dimas','Putri','Eko'];
  var cities=['Jakarta','Bandung','Surabaya','Yogyakarta','Medan','Denpasar','Semarang','Makassar','Malang','Bekasi'];
  function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
  var items=[];
  ver.slice().sort(function(a,b){ return new Date(b.dibuat)-new Date(a.dibuat); }).slice(0,3).forEach(function(u){
    items.push('🆕 UMKM terbaru: <b>'+escapeHtml(u.nama)+'</b> ('+escapeHtml(u.kota)+') baru bergabung di LoBiz');
  });
  for(var i=0;i<9;i++){
    var u=pick(ver), p=u.produk.length?pick(u.produk):null, mnt=1+Math.floor(Math.random()*58);
    if(i%3===2) items.push('⭐ <b>'+pick(buyers)+'</b> memberi '+(4+Math.round(Math.random()))+' bintang untuk <b>'+escapeHtml(u.nama)+'</b>');
    else if(p) items.push('🛒 <b>'+pick(buyers)+'</b> dari '+pick(cities)+' baru membeli <b>'+escapeHtml(p.nama)+'</b> di '+escapeHtml(u.nama)+' · '+mnt+' menit lalu');
  }
  items.sort(function(){ return Math.random()-0.5; });
  var html=items.map(function(t){ return '<span class="ticker-item">'+t+'</span>'; }).join('');
  var tr=document.getElementById('ticker-track');
  tr.innerHTML=html+html; tr.style.animationDuration=Math.max(40,items.length*6)+'s';
}

function setupExtras(){
  document.getElementById('sort-chips').addEventListener('click',function(e){
    var b=e.target.closest('[data-sort]'); if(!b) return;
    state.filters.sort=b.dataset.sort; renderDirectory();
  });
  document.getElementById('filter-minrating').addEventListener('change',function(){ state.filters.minRating=parseFloat(this.value)||0; renderDirectory(); });
  document.getElementById('filter-official').addEventListener('change',function(){ state.filters.official=this.checked; renderDirectory(); });

  document.addEventListener('change',function(e){
    var t=e.target; if(!t.dataset||!t.dataset.upload) return;
    var u=currentOwnerUmkm(); if(!u) return;
    var kind=t.dataset.upload, pid=t.dataset.pid, files=Array.prototype.slice.call(t.files||[]);
    t.value=''; if(!files.length) return;
    function done(){ if(saveDB()) showToast('Gambar berhasil diunggah.','success'); renderOwnerDashboard(); }
    if(kind==='galeri'){
      u.galeri=u.galeri||[];
      var room=12-u.galeri.length;
      if(room<=0){ showToast('Galeri maksimal 12 foto. Hapus salah satu dulu.','error'); return; }
      files=files.slice(0,room);
      var tipe=document.getElementById('galeri-tipe').value, cap=document.getElementById('galeri-caption').value.trim().slice(0,60), left=files.length;
      files.forEach(function(f){ readImage(f,1000,function(src){ if(src) u.galeri.push({id:uid('g'),src:src,tipe:tipe,caption:cap}); if(--left===0) done(); }); });
    } else {
      readImage(files[0],kind==='logo'?320:1200,function(src){
        if(!src) return;
        if(kind==='produk'){ var p=u.produk.find(function(x){ return x.id===pid; }); if(p) p.foto=src; }
        else u[kind]=src;
        done();
      });
    }
  });
  document.addEventListener('click',function(e){
    var img=e.target.closest&&e.target.closest('.galeri-item img');
    if(img){ openLightbox(img.src); return; }
    var b=e.target.closest&&e.target.closest('[data-rm]'); if(!b) return;
    var u=currentOwnerUmkm(); if(!u) return;
    var a=b.dataset.rm.split(':');
    if(a[0]==='galeri') u.galeri=(u.galeri||[]).filter(function(g){ return g.id!==a[1]; });
    else if(a[0]==='produk'){ var p=u.produk.find(function(x){ return x.id===a[1]; }); if(p) delete p.foto; }
    else u[a[0]]=null;
    saveDB(); showToast('Gambar dihapus.','success'); renderOwnerDashboard();
  });
  document.getElementById('halaman-form').addEventListener('submit',function(e){
    e.preventDefault();
    var u=currentOwnerUmkm(); if(!u) return;
    u.tagline=document.getElementById('hal-tagline').value.trim().slice(0,80);
    u.about=document.getElementById('hal-about').value.trim().slice(0,800);
    var wa=document.getElementById('hal-wa').value.replace(/\D/g,'');
    if(wa.indexOf('0')===0) wa='62'+wa.slice(1);
    u.wa=wa; u.tema=document.getElementById('hal-tema').value;
    saveDB(); showToast('Halaman toko disimpan.','success'); renderOwnerDashboard();
  });
  document.getElementById('preview-halaman').addEventListener('click',function(){
    var u=currentOwnerUmkm(); if(u) navigateTo('detail',{detailUmkmId:u.id});
  });
}

document.addEventListener('DOMContentLoaded', init);

/* =============================================================
   LOBY — asisten support LoBiz (chatbot berbasis aturan, tanpa server)
   ============================================================= */
(function(){
  var BOT='Loby', KEY='LoBiz_chat_v1';
  var AVATAR='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8A0A25"/><stop offset=".6" stop-color="#F2142B"/><stop offset="1" stop-color="#FF6A1F"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(#a)"/><path d="M22 40 L30 24 H70 L78 40Z" fill="#fff"/><path d="M30 24 L26 40 M42 24 L40 40 M54 24 L54 40 M66 24 L68 40" stroke="#F2142B" stroke-width="5" opacity=".85"/><path d="M22 40 q7 9 14 0 q7 9 14 0 q7 9 14 0 q7 9 14 0" fill="#FFAA00"/><rect x="28" y="50" width="44" height="30" rx="10" fill="#fff"/><circle cx="41" cy="62" r="4" fill="#3A0613"/><circle cx="59" cy="62" r="4" fill="#3A0613"/><circle cx="42.3" cy="60.7" r="1.3" fill="#fff"/><circle cx="60.3" cy="60.7" r="1.3" fill="#fff"/><path d="M42 70 q8 8 16 0" stroke="#3A0613" stroke-width="3.5" fill="none" stroke-linecap="round"/><circle cx="35" cy="69" r="3.2" fill="#FF8A8A" opacity=".7"/><circle cx="65" cy="69" r="3.2" fill="#FF8A8A" opacity=".7"/></svg>');
  var CHIPS=['Apa itu LoBiz?','Cara daftar UMKM','Cara buat akun pelanggan','Cara chat dengan UMKM','Cara beri ulasan','Cara upload foto toko','Filter & urutan'];
  var KB=[
    {k:[/\b(halo|hai|hi|hello|hallo|pagi|siang|sore|malam|permisi|p)\b/],a:['Halo! 👋 Saya Loby, asisten LoBiz. Ada yang bisa saya bantu soal website ini?','Hai! Saya Loby 😊 Mau tanya soal pendaftaran UMKM, ulasan, atau fitur lain? Silakan.'],q:CHIPS},
    {k:[/terima kasih|makasih|thanks|thank you|thx|mantap|oke makasih/],a:['Sama-sama! 😊 Kalau ada yang lain, tanya saja ya.','Senang bisa membantu! Semoga usahanya makin laris 🚀']},
    {k:[/siapa (kamu|anda)|(kamu|anda) siapa|nama (kamu|mu|anda)|kamu (itu )?apa|manusia|robot|bot\b|\bai\b/],a:['Saya Loby, asisten otomatis LoBiz. Saya bukan manusia: saya bot berbasis aturan yang menjawab pertanyaan umum soal website ini. 🤖','Namaku Loby! Bot asisten LoBiz. Jawabanku otomatis, jadi kalau pertanyaannya rumit, coba pakai kata kunci yang lebih sederhana ya.']},
    {k:[/apa itu|apa sih|tentang lobiz|lobiz itu|jelaskan lobiz|website ini|situs ini|fungsi/],a:['LoBiz (Lokal Bisnis Lo Bisa) adalah direktori dan etalase digital untuk UMKM lokal. Pemilik usaha bisa memasang halaman toko, produk, dan foto, sedangkan pengunjung bisa menemukan UMKM, melihat rating, dan memberi ulasan. 🏪'],q:['Cara daftar UMKM','Filter & urutan','Apakah gratis?']},
    {k:[/chat (dengan|ke|sama)|chat umkm|kirim pesan|pesan (ke|untuk) (umkm|toko|penjual)|tanya (penjual|umkm|toko)|kotak masuk|inbox|bicara (dengan|sama) (umkm|penjual)/,/chat|pesan/],a:['Anda bisa chat langsung dengan UMKM lewat tombol "💬 Chat dengan UMKM" di halaman detail UMKM. Fitur ini butuh akun pelanggan (gratis). Setelah masuk, balasan muncul di tombol "💬 Pesan" di bagian atas. Pemilik UMKM dan admin juga memakai tombol itu untuk kotak masuk mereka.'],q:['Cara buat akun pelanggan','Cara beri ulasan']},
    {k:[/akun pelanggan|daftar pelanggan|buat akun (pelanggan|customer)|akun customer|daftar customer|daftar sebagai pelanggan/,/pelanggan|customer/],a:['Untuk membuat akun pelanggan: klik "Daftar Pelanggan" di bagian atas, isi nama, username, dan kata sandi (minimal 6 karakter). Akun ini gratis dan dibutuhkan untuk chat dengan UMKM serta menulis ulasan. Menjelajah situs dan mengobrol dengan saya tetap bisa tanpa akun. 😊'],q:['Cara chat dengan UMKM']},
    {k:[/daftar|registrasi|bergabung|buat akun|pendaftaran|sign ?up|gabung/],a:['Cara mendaftarkan UMKM: 1) klik tombol "Daftarkan UMKM" di beranda, 2) isi data akun dan data usaha, 3) kirim. Setelah itu pendaftaran Anda ditinjau admin dan, kalau disetujui, usaha Anda tampil di direktori. ✅'],q:['Berapa lama verifikasi?','Cara upload foto toko']},
    {k:[/verifikasi|disetujui|menunggu|pending|status|ditolak|lama.*(setuju|verif)/],a:['Setiap pendaftaran ditinjau admin LoBiz lebih dulu. Selama belum disetujui, status usaha Anda "menunggu" dan belum muncul di direktori publik. Cek statusnya lewat dashboard setelah login. Kalau ditolak, perbaiki data usaha lalu daftar ulang.'],q:['Cara daftar UMKM','Lupa password']},
    {k:[/login|masuk|log in|sign in|akun demo|demo|username/],a:['Klik tombol "Masuk" di pojok kanan atas, lalu isi username dan password. Untuk mencoba versi demo: admin → admin / admin123, pemilik UMKM → siti / siti123 atau made / made123, pelanggan → budi / budi123.'],q:['Lupa password','Apa itu dashboard?']},
    {k:[/lupa|reset password|ganti password|kata sandi|sandi/],a:['Karena ini versi demo, belum ada fitur reset password lewat email. Kalau lupa, Anda bisa mendaftar dengan akun baru atau memakai akun demo. Fitur reset akan ada saat LoBiz memakai server sungguhan.']},
    {k:[/upload|unggah|foto|gambar|banner|logo|galeri/],a:['Untuk memasang foto: login sebagai pemilik, buka dashboard lalu tab "🎨 Halaman Toko". Di sana Anda bisa mengunggah banner, logo, foto "Tentang kami", galeri (maksimal 12 foto), dan foto tiap produk. Foto otomatis dikecilkan supaya hemat penyimpanan. 📷','Foto toko diatur di dashboard → tab "🎨 Halaman Toko". Anda bisa mengunggah banner, logo, galeri, dan foto produk. Kalau belum ada foto, LoBiz menampilkan gambar contoh otomatis.'],q:['Cara atur halaman toko','Foto tidak mau terunggah']},
    {k:[/tidak (bisa|mau) (terunggah|upload|unggah)|gagal (upload|unggah)|penuh|kuota|storage|ukuran/,/upload|unggah|foto|gambar/],a:['Kalau unggahan gagal: pastikan file berupa gambar (JPG/PNG), lalu coba foto yang lebih kecil. Penyimpanan browser terbatas (sekitar 5 MB), jadi kalau sudah penuh, hapus beberapa foto galeri lalu coba lagi.']},
    {k:[/halaman toko|customi[sz]e|atur (halaman|toko|tampilan)|slogan|tentang kami|cerita usaha|warna halaman|tema/],a:['Di tab "🎨 Halaman Toko" Anda bisa mengisi slogan, cerita usaha, nomor WhatsApp, dan memilih warna halaman (merah, oranye, amber, atau hijau). Klik "Simpan halaman", lalu "Lihat halaman publik" untuk melihat hasilnya.']},
    {k:[/produk|barang|jualan|tambah.*produk|harga/],a:['Produk dikelola di dashboard pemilik, tab Produk: tambah, ubah, atau hapus produk beserta harganya. Foto produk bisa diatur di tab "🎨 Halaman Toko".'],q:['Cara upload foto toko','Catat penjualan']},
    {k:[/catat.*(jual|transaksi)|penjualan|transaksi|omzet|pendapatan|grafik|dashboard/],a:['Dashboard pemilik menampilkan ringkasan pendapatan, unit terjual, rating, grafik tren, dan produk terlaris. Catat penjualan lewat tab penjualan agar angkanya ikut terbarui.']},
    {k:[/ulasan|review|rating|bintang|komentar|nilai/],a:['Untuk memberi ulasan, masuk dulu dengan akun pelanggan (gratis, daftar lewat "Daftar Pelanggan"). Lalu buka halaman detail UMKM, pilih bintang 1–5, tulis komentar, dan klik "Kirim ulasan". ⭐ Ulasan dengan lencana "✔ Ulasan Resmi" berasal dari Tim LoBiz dan selalu tampil paling atas.'],q:['Apa itu ulasan resmi?','Filter & urutan']},
    {k:[/resmi|tim lobiz|admin.*(ulas|review)/],a:['Ulasan resmi adalah penilaian dari Tim LoBiz (akun admin) untuk sebuah UMKM. Ulasan ini diberi lencana khusus dan diletakkan paling atas. Anda juga bisa memfilter UMKM yang punya ulasan resmi di direktori.']},
    {k:[/filter|urut|sort|cari|pencarian|search|kategori|kota|terlaris|trending|hot|terbaru|paling/],a:['Di direktori Anda bisa mencari nama, memfilter kategori dan kota, atau memilih urutan lewat tombol: 🔥 Hot, 📈 Trending, 🏆 Terlaris, 👥 Pembeli terbanyak, 🆕 Terbaru, ⭐ Rating tertinggi, dan 💬 Ulasan terbanyak. Ada juga filter rating minimal.'],q:['Apa arti Hot dan Trending?']},
    {k:[/arti (hot|trending)|hot (dan|vs|&) trending|beda.*(hot|trending)|label/],a:['Hot = UMKM dengan aktivitas pembeli tinggi belakangan ini (dipengaruhi rating). Trending = UMKM yang pembelinya naik dibanding beberapa hari sebelumnya. Terlaris dihitung dari total unit terjual. Semua angka di versi demo ini berasal dari data contoh.']},
    {k:[/teks berjalan|running text|pita|ticker|live|pembeli terbaru/],a:['Teks berjalan di atas halaman menampilkan kabar UMKM terbaru, pembeli yang baru membeli, dan ulasan baru. Di versi demo ini isinya data buatan. Arahkan kursor ke teks untuk menghentikannya sebentar.']},
    {k:[/beli|pesan|order|bayar|checkout|keranjang|pembayaran/,/mau beli|cara beli|ingin beli|pesan produk/],a:['LoBiz berfungsi sebagai direktori dan etalase. Untuk membeli, hubungi UMKM-nya langsung, misalnya lewat tombol "💬 Hubungi via WhatsApp" di halaman detail kalau pemilik sudah mengisinya. Sistem pembayaran dalam situs belum tersedia.']},
    {k:[/whatsapp|wa\b|hubungi (umkm|penjual|toko)|kontak (umkm|penjual|toko)/],a:['Tombol WhatsApp muncul di halaman UMKM yang pemiliknya sudah mengisi nomor di tab "🎨 Halaman Toko". Kalau tombolnya tidak ada, berarti pemilik belum mengisi nomor.']},
    {k:[/gratis|biaya|bayar.*daftar|harga langganan|tarif|berbayar/],a:['Mendaftarkan UMKM dan memasang halaman toko di LoBiz gratis. 🎉']},
    {k:[/gelap|dark|terang|tema (gelap|terang)|mode/],a:['Ganti tampilan terang/gelap lewat tombol tema di bagian atas halaman (ikon bulan/matahari). Pilihan Anda tersimpan di browser.']},
    {k:[/data|privasi|aman|keamanan|hilang|hapus data|localstorage/],a:['Di versi demo ini semua data disimpan di browser Anda sendiri (localStorage), tidak dikirim ke server. Artinya data tidak terbagi antar perangkat, dan menghapus data situs akan menghapus semuanya. Jangan memasukkan data sensitif ya.']},
    {k:[/error|bug|rusak|masalah|tidak bisa|gak bisa|ga bisa|nggak bisa|macet|lemot|blank|kosong/],a:['Maaf atas kendalanya 🙏 Coba muat ulang halaman (Ctrl+R / tarik layar ke bawah) dan pastikan memakai browser terbaru. Kalau masih bermasalah, ceritakan langkah yang Anda lakukan dan apa yang muncul, misalnya "tombol kirim ulasan tidak merespons", supaya saya bisa arahkan lebih tepat.']},
    {k:[/manusia|petugas|cs\b|customer service|admin.*hubung|hubungi (tim|kami|admin)|kontak kami|telepon|email/],a:['Saya bot otomatis, jadi belum bisa menyambungkan Anda ke petugas manusia di versi demo ini. Untuk saran atau laporan, tulis pertanyaan Anda di sini dengan jelas ya. Di versi resmi, kanal kontak tim LoBiz akan dicantumkan di footer.']},
    {k:[/sdg|tujuan|misi|visi|dampak|umkm lokal/],a:['LoBiz mendukung SDG 9: Industri, Inovasi, dan Infrastruktur, dengan membantu UMKM lokal tampil online dan mudah ditemukan. Slogan kami: "Lokal Bisnis Lo Bisa" 💪']},
    {k:[/lelucon|jokes?|bercanda|lucu|garing/],a:['Kenapa UMKM selalu optimis? Karena modalnya kecil, tapi harapannya selalu "full stock"! 😄','Pembeli: "Bisa kurang, Kak?" Penjual: "Bisa… kurang ajar maksudnya?" 😅 Ayo kembali ke LoBiz, ada yang mau ditanyakan?']},
    {k:[/apa kabar|how are you|lagi apa/],a:['Baik! Siap membantu 😄 Ada yang mau ditanyakan soal LoBiz?']},
    {k:[/bye|dadah|sampai jumpa|sudah cukup|udah cukup/],a:['Sampai jumpa! Kalau butuh bantuan lagi, saya di sini 👋']}
  ];
  var FALLBACK=['Hmm, saya belum menemukan jawaban yang pas untuk itu 🤔 Coba pakai kata kunci yang lebih sederhana, misalnya "daftar", "foto", "ulasan", atau "filter".','Maaf, saya belum paham maksudnya. Saya bisa membantu soal pendaftaran, foto toko, produk, ulasan, dan pencarian. Pilih salah satu di bawah ya!'];
  var el={}, hist=[], open=false, busy=false;
  function esc(s){ return String(s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(hist.slice(-40))); }catch(e){} }
  function time(){ var d=new Date(); return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2); }
  function addMsg(who,text,t,skipSave){
    var row=document.createElement('div'); row.className='lb-msg lb-'+who;
    row.innerHTML=(who==='bot'?'<img class="lb-av" src="'+AVATAR+'" alt="">':'')+'<div class="lb-bubble">'+esc(text)+'<span class="lb-time">'+(t||time())+'</span></div>';
    el.msgs.appendChild(row); el.msgs.scrollTop=el.msgs.scrollHeight;
    if(!skipSave){ hist.push({w:who,t:text,h:t||time()}); save(); }
  }
  function setChips(list){
    el.chips.innerHTML=(list||[]).map(function(c){ return '<button type="button" class="lb-chip">'+esc(c)+'</button>'; }).join('');
    el.chipsWrap.style.display=(list&&list.length)?'flex':'none'; el.chips.scrollLeft=0; updateArrows();
  }
  function answer(text){
    var s=text.toLowerCase().replace(/[^a-z0-9&\s]/g,' '), best=null, bestScore=0;
    KB.forEach(function(e){
      var sc=0; e.k.forEach(function(r){ if(r.test(s)) sc++; });
      if(s.trim().length<=2 && e.a[0].indexOf('Halo')!==0) sc=0;
      if(sc>bestScore){ bestScore=sc; best=e; }
    });
    return best?{a:pick(best.a),q:best.q||CHIPS}:{a:pick(FALLBACK),q:CHIPS};
  }
  function send(text){
    text=(text||'').trim().slice(0,300); if(!text||busy) return;
    addMsg('user',text); setChips([]); busy=true;
    var r=answer(text);
    var typing=document.createElement('div'); typing.className='lb-msg lb-bot';
    typing.innerHTML='<img class="lb-av" src="'+AVATAR+'" alt=""><div class="lb-bubble lb-typing"><i></i><i></i><i></i></div>';
    setTimeout(function(){ el.msgs.appendChild(typing); el.msgs.scrollTop=el.msgs.scrollHeight; },250);
    setTimeout(function(){
      if(typing.parentNode) typing.parentNode.removeChild(typing);
      addMsg('bot',r.a); setChips(r.q); busy=false;
      if(!open){ el.badge.style.display='flex'; }
    },900+Math.min(1400,r.a.length*9));
  }
  function toggle(force){
    open=typeof force==='boolean'?force:!open;
    el.panel.classList.toggle('open',open); el.fab.classList.toggle('hide',open);
    el.greet.classList.remove('show');
    if(open){ el.badge.style.display='none'; setTimeout(function(){ el.input.focus(); },250); setTimeout(function(){ clampPos(); updateArrows(); },380); el.msgs.scrollTop=el.msgs.scrollHeight; }
  }
  function reset(){ hist=[]; save(); el.msgs.innerHTML=''; intro(); }
  function intro(){
    addMsg('bot','Halo! Saya Loby 👋, asisten LoBiz. Saya bisa membantu soal pendaftaran UMKM, foto toko, ulasan, dan cara memakai website ini. Mau tanya apa?',null,true);
    hist.push({w:'bot',t:'Halo! Saya Loby 👋, asisten LoBiz. Saya bisa membantu soal pendaftaran UMKM, foto toko, ulasan, dan cara memakai website ini. Mau tanya apa?',h:time()}); save();
    setChips(CHIPS);
  }
  var POS='LoBiz_chat_pos', pos={x:0,y:0}, cur={x:0,y:0};
  function applyPos(){ cur={x:pos.x,y:pos.y}; el.panel.style.translate=pos.x+'px '+pos.y+'px'; }
  function clampPos(){
    var r=el.panel.getBoundingClientRect(); if(!r.width) return;
    var m=8, bl=r.left-cur.x, br=r.right-cur.x, bt=r.top-cur.y, bb=r.bottom-cur.y;
    pos.x=Math.min(Math.max(pos.x,m-bl),window.innerWidth-m-br);
    pos.y=Math.min(Math.max(pos.y,m-bt),window.innerHeight-m-bb);
    applyPos();
  }
  function savePos(){ try{ localStorage.setItem(POS,JSON.stringify(pos)); }catch(e){} }
  function updateArrows(){
    var c=el.chips, max=c.scrollWidth-c.clientWidth;
    el.arL.classList.toggle('show',c.scrollLeft>4); el.arR.classList.toggle('show',c.scrollLeft<max-4);
  }
  function wireMove(){
    try{ var p=JSON.parse(localStorage.getItem(POS)||'null'); if(p&&isFinite(p.x)&&isFinite(p.y)) pos=p; }catch(e){}
    applyPos();
    var drag=null, head=el.head;
    head.title='Geser untuk memindahkan · klik dua kali untuk mengembalikan';
    head.addEventListener('pointerdown',function(e){
      if(window.innerWidth<=480||e.button>0||e.target.closest('button')) return;
      drag={x:e.clientX,y:e.clientY,px:pos.x,py:pos.y};
      head.setPointerCapture(e.pointerId); el.panel.classList.add('dragging');
    });
    head.addEventListener('pointermove',function(e){
      if(!drag) return;
      pos.x=drag.px+e.clientX-drag.x; pos.y=drag.py+e.clientY-drag.y; clampPos();
    });
    function end(){ if(!drag) return; drag=null; el.panel.classList.remove('dragging'); savePos(); }
    head.addEventListener('pointerup',end); head.addEventListener('pointercancel',end);
    head.addEventListener('dblclick',function(e){ if(e.target.closest('button')) return; pos={x:0,y:0}; applyPos(); savePos(); });
    window.addEventListener('resize',function(){ if(open) clampPos(); updateArrows(); });
  }
  function wireChipScroll(){
    var c=el.chips, cd=null, moved=false;
    c.addEventListener('scroll',updateArrows);
    el.arL.addEventListener('click',function(){ c.scrollBy({left:-170,behavior:'smooth'}); });
    el.arR.addEventListener('click',function(){ c.scrollBy({left:170,behavior:'smooth'}); });
    c.addEventListener('wheel',function(e){ if(Math.abs(e.deltaY)>Math.abs(e.deltaX)&&c.scrollWidth>c.clientWidth){ e.preventDefault(); c.scrollLeft+=e.deltaY; } },{passive:false});
    c.addEventListener('pointerdown',function(e){ if(e.pointerType==='touch') return; cd={x:e.clientX,s:c.scrollLeft}; moved=false; });
    c.addEventListener('pointermove',function(e){
      if(!cd) return; var dx=e.clientX-cd.x;
      if(Math.abs(dx)>4){ moved=true; c.classList.add('grabbing'); }
      if(moved) c.scrollLeft=cd.s-dx;
    });
    function stop(){ cd=null; c.classList.remove('grabbing'); setTimeout(function(){ moved=false; },0); }
    document.addEventListener('pointerup',stop); c.addEventListener('pointerleave',function(){ if(cd) stop(); });
    c.addEventListener('click',function(e){ if(moved){ e.stopPropagation(); e.preventDefault(); } },true);
  }
  function init(){
    var root=document.createElement('div'); root.id='lb-chat';
    root.innerHTML=
      '<div class="lb-greet" id="lb-greet"><b>Butuh bantuan?</b><br>Tanya Loby soal LoBiz 👋</div>'+
      '<button type="button" class="lb-fab" id="lb-fab" aria-label="Buka chat bantuan"><img src="'+AVATAR+'" alt="Loby"><span class="lb-badge" id="lb-badge">1</span></button>'+
      '<section class="lb-panel" id="lb-panel" role="dialog" aria-label="Chat bantuan LoBiz">'+
        '<header class="lb-head"><img src="'+AVATAR+'" alt=""><div><b>'+BOT+'</b><small><i class="lb-dot"></i> Asisten LoBiz · online</small></div>'+
        '<button type="button" class="lb-ico" id="lb-reset" title="Mulai ulang" aria-label="Mulai ulang">↻</button><button type="button" class="lb-ico" id="lb-close" aria-label="Tutup chat">✕</button></header>'+
        '<div class="lb-msgs" id="lb-msgs" aria-live="polite"></div>'+
        '<div class="lb-chips-wrap" id="lb-chips-wrap"><button type="button" class="lb-arrow lb-arrow-l" id="lb-arl" aria-label="Geser ke kiri">‹</button><div class="lb-chips" id="lb-chips"></div><button type="button" class="lb-arrow lb-arrow-r" id="lb-arr" aria-label="Geser ke kanan">›</button></div>'+
        '<div class="lb-note">Loby adalah bot otomatis, bukan manusia.</div>'+
        '<div class="lb-form"><input type="text" id="lb-input" maxlength="300" placeholder="Tulis pertanyaan Anda..." autocomplete="off"><button type="button" id="lb-send" aria-label="Kirim">➤</button></div>'+
      '</section>';
    document.body.appendChild(root);
    el={fab:document.getElementById('lb-fab'),panel:document.getElementById('lb-panel'),msgs:document.getElementById('lb-msgs'),chips:document.getElementById('lb-chips'),chipsWrap:document.getElementById('lb-chips-wrap'),arL:document.getElementById('lb-arl'),arR:document.getElementById('lb-arr'),head:document.querySelector('#lb-panel .lb-head'),input:document.getElementById('lb-input'),badge:document.getElementById('lb-badge'),greet:document.getElementById('lb-greet')};
    try{ hist=JSON.parse(localStorage.getItem(KEY)||'[]'); }catch(e){ hist=[]; }
    if(hist.length){ hist.forEach(function(m){ addMsg(m.w,m.t,m.h,true); }); setChips(CHIPS); } else intro();
    el.fab.addEventListener('click',function(){ toggle(true); });
    document.getElementById('lb-close').addEventListener('click',function(){ toggle(false); });
    document.getElementById('lb-reset').addEventListener('click',reset);
    document.getElementById('lb-send').addEventListener('click',function(){ var v=el.input.value; el.input.value=''; send(v); });
    el.input.addEventListener('keydown',function(e){ if(e.key==='Enter'){ var v=el.input.value; el.input.value=''; send(v); } });
    el.chips.addEventListener('click',function(e){ var b=e.target.closest('.lb-chip'); if(b) send(b.textContent); });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&open) toggle(false); });
    wireMove(); wireChipScroll(); updateArrows();
    setTimeout(function(){ if(!open&&!hist.some(function(m){ return m.w==='user'; })) el.greet.classList.add('show'); },4000);
    setTimeout(function(){ el.greet.classList.remove('show'); },12000);
  }
  document.addEventListener('DOMContentLoaded',init);
})();

/* =============================================================
   PESAN: admin ↔ UMKM dan pelanggan ↔ UMKM
   (disimpan di localStorage browser, tersinkron antar tab)
   ============================================================= */
(function(){
  var KEY='LoBiz_chats_v2', VKEY='LoBiz_visitor', chats=null, loaded=false, dom=null, st={open:false,cur:null};
  function esc2(s){ return escapeHtml(String(s)); }
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(chats)); }catch(e){ showToast('Penyimpanan browser penuh.','error'); } }
  function seed(){
    var now=Date.now();
    function um(n){ var u=DB.users.find(function(x){ return x.username===n; }); return u&&u.umkmId; }
    var a=um('siti'), b=um('made');
    if(a){
      chats.push({id:'c-seed1',umkmId:a,peerType:'customer',peerId:'u-cust-budi',peerName:'Budi',read:{},msgs:[{f:'peer',t:'Halo kak, produk yang di etalase masih ready stock?',ts:now-45*6e4}]});
      chats.push({id:'c-seed2',umkmId:a,peerType:'admin',peerId:'admin',peerName:'Tim LoBiz',read:{},msgs:[{f:'peer',t:'Halo! Selamat bergabung di LoBiz 🎉 Kalau butuh bantuan melengkapi halaman toko, balas pesan ini ya.',ts:now-3*36e5}]});
    }
    if(b) chats.push({id:'c-seed3',umkmId:b,peerType:'customer',peerId:'v-demo-ayu',peerName:'Ayu',read:{},msgs:[{f:'peer',t:'Selamat siang, apakah bisa pesan dalam jumlah besar untuk acara kantor?',ts:now-2*36e5}]});
  }
  function ensure(){
    if(loaded) return; loaded=true;
    try{ var r=JSON.parse(localStorage.getItem(KEY)||'null'); chats=Array.isArray(r)?r:null; }catch(e){ chats=null; }
    if(!chats){ chats=[]; seed(); save(); }
  }
  function visitor(){
    var v=null; try{ v=JSON.parse(localStorage.getItem(VKEY)||'null'); }catch(e){}
    if(!v||!v.id){ v={id:'v'+Math.random().toString(36).slice(2,10),name:''}; try{ localStorage.setItem(VKEY,JSON.stringify(v)); }catch(e){} }
    return v;
  }
  function me(){
    var u=currentUser();
    if(u&&u.role==='admin') return {side:'peer',type:'admin',id:'admin',name:'Tim LoBiz'};
    if(u&&u.role==='owner') return {side:'umkm',type:'owner',umkmId:u.umkmId,name:u.nama};
    if(u&&u.role==='customer') return {side:'peer',type:'customer',id:u.id,name:u.nama};
    return {side:'peer',type:'guest',id:null,name:''};
  }
  function lastTs(t){ return t.msgs.length?t.msgs[t.msgs.length-1].ts:0; }
  function mine(m){
    return chats.filter(function(t){
      if(m.type==='admin') return t.peerType==='admin';
      if(m.type==='owner') return t.umkmId===m.umkmId;
      return t.peerType==='customer'&&t.peerId===m.id;
    }).sort(function(a,b){ return lastTs(b)-lastTs(a); });
  }
  function unread(t,m){
    var l=t.msgs[t.msgs.length-1]; if(!l) return false;
    return m.side==='umkm'?(l.f==='peer'&&l.ts>(t.read.umkm||0)):(l.f==='umkm'&&l.ts>(t.read.peer||0));
  }
  function ft(ts){
    var d=new Date(ts), n=new Date(), hm=('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
    return d.toDateString()===n.toDateString()?hm:('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+' '+hm;
  }
  function find(umkmId,m){
    return chats.find(function(t){ return t.umkmId===umkmId&&t.peerType===(m.type==='admin'?'admin':'customer')&&t.peerId===m.id; })||
      {id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),umkmId:umkmId,peerType:m.type==='admin'?'admin':'customer',peerId:m.id,peerName:m.name||'Pengunjung',msgs:[],read:{},draft:true};
  }
  function info(t,m){
    var u=findUmkm(t.umkmId)||{nama:'UMKM',kategori:'Lainnya',kota:'',id:t.umkmId};
    if(m.side==='umkm') return {title:t.peerType==='admin'?'Tim LoBiz':t.peerName,sub:t.peerType==='admin'?'Resmi · LoBiz':'Pelanggan',
      av:t.peerType==='admin'?'<img src="logo.png" alt="">':'<span class="msg-av-i">'+esc2((t.peerName||'?').charAt(0).toUpperCase())+'</span>'};
    return {title:u.nama,sub:u.kategori+(u.kota?' · '+u.kota:''),av:'<img src="'+(u.logo||stockImg(u.kategori,1,u.id))+'" alt="">'};
  }
  function updateBadge(){
    if(!loaded) return;
    var m=me(), n=mine(m).filter(function(t){ return unread(t,m); }).length;
    Array.prototype.forEach.call(document.querySelectorAll('.msg-badge'),function(b){ b.textContent=n; b.style.display=n?'inline-flex':'none'; });
  }
  function ensureDom(){
    if(dom) return;
    var o=document.createElement('div'); o.id='msg-overlay';
    o.innerHTML='<div class="msg-box" role="dialog" aria-label="Pesan">'+
      '<aside class="msg-list"><header><b>💬 Pesan</b><button type="button" class="msg-x" id="msg-close" aria-label="Tutup">✕</button></header>'+
      '<div class="msg-new" id="msg-new"><select id="msg-new-sel" aria-label="Pilih UMKM"></select><button type="button" class="btn btn-primary btn-sm" id="msg-new-btn">Chat</button></div>'+
      '<div class="msg-threads" id="msg-threads"></div></aside>'+
      '<section class="msg-conv"><header id="msg-head"></header><div class="msg-msgs" id="msg-msgs" aria-live="polite"></div>'+
      '<form class="msg-form" id="msg-form"><div class="msg-row"><input type="text" id="msg-input" maxlength="500" placeholder="Tulis pesan..." autocomplete="off"><button type="submit" aria-label="Kirim">➤</button></div>'+
      '<small class="msg-note">Demo: pesan tersimpan di browser ini. Masuk sebagai pemilik/admin di browser yang sama untuk membalas.</small></form></section></div>';
    document.body.appendChild(o);
    dom={o:o,box:o.querySelector('.msg-box'),threads:o.querySelector('#msg-threads'),head:o.querySelector('#msg-head'),msgs:o.querySelector('#msg-msgs'),form:o.querySelector('#msg-form'),input:o.querySelector('#msg-input'),nw:o.querySelector('#msg-new'),sel:o.querySelector('#msg-new-sel')};
    o.addEventListener('click',function(e){ if(e.target===o) closeDrawer(); });
    o.querySelector('#msg-close').addEventListener('click',closeDrawer);
    dom.threads.addEventListener('click',function(e){
      var b=e.target.closest('[data-tid]'); if(!b) return;
      var m=me(); st.cur=(mine(m).concat(st.cur&&st.cur.draft?[st.cur]:[])).find(function(t){ return t.id===b.dataset.tid; })||null;
      dom.box.classList.add('conv-open'); render();
    });
    dom.head.addEventListener('click',function(e){ if(e.target.closest('#msg-back')){ dom.box.classList.remove('conv-open'); } });
    o.querySelector('#msg-new-btn').addEventListener('click',function(){
      if(!dom.sel.value) return; st.cur=find(dom.sel.value,me()); dom.box.classList.add('conv-open'); render(); dom.input.focus();
    });
    dom.form.addEventListener('submit',function(e){
      e.preventDefault();
      var m=me(), text=dom.input.value.trim().slice(0,500);
      if(!st.cur||!text) return;
      if(m.type==='customer'&&m.name) st.cur.peerName=m.name;
      if(st.cur.draft){ delete st.cur.draft; chats.push(st.cur); }
      var now=Date.now(); st.cur.msgs.push({f:m.side,t:text,ts:now}); st.cur.read[m.side==='umkm'?'umkm':'peer']=now;
      save(); dom.input.value=''; render();
    });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&st.open) closeDrawer(); });
  }
  function render(){
    var m=me(), list=mine(m);
    if(st.cur&&st.cur.draft) list.unshift(st.cur);
    dom.nw.style.display=m.type==='admin'?'flex':'none';
    if(m.type==='admin'&&!dom.sel.options.length){
      dom.sel.innerHTML=DB.umkm.filter(function(u){ return u.status==='terverifikasi'; }).map(function(u){ return '<option value="'+u.id+'">'+esc2(u.nama)+'</option>'; }).join('');
    }
    dom.threads.innerHTML=list.length?list.map(function(t){
      var i=info(t,m), l=t.msgs[t.msgs.length-1];
      return '<button type="button" class="msg-item'+(st.cur===t?' active':'')+'" data-tid="'+t.id+'"><span class="msg-av">'+i.av+'</span><span class="msg-meta"><b>'+esc2(i.title)+'</b><small>'+(l?esc2((l.f===m.side?'Anda: ':'')+l.t):'Belum ada pesan')+'</small></span>'+
        '<span class="msg-side">'+(l?'<small>'+ft(l.ts)+'</small>':'')+(unread(t,m)?'<i class="msg-dot"></i>':'')+'</span></button>';
    }).join(''):'<p class="msg-empty">'+(m.type==='owner'?'Belum ada pesan masuk.':m.type==='admin'?'Pilih UMKM di atas untuk memulai chat.':'Belum ada percakapan. Buka halaman UMKM lalu klik "Chat dengan UMKM".')+'</p>';
    if(!st.cur){
      dom.head.innerHTML='<b>Pilih percakapan</b>'; dom.msgs.innerHTML='<p class="msg-empty">Pilih percakapan di sebelah kiri.</p>'; dom.form.style.display='none';
    } else {
      var i=info(st.cur,m);
      dom.head.innerHTML='<button type="button" class="msg-x msg-back" id="msg-back" aria-label="Kembali">‹</button><span class="msg-av">'+i.av+'</span><div><b>'+esc2(i.title)+'</b><small>'+esc2(i.sub)+'</small></div>';
      dom.msgs.innerHTML=st.cur.msgs.length?st.cur.msgs.map(function(x){
        return '<div class="msg-b '+(x.f===m.side?'me':'other')+'"><div>'+esc2(x.t)+'<span>'+ft(x.ts)+'</span></div></div>';
      }).join(''):'<p class="msg-empty">Mulai percakapan dengan menulis pesan di bawah.</p>';
      dom.msgs.scrollTop=dom.msgs.scrollHeight;
      dom.form.style.display='block';
      if(!st.cur.draft&&unread(st.cur,m)){ st.cur.read[m.side==='umkm'?'umkm':'peer']=Date.now(); save(); }
    }
    updateBadge();
  }
  function openDrawer(t){
    ensure(); ensureDom();
    var m=me(), list=mine(m);
    if(t) st.cur=t;
    else if(!st.cur||(!st.cur.draft&&list.indexOf(st.cur)<0)) st.cur=window.innerWidth>700?(list[0]||null):null;
    st.open=true; dom.o.classList.add('open'); dom.box.classList.toggle('conv-open',!!t); render();
    if(t) setTimeout(function(){ dom.input.focus(); },250);
  }
  function closeDrawer(){ st.open=false; if(dom) dom.o.classList.remove('open'); }
  window.updateMsgBadge=function(){ ensure(); updateBadge(); };
  window.setupDetailChatBtn=function(u){
    var b=document.getElementById('detail-chat'); if(!b) return;
    ensure(); var m=me();
    if(m.type==='owner'){ b.style.display='none'; return; }
    b.textContent=m.type==='admin'?'💬 Chat sebagai Tim LoBiz':'💬 Chat dengan UMKM';
    b.style.display='inline-flex';
    b.onclick=function(){
      var mm=me();
      if(mm.type==='guest'){ showToast('Masuk atau daftar akun pelanggan untuk chat dengan UMKM.','error'); openAuthModal('login'); return; }
      st.cur=null; openDrawer(find(u.id,mm));
    };
  };
  document.addEventListener('click',function(e){ if(e.target.closest&&e.target.closest('#msg-open')) openDrawer(); });
  window.addEventListener('storage',function(e){
    if(e.key!==KEY||!loaded) return;
    try{ chats=JSON.parse(e.newValue||'[]'); }catch(x){ return; }
    if(st.cur&&!st.cur.draft) st.cur=chats.find(function(c){ return c.id===st.cur.id; })||null;
    if(st.open&&dom) render(); else updateBadge();
  });
})();
