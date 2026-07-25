/* strategic.js — แผนที่ยุทธศาสตร์
 *
 * SVG ชั้นเดียวครอบ JPG ใช้ viewBox = พิกัดพิกเซลของภาพต้นฉบับ (DECISIONS §4)
 * Zoom/Pan = แก้ค่า viewBox อย่างเดียว ห้ามซ้อน CSS transform (DECISIONS §5)
 */
window.TK = window.TK || {};

TK.map = (function(){

  const NS = 'http://www.w3.org/2000/svg';
  const W = 1650, H = 1950;

  /* ⚠ preserveAspectRatio="meet" ย่อ/ขยายตามด้านที่ "คับกว่า"
     ถ้า viewBox มีสัดส่วนไม่ตรงกับกล่องบนจอ จะเกิดขอบดำและสเกลไม่ใช่ w/screenW
     → บังคับสัดส่วน viewBox ให้ตรงกับกล่องเสมอ กล้องถึงจะไปตรงที่สั่งจริง ๆ */
  const fitAR = () => (host.clientHeight || 1) / (host.clientWidth || 1);
  const mk = (n,a) => { const e = document.createElementNS(NS,n);
    for (const k in (a||{})) e.setAttribute(k,a[k]); return e; };

  let svg, layers = {}, host;
  let vb = { x:0, y:0, w:W, h:H };
  let camCancel = null, scaleCache = null;
  let forceLabels = new Set();
  /* ต้องเก็บ timer กับ tween ของลูกศรไว้ยกเลิก ไม่งั้นกดต่อไปรัว ๆ
     แอนิเมชันของฉากเก่าจะค้างวิ่งทับกันไปเรื่อย ๆ จนเครื่องหน่วง */
  let mkTimers = [], mkTweens = [];
  const regionEl = {}, pinEl = {}, labelEl = {};

  /* ── สัญลักษณ์กองทัพ (DECISIONS §6) ── */
  function unitShape(kind, s){
    switch (kind){
      case 'triangle': return mk('polygon',{points:`0,${-s} ${s},${s*0.8} ${-s},${s*0.8}`});
      case 'hex':      return mk('polygon',{points:
        [0,30,90,150,210,270,330].slice(1).map(a=>{
          const r=a*Math.PI/180; return `${(s*Math.cos(r)).toFixed(1)},${(s*Math.sin(r)).toFixed(1)}`;
        }).join(' ')});
      case 'circle':   return mk('circle',{r:s});
      default:         return mk('rect',{x:-s, y:-s, width:s*2, height:s*2});
    }
  }

  /* ── สร้างครั้งเดียว ── */
  function init(hostEl){
    host = hostEl;
    svg = mk('svg',{viewBox:`0 0 ${W} ${H}`, preserveAspectRatio:'xMidYMid meet', id:'tkmap'});
    host.append(svg);

    /* หัวลูกศร — markerUnits ปริยายคือ strokeWidth ขนาดจึงคงที่บนจอตามเส้นไปเอง
       fill:context-stroke ทำให้หัวลูกศรได้สีเดียวกับเส้นโดยไม่ต้องสร้าง marker ต่อฝ่าย */
    const defs = mk('defs');
    const head = mk('marker',{id:'ahead', viewBox:'0 0 10 10', refX:8, refY:5,
      markerWidth:4.2, markerHeight:4.2, orient:'auto-start-reverse'});
    head.append(mk('path',{d:'M 0,0 L 10,5 L 0,10 z', fill:'context-stroke'}));
    defs.append(head);
    svg.append(defs);

    svg.append(mk('image',{href:'assets/map.jpg', x:0, y:0, width:W, height:H, id:'basemap'}));
    for (const name of ['regions','focus','routes','markers','pins','labels'])
      svg.append(layers[name] = mk('g',{id:'L-'+name}));

    /* ปิดทับตัวอักษร WEI / SHU / WU ที่พิมพ์มากับแผนที่ (สลับสีกับคอนเวนชันของเรา) */
    const mask = mk('g',{id:'L-mask'});
    [[560,455,205,95],[262,1195,215,95],[1175,1450,180,95]].forEach(([x,y,w,h]) =>
      mask.append(mk('rect',{x,y,width:w,height:h, fill:'#eef1f4', opacity:.92})));
    svg.insertBefore(mask, layers.regions);

    buildRegions();
    buildPins();
    bindPanZoom();
    vb = fitBox(0, 0, W, H);        // เริ่มที่ทั้งแผ่นดิน โดยสัดส่วนตรงกับกล่อง
    applyVB();
    relayout();
    return api;
  }

  function buildRegions(){
    for (const id in TK.regions){
      const r = TK.regions[id];
      const c = TK.factions[r.owner].color;
      const p = mk('path',{d:r.d, class:'region', fill:c, stroke:c});
      p.dataset.id = id;
      const t = mk('title'); t.textContent = r.th;
      p.append(t);
      layers.regions.append(p);
      regionEl[id] = p;
    }
  }

  function buildPins(){
    for (const id in TK.places){
      const p = TK.places[id];
      const g = mk('g',{class:'pin t-'+p.type});
      g.dataset.id = id;
      g.append(mk('circle',{cx:p.x, cy:p.y, r: p.type==='capital' ? 6 : 4}));
      const t = mk('title'); t.textContent = `${p.th} · ${p.py}`;
      g.append(t);
      layers.pins.append(g);
      pinEl[id] = g;
    }
  }

  /* ── เจ้าของพื้นที่ ── */
  function setOwners(owners){
    for (const id in owners){
      const el = regionEl[id]; if (!el) continue;
      const c = TK.factions[owners[id]].color;
      if (el.getAttribute('fill') !== c){
        el.setAttribute('fill', c);
        el.setAttribute('stroke', c);
        el.classList.remove('flip'); void el.offsetWidth; el.classList.add('flip');
      }
    }
  }

  /* ── กล้อง: tween viewBox ──
     applyVB ทำแค่เขียน attribute เดียว ห้ามเรียก relayout ที่นี่
     เพราะระหว่าง tween มันจะยิงวินาทีละ 60 ครั้ง × (122 หมุด + 26 ป้าย) = เครื่องตาย */
  function applyVB(){
    svg.setAttribute('viewBox',
      `${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`);
  }

  /* ระหว่างกล้องเคลื่อน ซ่อนป้ายไว้ก่อน แล้วค่อยจัดใหม่ตอนนิ่ง
     — เร็วกว่ามาก และดูดีกว่าปล่อยให้ป้ายวิ่งสะบัดตามกล้อง */
  let settleTimer = null;
  function settleLabels(delay){
    clearTimeout(settleTimer);
    layers.labels.style.opacity = 0;
    layers.pins.style.opacity   = 0;
    settleTimer = setTimeout(() => {
      relayout();
      updateWhere();
      layers.labels.style.opacity = 1;
      layers.pins.style.opacity   = 1;
    }, delay);
  }

  /* ── "ตอนนี้กำลังดูอะไรอยู่" ──
     กล้องซูมเข้าออกโดยไม่บอกว่าดูอะไร ทำให้คนที่ไม่รู้จักภูมิศาสตร์แถบนั้นหลง
     หาเองได้จากเขตที่กล้องเล็งไป + สถานที่ที่ฉากนี้ปักหมุด ไม่ต้องเพิ่มข้อมูล 71 ฉาก */
  let focusBeat = null;
  const setFocus = b => { focusBeat = b; };

  function regionAt(x, y){
    const pt = svg.createSVGPoint(); pt.x = x; pt.y = y;
    for (const id in regionEl)
      if (regionEl[id].isPointInFill(pt)) return id;
    return null;
  }

  function updateWhere(){
    const box = document.getElementById('where');
    if (!box) return;

    /* ⚠ ต้องตัดสินจาก "กรอบที่ฉากตั้งใจ" ไม่ใช่ viewBox จริงบนจอ
       เพราะ fitBox ขยายกรอบให้พอดีสัดส่วนจอ จอกว้างมาก ๆ (เช่น 2454×784)
       จะทำให้กรอบที่ตั้งใจซูม 340 บานเป็น 1535 แล้วถูกตัดสินว่า "ทั้งแผ่นดิน" ผิด ๆ */
    const cam  = focusBeat && focusBeat.camera;
    const wide = !cam || cam[2] > W * 0.72;
    const cx   = cam ? cam[0] + cam[2]/2 : W/2;
    const cy   = cam ? cam[1] + (cam[3] || cam[2]) / 2 : H/2;
    const rid  = wide ? null : regionAt(cx, cy);

    /* สถานที่ที่ฉากนี้พูดถึง เอามาจาก marker ตรง ๆ */
    const spots = [...new Set((focusBeat && focusBeat.markers || [])
      .filter(m => m.place && TK.places[m.place])
      .map(m => TK.places[m.place].th))].slice(0, 3);

    const parts = [];
    if (wide) parts.push('ทั้งแผ่นดิน');
    else if (rid) parts.push(TK.regions[rid].th);
    if (spots.length) parts.push(spots.join(' · '));

    box.innerHTML = parts.length
      ? `<b>${parts[0]}</b>${parts[1] ? '<span>' + parts[1] + '</span>' : ''}` : '';
    box.classList.toggle('on', parts.length > 0);

    /* ตีกรอบเขตที่กำลังดู ให้ตารู้ทันทีว่าต้องมองตรงไหน */
    layers.focus.replaceChildren();
    if (rid){
      const o = mk('path',{d:TK.regions[rid].d, class:'region-focus'});
      layers.focus.append(o);
    }
  }

  /* จัดกรอบที่ขอ (x,y,w,h) ให้พอดีกล่องบนจอ โดยยังเห็นครบทั้งกรอบ */
  function fitBox(x0, y0, w0, h0){
    const ar = fitAR();
    h0 = h0 || w0 * ar;
    const cx = x0 + w0/2, cy = y0 + h0/2;
    let w, h;
    if (h0 / w0 > ar) { h = h0; w = h0 / ar; }   // กรอบสูงกว่าจอ → ขยายด้านกว้าง
    else              { w = w0; h = w0 * ar; }   // กรอบเตี้ยกว่าจอ → ขยายด้านสูง
    if (w > W){ w = W; h = w * ar; }
    if (h > H){ h = H; w = h / ar; }
    return { w, h,
      x: Math.max(0, Math.min(W - w, cx - w/2)),
      y: Math.max(0, Math.min(H - h, cy - h/2)) };
  }

  function flyTo(cam, ms){
    if (camCancel) camCancel();
    if (!cam) return;
    const dur = ms === undefined ? 1100 : ms;
    const to = fitBox(cam[0], cam[1], cam[2], cam[3]);
    settleLabels(dur + 60);            // จัดป้ายใหม่ทีเดียวตอนกล้องหยุด
    camCancel = TK.engine.tween({...vb}, to, dur,
      cur => { vb = cur; applyVB(); });
  }

  const resetView = ms => flyTo([0,0,W,H], ms);

  /* ── หมุด / ลูกศร / การปะทะ ── */
  function clearMarkers(){
    mkTimers.forEach(clearTimeout);  mkTimers = [];
    mkTweens.forEach(cancel => cancel()); mkTweens = [];
    layers.markers.replaceChildren();
  }

  function setMarkers(markers, animate){
    clearMarkers();
    forceLabels = new Set();
    if (!markers) return;

    markers.forEach((m, idx) => {
      if (m.type === 'pin'){
        const p = TK.places[m.place]; if (!p) return;
        forceLabels.add(m.place);
        const g = mk('g',{class:'mk-pin'});
        g.append(mk('circle',{cx:p.x, cy:p.y, r:13, class:'mk-halo'}));
        g.append(mk('circle',{cx:p.x, cy:p.y, r:5,  class:'mk-dot'}));
        if (m.label){
          const t = mk('text',{x:p.x, y:p.y - 20, class:'mk-label','text-anchor':'middle'});
          t.textContent = m.label;
          g.append(t);
        }
        layers.markers.append(g);
      }

      if (m.type === 'arrow'){
        const rt = TK.routes[m.route]; if (!rt) return;
        const col = TK.factions[m.side].color;
        /* สองธงนี้แยกกันเด็ดขาด อย่าให้อันหนึ่งลากอีกอัน:
             reverse = ทิศทาง — วิ่งย้อนเส้นทาง (ปลายทาง → ต้นทาง)
             retreat = ความหมาย — เป็นการถอยทัพ มีผลแค่หน้าตา
           การถอยไม่ได้แปลว่าต้องย้อนเส้นทางเสมอ เช่น กุยห้วยถอย "ไปยัง" ตันฉอง
           ซึ่งเป็นทิศเดียวกับที่ route วางไว้อยู่แล้ว */
        const back = !!m.reverse;
        const path = mk('path',{d:rt.d, stroke:col,
          class:'mk-route' + (m.retreat ? ' retreat' : '')});
        path.setAttribute(back ? 'marker-start' : 'marker-end', 'url(#ahead)');
        layers.markers.append(path);
        const L = path.getTotalLength();
        path.style.strokeDasharray  = L;
        path.style.strokeDashoffset = back ? -L : L;

        /* ชั้นนอกรับ translate ชั้นในรับ scale — relayout() ปรับ scale ให้ขนาดคงที่บนจอ */
        const g  = mk('g',{class:'mk-unit' + (m.retreat ? ' retreat' : '')});
        const gs = mk('g',{class:'mk-unit-s'});
        const sh = unitShape(m.unit || 'square', 9);
        if (m.retreat){ sh.setAttribute('fill','none');
                        sh.setAttribute('stroke',col);
                        sh.setAttribute('stroke-width',3); }
        else            sh.setAttribute('fill', col);
        gs.append(sh); g.append(gs);
        layers.markers.append(g);

        const at = v => path.getPointAtLength(L * (back ? 1 - v : v));
        const settle = () => {
          path.style.strokeDashoffset = 0;
          const pt = at(1);
          g.setAttribute('transform', `translate(${pt.x},${pt.y})`);
        };
        const run = () => mkTweens.push(
          TK.engine.tween({v:0},{v:1}, 1500 + idx*160, cur => {
            const rest = L * (1 - cur.v);
            path.style.strokeDashoffset = back ? -rest : rest;
            const pt = at(cur.v);
            g.setAttribute('transform', `translate(${pt.x},${pt.y})`);
          }, settle));
        if (animate === false) settle();
        else mkTimers.push(setTimeout(run, 260 + idx*140));
      }

      if (m.type === 'clash'){
        const p = TK.places[m.place]; if (!p) return;
        forceLabels.add(m.place);
        const g = mk('g',{class:'mk-clash', transform:`translate(${p.x},${p.y})`});
        g.append(mk('circle',{r:16, class:'mk-clash-ring'}));
        g.append(mk('circle',{r:24, class:'mk-clash-ring r2'}));
        g.append(mk('path',{d:'M -7,-7 L 7,7 M 7,-7 L -7,7', class:'mk-clash-x'}));
        layers.markers.append(g);
      }
    });
  }

  function relayout(){
    const screenW = host.clientWidth || 1000;
    const FONT_PX = 13.5;
    /* สเกลจริงของ meet = ด้านที่คับกว่า — คำนวณตรง ๆ อย่าเดาจากความกว้างอย่างเดียว */
    const scale = Math.min(screenW / vb.w, (host.clientHeight || 1) / vb.h);
    const mu = 1 / scale;                      // map-unit ต่อ 1 screen px

    /* ทุกอย่างที่ต้อง "ขนาดคงที่บนจอ" ต้องคูณ mu เพราะ viewBox ย่อ-ขยายตลอด */
    layers.markers.querySelectorAll('.mk-label').forEach(t => {
      t.style.fontSize    = (FONT_PX * 1.2 * mu) + 'px';
      t.style.strokeWidth = (FONT_PX * 0.30 * mu) + 'px';
    });
    layers.markers.querySelectorAll('.mk-unit-s').forEach(g =>
      g.setAttribute('transform', `scale(${mu.toFixed(3)})`));
    layers.markers.querySelectorAll('.mk-route').forEach(p =>
      p.style.strokeWidth = (4 * mu) + 'px');
    layers.markers.querySelectorAll('.mk-clash').forEach(g => {
      const t = g.getAttribute('transform').replace(/ scale\([^)]*\)/,'');
      g.setAttribute('transform', `${t} scale(${mu.toFixed(3)})`);
    });
    /* 122 หมุด — เขียนใหม่เฉพาะตอนสเกลเปลี่ยนจริง ไม่ใช่ทุกครั้งที่เรียก */
    if (scaleCache === null || Math.abs(mu / scaleCache - 1) > 0.01){
      scaleCache = mu;
      layers.pins.querySelectorAll('circle').forEach(c => {
        const id = c.parentNode.dataset.id;
        c.setAttribute('r', (TK.places[id].type==='capital' ? 5 : 3.4) * mu);
        c.style.strokeWidth = (1.3 * mu) + 'px';
      });
    }

    const res = TK.labeler.layout(TK.places, vb, screenW, {
      force: forceLabels, fontPx: FONT_PX, pinR: 4,
      fontFamily: '"Leelawadee UI","Segoe UI",Tahoma,sans-serif'
    });

    const on = new Set(res.pins);
    for (const id in pinEl) pinEl[id].style.display = on.has(id) ? '' : 'none';

    layers.labels.replaceChildren();
    for (const L of res.labels){
      const t = mk('text',{x:L.x, y:L.y, 'text-anchor':L.anchor,
        class:'plabel' + (forceLabels.has(L.id) ? ' hot' : '')});
      t.style.fontSize = L.fontMU + 'px';
      /* ฮาโลบางกว่านี้ไม่ชัด หนากว่านี้สระไทยจะเชื่อมกันเป็นก้อนดำอ่านไม่ออก */
      t.style.strokeWidth = (L.fontMU * 0.17) + 'px';
      t.textContent = TK.places[L.id].th;
      layers.labels.append(t);
      labelEl[L.id] = t;
    }
  }

  /* ── ลาก/ซูมด้วยมือ ── */
  function toMap(evt){
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function bindPanZoom(){
    let from = null;
    host.addEventListener('wheel', e => {
      e.preventDefault();
      if (camCancel) camCancel();
      const p = toMap(e);
      const k = e.deltaY > 0 ? 1.16 : 1/1.16;
      const nw = Math.min(W, Math.max(140, vb.w * k)), nh = nw * fitAR();
      vb.x = p.x - (p.x - vb.x) * (nw/vb.w);
      vb.y = p.y - (p.y - vb.y) * (nh/vb.h);
      vb.w = nw; vb.h = nh;
      applyVB();
      settleLabels(160);          // จัดป้ายใหม่ตอนหยุดหมุนล้อ
    }, {passive:false});

    host.addEventListener('pointerdown', e => {
      if (camCancel) camCancel();
      from = {mx:e.clientX, my:e.clientY, vx:vb.x, vy:vb.y};
      host.setPointerCapture(e.pointerId);
      host.classList.add('grabbing');
    });
    host.addEventListener('pointermove', e => {
      if (!from) return;
      if (!from.moved){ from.moved = true; layers.labels.style.opacity = 0;
                        layers.pins.style.opacity = 0; }
      const sc = vb.w / (host.clientWidth || 1);
      vb.x = from.vx - (e.clientX - from.mx) * sc;
      vb.y = from.vy - (e.clientY - from.my) * sc;
      applyVB();
    });
    const end = () => {
      if (from) settleLabels(60);   // ปล่อยเมาส์แล้วค่อยจัดป้าย
      from = null; host.classList.remove('grabbing');
    };
    host.addEventListener('pointerup', end);
    host.addEventListener('pointercancel', end);

    /* ย่อ-ขยายหน้าต่างแล้วต้องแก้สัดส่วน viewBox ตาม ไม่งั้นสเกลเพี้ยนทันที */
    window.addEventListener('resize', () => {
      const c = { x: vb.x + vb.w/2, y: vb.y + vb.h/2 };
      const f = fitBox(c.x - vb.w/2, c.y - vb.h/2, vb.w, vb.w * fitAR());
      vb = f; applyVB();
      scaleCache = null;            // สัดส่วนเปลี่ยน ต้องคำนวณขนาดหมุดใหม่
      settleLabels(180);
    });
  }

  const api = { init, setOwners, flyTo, resetView, setMarkers, relayout, setFocus,
                get viewBox(){ return {...vb}; } };
  return api;
})();
