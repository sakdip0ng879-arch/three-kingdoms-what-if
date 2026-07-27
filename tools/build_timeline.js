/* build_timeline.js — รวม data/_part1..3.js เป็น data/timeline.js พร้อมตรวจความถูกต้อง
 *
 *   node tools/build_timeline.js
 *
 * ตรวจให้ก่อนเขียน:
 *   - id ซ้ำไหม
 *   - regionId / placeId / routeId มีจริงไหม
 *   - ทุก beat มี fact + factNote ไหม
 *   - chapter เรียงต่อเนื่องไหม  ปีเดินหน้าไหม
 *   - mapDelta สะสมแล้วจบที่ฮั่นถือครบทุกเขตไหม
 *   - ศึกที่อ้างถึงอยู่ในรายการ Tier A แปดศึกไหม
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const load = f => { require(path.join(ROOT, 'data', f)); };

global.window = {};
const NEED = ['names.js','places.js','geo.js','routes.js','_part1.js','_part2.js','_part3.js'];
const missing = NEED.filter(f => !fs.existsSync(path.join(ROOT,'data',f)));
if (missing.length){
  console.error(`✖ ไม่พบไฟล์: ${missing.join(', ')}\n  (ไฟล์ _partN.js สร้างโดย Storyboard agent ในเฟส 3)`);
  process.exit(1);
}
NEED.forEach(load);
const TK = global.window.TK;

const BATTLES = ['jieting228','chencang229','mei229','twogates230',
                 'wuguan244','eastern255','xiling272','conquestwu276'];

/* ── กำลังพลที่เสียในโหมดสมรภูมิ — คิดจากไฟล์ศึกโดยตรง ──
   เดิม losses ของฉากที่มีสมรภูมิถูกตั้งด้วยมือ แล้ววัดออกมาว่าห่างจากของจริงมาก:
   อู่กวนเสีย 9.5 หมื่นแต่บันทึก 2 · ศึกสองประตูเสีย 8.4 แต่บันทึก 0.5
   คนอ่านกดเข้าไปเห็นทัพละลายคาตา แล้วออกมาหลอดแทบไม่ขยับ

   กติกา: ฉากที่มี battle ห้ามเขียน losses เอง ให้คิดจากไฟล์ศึก
          ฉากที่ไม่มี battle (เล่าด้วยคำบรรยายล้วน) เขียน losses เองได้

   ขบวนเสบียงไม่นับเป็นกำลังพล — เป็นเกวียนกับวัวต่าง ไม่ใช่ทหาร */
for (const id of BATTLES) {
  const f = path.join(ROOT, 'data', 'battles', id + '.js');
  if (fs.existsSync(f)) require(f);
}
function battleLosses(id){
  const B = (TK.battles || {})[id];
  if (!B) return null;
  const defs = {};
  for (const u of (B.units || []))    defs[u.id] = { ...u, final:u.strength };
  for (const u of (B.reserves || [])) defs[u.id] = { ...u, final:u.strength };
  for (const ph of B.phases)
    for (const a of ph.acts){
      const d = defs[a.u]; if (!d) continue;
      if (a.shrink !== undefined) d.final = Math.round(d.strength * Math.max(0.18, a.shrink));
      if (a.despawn) d.gone = true;               /* ถูกทำลาย/หมดสภาพ นับที่เหลือเป็นเสียด้วย */
    }
  const out = {};
  for (const k in defs){
    const d = defs[k];
    if (d.shape === 'wagon') continue;            /* ขบวนเสบียง ไม่ใช่ทหาร */
    const lost = d.strength - (d.gone ? 0 : d.final);
    if (lost > 0) out[d.side] = (out[d.side] || 0) + lost / 10000;
  }
  for (const k in out) out[k] = Math.round(out[k] * 10) / 10;
  return out;
}

/* แหล่งจริงของรายชื่อภาค — อยู่ที่นี่ ไม่ใช่ใน timeline.js เพราะไฟล์นั้นถูกสร้างทับทุกครั้ง */
const CHAPTERS = [
  { n:0, th:"บทนำ — ผู้เฝ้ามอง",             years:"228"     },
  { n:1, th:"ภาคหนึ่ง — เกเต๋งไม่แตก",        years:"228"     },
  { n:2, th:"ภาคสอง — ประตูสี่บานของกวนจง",   years:"228–229" },
  { n:3, th:"ภาคสาม — สิบปีไถหว่าน",          years:"230–234" },
  { n:4, th:"ภาคสี่ — สองแผ่นดินผุจากข้างใน",  years:"235–249" },
  { n:5, th:"ภาคห้า — วุ่ยแตกสลาย",           years:"250–263" },
  { n:6, th:"ภาคหก — สองตะวันบนฟ้าเดียวกัน",   years:"264–274" },
  { n:7, th:"ภาคเจ็ด — คลื่นสุดท้าย",         years:"275–276" },
  { n:8, th:"บทส่งท้าย — รายงานต่ออาจารย์",    years:"276"     }
];

