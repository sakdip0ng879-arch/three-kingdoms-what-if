/* selfcheck.js — ตัวตรวจ "ความผิดพลาดที่ DOM ถูกแต่ภาพผิด"
 *
 * ทำไมต้องมี: บั๊กก้อนดำเต็มจอกับวงกลมไหลหลุดจอ ตรวจด้วยการอ่าน DOM ไม่เจอเลย
 * เพราะ DOM ถูกต้องทุกอย่าง — ผิดตอน "เรนเดอร์" เท่านั้น
 * ตัวนี้จึงตรวจจาก computed style + getBBox ซึ่งเป็นผลลัพธ์หลังเรนเดอร์จริง
 *
 * วิธีใช้ — เปิด index.html แล้ววางใน console:
 *   const s=document.createElement('script'); s.src='tools/selfcheck.js';
 *   document.head.append(s);
 *   // แล้วเรียก
 *   TK.selfcheck.all()          ตรวจทุกศึก + แผนที่ใหญ่
 *   TK.selfcheck.battle('jieting228')
 */
window.TK = window.TK || {};

TK.selfcheck = (function(){

  const problems = [];
  const add = (sev, where, what, how) => problems.push({sev, where, what, how});

  /* ── 1. path ที่ระบายทึบ "โดยไม่ได้ตั้งใจ" (ต้นเหตุ "ก้อนดำเต็มจอ") ──
     SVG ระบาย path เป็นสีดำทึบตามค่าปริยาย ถ้าลืมสั่ง fill:none
     แต่ path ที่ตั้งใจให้ระบาย (ชั้นพื้นที่ยึดครอง, หัวลูกศร) ต้องไม่ถูกฟ้อง
     → เกณฑ์: ฟ้องเฉพาะ path ที่ "ไม่มีทั้ง attribute fill และไม่มี class"
       เพราะนั่นคือ path ที่ไม่มีใครกำหนดหน้าตาให้เลย = ลืมสั่ง */
  function checkFills(root, where){
    for (const p of root.querySelectorAll('path')){
      if (p.hasAttribute('fill') || p.hasAttribute('class')) continue;
      /* ไม่ดูค่า computed เพราะอาจมีกฎ CSS แบบเหมารวมช่วยไว้อยู่
         ตรวจที่ "ผู้เขียนสั่งหรือยัง" — พึ่งกฎเหมารวมเป็นการป้องกันที่เปราะ
         ย้ายไฟล์หรือเปลี่ยน id ของชั้นเมื่อไหร่ บั๊กกลับมาทันที */
      const r = p.getBoundingClientRect();
      add('ผิด', where,
        `path ไม่มีทั้ง attribute fill และ class — ไม่มีใครกำหนดว่าจะระบายยังไง ` +
        `(ตอนนี้กิน ${Math.round(r.width)}×${Math.round(r.height)} px)`,
        'ใส่ fill="none" ตอนสร้าง path นั้นให้ชัด');
    }
  }

  /* ── 2. transform animation ที่ลืม transform-box (ต้นเหตุ "วงกลมไหลหลุดจอ") ──
     ใน SVG ถ้าใช้ transform-origin:center โดยไม่มี transform-box:fill-box
     คำว่า center = กึ่งกลางของทั้ง viewport ไม่ใช่ของรูปนั้น พอ scale จะเหวี่ยงหลุด */
  function checkTransformBox(root, where){
    for (const e of root.querySelectorAll('*')){
      const cs = getComputedStyle(e);
      if (cs.animationName === 'none') continue;
      const usesTransform = [...document.styleSheets].some(ss => {
        try {
          return [...ss.cssRules].some(r =>
            r.type === CSSRule.KEYFRAMES_RULE && r.name === cs.animationName &&
            [...r.cssRules].some(k => /transform:\s*(scale|rotate)/.test(k.cssText)));
        } catch { return false; }
      });
      if (usesTransform && cs.transformBox !== 'fill-box'){
        add('ผิด', where,
          `<${e.tagName}> class="${e.getAttribute('class')||'—'}" ` +
          `animation "${cs.animationName}" ใช้ scale/rotate แต่ transform-box = ${cs.transformBox}`,
          'เพิ่ม transform-box:fill-box คู่กับ transform-origin:center');
      }
    }
  }

  /* ── 3. อะไรที่วาดหลุดออกนอกกรอบภาพ ──
     ⚠ ต้องใช้ getBoundingClientRect ไม่ใช่ getBBox
       getBBox คืนกรอบ "ก่อน" ใส่ transform ของตัวเอง ทุกหน่วยจะกองอยู่ที่ (0,0) หมด */
  function checkBounds(svg, where){
    const V = svg.getBoundingClientRect();
    if (!V.width) return;
    const pad = Math.max(V.width, V.height) * 0.06;
    for (const e of svg.querySelectorAll('path,rect,circle,polygon,text,image')){
      const r = e.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      if (r.left < V.left - pad || r.top  < V.top - pad ||
          r.right > V.right + pad || r.bottom > V.bottom + pad){
        add('เตือน', where,
          `<${e.tagName}> class="${e.getAttribute('class')||'—'}" โผล่นอกกรอบภาพ`,
          'ตรวจพิกัดใน data หรือดูว่าโดน transform เหวี่ยงออกไปไหม');
      }
    }
  }

  /* ── 4. สัญลักษณ์หน่วยทับกันเอง หรือทับป้ายป้อม ──
     ใช้ screen rect เพราะต้องเทียบหลังใส่ transform แล้ว */
  function checkOverlap(where){
    const boxes = [];
    for (const g of document.querySelectorAll('#bsvg .bu')){
      if (g.style.display === 'none') continue;
      const nm = g.querySelector('.bu-name');
      boxes.push({ label: nm ? nm.textContent : (g.dataset.id||'หน่วย'),
                   r: g.getBoundingClientRect() });
    }
    for (const t of document.querySelectorAll('#bsvg .bt-fortlabel'))
      boxes.push({ label: `ป้ายป้อม "${t.textContent}"`, r: t.getBoundingClientRect() });

    for (let i=0;i<boxes.length;i++)
      for (let j=i+1;j<boxes.length;j++){
        const A = boxes[i].r, B = boxes[j].r;
        if (!A.width || !B.width) continue;
        const ox = Math.min(A.right, B.right) - Math.max(A.left, B.left);
        const oy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
        if (ox > 3 && oy > 3)
          add('เตือน', where,
            `${boxes[i].label} ทับ ${boxes[j].label} (ซ้อน ${Math.round(ox)}×${Math.round(oy)} px)`,
            'ขยับพิกัดปลายทางของหน่วย หรือย้ายป้อม ให้ห่างกันมากขึ้น');
      }
  }

  /* ── 5. act ที่ทำงานพร้อมกันแล้วแย่งกันเขียนตำแหน่งของหน่วยเดียวกัน ──
     บั๊ก "เส้นวิ่งไปแต่ทัพไม่ตาม" มาจากตรงนี้ ตรวจจากข้อมูลได้เลย ไม่ต้องรอดูภาพ
     ทดสอบสถานะปลายทางอย่างเดียวจับไม่ได้ เพราะโหมดข้ามทันทีทุก act กระโดดไปค่าสุดท้ายพร้อมกัน */
  const MOVES_UNIT = a => !!(a.move || a.clash || a.spawn);

  function checkActOrder(id){
    const B = (TK.battles||{})[id];
    if (!B) return;
    B.phases.forEach((ph, i) => {
      const groups = [];
      for (const a of (ph.acts || [])){
        if (a.with && groups.length) groups[groups.length-1].push(a);
        else groups.push([a]);
      }
      groups.forEach(g => {
        const byUnit = {};
        for (const a of g){
          if (!a.u || !MOVES_UNIT(a)) continue;
          (byUnit[a.u] = byUnit[a.u] || []).push(
            a.move ? 'move' : a.clash ? 'clash' : 'spawn');
        }
        for (const u in byUnit)
          if (byUnit[u].length > 1)
            add('ผิด', `${id} ระยะ ${i+1}`,
              `"${u}" มี act ที่ขยับตำแหน่งทำงานพร้อมกัน ${byUnit[u].length} ตัว (${byUnit[u].join(' + ')})`,
              'เอา with:true ออก ให้ทำงานเรียงลำดับ — ไม่งั้นสองคำสั่งจะแย่งกันเขียนตำแหน่ง');
      });
    });
  }

  /* ── ตรวจศึกหนึ่งศึก ทุกระยะ ── */
  function battle(id){
    const before = problems.length;
    if (!(TK.battles||{})[id]){ add('ผิด','—',`ไม่มีข้อมูลศึก "${id}"`,'ตรวจว่าโหลด data/battles/'+id+'.js แล้วหรือยัง'); return; }
    checkActOrder(id);
    TK.battle.open(id, ()=>{});
    const n = TK.battles[id].phases.length;
    const svg = document.getElementById('bsvg');
    for (let p=0; p<n; p++){
      TK.battle.goPhase(p, true);
      const where = `${id} ระยะ ${p+1}`;
      checkFills(svg, where);
      checkTransformBox(svg, where);
      checkBounds(svg, where);
      checkOverlap(where);
    }
    TK.battle.close();
    return problems.length - before;
  }

  /* ── ตรวจแผนที่ยุทธศาสตร์ ── */
  function strategic(){
    const svg = document.getElementById('tkmap');
    if (!svg) return;
    const withMarkers = TK.engine.beats.findIndex(b => (b.markers||[]).some(m=>m.type!=='pin'));
    TK.engine.goTo(withMarkers >= 0 ? withMarkers : 0);
    checkFills(svg, 'แผนที่ใหญ่');
    checkTransformBox(svg, 'แผนที่ใหญ่');
  }

  function all(){
    problems.length = 0;
    strategic();
    for (const id in (TK.battles||{})) battle(id);
    return report();
  }

  function report(){
    const bad  = problems.filter(p => p.sev === 'ผิด');
    const warn = problems.filter(p => p.sev === 'เตือน');
    console.log(`%cตรวจเสร็จ — ผิด ${bad.length} · เตือน ${warn.length}`,
                `font-weight:bold;color:${bad.length?'#ff6b6b':'#6fd39a'}`);
    if (bad.length)  console.table(bad.map(p => ({ที่:p.where, ปัญหา:p.what, แก้:p.how})));
    if (warn.length) console.table(warn.map(p => ({ที่:p.where, ปัญหา:p.what, แก้:p.how})));
    return { ผิด: bad.length, เตือน: warn.length, รายการ: problems };
  }

  return { all, battle, strategic, report, get problems(){ return problems; } };
})();
