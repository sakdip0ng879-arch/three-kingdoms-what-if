/* check_hud.js — ตรวจตัวเลขประชากร/กำลังพลที่คำนวณจากพื้นที่
 *
 *   node tools\check_hud.js          สรุป + เตือนถ้าผิด
 *   node tools\check_hud.js --all    พิมพ์ทุกฉากที่ตัวเลขขยับ
 *
 * ตรวจสามอย่าง:
 *   1. ยอดรวมปี 228 ต้องตรงกับที่เนื้อเรื่องประกาศไว้ฉากแรก
 *   2. ทุกเขตต้องมีน้ำหนัก ไม่งั้นเขตนั้นหายจากยอดเงียบ ๆ
 *   3. ★ กองทัพที่เนื้อเรื่องเอ่ยถึง ต้องไม่เกินกำลังพลที่ฝ่ายนั้นมีในฉากนั้น
 *      (เจอมาแล้ว: สุมาเจียว "ทุ่มยี่สิบหกหมื่น" ล้อมโซ่วชุน ทั้งที่ HUD ให้วุ่ยแค่ 19)
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

if (!T.length){
  const missing = Object.keys(TK.regions).filter(id => TK.regions[id].pop === undefined);
  console.log('ยังไม่มีฉากใน timeline — ตรวจได้แค่น้ำหนักต่อเขต');
  console.log(missing.length ? `✖ เขตที่ไม่มีน้ำหนัก: ${missing.join(', ')}`
                             : `เขตทั้ง ${Object.keys(TK.regions).length} เขตมีน้ำหนักครบ`);
  process.exit(missing.length ? 1 : 0);
}

/* ── ต้องเหมือน engine.strength() ทุกบรรทัด ── */
const RECOVER = 0.68, DESPERATION = 0.5;
const BASE228 = (() => { const b = { han:0, wei:0, wu:0 };
  for (const id in TK.regions){ const r = TK.regions[id];
    if (b[r.owner] !== undefined && r.troops !== undefined) b[r.owner] += r.troops; }
  return b; })();

function ownersAt(n){
  const o = {}; for (const id in TK.regions) o[id] = TK.regions[id].owner;
  for (let k = 0; k <= n; k++) Object.assign(o, T[k].mapDelta || {});
  return o;
}
function strength(n){
  const o = ownersAt(n);
  const s = { han:{pop:0,troops:0}, wei:{pop:0,troops:0}, wu:{pop:0,troops:0} };
  for (const id in o){ const side = s[o[id]], r = TK.regions[id];
    if (!side || !r || r.pop === undefined) continue;
    side.pop += r.pop; side.troops += r.troops; }
  const year = T[n].year;
  for (const k in s){
    const share = BASE228[k] ? s[k].troops / BASE228[k] : 1;
    s[k].troops *= 1 + DESPERATION * Math.max(0, 1 - share);
  }
  for (let k = 0; k <= n; k++){ const L = T[k].losses; if (!L) continue;
    const age = Math.max(0, year - T[k].year);
    for (const w in L) if (s[w]) s[w].troops -= L[w] * Math.pow(RECOVER, age); }
  for (const k in s){ s[k].pop = Math.round(s[k].pop*10)/10;
                      s[k].troops = Math.max(0, Math.round(s[k].troops)); }
  return s;
}

const err = [];

/* 1 + 2 */
const noWeight = Object.keys(TK.regions).filter(id => TK.regions[id].pop === undefined);
if (noWeight.length) err.push(`เขตที่ไม่มีน้ำหนักใน geo.js: ${noWeight.join(', ')}`);

const WANT = { han:[1.0,12], wei:[4.4,40], wu:[2.3,20] };
const s0 = strength(0);
for (const k of SIDES){
  const [p, t] = WANT[k];
  if (Math.abs(s0[k].pop - p) > 0.05)
    err.push(`ยอดประชากรปี 228 ของ${TH(k)} = ${s0[k].pop} ควรเป็น ${p}`);
  if (Math.abs(s0[k].troops - t) > 0.5)
    err.push(`ยอดกำลังพลปี 228 ของ${TH(k)} = ${s0[k].troops} ควรเป็น ${t}`);
}

/* 3. กองทัพที่เนื้อเรื่องเอ่ย ต้องไม่เกินกำลังที่มี
   ระบุด้วยมือเพราะการอ่านเลขไทยจากประโยคเดาผิดได้ง่าย
   ตัวเลขคือ [ฉาก, ฝ่าย, จำนวนหมื่นที่เรื่องบอกว่าใช้, คำในเรื่อง] */