const beats = [...(TK._part1||[]), ...(TK._part2||[]), ...(TK._part3||[])];
const err = [], warn = [];

/* ── ตรวจ ── */
const seen = new Set();
let lastChapter = -1, lastYear = 0, prevOpenedChapter = false;

for (const b of beats){
  const at = b.id || '(ไม่มี id)';
  if (!b.id)            err.push(`${at}: ไม่มี id`);
  if (seen.has(b.id))   err.push(`${at}: id ซ้ำ`);
  seen.add(b.id);

  if (typeof b.chapter !== 'number') err.push(`${at}: ไม่มี chapter`);
  if (typeof b.year !== 'number')    err.push(`${at}: ไม่มี year`);
  if (!b.title)  err.push(`${at}: ไม่มี title`);
  if (!b.text)   err.push(`${at}: ไม่มี text`);
  if (!b.fact)   err.push(`${at}: ไม่มี fact`);
  else if (!['real','fiction','mixed'].includes(b.fact))
                 err.push(`${at}: fact ต้องเป็น real|fiction|mixed ไม่ใช่ "${b.fact}"`);
  if (!b.factNote) warn.push(`${at}: ไม่มี factNote`);

  if (b.chapter < lastChapter) err.push(`${at}: chapter ย้อนหลัง (${lastChapter}→${b.chapter})`);
  const opensChapter = b.chapter !== lastChapter;
  lastChapter = b.chapter;
  /* beat แรกของภาคมักเป็นบทสรุปภาพรวมที่พูดถึงปีปลายทางก่อน แล้วค่อยย้อนไปเล่า
     (ต้นฉบับภาคสี่เปิดด้วย "ราวปี 240 กระดานเป็นแบบนี้") — ไม่ใช่ความผิดพลาด */
  if (b.year < lastYear && !prevOpenedChapter)
    warn.push(`${at}: ปีย้อนหลัง (${lastYear}→${b.year})`);
  prevOpenedChapter = opensChapter;
  lastYear = b.year;

  if (b.camera && (!Array.isArray(b.camera) || b.camera.length < 3))
    err.push(`${at}: camera ต้องเป็น [x,y,w,h]`);

  /* losses = กำลังพลที่เสียถาวรจากการรบ หน่วยหมื่นนาย เขียนได้เฉพาะสามฝ่ายและต้องเป็นบวก
     ถ้าพิมพ์ชื่อฝ่ายผิด ตัวเลขจะหายเงียบ ๆ โดยไม่มีอะไรเตือน */
  for (const k in (b.losses || {})){
    if (!['han','wei','wu'].includes(k))
      err.push(`${at}: losses มีฝ่ายที่ไม่รู้จัก "${k}" — ใช้ han|wei|wu`);
    else if (typeof b.losses[k] !== 'number' || b.losses[k] <= 0)
      err.push(`${at}: losses.${k} ต้องเป็นตัวเลขบวก (หน่วยหมื่นนาย) ไม่ใช่ ${b.losses[k]}`);
  }
  /* ฉากที่มีสมรภูมิ ตัวเลขต้องมาจากไฟล์ศึก ไม่ใช่ตั้งมือให้มันเถียงกันเอง */
  if (b.battle && b.losses)
    err.push(`${at}: ฉากที่มี battle ห้ามเขียน losses เอง — คิดจาก data/battles/${b.battle}.js ให้อัตโนมัติ`);
  if (b.hud)
    err.push(`${at}: ช่อง hud เลิกใช้แล้ว — ตัวเลขคำนวณจากพื้นที่ใน geo.js (ดู engine.strength)`);

  for (const k in (b.mapDelta || {})){
    if (!TK.regions[k]) err.push(`${at}: ไม่รู้จักเขต "${k}"`);
    /* none = แยกตัวเป็นอิสระ ไม่ได้ขึ้นกับสามก๊กสักฝ่าย (เช่นเลียวตั๋งของกงซุนยวนปี 238)
       เอนจินรองรับมาตั้งแต่แรก — names.js มีสีให้ และ tally() ก็นับ none แยกไว้แล้ว
       ขาดแค่ด่านนี้ที่ยังไม่ยอมให้ผ่าน */
    if (!['han','wei','wu','none'].includes(b.mapDelta[k]))
      err.push(`${at}: เจ้าของต้องเป็น han|wei|wu|none ไม่ใช่ "${b.mapDelta[k]}"`);
  }

  for (const m of (b.markers || [])){
    if (!['pin','arrow','clash'].includes(m.type)) err.push(`${at}: marker ชนิด "${m.type}" ไม่มี`);
    if (m.place && !TK.places[m.place]) err.push(`${at}: ไม่รู้จักสถานที่ "${m.place}"`);
    if (m.route && !TK.routes[m.route]) err.push(`${at}: ไม่รู้จักเส้นทาง "${m.route}"`);
    if (m.side  && !['han','wei','wu'].includes(m.side)) err.push(`${at}: side "${m.side}" ไม่ถูก`);
  }

  if (b.battle && !BATTLES.includes(b.battle))
    err.push(`${at}: ศึก "${b.battle}" ไม่อยู่ใน Tier A แปดศึก`);
}

