/* ui.js — โหมดอ่านนิยาย + แถบเวลา + HUD กำลังพล
 *
 * แนวคิดหลัก: นี่ไม่ใช่สไลด์ที่กดทีละหน้า แต่เป็น "นิยายที่เลื่อนอ่านต่อเนื่อง
 * แล้วแผนที่วิ่งตามที่อ่านอยู่" — เนื้อเรื่องทั้ง 71 ตอนอยู่ในหน้าเดียวกันหมด
 * เลื่อนถึงตอนไหน กล้องกับพื้นที่บนแผนที่ก็ขยับไปตอนนั้น
 */
window.TK = window.TK || {};

TK.ui = (function(){

  const $ = s => document.querySelector(s);
  const E = TK.engine;

  const FACT = {
    real:    { th:"อิงประวัติศาสตร์จริง", cls:"f-real" },
    fiction: { th:"แต่งขึ้น",             cls:"f-fic"  },
    mixed:   { th:"จริงผสมแต่ง",          cls:"f-mix"  }
  };
  const SEASON = {spring:'ฤดูใบไม้ผลิ', summer:'ฤดูร้อน',
                  autumn:'ฤดูใบไม้ร่วง', winter:'ฤดูหนาว'};
  const SHORT = ['นำ','๑','๒','๓','๔','๕','๖','๗','ท้าย'];

  let arts = [];          // <article> ของแต่ละตอน
  let scrollDriven = false;   // การเปลี่ยนตอนครั้งนี้มาจากการเลื่อนอ่านหรือไม่
  let programmatic = false;   // กำลังสั่งเลื่อนเองอยู่ ห้าม observer ยิงกลับ

  function init(){
    buildReader();
    buildTimeline();
    buildHud();
    bindControls();
    E.on('beat', render);
    E.goTo(0, 'init');
  }

  /* ══ นิยาย: สร้างทุกตอนไว้ในหน้าเดียว ══ */
  function buildReader(){
    const reader = $('#reader');
    reader.replaceChildren();
    arts = [];
    let lastChapter = -1;

    E.beats.forEach((b, i) => {
      if (b.chapter !== lastChapter){
        lastChapter = b.chapter;
        const info = TK.chapters.find(c => c.n === b.chapter) || {};
        const h = document.createElement('div');
        h.className = 'chapmark';
        h.innerHTML = `<b>${info.th || 'ภาค ' + b.chapter}</b><i>${info.years || ''}</i>`;
        reader.append(h);
      }

      const a = document.createElement('article');
      a.className = 'beat';
      a.dataset.i = i;
      const f = FACT[b.fact] || FACT.mixed;
      a.innerHTML =
        `<div class="bmeta">${b.year}${b.season ? ' · ' + SEASON[b.season] : ''}</div>
         <h2 class="btitle">${b.title}</h2>
         <p class="text${b.voice === 'watcher' ? ' watcher' : ''}">${b.text}</p>
         <div class="chg"></div>
         ${b.battle ? '<button class="gobattle">⚔ เข้าดูสมรภูมิ</button>' : ''}
         <span class="fact ${f.cls}">${f.th}</span>
         <div class="fnote">${b.factNote || ''}</div>`;

      a.querySelector('.fact').onclick = e => {
        e.stopPropagation();
        a.querySelector('.fnote').classList.toggle('open');
      };
      const gb = a.querySelector('.gobattle');
      if (gb) gb.onclick = e => { e.stopPropagation(); openBattle(b); };

      reader.append(a);
      arts.push(a);
    });

    /* เว้นท้ายไว้ให้ตอนสุดท้ายเลื่อนขึ้นมาถึงเส้นอ่านได้ */
    const tail = document.createElement('div');
    tail.style.height = '52vh';
    reader.append(tail);

    watchScroll(reader);
  }

  /* เส้นอ่านอยู่ราว 35% จากขอบบนของพาเนล — ตอนที่คร่อมเส้นนี้คือตอนที่กำลังอ่าน
     ใช้ scroll event คำนวณตรง ๆ แทน IntersectionObserver เพราะตรวจสอบง่ายกว่า
     และไม่มีปัญหาแถบบางเกินจนไม่มีอะไรแตะ */
  let tScroll = null;
  function watchScroll(reader){
    reader.addEventListener('scroll', () => {
      if (programmatic) return;
      clearTimeout(tScroll);
      tScroll = setTimeout(pickCurrent, 70);
    }, {passive:true});
  }

  function pickCurrent(){
    const reader = $('#reader');
    const line = reader.getBoundingClientRect().top + reader.clientHeight * 0.35;
    let best = 0, bd = Infinity;
    arts.forEach((a, i) => {
      const r = a.getBoundingClientRect();
      const d = (r.top <= line && r.bottom >= line) ? 0
              : Math.min(Math.abs(r.top - line), Math.abs(r.bottom - line));
      if (d < bd){ bd = d; best = i; }
    });
    if (best !== E.index){ scrollDriven = true; E.goTo(best, 'read'); scrollDriven = false; }
  }

  /* กระโดดไปตอนที่ระบุ — เลื่อนหน้าให้ด้วย และสั่งเปลี่ยนตอนเองเลย
     ห้ามรอให้ตัวตรวจจับการเลื่อนทำงาน เพราะระหว่างเลื่อนเองมันถูกปิดไว้ */
  function scrollTo(i){
    const a = arts[i]; if (!a) return;
    programmatic = true;
    a.scrollIntoView({ behavior:'smooth', block:'center' });
    clearTimeout(scrollTo._t);
    scrollTo._t = setTimeout(() => { programmatic = false; }, 650);
    if (i !== E.index) E.goTo(i, 'jump');
  }

  function openBattle(b){
    const bd = (TK.battles || {})[b.battle];
    const back = () => TK.map.flyTo(b.camera, 800);
    if (bd && bd.anchor){
      TK.map.flyTo([bd.anchor[0]-95, bd.anchor[1]-80, 190, 160], 650);
      setTimeout(() => TK.battle.open(b.battle, back), 680);
    } else TK.battle.open(b.battle, back);
  }

  /* ══ แถบเวลา ══ */
  function buildTimeline(){
    const strip = $('#chapstrip'), track = $('#track');
    strip.replaceChildren(); track.replaceChildren();

    const groups = [];
    E.beats.forEach((b, i) => {
      const last = groups[groups.length - 1];
      if (!last || last.chapter !== b.chapter)
        groups.push({ chapter:b.chapter, first:i, items:[i] });
      else last.items.push(i);
    });

    for (const g of groups){
      const info = TK.chapters.find(c => c.n === g.chapter) || {};
      const cap  = `${info.th || 'ภาค ' + g.chapter}${info.years ? ' · ' + info.years : ''}`;

      const btn = document.createElement('button');
      btn.className = 'chapbtn';
      btn.dataset.chapter = g.chapter;
      btn.style.flexGrow = g.items.length;
      btn.title = cap;
      btn.innerHTML = `<b>${SHORT[g.chapter] ?? g.chapter}</b><i>${info.years || ''}</i>`;
      btn.onclick = () => scrollTo(g.first);
      strip.append(btn);

      const grp = document.createElement('div');
      grp.className = 'tgrp';
      grp.style.flexGrow = g.items.length;
      grp.dataset.chapter = g.chapter;
      grp.title = cap;
      for (const i of g.items){
        const b = E.beats[i];
        const cell = document.createElement('button');
        cell.className = 'tcell';
        cell.dataset.i = i;
        cell.title = `${b.year} · ${b.title}`;
        cell.onclick = () => scrollTo(i);
        grp.append(cell);
      }
      track.append(grp);
    }
    bindScrub();
  }

  /* ลากไล่ดูตลอดแถบเวลา */
  function bindScrub(){
    const track = $('#track'), strip = $('#chapstrip');
    let on = false, last = -1;

    const indexAt = x => {
      let best = null, bd = Infinity;
      for (const c of track.querySelectorAll('.tcell')){
        const r = c.getBoundingClientRect();
        const d = Math.abs(x - (r.left + r.width/2));
        if (d < bd){ bd = d; best = +c.dataset.i; }
      }
      return best;
    };
    const move = e => {
      if (!on) return;
      const i = indexAt(e.clientX);
      if (i !== null && i !== last){ last = i; scrollTo(i); E.goTo(i, 'scrub'); }
    };
    const stop = () => { on = false; track.classList.remove('scrubbing'); };

    for (const el of [track, strip]){
      el.addEventListener('pointerdown', e => {
        on = true; last = -1; el.setPointerCapture(e.pointerId);
        track.classList.add('scrubbing'); move(e);
      });
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', stop);
      el.addEventListener('pointercancel', stop);
    }
  }

  function buildHud(){
    $('#hud').replaceChildren(...['han','wei','wu'].map(k => {
      const f = TK.factions[k];
      const row = document.createElement('div');
      row.className = 'hrow';
      row.innerHTML =
        `<div class="htop">
           <span class="hname"><i class="hdot" style="background:${f.color}"></i>${f.th}</span>
           <span class="hnum" data-num="${k}">—</span>
         </div>
         <span class="hbar"><i data-bar="${k}" style="background:${f.color}"></i></span>`;
      return row;
    }));
  }

  function bindControls(){
    $('#btnNext').onclick  = () => scrollTo(Math.min(E.length - 1, E.index + 1));
    $('#btnPrev').onclick  = () => scrollTo(Math.max(0, E.index - 1));
    $('#btnReset').onclick = () => TK.map.resetView(900);

    const MODES = [{cls:'map-faint',th:'จาง'},{cls:'',th:'กลาง'},{cls:'map-rich',th:'ชัด'}];
    let mi = 1;
    try { mi = +(localStorage.getItem('tk-mapmode') ?? 1) || 0; } catch {}
    const applyMode = () => {
      const st = $('#stage');
      MODES.forEach(m => m.cls && st.classList.remove(m.cls));
      if (MODES[mi].cls) st.classList.add(MODES[mi].cls);
      $('#mapmode').textContent = 'แผนที่: ' + MODES[mi].th;
      try { localStorage.setItem('tk-mapmode', mi); } catch {}
    };
    $('#mapmode').onclick = () => { mi = (mi + 1) % MODES.length; applyMode(); };
    applyMode();

    document.addEventListener('keydown', e => {
      if (!$('#battle').hidden) return;          // อยู่ในสมรภูมิ ปล่อยให้ battle.js คุม
      if (e.target.closest('#reader') && ['ArrowUp','ArrowDown','PageUp','PageDown'].includes(e.key))
        return;                                   // ปล่อยให้เลื่อนอ่านตามปกติ
      if (e.key === 'ArrowRight' || e.key === ' '){ e.preventDefault(); $('#btnNext').click(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); $('#btnPrev').click(); }
      if (e.key === 'Home')       { e.preventDefault(); scrollTo(0); }
      if (e.key === 'Escape')     { TK.map.resetView(900); }
      if (e.key === 'Enter' && E.beat.battle){ e.preventDefault(); openBattle(E.beat); }
    });
  }

  /* ══ วาดใหม่เมื่อตอนที่อ่านอยู่เปลี่ยน ══ */
  function render(ev){
    const b = ev.beat, i = ev.index;
    const chap = TK.chapters.find(c => c.n === b.chapter);

    $('#nowchap').textContent = chap ? chap.th : '';
    $('#nowyear').textContent = b.year + (b.season ? ' · ' + SEASON[b.season] : '');
    $('#counter').textContent = `${i + 1} / ${E.length}`;

    arts.forEach((a, k) => a.classList.toggle('now', k === i));

    /* พื้นที่เปลี่ยนมือ — ใส่ไว้ในตอนนั้นเลย ให้คนอ่านเห็นพร้อมข้อความ */
    const box = arts[i] && arts[i].querySelector('.chg');
    if (box && !box.dataset.done){
      box.dataset.done = '1';
      if (b.mapDelta){
        const before = i > 0 ? E.ownersAt(i - 1) : {};
        const rows = Object.entries(b.mapDelta)
          .filter(([id, to]) => before[id] !== to)
          .map(([id, to]) => {
            const from = TK.factions[before[id]] || TK.factions.none;
            const dest = TK.factions[to];
            return `<div class="crow"><span class="cname">${TK.regions[id].th}</span>
              <span style="color:${from.text}">${from.th}</span><span class="carrow">→</span>
              <span style="color:${dest.text}">${dest.th}</span></div>`;
          });
        if (rows.length)
          box.innerHTML = `<div class="chead">พื้นที่เปลี่ยนมือ · ค.ศ. ${b.year}</div>${rows.join('')}`;
      }
    }

    document.querySelectorAll('.tcell').forEach(c => {
      const k = +c.dataset.i;
      c.classList.toggle('done', k <  i);
      c.classList.toggle('now',  k === i);
    });
    document.querySelectorAll('.chapbtn').forEach(c =>
      c.classList.toggle('now', +c.dataset.chapter === b.chapter));
    const cur = document.querySelector('.tcell.now');
    if (cur) cur.scrollIntoView({block:'nearest', inline:'nearest'});

    /* ทั้งสามตัวเลขมาจากพื้นที่ที่ถืออยู่จริงเหมือนกันหมด — เสียดินแดนเมื่อไหร่ลดพร้อมกัน
       เดิมจำนวนเขตคำนวณสด แต่ประชากรกับทหารอ่านค่าที่ประกาศไว้เพียง 7 ฉากจาก 71
       บรรทัดเดียวจึงมีตัวเลขเรียลไทม์ปนกับตัวเลขแช่แข็ง */
    const s = ev.strength, t = ev.tally, total = t.han + t.wei + t.wu + t.none;
    ['han','wei','wu'].forEach(k => {
      const pct = total ? (t[k] / total * 100) : 0;
      document.querySelector(`[data-bar="${k}"]`).style.width = pct.toFixed(1) + '%';
      document.querySelector(`[data-num="${k}"]`).textContent =
        `${t[k]} เขต` + (s && s[k] && t[k]
          ? ` · ${s[k].pop} ล้าน · ${s[k].troops} หมื่น` : '');
    });

    const scrub = ev.how === 'scrub';
    TK.map.setOwners(ev.owners);
    TK.map.setFocus(b);
    TK.map.flyTo(b.camera, ev.how === 'init' ? 0 : scrub ? 320 : 1000);
    TK.map.setMarkers(b.markers, ev.how !== 'init' && !scrub);

  }

  return { init, scrollTo, pickCurrent };
})();
