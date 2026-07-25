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

  /* ── แถบเวลา: แถวบนคือภาค (กดกระโดดได้) แถวล่างคือหนึ่งช่องต่อหนึ่ง beat ──
     ทั้งสองแถวใช้ flex-grow เท่ากับจำนวน beat ในภาคนั้น จะได้ตรงคอลัมน์กัน */
  const SHORT = ['นำ','๑','๒','๓','๔','๕','๖','๗','ท้าย'];

  function buildTimeline(){
    const strip = $('#chapstrip'), track = $('#track');
    strip.replaceChildren(); track.replaceChildren();

    /* จัดกลุ่ม beat ตามภาค โดยยึดลำดับที่ปรากฏจริง */
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
      btn.onclick = () => E.goTo(g.first, 'scrub');
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
        cell.onclick = () => E.goTo(i, 'scrub');
        grp.append(cell);
      }
      track.append(grp);
    }
    bindScrub(groups);
  }

  /* ── โหมดสำรวจ: ลากไล่ดูตลอดแถบเวลา ──
     กดค้างแล้วลากผ่านช่องไหนก็กระโดดไปฉากนั้นทันที เห็นพื้นที่ไหลเปลี่ยนสีต่อเนื่อง 228→276
     ระหว่างลากใช้ how:'scrub' เพื่อให้กล้องกับแอนิเมชันสั้นลง ไม่งั้นจะหน่วง */
  function bindScrub(groups){
    const track = $('#track');
    let scrubbing = false, lastIndex = -1;

    const indexAt = (clientX) => {
      const cells = [...track.querySelectorAll('.tcell')];
      let best = null, bd = Infinity;
      for (const c of cells){
        const r = c.getBoundingClientRect();
        const d = Math.abs(clientX - (r.left + r.width/2));
        if (d < bd){ bd = d; best = +c.dataset.i; }
      }
      return best;
    };

    const move = e => {
      if (!scrubbing) return;
      const i = indexAt(e.clientX);
      if (i !== null && i !== lastIndex){ lastIndex = i; E.goTo(i, 'scrub'); }
    };

    track.addEventListener('pointerdown', e => {
      scrubbing = true; lastIndex = -1;
      track.setPointerCapture(e.pointerId);
      track.classList.add('scrubbing');
      move(e);
    });
    track.addEventListener('pointermove', move);
    const stop = () => { scrubbing = false; track.classList.remove('scrubbing'); };
    track.addEventListener('pointerup', stop);
    track.addEventListener('pointercancel', stop);

    /* ลากบนแถบภาคก็ไล่ได้เหมือนกัน */
    const strip = $('#chapstrip');
    strip.addEventListener('pointerdown', e => {
      scrubbing = true; lastIndex = -1;
      strip.setPointerCapture(e.pointerId);
      move(e);
    });
    strip.addEventListener('pointermove', move);
    strip.addEventListener('pointerup', stop);
    strip.addEventListener('pointercancel', stop);
  }

  function buildHud(){
    $('#hud').replaceChildren(...['han','wei','wu'].map(k => {
      const f = TK.factions[k];
      const row = document.createElement('div');
      row.className = 'hrow';
      /* ชื่อฝ่ายใช้สีตัวอักษรปกติ ให้จุดสีข้าง ๆ เป็นตัวบอกว่าใครเป็นใคร
         (สีระบายพื้นที่เข้มเกินกว่าจะใช้เป็นตัวหนังสือได้ — วุ่ยได้แค่ 2.87:1) */
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
    $('#btnNext').onclick  = () => E.next();
    $('#btnPrev').onclick  = () => E.prev();
    $('#btnReset').onclick = () => TK.map.resetView(900);

    /* ความเข้มแผนที่พื้น — จำค่าที่เลือกไว้ให้ด้วย */
    const MODES = [
      { cls:'map-faint', th:'จาง' },
      { cls:'',          th:'กลาง' },
      { cls:'map-rich',  th:'ชัด'  }
    ];
    let mi = +(localStorage.getItem('tk-mapmode') ?? 1);
    const applyMode = () => {
      const st = $('#stage');
      MODES.forEach(m => m.cls && st.classList.remove(m.cls));
      if (MODES[mi].cls) st.classList.add(MODES[mi].cls);
      $('#mapmode').textContent = 'แผนที่: ' + MODES[mi].th;
      try { localStorage.setItem('tk-mapmode', mi); } catch {}
    };
    $('#mapmode').onclick = () => { mi = (mi + 1) % MODES.length; applyMode(); };
    applyMode();
    $('#fact').onclick     = () => $('#factNote').classList.toggle('open');
    /* ซูมแผนที่ใหญ่เข้าไปที่จุดเกิดศึกก่อน แล้วค่อยให้แผนที่ยุทธวิธีเฟดขึ้นมาทับ
       ให้รู้สึกเหมือนซูมต่อเนื่อง ไม่ใช่กระโดดไปอีกหน้า (DECISIONS §5) */
    $('#btnBattle').onclick = () => {
      const b  = E.beat;
      const bd = (TK.battles || {})[b.battle];
      const back = () => TK.map.flyTo(b.camera, 800);
      if (bd && bd.anchor){
        TK.map.flyTo([bd.anchor[0]-95, bd.anchor[1]-80, 190, 160], 650);
        setTimeout(() => TK.battle.open(b.battle, back), 680);
      } else TK.battle.open(b.battle, back);
    };
    document.addEventListener('keydown', e => {
      if (!document.getElementById('battle').hidden) return;   // อยู่ในสมรภูมิ ปล่อยให้ battle.js คุมคีย์
      if (e.key === 'ArrowRight' || e.key === ' '){ e.preventDefault(); E.next(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); E.prev(); }
      if (e.key === 'Home')       { e.preventDefault(); E.goTo(0); }
      if (e.key === 'Escape')     { TK.map.resetView(900); }
      if (e.key === 'Enter' && E.beat.battle){ e.preventDefault(); $('#btnBattle').click(); }
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
    document.querySelectorAll('.chapbtn').forEach(c =>
      c.classList.toggle('now', +c.dataset.chapter === b.chapter));

    /* เลื่อนช่องปัจจุบันให้อยู่ในสายตาเสมอ ตอนแถบยาว ๆ */
    const cur = document.querySelector('.tcell.now');
    if (cur) cur.scrollIntoView({block:'nearest', inline:'nearest'});

    /* HUD: ตัวเลขจากเนื้อเรื่อง + จำนวนภูมิภาคที่ถือครองจริง */
    const hud = ev.hud, t = ev.tally, total = t.han + t.wei + t.wu + t.none;
    ['han','wei','wu'].forEach(k => {
      const pct = total ? (t[k] / total * 100) : 0;
      document.querySelector(`[data-bar="${k}"]`).style.width = pct.toFixed(1) + '%';
      document.querySelector(`[data-num="${k}"]`).textContent =
        hud && hud[k] ? `${hud[k].pop} ล้าน · ${hud[k].troops} หมื่น` : `${t[k]} เขต`;
    });

    /* แผนที่ — ตอนลากไล่ดูต้องสั้นและไม่เล่นแอนิเมชันลูกศร ไม่งั้นตามไม่ทันแล้วหน่วง */
    const scrub = ev.how === 'scrub';
    TK.map.setOwners(ev.owners);
    TK.map.setFocus(b);
    TK.map.flyTo(b.camera, ev.how === 'init' ? 0 : scrub ? 320 : 1100);
    TK.map.setMarkers(b.markers, ev.how !== 'init' && !scrub);
  }

  const seasonTh = s => ({spring:'ฤดูใบไม้ผลิ', summer:'ฤดูร้อน',
                          autumn:'ฤดูใบไม้ร่วง', winter:'ฤดูหนาว'}[s] || '');

  return { init };
})();