/* ── สะสม delta ดูว่าจบเกมถูกไหม ── */
const owners = {};
for (const id in TK.regions) owners[id] = TK.regions[id].owner;
const flips = [];
for (const b of beats){
  for (const k in (b.mapDelta || {})){
    if (owners[k] === b.mapDelta[k])
      warn.push(`${b.id}: "${k}" เป็นของ ${b.mapDelta[k]} อยู่แล้ว — delta ซ้ำซ้อน`);
    else flips.push(`${b.year} ${k}: ${owners[k]}→${b.mapDelta[k]}`);
    owners[k] = b.mapDelta[k];
  }
}
const notHan = Object.entries(owners).filter(([,o]) => o !== 'han').map(([k]) => k);
if (notHan.length) err.push(`จบเรื่องแล้วยังมีเขตที่ไม่ใช่ของฮั่น: ${notHan.join(', ')}`);

/* ── รายงาน ── */
const byChapter = {};
for (const b of beats) byChapter[b.chapter] = (byChapter[b.chapter] || 0) + 1;

console.log(`\nbeat ทั้งหมด: ${beats.length}`);
console.log('ต่อภาค: ' + Object.entries(byChapter).map(([c,n]) => `${c}=${n}`).join('  '));
console.log(`ปี: ${beats[0].year} → ${beats[beats.length-1].year}`);
console.log(`ศึกที่ผูกไว้: ${[...new Set(beats.filter(b=>b.battle).map(b=>b.battle))].join(', ')}`);
const fc = {real:0,fiction:0,mixed:0};
beats.forEach(b => fc[b.fact] !== undefined && fc[b.fact]++);
console.log(`ป้ายจริง/แต่ง: จริง ${fc.real} · แต่ง ${fc.fiction} · ผสม ${fc.mixed}`);
console.log(`\nการเปลี่ยนมือ ${flips.length} ครั้ง:`);
flips.forEach(f => console.log('  ' + f));

if (warn.length){ console.log(`\n⚠ เตือน ${warn.length} รายการ:`); warn.forEach(w => console.log('  ' + w)); }
if (err.length){
  console.log(`\n✖ ผิด ${err.length} รายการ — ไม่เขียนไฟล์:`);
  err.forEach(e => console.log('  ' + e));
  process.exit(1);
}

/* ── ใส่ losses ที่คิดจากไฟล์ศึกลงในฉากที่มีสมรภูมิ ── */
let fromBattle = 0;
for (const b of beats){
  if (!b.battle) continue;
  const L = battleLosses(b.battle);
  if (L && Object.keys(L).length){ b.losses = L; fromBattle++; }
}

/* ── เขียน ── */
/* พิมพ์แบบหลายบรรทัด เพื่อให้ git diff อ่านออกว่าแก้ฉากไหนไปบ้าง */
const body = beats.map(b =>
  JSON.stringify(b, null, 2).split('\n').map(l => '  ' + l).join('\n')
).join(',\n');
const out =
`/* timeline.js — แกนหลักของเรื่อง (ดู docs/SCHEMA.md)
 *
 * ⚠ ไฟล์นี้สร้างจาก data/_part1.js + _part2.js + _part3.js
 *   ถ้าจะแก้เนื้อหา ให้แก้ไฟล์ _partN แล้วรัน  node tools/build_timeline.js
 *   อย่าแก้ไฟล์นี้ตรง ๆ เพราะจะโดนทับ
 *
 * beat ${beats.length} อัน · ค.ศ. ${beats[0].year}–${beats[beats.length-1].year}
 */
window.TK = window.TK || {};

window.TK.chapters = ${JSON.stringify(CHAPTERS, null, 2)};

window.TK.timeline = [
${body}
];
`;
fs.writeFileSync(path.join(ROOT,'data','timeline.js'), out, 'utf8');
console.log(`\n✔ เขียน data/timeline.js แล้ว (${beats.length} beat)`);
