/* build_geo.js — สร้างรูปพื้นที่ยึดครองที่ "ไม่มีรูโหว่และหยุดที่ชายฝั่งจริง"
 *
 *   tools\landmask.ps1        (รันครั้งเดียว ได้ data\landmask.js)
 *   node tools\build_geo.js   (ได้ data\geo_fill.js)
 *
 * ปัญหาที่แก้: โพลิกอนใน geo.js ลากด้วยมือ ภูมิภาคละ 12–18 จุด ไม่ได้ปูเต็มแผ่นดิน
 * วัดจริงแล้วพื้นดิน 46% ไม่มีสีเลย และ .region ต้องพึ่ง stroke หนา 34 มากลบรอยต่อ
 * ผลคือขอบมนเป็นก้อน ๆ เหมือนแต้มสี แถมสีล้นลงทะเลด้วย
 *
 * วิธี: ไม่ทิ้งของเดิม ใช้โพลิกอนที่ลากไว้เป็น "เมล็ด" แล้วให้มันโตออกไปหากัน
 *   1. แปะทุกช่องที่อยู่ในโพลิกอนอยู่แล้ว → เขตแดนที่ตั้งใจไว้ไม่ขยับสักจุด
 *      (เช่นขอบหยางจิ๋วที่จงใจเดินตามลำแยงซี ต้องอยู่ที่เดิม)
 *   2. BFS จากช่องพวกนั้นออกไปหาช่อง "พื้นดินที่ยังไม่มีเจ้าของ" ที่ใกล้ที่สุด
 *      เดินผ่านพื้นดินเท่านั้น → ข้ามอ่าวป๋อไห่ไม่ได้ สีจึงไม่กระเด็นข้ามทะเล
 *   3. หยุดที่ระยะ GROW ช่อง → ทุ่งหญ้าเหนือกับทะเลทรายตะวันตกไม่ถูกอ้างสิทธิ์
 *   4. ลากเส้นขอบของแต่ละภูมิภาคจากตาราง แล้วลดจุด + ลบมุมฉากให้เนียน
 *
 * ผลลัพธ์ไปอยู่ที่ TK.regions[id].fill — strategic.js ใช้ fill ถ้ามี ไม่มีก็ใช้ d เดิม
 * ลบ data\geo_fill.js ทิ้งเมื่อไหร่ ทุกอย่างกลับไปเป็นแบบเดิมทันที
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
global.window = global;
require(path.join(ROOT, 'data', 'geo.js'));
require(path.join(ROOT, 'data', 'landmask.js'));

const R    = window.TK.regions;
const MASK = window.TK.landmask;
const { cell: CELL, w: W, h: H, rows } = MASK;

const GROW = Number(process.argv[2] || 30);   // ระยะโตสูงสุด (ช่อง) 30 ช่อง = 150 หน่วย
const DPTOL = 7;                              // ความคลาดเคลื่อนตอนลดจุด (หน่วยแผนที่)

/* ── พื้นดิน ─────────────────────────────────────────────────────────────── */
const land = new Uint8Array(W * H);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++)
    land[y * W + x] = rows[y].charCodeAt(x) === 49 ? 1 : 0;

/* ปิดร่องน้ำแคบก่อน — แม่น้ำไม่ใช่เส้นแบ่งที่ทำให้สีพื้นที่ขาดออกจากกัน
   ถ้าไม่ทำ แยงซีกับฮวงโหจะกลายเป็นร่องขาวผ่ากลางแคว้น และเมืองท่าริมน้ำ
   (เห็กเค้า เซ็กเพ็ก ไฉสัง หยูซวี ผู่ปั่น อู่จ้างหยวน) จะตกอยู่นอกทุกภูมิภาค — วัดแล้วหลุด 16 แห่ง

   วิธี: ขยายพื้นดินออก CLOSE ช่องแล้วหดกลับเท่าเดิม (morphological closing)
   ร่องที่แคบกว่า 2xCLOSE จะถูกเชื่อมปิด ส่วนทะเลกับทะเลสาบใหญ่ (ต้งถิง ผัวหยาง ไท่)
   กว้างกว่านั้นมาก จึงรอดมาเป็นน้ำเหมือนเดิม */
