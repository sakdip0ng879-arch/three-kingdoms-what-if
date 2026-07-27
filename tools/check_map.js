/* check_map.js — ตรวจว่าเจ้าของพื้นที่ในแต่ละฉากขัดกับสิ่งที่ฉากนั้นเล่าไหม
 *
 *   node tools\check_map.js
 *
 * ที่มา: ผู้ใช้ทักว่า "ทำไม Wei เคลื่อนที่ไปตีตัวเอง" ที่ศึกสือถิง
 * สาเหตุคือหมุดสือถิงตกอยู่ในภูมิภาคที่ยังเป็นของวุ่ยตอนปี 228
 * ฉากจึงวาดลูกศรวุ่ยบุกเข้าไปปะทะในแผ่นดินของวุ่ยเอง
 *
 * ตรวจสามอย่างที่ตาคนมองข้ามง่ายแต่คนอ่านจับได้ทันที:
 *   1. ปะทะในแผ่นดินตัวเอง — ทุกลูกศรที่เข้าฉากเป็นฝ่ายเดียวกับเจ้าของพื้นที่
 *   2. ปะทะในแผ่นดินฝ่ายที่สาม — เจ้าของไม่ใช่คู่กรณีสักฝ่าย
 *   3. หมุดปะทะที่ไม่ตกอยู่ในภูมิภาคใดเลย — ไม่มีใครเป็นเจ้าของ บอกอะไรคนอ่านไม่ได้
 *
 * ใช้รูปเดียวกับที่วาดจริง (geo_fill ถ้ามี) ไม่ใช่รูปที่ลากด้วยมือ
 * เพราะสิ่งที่คนอ่านเห็นคือรูปที่วาด ไม่ใช่รูปที่ตั้งใจ
 */
const path = require('path');
const ROOT = path.join(__dirname, '..');
global.window = global;
require(path.join(ROOT, 'data', 'names.js'));
require(path.join(ROOT, 'data', 'places.js'));
require(path.join(ROOT, 'data', 'geo.js'));
try { require(path.join(ROOT, 'data', 'geo_fill.js')); } catch { /* ไม่มีก็ใช้รูปที่ลากมือ */ }
require(path.join(ROOT, 'data', 'timeline.js'));

const TK = window.TK;
const REG = TK.regions;

/* แปลง path เป็นโพลิกอนย่อย — geo_fill มีหลายวงต่อภูมิภาค (เกาะ อ่าว) */
function loops(d) {
  const out = [];
  for (const chunk of d.split('M').slice(1)) {
    const pts = [];
    const re = /(-?[\d.]+)\s*,\s*(-?[\d.]+)/g; let m;
    while ((m = re.exec(chunk))) pts.push([+m[1], +m[2]]);
    if (pts.length > 2) out.push(pts);
  }
  return out;
}
const shape = {};
for (const id in REG) shape[id] = loops(REG[id].fill || REG[id].d);

const inPoly = (pts, x, y) => {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};
const regionAt = (x, y) => {
  for (const id in shape) if (shape[id].some(l => inPoly(l, x, y))) return id;
  return null;
};

/* เจ้าของ ณ ฉากที่ n — เริ่มจาก geo.js แล้วสะสม mapDelta (เหมือน engine ทำ) */
function ownersAt(n) {
  const o = {};
  for (const id in REG) o[id] = REG[id].owner;
  for (let i = 0; i <= n; i++) Object.assign(o, TK.timeline[i].mapDelta || {});
  return o;
}

const TH = s => (TK.factions[s] || {}).th || s;
const bad = [];

TK.timeline.forEach((b, n) => {
  const clashes = (b.markers || []).filter(m => m.type === 'clash');
  if (!clashes.length) return;
  const own = ownersAt(n);
  const sides = [...new Set((b.markers || [])
    .filter(m => m.type === 'arrow' && m.side).map(m => m.side))];

  for (const c of clashes) {
    const p = TK.places[c.place];
    if (!p) { bad.push([b, `หมุดปะทะ "${c.place}" ไม่มีใน places.js`]); continue; }
    const rid = regionAt(p.x, p.y);
    if (!rid) { bad.push([b, `ปะทะที่ ${p.th} แต่จุดนั้นไม่ตกอยู่ในภูมิภาคใดเลย`]); continue; }
    const holder = own[rid];

    if (sides.length && sides.every(s => s === holder))
      bad.push([b, `ปะทะที่ ${p.th} ซึ่งอยู่ใน "${REG[rid].th}" ของ${TH(holder)}อยู่แล้ว ` +
                   `แต่ลูกศรที่เข้าฉากมีแต่ของ${TH(holder)} → อ่านว่าบุกตีตัวเอง`]);
    /* holder === 'none' คือแผ่นดินที่ไม่มีเจ้าของ (กบฏ/แยกตัว) — ใครมาชนกันตรงนั้นก็ถูกทั้งนั้น
       เช่นโซ่วชุนตอนจูกัดตั้นยกธง วุ่ยมาล้อม ง่อมาหนุน ไม่มีฝ่ายไหนเป็นเจ้าของ */
    else if (sides.length > 1 && holder !== 'none' && !sides.includes(holder))
      bad.push([b, `ปะทะที่ ${p.th} อยู่ใน "${REG[rid].th}" ของ${TH(holder)} ` +
                   `ซึ่งไม่ใช่คู่กรณี (${sides.map(TH).join(' vs ')})`]);
  }
});

console.log(`ตรวจ ${TK.timeline.length} ฉาก · ` +
            `ใช้รูป${REG.yizhou.fill ? 'ที่วาดจริง (geo_fill)' : 'ที่ลากด้วยมือ (geo)'}\n`);
for (const [b, why] of bad) console.log(`✖ ${b.id} ${b.year} — ${b.title}\n   ${why}\n`);
console.log(bad.length ? `พบ ${bad.length} จุด` : 'ไม่พบความขัดแย้งระหว่างเจ้าของพื้นที่กับสิ่งที่ฉากเล่า');
process.exit(bad.length ? 1 : 0);
