/* check_hud.js — ตรวจตัวเลขประชากร/กำลังพลที่คำนวณจากพื้นที่
 *
 *   node tools\check_hud.js          สรุป + เตือนถ้าผิด
 *   node tools\check_hud.js --all    พิมพ์ทุกฉากที่ตัวเลขขยับ
 *
 * ตรวจสองอย่าง:
 *   1. ยอดรวมปี 228 ต้องตรงกับที่เนื้อเรื่องประกาศไว้ฉากแรก (ฮั่น 1.0/12 · วุ่ย 4.4/40 · ง่อ 2.3/20)
 *      ถ้าไปแก้ weights ใน geo.js แล้วยอดเพี้ยน ตัวนี้จะจับได้
 *   2. ทุกเขตต้องมีน้ำหนัก ไม่งั้นเขตนั้นหายไปจากยอดเงียบ ๆ
 */
const path = require('path');
const ROOT = path.join(__dirname, '..');
global.window = global;
require(path.join(ROOT, 'data', 'names.js'));
require(path.join(ROOT, 'data', 'geo.js'));
require(path.join(ROOT, 'data', 'timeline.js'));

const TK = window.TK, T = TK.timeline;
const SIDES = ['han','wei','wu'];
const TH = s => TK.factions[s].th;

/* โปรเจกต์ที่ยังไม่มีฉากเลย (เพิ่งตั้งต้น) — ตรวจได้แค่ว่าเขตมีน้ำหนักครบไหม */
if (!T.length){
  const missing = Object.keys(TK.regions).filter(id => TK.regions[id].pop === undefined);
  console.log('ยังไม่มีฉากใน timeline — ตรวจได้แค่น้ำหนักต่อเขต');
  console.log(missing.length
    ? `✖ เขตที่ไม่มีน้ำหนัก: ${missing.join(', ')}`
    : `เขตทั้ง ${Object.keys(TK.regions).length} เขตมีน้ำหนักครบ`);
  process.exit(missing.length ? 1 : 0);
}

/* ── สำเนาตรรกะเดียวกับ engine.strength() ── */
function ownersAt(n){
  const o = {};
  for (const id in TK.regions) o[id] = TK.regions[id].owner;
  for (let k = 0; k <= n; k++) Object.assign(o, T[k].mapDelta || {});
  return o;
}
function strength(n){
  const o = ownersAt(n);
  const s = { han:{pop:0,troops:0}, wei:{pop:0,troops:0}, wu:{pop:0,troops:0} };
  for (const id in o){
    const side = s[o[id]], r = TK.regions[id];
    if (!side || !r || r.pop === undefined) continue;
    side.pop += r.pop; side.troops += r.troops;
  }
  for (let k = 0; k <= n; k++){
    const L = T[k].losses; if (!L) continue;
    for (const k2 in L) if (s[k2]) s[k2].troops -= L[k2];
  }
  for (const k in s){
    s[k].pop = Math.round(s[k].pop*10)/10;
    s[k].troops = Math.max(0, Math.round(s[k].troops));
  }
  return s;
}

const err = [];

/* 1. เขตที่ไม่มีน้ำหนัก */
const noWeight = Object.keys(TK.regions).filter(id => TK.regions[id].pop === undefined);
if (noWeight.length)
  err.push(`เขตที่ไม่มีน้ำหนักใน geo.js: ${noWeight.join(', ')} — จะหายไปจากยอดเงียบ ๆ`);

/* 2. ยอดรวมปีเปิดเรื่อง */
const WANT = { han:[1.0,12], wei:[4.4,40], wu:[2.3,20] };
const s0 = strength(0);
for (const k of SIDES){
  const [p, t] = WANT[k];
  if (Math.abs(s0[k].pop - p) > 0.05)
    err.push(`ยอดประชากรปี 228 ของ${TH(k)} = ${s0[k].pop} ควรเป็น ${p}`);
  if (Math.abs(s0[k].troops - t) > 0.5)
    err.push(`ยอดกำลังพลปี 228 ของ${TH(k)} = ${s0[k].troops} ควรเป็น ${t}`);
}

/* ── รายงาน ── */
const showAll = process.argv.includes('--all');
let moves = 0, prev = null;
const lines = [];
T.forEach((b, n) => {
  const s = strength(n);
  const key = SIDES.map(k => s[k].pop + '/' + s[k].troops).join('|');
  if (key !== prev){
    moves++;
    lines.push(`  ${b.id} ${b.year}  ` +
      SIDES.map(k => `${TH(k)} ${s[k].pop}ล./${s[k].troops}ม.`).join('  '));
  }
  prev = key;
});

console.log(`ฉากทั้งหมด ${T.length} · ตัวเลขขยับ ${moves} ครั้ง ` +
            `(${(moves / T.length * 100).toFixed(0)}% ของฉาก)\n`);
if (showAll) console.log(lines.join('\n') + '\n');
else { console.log(lines.slice(0,3).join('\n'));
       console.log('  ...');
       console.log(lines.slice(-3).join('\n') + '\n'); }

for (const e of err) console.log('✖ ' + e);
console.log(err.length ? `พบ ${err.length} รายการ` : 'ยอดรวมปีเปิดเรื่องตรงกับที่เนื้อเรื่องประกาศไว้');
process.exit(err.length ? 1 : 0);
