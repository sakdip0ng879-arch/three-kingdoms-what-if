/* check_fact.js — ไล่หาป้าย real/mixed/fiction ที่อาจขัดกับ DECISIONS §6.6
 *
 *   node tools\check_fact.js
 *
 * ⚠ ตัวนี้ **ไม่ใช่ตัวตัดสิน** มันอ่านภาษาไทยในคำอธิบายด้วย regex เท่านั้น
 *   หน้าที่ของมันคือย่อ 71 ฉากให้เหลือรายการสั้น ๆ ที่ต้องดูด้วยตา
 *   ไม่ใช่บอกว่าผิด — ถ้าดูแล้วป้ายถูกอยู่ ให้แก้ถ้อยคำในคำอธิบายให้ตรงกับป้าย
 *   (คำอธิบายที่อ่านแล้วขัดกับป้ายตัวเอง คือบั๊กของคนอ่าน ไม่ใช่แค่ของตัวตรวจ)
 *
 * เกณฑ์ที่ยึด (§6.6): ตัดสินจากเหตุการณ์ที่ฉากเล่า — "โลกรอบตัวต่างไป" ไม่นับ
 *   real    = มีบันทึก เล่าตรงที่ ตรงปี ตรงธง ตรงผล
 *   mixed   = มีบันทึก แต่ย้ายที่/ปี/ธง/ผล หรือมีของจริงปนของแต่ง
 *   fiction = ไม่มีบันทึก
 */
const path = require('path');
global.window = global;
require(path.join(__dirname, '..', 'data', 'timeline.js'));

/* ภาษาที่แปลว่า "ถูกย้าย" — ตัวชี้ว่าน่าจะเป็น mixed */
const MOVED = /ย้าย|ต่างแค่|ต่างเพียง|คนละสมรภูมิ|ช้ากว่านี้|ไม่ใช่ปี|ที่แต่งคือ/;
/* ภาษาที่แปลว่า "จริงยกดุ้น" — ตัวชี้ว่าน่าจะเป็น real */
const WHOLE = /จริงทั้งดุ้น|จริงทั้งหมด|จริงทุกฉาก|จริงทุกตัวอักษร|จริงทุกจังหวะ|จริงทุกรายละเอียด|ตรงกับเอกภพของเราทั้งหมด|ไม่มีส่วนใดที่แต่งขึ้น|ไม่มีส่วนใดถูกแต่ง/;

const beats = window.TK.timeline;
const tally = { real:0, mixed:0, fiction:0 };
const flags = [];

for (const b of beats){
  tally[b.fact] = (tally[b.fact] || 0) + 1;
  const s = (b.factNote || '').replace(/\s+/g, ' ');

  if (!['real','mixed','fiction'].includes(b.fact))
    flags.push([b, `ป้ายไม่ถูกต้อง: "${b.fact}"`]);
  else if (!s)
    flags.push([b, 'ไม่มี factNote — กฎ 6 บังคับว่าต้องมี']);
  else if (b.fact === 'real'    && /แต่ง/.test(s) && MOVED.test(s))
    flags.push([b, 'ป้าย real แต่คำอธิบายพูดถึงการย้าย/การแต่ง']);
  else if (b.fact === 'mixed'   && WHOLE.test(s) && !MOVED.test(s))
    flags.push([b, 'ป้าย mixed แต่คำอธิบายบอกว่าจริงยกดุ้น']);
  else if (b.fact === 'fiction' && WHOLE.test(s))
    flags.push([b, 'ป้าย fiction แต่คำอธิบายบอกว่ามีของจริงยกดุ้น']);
}

console.log(`${beats.length} ฉาก — จริง ${tally.real} · ผสม ${tally.mixed} · แต่ง ${tally.fiction}\n`);
for (const [b, why] of flags)
  console.log(`[${why}]\n  ${b.id} — ${b.title}\n  ${(b.factNote||'').replace(/\s+/g,' ')}\n`);

console.log(flags.length === 0
  ? 'ไม่พบป้ายที่ขัดกับ §6.6'
  : `ต้องดูด้วยตา ${flags.length} ฉาก (ไม่ได้แปลว่าผิด — อ่านแล้วตัดสินเอง)`);
process.exit(flags.length === 0 ? 0 : 1);