const CLAIMS = [
  ['c1-02', 'han',  6, 'ทัพหลวงหกหมื่นออกทางกิสาน'],
  ['c1-04', 'wei',  5, 'เตียวคับนำทหารม้าและราบห้าหมื่น'],
  ['c1-06', 'wei',  8, 'โจจิ๋นกับทัพแปดหมื่นที่เหมย'],
  ['c1-06b','wei',  5, 'โจจิ๋นคุมห้าหมื่นขึ้นลุ่มน้ำเว่ย'],
  ['c1-06c','han',  3, 'ทัพหลวงสามหมื่นตามไปสมทบที่ตันฉอง'],
  ['c1-07', 'wei', 10, 'โจฮิวนำทัพสิบหมื่นเข้าหุบเขา'],
  ['c2-02', 'han',  7, 'ทัพฮั่นเจ็ดหมื่นไหลลงที่ราบกวนจง'],
  ['c2-03', 'wei',  8, 'ทัพวุ่ยเจ็ดถึงแปดหมื่นที่เหมย'],
  ['c3-01', 'wei', 20, 'โจจิ๋นบุกสองประตู รวมยี่สิบหมื่น'],
  ['c3-01b','wei', 10, 'สุมาอี้ไม่เอาทัพสิบหมื่นไปแลก'],
  ['c3-10', 'wu',  10, 'ซุนกวนยกสิบหมื่นสามทางเข้าหวยหนำ'],
  ['c4-03b','wu',  3, 'กองเรือง่อสามหมื่นภายใต้ปู้จื้อ'],
  ['c4-03d','han', 3, 'ฮั่นมีทหารสามหมื่นยืนที่แนวตะวันออกตลอดเวลา'],
  ['c4-04', 'wei', 10, 'โจซองเกณฑ์สิบหมื่นทุบอู่กวน'],
  ['c5-05', 'han', 14, 'เกียงอุยสิบหมื่น + แกนเหนือสี่หมื่น'],
  ['c5-08', 'wu',   3, 'ง่อส่งทัพสามหมื่นเข้าหนุนในเมือง'],
  ['c5-08', 'wei', 26, 'สุมาเจียวทุ่มยี่สิบหกหมื่นล้อมโซ่วชุน'],
  ['c5-12b','han', 18, 'เกียงอุยสิบสามหมื่น + เตงงายห้าหมื่น'],
  ['c5-12b','wei', 18, 'สุมาเจียวรอด้วยสิบแปดหมื่น'],
  ['c7-01', 'han', 20, 'ฮั่นเคลื่อนทัพยี่สิบหมื่นสามแกน'],
  ['c7-03', 'wu',   3, 'จางทีนำทัพสามหมื่นข้ามแม่น้ำ']
];
for (const [id, side, need, quote] of CLAIMS){
  const n = T.findIndex(b => b.id === id);
  if (n < 0){ err.push(`ไม่พบฉาก ${id} ที่อ้างถึงใน CLAIMS`); continue; }
  const have = strength(n)[side].troops;
  if (have < need)
    err.push(`${id} ${T[n].year}: เนื้อเรื่องว่า "${quote}" (${need} หมื่น) ` +
             `แต่${TH(side)}มีแค่ ${have} หมื่น`);
}

/* ── รายงาน ── */
const showAll = process.argv.includes('--all');
let moves = 0, prev = null; const lines = [];
T.forEach((b, n) => {
  const s = strength(n);
  const key = SIDES.map(k => s[k].pop + '/' + s[k].troops).join('|');
  if (key !== prev){ moves++;
    lines.push(`  ${b.id} ${b.year}  ` +
      SIDES.map(k => `${TH(k)} ${s[k].pop}ล./${s[k].troops}ม.`).join('  ')); }
  prev = key;
});
console.log(`ฉากทั้งหมด ${T.length} · ตัวเลขขยับ ${moves} ครั้ง ` +
            `(${(moves/T.length*100).toFixed(0)}% ของฉาก)\n`);
console.log(showAll ? lines.join('\n') + '\n'
                    : lines.slice(0,3).join('\n') + '\n  ...\n' + lines.slice(-3).join('\n') + '\n');

for (const e of err) console.log('✖ ' + e);
console.log(err.length ? `พบ ${err.length} รายการ`
  : `ยอดปีเปิดเรื่องตรง · กองทัพที่เนื้อเรื่องเอ่ยถึงทั้ง ${CLAIMS.length} จุดอยู่ในกำลังที่มีจริง`);
process.exit(err.length ? 1 : 0);
