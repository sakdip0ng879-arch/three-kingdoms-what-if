/* battle.js — แผนที่ยุทธวิธี (โหมดสมรภูมิ)
 *
 * DECISIONS §5: ชั้นนี้วาดเวกเตอร์เองทั้งหมด ไม่ใช้ภาพ JPG
 * เพราะซูม 4 เท่าเข้าไปในภาพต้นฉบับจะเบลอ
 *
 * DECISIONS §6: ▲ ทหารม้า · ■ ทหารราบ · ⬢ กองเรือ · ◉ เมืองป้อม
 * ขนาดแปรตาม √กำลังพล · ปะทะแล้วสั่นยันกัน · แตกทัพแล้ววิ่งถอย
 *
 * act ที่รองรับต้องตรงกับ docs/SCHEMA.md เท่านั้น ห้าม hard-code เฉพาะศึก
 */
window.TK = window.TK || {};

TK.battle = (function(){

  const NS = 'http://www.w3.org/2000/svg';
  const mk = (n,a) => { const e = document.createElementNS(NS,n);
    for (const k in (a||{})) e.setAttribute(k,a[k]); return e; };
  const el = id => document.getElementById(id);

  let B = null;                 // ข้อมูลศึกปัจจุบัน
  let svg, gTerrain, gFx, gUnits, gLabels;
  let U = {};                   // สถานะหน่วยตอนนี้ { id: {x,y,strength,size,el,...} }
  let phase = -1, busy = false, playing = false;
  let tweens = [], timers = [];
  let onExit = null;
  /* close() ซ่อน overlay แบบหน่วงเวลาเพื่อรอ transition จบ
     ถ้าเปิดศึกใหม่ภายในช่วงนั้นต้องยกเลิก ไม่งั้นมันจะซ่อนศึกที่เพิ่งเปิด */
  let hideTimer = null;

  const size = s => 9 + Math.sqrt(s) / 11;

  /* ── รูปทรงหน่วย ── */
  function shapeOf(kind, s){
    if (kind === 'triangle') return mk('polygon',{points:`0,${-s} ${s*.92},${s*.72} ${-s*.92},${s*.72}`});
    if (kind === 'hex'){
      const p = [];
      for (let i=0;i<6;i++){ const a=(i*60)*Math.PI/180;
        p.push(`${(s*Math.cos(a)).toFixed(1)},${(s*Math.sin(a)).toFixed(1)}`); }
      return mk('polygon',{points:p.join(' ')});
    }
    if (kind === 'circle') return mk('circle',{r:s});
    return mk('rect',{x:-s, y:-s, width:s*2, height:s*2, rx:s*.14});
  }

  /* ── สร้างฉาก ── */
  function build(){
    svg.replaceChildren();
    const defs = mk('defs');
    defs.innerHTML =
      `<filter id="bglow" x="-60%" y="-60%" width="220%" height="220%">
         <feGaussianBlur stdDeviation="7" result="b"/>
         <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
       </filter>`;
    svg.append(defs);
    gTerrain = mk('g'); gFx = mk('g'); gUnits = mk('g'); gLabels = mk('g');
    svg.append(gTerrain, gFx, gUnits, gLabels);

    for (const t of (B.terrain || [])){
      if (t.kind === 'fort'){
        const g = mk('g',{class:'bt-fort', transform:`translate(${t.at[0]},${t.at[1]})`});
        const c = t.side ? TK.factions[t.side].color : '#8b93a7';
        g.append(mk('rect',{x:-16,y:-16,width:32,height:32,rx:3,fill:'none',
                            stroke:c,'stroke-width':3}));
        g.append(mk('path',{d:'M -16,-16 L 16,16 M 16,-16 L -16,16',
                            fill:'none', stroke:c,'stroke-width':1.4,opacity:.55}));
        if (t.label){ const x = mk('text',{y:-24,class:'bt-fortlabel',fill:c});
                      x.textContent = t.label; g.append(x); }
        gTerrain.append(g);
      } else {
        gTerrain.append(mk('path',{d:t.d, class:'bt-'+t.kind}));
      }
    }

    U = {};
    for (const u of (B.units || [])) spawn(u, u.at);
  }

  function spawn(def, at){
    const s = size(def.strength);
    const g = mk('g',{class:'bu bu-'+def.side});
    const inner = mk('g',{class:'bu-body'});
    const sh = shapeOf(def.shape, s);
    sh.setAttribute('fill', TK.factions[def.side].color);
    sh.setAttribute('class','bu-shape');
    inner.append(sh);
    g.append(inner);

    const who = TK.people[def.who];
    const nm = mk('text',{y:-s-9, class:'bu-name'});
    nm.textContent = who ? who.th : (def.name || '');
    const st = mk('text',{y:s+17, class:'bu-str'});
    st.textContent = fmt(def.strength);
    g.append(nm, st);
    g.setAttribute('transform', `translate(${at[0]},${at[1]})`);
    gUnits.append(g);

    U[def.id] = { ...def, x:at[0], y:at[1], strength0:def.strength,
                  strength:def.strength, size:s, el:g, inner, sh, nm, st, dead:false };
    return U[def.id];
  }

  const fmt = n =>
    n >= 10000 ? (n/10000).toFixed(n % 10000 ? 1 : 0) + ' หมื่น' :
    n >= 1000  ? (n/1000 ).toFixed(n % 1000  ? 1 : 0) + ' พัน'  :
                 n.toLocaleString('th-TH');

  function place(u){
    u.el.setAttribute('transform', `translate(${u.x.toFixed(1)},${u.y.toFixed(1)})`);
  }

  /* ── ตัวรัน act ── */
  function clearAnim(){
    tweens.forEach(c => c && c()); tweens = [];
    timers.forEach(clearTimeout);  timers = [];
    if (gFx) gFx.replaceChildren();
    /* ป้ายอธิบายต้องล้างด้วย ไม่งั้นมันค้างสะสมข้ามระยะไปเรื่อย ๆ */
    if (gLabels) gLabels.replaceChildren();
  }

  /* รัน act ทั้งชุดพร้อมกัน แล้วเรียก done เมื่อครบ
     instant = true คือกระโดดไปสถานะปลายทางทันที (ใช้ตอนเลื่อน phase เร็ว ๆ และตอนทดสอบ) */
  function runActs(acts, instant, done){
    acts = acts || [];
    let left = acts.length;
    if (!left) return done && done();
    const tick = () => { if (--left === 0 && done) done(); };
    for (const a of acts) runAct(a, instant, tick);
  }

  function runAct(a, instant, done){
    const u = U[a.u];
    const ms = instant ? 0 : (a.ms || 1200);

    /* spawn — หน่วยโผล่เข้าฉาก */
    if (a.spawn){
      const def = (B.units || []).find(d => d.id === a.u) ||
                  (B.reserves || []).find(d => d.id === a.u);
      if (def && !U[a.u]) spawn(def, a.spawn);
      else if (u){ u.x = a.spawn[0]; u.y = a.spawn[1]; place(u); u.el.style.display=''; }
      const nu = U[a.u];
      if (nu){ nu.el.style.opacity = 0;
               tweens.push(TK.engine.tween({o:0},{o:1}, ms, c => nu.el.style.opacity = c.o, done)); }
      else done();
      return;
    }
    if (!u) return done();

    /* move — เดินตามเส้นทาง */
    if (a.move){
      /* เส้นนี้มีไว้วัดระยะอย่างเดียว ต้องสั่ง fill/stroke = none ให้ชัด
         ไม่งั้น SVG ระบายทึบสีดำให้ตามค่าปริยาย กลายเป็นก้อนดำเต็มจอ */
      const p = mk('path',{d:a.move, fill:'none', stroke:'none'});
      gFx.append(p);
      const L = p.getTotalLength();
      /* วาดรอยทางเดินไว้ให้เห็นว่าเคลื่อนไปทางไหน */
      const trail = mk('path',{d:a.move, class:'bt-trail',
        stroke:TK.factions[u.side].color});
      trail.style.strokeDasharray = L; trail.style.strokeDashoffset = L;
      gFx.append(trail);
      const step = v => { const pt = p.getPointAtLength(L*v);
        u.x = pt.x; u.y = pt.y; place(u);
        trail.style.strokeDashoffset = L*(1-v); };
      if (instant){ step(1); done(); }
      else tweens.push(TK.engine.tween({v:0},{v:1}, ms, c => step(c.v), done));
      return;
    }

    /* clash — ดันเข้าหากันแล้วสั่นยันกัน + แถบแรงดัน */
    if (a.clash){
      const foe = U[a.clash];
      if (!foe) return done();
      const mx = (u.x + foe.x)/2, my = (u.y + foe.y)/2;
      const ang = Math.atan2(foe.y - u.y, foe.x - u.x);
      const ux = Math.cos(ang), uy = Math.sin(ang);
      const push = (a.pressure || 0);         // -1..1  ลบ = ฝ่ายนี้เสียเปรียบ

      /* ยกแถบขึ้นเหนือแนวปะทะ ไม่งั้นทับคูดิน/ถนนจนอ่านไม่ออก */
      const bar = mk('g',{class:'bt-press', transform:`translate(${mx},${my - 46})`});
      const bw = 68;
      bar.append(mk('rect',{x:-bw/2,y:-5,width:bw,height:10,rx:5,class:'bt-press-bg'}));
      const foeFill = mk('rect',{x:-bw/2,y:-5,width:bw,height:10,rx:5,
        fill:TK.factions[foe.side].color, opacity:.85});
      const fill = mk('rect',{x:-bw/2,y:-5,width:bw/2,height:10,rx:5,
        fill:TK.factions[u.side].color});
      bar.append(foeFill, fill);
      gFx.append(bar);

      const x0=u.x, y0=u.y, fx0=foe.x, fy0=foe.y;
      const step = (t) => {
        /* สั่น 4Hz แอมพลิจูดค่อย ๆ ลด */
        const osc = Math.sin(t*Math.PI*2*4) * 5 * (1 - t*0.45);
        const drift = push * 14 * t;          // ฝ่ายได้เปรียบดันคู่ต่อสู้ถอย
        u.x = x0 + ux*(osc + drift);  u.y = y0 + uy*(osc + drift);
        foe.x = fx0 + ux*(osc + drift)*0.6; foe.y = fy0 + uy*(osc + drift)*0.6;
        place(u); place(foe);
        const r = Math.max(.08, Math.min(.92, 0.5 + push*t*0.55));
        fill.setAttribute('width', bw*r);
      };
      if (instant){ step(1); done(); }
      else tweens.push(TK.engine.tween({t:0},{t:1}, ms, c => step(c.t), done));
      return;
    }

    /* shrink — เสียกำลังพล */
    if (a.shrink !== undefined){
      const to = Math.max(0.18, a.shrink);
      const from = u.strength;
      const target = Math.round(u.strength0 * to);
      const s1 = size(Math.max(target,1));
      const s0 = u.size;
      const step = v => {
        const s = s0 + (s1-s0)*v;
        u.inner.setAttribute('transform', `scale(${(s/u.size).toFixed(3)})`);
        u.st.textContent = fmt(Math.round(from + (target-from)*v));
      };
      if (instant){ step(1); u.strength=target; u.size=s1;
                    u.inner.setAttribute('transform',''); rebuild(u); done(); }
      else tweens.push(TK.engine.tween({v:0},{v:1}, ms, c => step(c.v), () => {
             u.strength=target; u.size=s1; u.inner.setAttribute('transform','');
             rebuild(u); done(); }));
      return;
    }

    /* rout — แตกทัพ กะพริบแดง */
    if (a.rout){
      u.el.classList.add('routed');
      if (instant) done();
      else timers.push(setTimeout(done, Math.min(ms, 900)));
      return;
    }

    /* despawn */
    if (a.despawn){
      if (instant){ u.el.style.display='none'; done(); }
      else tweens.push(TK.engine.tween({o:1},{o:0}, ms, c => u.el.style.opacity=c.o,
             () => { u.el.style.display='none'; done(); }));
      return;
    }

    done();
  }

  /* วาดรูปทรงใหม่ตามขนาดที่เปลี่ยน */
  function rebuild(u){
    const nsh = shapeOf(u.shape, u.size);
    nsh.setAttribute('fill', TK.factions[u.side].color);
    nsh.setAttribute('class','bu-shape');
    u.inner.replaceChildren(nsh);
    u.sh = nsh;
    u.nm.setAttribute('y', -u.size-9);
    u.st.setAttribute('y',  u.size+17);
  }

  /* act ที่ไม่ผูกกับหน่วย */
  function runFree(a, instant, done){
    if (a.burn){
      const g = mk('g',{class:'bt-burn', transform:`translate(${a.burn[0]},${a.burn[1]})`});
      for (let i=0;i<3;i++)
        g.append(mk('circle',{r:9+i*7, class:'bt-flame', style:`animation-delay:${i*.18}s`}));
      gFx.append(g);
      instant ? done() : timers.push(setTimeout(done, Math.min(a.ms||900, 900)));
      return;
    }
    if (a.siege){
      const t = U[a.siege]; if (!t) return done();
      const g = mk('g',{class:'bt-siege', transform:`translate(${t.x},${t.y})`});
      g.append(mk('circle',{r:t.size+18}));
      g.append(mk('circle',{r:t.size+30, opacity:.45}));
      gFx.append(g);
      instant ? done() : timers.push(setTimeout(done, Math.min(a.ms||900, 900)));
      return;
    }
    if (a.label){
      const t = mk('text',{x:a.at?a.at[0]:600, y:a.at?a.at[1]:60, class:'bt-note'});
      t.textContent = a.label;
      gLabels.append(t);
      instant ? done() : timers.push(setTimeout(done, 500));
      return;
    }
    done();
  }

  /* ── เดิน phase ── */
  function goPhase(n, instant){
    if (!B) return;
    n = Math.max(0, Math.min(B.phases.length-1, n));
    clearAnim();

    /* ถ้ากระโดดถอยหลังหรือข้าม ต้องเล่นซ้ำตั้งแต่ต้นแบบทันที เพื่อให้สถานะถูก */
    if (n < phase || n > phase + 1){
      build();
      for (let k=0; k<n; k++) applyPhase(k, true);
      phase = n - 1;
    }
    phase = n;
    renderPanel();
    busy = true;
    applyPhase(n, !!instant, () => {
      busy = false;
      renderPanel();          // กำลังพลกับรายชื่อเปลี่ยนหลังระยะจบ ต้องวาดซ้ำ
      if (playing) timers.push(setTimeout(() => {
        if (playing && phase < B.phases.length-1) goPhase(phase+1);
        else { playing = false; renderPanel(); }
      }, 900));
    });
  }

  function applyPhase(n, instant, done){
    const ph = B.phases[n];
    const acts = ph.acts || [];
    const unitActs = acts.filter(a => a.u);
    const freeActs = acts.filter(a => !a.u);
    let left = unitActs.length + freeActs.length;
    if (!left) return done && done();
    const tick = () => { if (--left === 0 && done) done(); };
    unitActs.forEach(a => runAct(a, instant, tick));
    freeActs.forEach(a => runFree(a, instant, tick));
  }

  /* ── แผงข้อมูล ── */
  function renderPanel(){
    const ph = B.phases[phase] || {};
    el('bPhaseNo').textContent  = `ระยะที่ ${phase+1} / ${B.phases.length}`;
    el('bPhaseTxt').textContent = ph.th || '';
    el('bPrev').disabled = phase === 0;
    el('bNext').disabled = phase === B.phases.length-1;
    el('bPlay').textContent = playing ? '❚❚ หยุด' : '▶ เล่นต่อเนื่อง';
    el('bDots').replaceChildren(...B.phases.map((p,i) => {
      const d = document.createElement('button');
      d.className = 'bdot' + (i===phase?' now':'') + (i<phase?' done':'');
      d.title = `${i+1}. ${p.th}`;
      d.onclick = () => { playing=false; goPhase(i, true); };
      return d;
    }));
    el('bRoster').replaceChildren(...Object.values(U)
      .filter(u => u.el.style.display !== 'none')
      .map(u => {
        const who = TK.people[u.who];
        const d = document.createElement('div');
        d.className = 'brow';
        d.innerHTML =
          `<i class="bchip s-${u.shape}" style="background:${TK.factions[u.side].color}"></i>
           <span class="bname">${who ? who.th : (u.name||u.id)}</span>
           <span class="bnum">${fmt(u.strength)}</span>`;
        return d;
      }));
  }

  /* ── เปิด/ปิด ── */
  function open(id, exitCb){
    B = (TK.battles || {})[id];
    if (!B){ alert('ยังไม่มีข้อมูลศึกนี้: ' + id); return; }
    onExit = exitCb;
    clearTimeout(hideTimer);
    const host = el('battle');
    host.hidden = false;
    requestAnimationFrame(() => host.classList.add('on'));
    el('bTitle').textContent = B.th;
    el('bYear').textContent  = 'ค.ศ. ' + B.year;
    svg = el('bsvg');
    svg.setAttribute('viewBox', B.viewBox || '0 0 1200 800');
    build();
    phase = -1; playing = false;
    goPhase(0, true);
    document.addEventListener('keydown', keys);
  }

  function close(){
    playing = false; clearAnim();
    document.removeEventListener('keydown', keys);
    const host = el('battle');
    host.classList.remove('on');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { host.hidden = true; }, 320);
    B = null;
    if (onExit) onExit();
  }

  function keys(e){
    if (!B) return;
    if (e.key === 'Escape'){ e.preventDefault(); close(); }
    if (e.key === 'ArrowRight' || e.key === ' '){ e.preventDefault(); if(!busy) goPhase(phase+1); }
    if (e.key === 'ArrowLeft'){ e.preventDefault(); playing=false; goPhase(phase-1, true); }
  }

  function bind(){
    el('bClose').onclick = close;
    el('bNext').onclick  = () => { playing=false; goPhase(phase+1); };
    el('bPrev').onclick  = () => { playing=false; goPhase(phase-1, true); };
    el('bPlay').onclick  = () => {
      playing = !playing; renderPanel();
      if (playing && !busy && phase < B.phases.length-1) goPhase(phase+1);
    };
  }

  return { open, close, bind,
           get phase(){ return phase; },
           get data(){ return B; },
           goPhase };
})();
