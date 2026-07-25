/* check_battle.js — ตรวจไฟล์ศึกจากข้อมูลล้วน ไม่ต้องเปิดเบราว์เซอร์
 *
 *   node tools/check_battle.js jieting228
 *   node tools/check_battle.js              (ตรวจทุกศึกที่มี)
 *
 * จำลองการเดิน phase แบบเดียวกับ js/battle.js แล้วตรวจทุกระยะ:
 *   1. act ที่ขยับตำแหน่งหน่วยเดียวกันทำงานพร้อมกัน  ← บั๊ก "เส้นวิ่งไปแต่ทัพไม่ตาม"
 *   2. สัญลักษณ์หน่วยทับกันเอง หรือทับป้ายป้อม
 *   3. หน่วยหรือภูมิประเทศหลุดนอกกรอบ viewBox
 *   4. id ของคน / ศึก / หน่วย ที่อ้างถึงไม่มีจริง
 *   5. เส้นทางที่ move ระบุ ห่างจากตำแหน่งจริงของหน่วยมากผิดปกติ
 */
const path = require('path');
const fs   = require('fs');

const ROOT = path.join(__dirname, '..');
global.window = {};
['names.js','places.js'].forEach(f => require(path.join(ROOT,'data',f)));
const BDIR = path.join(ROOT,'data','battles');
if (fs.existsSync(BDIR))
  fs.readdirSync(BDIR).filter(f => f.endsWith('.js'))
    .forEach(f => require(path.join(BDIR,f)));
const TK = global.window.TK;

const VALID_ACTS = ['move','clash','shrink','rout','spawn','despawn','burn','siege','label'];
const MOVES = a => !!(a.move || a.clash || a.spawn);
const size  = s => 9 + Math.sqrt(s)/11;