const CLOSE = 4;
function morph(src, grow) {
  let cur = src;
  for (let s = 0; s < Math.abs(grow); s++) {
    const next = new Uint8Array(cur);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (grow > 0 ? cur[i] : !cur[i]) continue;
      let touch = false;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (grow > 0 ? cur[ny * W + nx] : !cur[ny * W + nx]) { touch = true; break; }
      }
      if (touch) next[i] = grow > 0 ? 1 : 0;
    }
    cur = next;
  }
  return cur;
}
const rawLand = land.reduce((n, v) => n + v, 0);
const closed = morph(morph(land, CLOSE), -CLOSE);
closed.forEach((v, i) => { land[i] = v; });
console.log(`ปิดร่องน้ำแคบ (${CLOSE} ช่อง = ${CLOSE * CELL} หน่วย): ` +
            `พื้นดิน ${rawLand} → ${land.reduce((n, v) => n + v, 0)} ช่อง`);

/* ── โพลิกอนเมล็ด ───────────────────────────────────────────────────────── */
const ids = Object.keys(R);
const polys = ids.map(id => {
  const pts = [];
  const re = /([ML])\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)/g;
  let m;
  while ((m = re.exec(R[id].d))) pts.push([+m[2], +m[3]]);
  return pts;
});

function inPoly(pts, x, y) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/* ── 1. แปะช่องที่อยู่ในโพลิกอนเดิม ─────────────────────────────────────── */
const own = new Int16Array(W * H).fill(-1);
let seeded = 0;
for (let y = 0; y < H; y++) {
  const my = y * CELL + CELL / 2;
  for (let x = 0; x < W; x++) {
    if (!land[y * W + x]) continue;
    const mx = x * CELL + CELL / 2;
    for (let k = 0; k < polys.length; k++) {
      if (inPoly(polys[k], mx, my)) { own[y * W + x] = k; seeded++; break; }
    }
  }
}

/* ── 2–3. BFS ออกไปหาพื้นดินที่ยังว่าง เดินผ่านพื้นดินเท่านั้น ──────────── */
let frontier = [];
for (let i = 0; i < own.length; i++) if (own[i] >= 0) frontier.push(i);
let grown = 0;
for (let step = 0; step < GROW && frontier.length; step++) {
  const next = [];
  for (const i of frontier) {
    const x = i % W, y = (i / W) | 0, k = own[i];
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx;
      if (own[j] >= 0 || !land[j]) continue;
      own[j] = k; grown++; next.push(j);
    }
  }
  frontier = next;
}

/* ── 4. ลากเส้นขอบจากตาราง ──────────────────────────────────────────────── */
/* เก็บด้านของช่องที่ติดกับ "ไม่ใช่ภูมิภาคนี้" แล้วร้อยเป็นวงปิด
   ทิศทางของแต่ละด้านตั้งไว้ให้วงต่อกันได้เอง ไม่ต้องเดาว่าอันไหนต่ออันไหน */
function trace(k) {
  const edges = new Map();                       // "x,y" ต้นทาง → [ปลายทาง...]
  const key = (x, y) => x + ',' + y;
  const add = (ax, ay, bx, by) => {
    const a = key(ax, ay);
    if (!edges.has(a)) edges.set(a, []);
    edges.get(a).push([bx, by]);
  };
  const is = (x, y) => x >= 0 && y >= 0 && x < W && y < H && own[y * W + x] === k;

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (own[y * W + x] !== k) continue;
    if (!is(x, y - 1)) add(x,     y,     x + 1, y    );
    if (!is(x + 1, y)) add(x + 1, y,     x + 1, y + 1);
    if (!is(x, y + 1)) add(x + 1, y + 1, x,     y + 1);
    if (!is(x - 1, y)) add(x,     y + 1, x,     y    );
  }

  const loops = [];
  while (edges.size) {
    const startKey = edges.keys().next().value;
    let [cx, cy] = startKey.split(',').map(Number);
    const loop = [];
    while (true) {
      const list = edges.get(key(cx, cy));
      if (!list || !list.length) break;
      const [nx, ny] = list.pop();
      if (!list.length) edges.delete(key(cx, cy));
      loop.push([cx * CELL, cy * CELL]);
      cx = nx; cy = ny;
      if (key(cx, cy) === startKey) break;
    }
    if (loop.length > 8) loops.push(loop);
  }
  return loops;
}

