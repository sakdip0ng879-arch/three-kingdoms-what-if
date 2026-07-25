/* ui.js — แผงเนื้อเรื่อง แถบเวลา HUD กำลังพล และป้ายจริง/แต่ง */
window.TK = window.TK || {};

TK.ui = (function(){

  const $ = s => document.querySelector(s);
  const E = TK.engine;

  const FACT = {
    real:    { th:"อิงประวัติศาสตร์จริง", cls:"f-real" },
    fiction: { th:"แต่งขึ้น",             cls:"f-fic"  },
    mixed:   { th:"จริงผสมแต่ง",          cls:"f-mix"  }
  };

  function init(){
    buildTimeline();
    buildHud();
    bindControls();
    E.on('beat', render);
    E.goTo(0, 'init');
  }

  /* ── แถบเวลา: หนึ่งช่องต่อหนึ่ง beat จัดกลุ่มตามภาค ── */
  function buildTimeline(){
    const track = $('#track');
    track.replaceChildren();
    let chap = -1, grp = null;
    E.beats.forEach((b, i) => {
      if (b.chapter !== chap){
        chap = b.chapter;
        grp = document.createElement('div');
        grp.className = 'tgrp';
        const info = TK.chapters.find(c => c.n === chap);
        grp.title = info ? `${info.th} (${info.years})` : '';
        grp.dataset.chapter = chap;
        track.append(grp);
      }
      const cell = document.createElement('button');
      cell.className = 'tcell';
      cell.dataset.i = i;
      cell.title = `${b.year} · ${b.title}`;
      cell.onclick = () => E.goTo(i, 'scrub');
      grp.append(cell);
    });
  }

  function buildHud(){
    $('#hud').replaceChildren(...['han','wei','wu'].map(k => {
      const f = TK.factions[k];
      const row = document.createElement('div');
      row.className = 'hrow';
      row.innerHTML =
        `<div class="htop">
           <span class="hname" style="color:${f.color}">${f.th}</span>
           <span class="hnum" data-num="${k}">—</span>
         </div>
         <span class="hbar"><i data-bar="${k}" style="background:${f.color}"></i></span>`;
      return row;
    }));
  }

  function bindControls(){
    $('#btnNext').onclick  = () => E.next();
    $('#btnPrev').onclick  = () => E.prev();
    $('#btnReset').onclick = () => TK.map.resetView(900);
    $('#fact').onclick     = () => $('#factNote').classList.toggle('open');
    $('#btnBattle').onclick = () => {
      const id = E.beat.battle;
      alert(`เฟส 4 จะทำระบบสมรภูมิที่นี่\n\nศึก: ${id}\n\n` +
            `ตอนนี้เป็นแค่ปุ่มพิสูจน์ว่า schema field "battle" ทำงาน`);
    };
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === ' '){ e.preventDefault(); E.next(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); E.prev(); }
      if (e.key === 'Home')       { e.preventDefault(); E.goTo(0); }
      if (e.key === 'Escape')     { TK.map.resetView(900); }
    });
  }

  /* ── วาดทุกอย่างใหม่เมื่อ beat เปลี่ยน ── */
  function render(ev){
    const b = ev.beat;
    const chap = TK.chapters.find(c => c.n === b.chapter);

    $('#chapter').textContent = chap ? chap.th : '';
    $('#year').textContent    = b.year + (b.season ? ' · ' + seasonTh(b.season) : '');
    $('#title').textContent   = b.title;

    const body = $('#text');
    body.textContent = b.text;
    body.className = 'text' + (b.voice === 'watcher' ? ' watcher' : '');

    const f = FACT[b.fact] || FACT.mixed;
    $('#fact').textContent = f.th;
    $('#fact').className   = 'fact ' + f.cls;
    $('#factNote').textContent = b.factNote || '';
    $('#factNote').classList.remove('open');

    $('#btnBattle').hidden = !b.battle;
    $('#btnPrev').disabled = ev.index === 0;
    $('#btnNext').disabled = ev.index === E.length - 1;
    $('#counter').textContent = `${ev.index + 1} / ${E.length}`;

    document.querySelectorAll('.tcell').forEach(c => {
      const i = +c.dataset.i;
      c.classList.toggle('done', i <  ev.index);
      c.classList.toggle('now',  i === ev.index);
    });

    /* HUD: ตัวเลขจากเนื้อเรื่อง + จำนวนภูมิภาคที่ถือครองจริง */
    const hud = ev.hud, t = ev.tally, total = t.han + t.wei + t.wu + t.none;
    ['han','wei','wu'].forEach(k => {
      const pct = total ? (t[k] / total * 100) : 0;
      document.querySelector(`[data-bar="${k}"]`).style.width = pct.toFixed(1) + '%';
      document.querySelector(`[data-num="${k}"]`).textContent =
        hud && hud[k] ? `${hud[k].pop} ล้าน · ${hud[k].troops} หมื่น` : `${t[k]} เขต`;
    });

    /* แผนที่ */
    TK.map.setOwners(ev.owners);
    TK.map.flyTo(b.camera, ev.how === 'init' ? 0 : 1100);
    TK.map.setMarkers(b.markers, ev.how !== 'init');
  }

  const seasonTh = s => ({spring:'ฤดูใบไม้ผลิ', summer:'ฤดูร้อน',
                          autumn:'ฤดูใบไม้ร่วง', winter:'ฤดูหนาว'}[s] || '');

  return { init };
})();