/* จุดสุดท้ายของ path */
function pathEnd(d){
  const p = [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map(m => [+m[1], +m[2]]);
  return p[p.length-1];
}
function pathStart(d){
  const m = /(-?[\d.]+),(-?[\d.]+)/.exec(d);
  return [+m[1], +m[2]];
}

function checkBattle(id){
  const B = TK.battles[id];
  const err = [], warn = [];
  const E = (ph, m, fix) => err.push({ph, m, fix});
  const W = (ph, m, fix) => warn.push({ph, m, fix});

  const [ , , VW, VH] = (B.viewBox || '0 0 1200 700').split(/\s+/).map(Number);

  /* ── ตรวจนิยามหน่วย ── */
  const defs = {};
  for (const u of [...(B.units||[]), ...(B.reserves||[])]){
    if (defs[u.id]) E('—', `หน่วย id ซ้ำ: "${u.id}"`, 'ตั้งชื่อ id ให้ไม่ซ้ำกัน');
    if (u.who && !TK.people[u.who])
      E('—', `หน่วย "${u.id}" อ้างถึงคนที่ไม่มีใน names.js: "${u.who}"`,
        'ใช้ id จาก data/names.js เท่านั้น หรือใส่ name:"..." แทน');
    if (!['triangle','square','hex','circle'].includes(u.shape))
      E('—', `หน่วย "${u.id}" shape ไม่ถูก: "${u.shape}"`, 'ใช้ triangle|square|hex|circle');
    if (!['han','wei','wu'].includes(u.side))
      E('—', `หน่วย "${u.id}" side ไม่ถูก: "${u.side}"`, 'ใช้ han|wei|wu');
    defs[u.id] = u;
  }
  const reserveIds = new Set((B.reserves||[]).map(u => u.id));

  /* ── ป้ายป้อม ── */
  const fortLabels = (B.terrain||[]).filter(t => t.kind==='fort' && t.label)
    .map(t => ({label:t.label, x:t.at[0], y:t.at[1]-30, w:t.label.length*8, h:18}));

  /* ── จำลองการเดิน phase ── */
  const live = {};
  for (const u of (B.units||[]))
    live[u.id] = { ...u, x:u.at[0], y:u.at[1], str:u.strength, str0:u.strength, on:true };
  for (const u of (B.reserves||[]))
    live[u.id] = { ...u, x:u.at[0], y:u.at[1], str:u.strength, str0:u.strength, on:false };

  (B.phases||[]).forEach((ph, i) => {
    const tag = `ระยะ ${i+1}`;
    if (!ph.th) E(tag, 'ไม่มีคำบรรยาย th', 'ใส่ th:"..." อธิบายว่าระยะนี้เกิดอะไร');

    const groups = [];
    for (const a of (ph.acts||[])){
      if (a.with && groups.length) groups[groups.length-1].push(a);
      else groups.push([a]);
    }

    for (const g of groups){
      /* 1. act ที่ขยับตำแหน่งหน่วยเดียวกันทำงานพร้อมกัน */
      const byUnit = {};
      for (const a of g){
        const kind = VALID_ACTS.find(k => a[k] !== undefined);
        if (!kind) E(tag, `act ไม่รู้จัก: ${JSON.stringify(a).slice(0,70)}`,
                     'ใช้ได้เฉพาะ ' + VALID_ACTS.join(', '));
        if (a.u && !defs[a.u]) E(tag, `act อ้างถึงหน่วยที่ไม่มี: "${a.u}"`, 'ตรวจ id ใน units/reserves');
        if (a.clash && !defs[a.clash]) E(tag, `clash อ้างถึงหน่วยที่ไม่มี: "${a.clash}"`, '');
        if (a.u && MOVES(a)) (byUnit[a.u] = byUnit[a.u]||[]).push(
          a.move ? 'move' : a.clash ? 'clash' : 'spawn');
      }
      for (const u in byUnit)
        if (byUnit[u].length > 1)
          E(tag, `"${u}" มี act ที่ขยับตำแหน่งทำงานพร้อมกัน (${byUnit[u].join(' + ')})`,
            'เอา with:true ออก ให้ทำงานเรียงลำดับ');

      /* เดินสถานะตาม act */
      for (const a of g){
        const u = live[a.u];
        if (a.spawn && u){ u.on = true; u.x = a.spawn[0]; u.y = a.spawn[1]; }
        if (a.move && u){
          const st = pathStart(a.move), en = pathEnd(a.move);
          const gap = Math.hypot(u.x - st[0], u.y - st[1]);
          if (u.on && gap > 60)
            W(tag, `"${a.u}" อยู่ที่ (${Math.round(u.x)},${Math.round(u.y)}) `+
                   `แต่เส้นทางเริ่มที่ (${st[0]},${st[1]}) ห่าง ${Math.round(gap)} หน่วย`,
              'แก้จุดเริ่มของ path ให้ตรงกับที่หน่วยอยู่จริง (engine จะกลืนให้ แต่รอยทางจะเบี้ยว)');
          u.x = en[0]; u.y = en[1];
        }
        if (a.shrink !== undefined && u) u.str = Math.round(u.str0 * a.shrink);
        if (a.despawn && u) u.on = false;
        if (a.burn && (a.burn.length !== 2)) E(tag, 'burn ต้องเป็น [x,y]', '');
        if (a.siege && !defs[a.siege]) E(tag, `siege อ้างถึงหน่วยที่ไม่มี: "${a.siege}"`, '');
      }
    }

    /* 2 + 3. ตรวจตำแหน่งหลังจบระยะ */
    const boxes = [];
    for (const k in live){
      const u = live[k]; if (!u.on) continue;
      const s = size(Math.max(u.str,1));
      boxes.push({ n: (TK.people[u.who]||{}).th || u.id,
                   x:u.x-s, y:u.y-s-22, w:s*2, h:s*2+40 });   // เผื่อชื่อบนกับตัวเลขล่าง
      if (u.x < 0 || u.y < 0 || u.x > VW || u.y > VH)
        E(tag, `"${k}" อยู่นอกกรอบภาพที่ (${Math.round(u.x)},${Math.round(u.y)}) `+
               `กรอบคือ ${VW}×${VH}`, 'แก้พิกัดใน at หรือปลายทางของ move');
    }
    for (const f of fortLabels) boxes.push({n:`ป้ายป้อม "${f.label}"`, ...f});

    for (let a=0;a<boxes.length;a++)
      for (let b=a+1;b<boxes.length;b++){
        const A=boxes[a], B2=boxes[b];
        const ox = Math.min(A.x+A.w, B2.x+B2.w) - Math.max(A.x, B2.x);
        const oy = Math.min(A.y+A.h, B2.y+B2.h) - Math.max(A.y, B2.y);
        if (ox > 6 && oy > 6)
          W(tag, `${A.n} ทับ ${B2.n} (ซ้อน ${Math.round(ox)}×${Math.round(oy)})`,
            'ขยับให้ห่างกันอย่างน้อย ~70 หน่วยตามแนวนอน');
      }
  });

  return {err, warn};
}

/* ── รายงาน ── */
const want = process.argv[2];
const ids = want ? [want] : Object.keys(TK.battles || {});
if (!ids.length){ console.log('ไม่พบไฟล์ศึกใน data/battles/'); process.exit(1); }

let bad = 0;
for (const id of ids){
  if (!TK.battles[id]){ console.log(`✖ ไม่พบศึก "${id}"`); bad++; continue; }
  const {err, warn} = checkBattle(id);
  const n = (TK.battles[id].phases||[]).length;
  console.log(`\n═══ ${id}  (${n} ระยะ) ═══`);
  if (!err.length && !warn.length) console.log('  ผ่านหมด ✓');
  for (const e of err ){ console.log(`  ✖ [${e.ph}] ${e.m}`); if(e.fix) console.log(`      → ${e.fix}`); }
  for (const w of warn){ console.log(`  ⚠ [${w.ph}] ${w.m}`); if(w.fix) console.log(`      → ${w.fix}`); }
  bad += err.length;
}
console.log(`\nสรุป: ผิด ${bad} รายการ`);
process.exit(bad ? 1 : 0);