/* ลดจุดแบบ Douglas–Peucker แล้วมนมุมด้วย Chaikin หนึ่งรอบ
   ตารางให้ขอบเป็นฟันปลามุมฉาก ถ้าไม่ทำจะเห็นขั้นบันไดชัดตอนซูม */
function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let far = -1, fd = tol;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
      if (d > fd) { fd = d; far = i; }
    }
    if (far > 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

function chaikin(pts) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
    out.push([ax + (bx - ax) * 0.25, ay + (by - ay) * 0.25]);
    out.push([ax + (bx - ax) * 0.75, ay + (by - ay) * 0.75]);
  }
  return out;
}

/* ── เขียนไฟล์ ──────────────────────────────────────────────────────────── */
const lines = [];
let totalPts = 0, kept = 0;
ids.forEach((id, k) => {
  const loops = trace(k)
    .map(l => chaikin(dp(l, DPTOL)))
    .filter(l => l.length > 10);
  if (!loops.length) return;
  kept++;
  const d = loops.map(l =>
    'M ' + l.map(p => `${Math.round(p[0])},${Math.round(p[1])}`).join(' L ') + ' Z'
  ).join(' ');
  totalPts += loops.reduce((n, l) => n + l.length, 0);
  lines.push(`  ${id}: ${JSON.stringify(d)},`);
});

const out =
`/* geo_fill.js — สร้างโดย tools\\build_geo.js ห้ามแก้ด้วยมือ
 * แก้รูปพื้นที่ที่ data\\geo.js แล้วรันใหม่:  node tools\\build_geo.js
 *
 * รูปพวกนี้คือโพลิกอนใน geo.js ที่ถูกขยายออกไปจนชนกันเองและชนชายฝั่งจริง
 * เขตแดนที่ลากไว้เดิมไม่ขยับ — ที่เพิ่มคือส่วนที่เคยเป็นช่องว่างสีขาว
 * ระยะขยายสูงสุด ${GROW} ช่อง (${GROW * CELL} หน่วยแผนที่) · ลดจุดที่ ${DPTOL} หน่วย
 *
 * ลบไฟล์นี้ทิ้ง = กลับไปใช้รูปเดิมใน geo.js ทันที ไม่ต้องแก้โค้ด
 */
window.TK = window.TK || {};
window.TK.regionsFill = {
${lines.join('\n')}
};
for (const id in window.TK.regionsFill)
  if (window.TK.regions[id]) window.TK.regions[id].fill = window.TK.regionsFill[id];
`;

fs.writeFileSync(path.join(ROOT, 'data', 'geo_fill.js'), out, 'utf8');

const landCells = land.reduce((n, v) => n + v, 0);
const ownedCells = own.reduce((n, v) => n + (v >= 0 ? 1 : 0), 0);
console.log(`ตาราง ${W}x${H} · พื้นดิน ${landCells} ช่อง`);
console.log(`ในโพลิกอนเดิม ${seeded} ช่อง (${(seeded/landCells*100).toFixed(1)}% ของพื้นดิน)`);
console.log(`ขยายเพิ่ม ${grown} ช่อง → ระบายรวม ${(ownedCells/landCells*100).toFixed(1)}% ของพื้นดิน`);
console.log(`เขียน data/geo_fill.js — ${kept}/${ids.length} ภูมิภาค · ${totalPts} จุด`);
