# SCHEMA — สัญญาโครงสร้างข้อมูล

> **นี่คือเอกสารที่สำคัญที่สุดในการกันการแก้ซ้ำ**
> ถ้าเขียน timeline ครบ 60 beat แล้วค่อยเปลี่ยน schema = ต้องแก้ทั้ง 60 beat
> ดังนั้น: **เฟส 2 ต้องพิสูจน์ schema นี้ด้วย beat ตัวอย่าง 4 อันก่อน แล้วค่อยเขียนของจริงในเฟส 3**

ทุกไฟล์ใน `data/` ขึ้นต้นด้วย `window.TK = window.TK || {};`

---

## data/names.js — ตารางชื่อกลาง

ผูก ไทย ↔ พินอิน ↔ ป้ายบนแผนที่ **เขียนที่เดียว ใช้ทุกที่** (กฎ 5)

```js
window.TK.people = {
  kongming:  { th:"ขงเบ้ง",  py:"Zhuge Liang", side:"han" },
  wangping:  { th:"อองเป๋ง", py:"Wang Ping",   side:"han" },
  zhanghe:   { th:"เตียวคับ", py:"Zhang He",    side:"wei" },
  // ...
};
```

---

## data/places.js — พิกัดสถานที่

```js
window.TK.places = {
  jieting:  { th:"เกเต๋ง",   py:"Jie Ting",  map:"Jie Ting",  x:345, y:541, type:"town" },
  changan:  { th:"เตียงอาน", py:"Chang'an",  map:"Chang An",  x:645, y:635, type:"capital" },
  tongguan: { th:"ถงกวน",    py:"Tong Pass", map:"Tong Pass", x:735, y:620, type:"pass" },
};
```

| field | ความหมาย |
|---|---|
| `x`, `y` | พิกเซลบน map.jpg (0–1650, 0–1950) — **กฎ 4** |
| `map` | ข้อความที่พิมพ์อยู่บนแผนที่จริง ๆ (ไว้ตรวจสอบ / `null` ถ้าไม่มีบนแผนที่) |
| `type` | `capital` \| `city` \| `town` \| `pass` \| `mountain` \| `ford` \| `camp` |

---

## data/geo.js — polygon ภูมิภาค

```js
window.TK.regions = {
  longyou: {
    th:"หลงโหย่ว", py:"Longyou",
    d:"M 262,478 L 318,466 L ... Z",   // path ในพิกัด 1650×1950
    owner:"wei",                        // เจ้าของ ณ ปี 228 (สถานะเริ่มต้น)
    labelAt:[330,620]
  },
};
```

**ทำเฉพาะภูมิภาคที่เปลี่ยนมือในเรื่อง** (~18–22 อัน) ไม่ต้องแบ่งครบทุกมณฑล
สถานะเริ่มต้นลอกจาก **เส้นประสีแดง** บนแผนที่ต้นฉบับ

---

## data/routes.js — เส้นทางเดินทัพ

```js
window.TK.routes = {
  qishan_jieting: { th:"กิสาน → เกเต๋ง", d:"M 290,705 C 300,640 320,580 345,541" },
  puban_cross:    { th:"ข้ามท่าผู่ปั่น",  d:"M 762,556 L 748,600" },
};
```

**ต้องลากตามหุบเขา/ถนน/แม่น้ำจริงบนแผนที่ ห้ามลากเส้นตรง** (กฎ §6)

---

## data/timeline.js — แกนหลักของเรื่อง

> ⚠ **ตั้งแต่เฟส 3 ไฟล์นี้ถูกสร้างอัตโนมัติ ห้ามแก้ตรง ๆ**
> แหล่งจริงคือ `data/_part1.js` (บทนำ–ภาคสอง) · `_part2.js` (ภาคสาม–ห้า) · `_part3.js` (ภาคหก–ส่งท้าย)
> แก้ที่ไฟล์ `_partN` แล้วสั่งสร้างใหม่:
>
> ```
> node tools/build_timeline.js
> ```
>
> เครื่องนี้ไม่มี `node` ใน PATH — ใช้ตัวที่ติดมากับ playwright:
> `%LOCALAPPDATA%\ms-playwright-go\1.50.1\node.exe tools\build_timeline.js`
>
> ตัวสร้างจะตรวจก่อนเขียนเสมอ ถ้าไม่ผ่านจะไม่ทับไฟล์เดิม:
> id ซ้ำ · regionId/placeId/routeId มีจริงไหม · ทุก beat มี fact ไหม · ภาค/ปีเรียงถูกไหม ·
> ศึกอยู่ใน Tier A แปดศึกไหม · **สะสม mapDelta ทั้งเรื่องแล้วต้องจบที่ฮั่นถือครบทุกเขต**

```js
window.TK.timeline = [
  {
    id:      "p0-01",           // <chapter>-<ลำดับ> ห้ามซ้ำ ห้ามเปลี่ยนหลังใช้แล้ว
    chapter: 0,                 // 0=บทนำ · 1–7=ภาคหนึ่งถึงเจ็ด · 8=บทส่งท้าย
    year:    228,
    season:  "spring",          // spring|summer|autumn|winter|null
    title:   "คืนที่วางพัดขนนกลง",
    text:    "...",             // ข้อความไทย ตัดทอนจาก MD ได้ แต่ห้ามเปลี่ยนความหมาย
    voice:   "watcher",         // "narrator" (ปกติ) | "watcher" (ผู้เฝ้ามอง — สไตล์ต่าง)

    // ทุก field ข้างล่างนี้ optional — ใส่เฉพาะตอนที่ "เปลี่ยน" เท่านั้น (กฎ 2)
    camera:   [430,700,400,340],            // viewBox เป้าหมาย [x,y,w,h]
    mapDelta: { longyou:"han" },            // ภูมิภาคไหนเปลี่ยนเป็นของใคร
    markers:  [
      { type:"pin",   place:"hanzhong", label:"ค่ายหลวง" },
      { type:"arrow", route:"qishan_jieting", side:"han", unit:"square" },
      { type:"clash", place:"jieting" }
    ],
    /* ลูกศรมีสองธงเสริม — แยกกันเด็ดขาด ใส่ให้ถูกไม่งั้นคนดูอ่านทิศผิด:
         reverse:true  ทิศทาง — วิ่งย้อนเส้นทาง (ปลายทาง → ต้นทาง)
         retreat:true  ความหมาย — เป็นการถอยทัพ มีผลแค่หน้าตา (เส้นจาง หน่วยโครงกลวง)
       การถอยไม่ได้แปลว่าต้องย้อนเส้นทางเสมอ — ถ้าถอย "ไปยัง" ปลายทางของ route
       ให้ใส่แค่ retreat ถ้าถอยสวนทาง route ให้ใส่ทั้งสองอัน
       ทุกลูกศรมีหัวลูกศรบอกทิศให้อัตโนมัติ */
    hud:     { han:{pop:1.0,troops:12}, wei:{pop:4.4,troops:40}, wu:{pop:2.3,troops:20} },
    battle:  "jieting228",                  // มีค่า → ปุ่ม ⚔ "เข้าดูสมรภูมิ" โผล่

    fact:     "mixed",                      // "real" | "fiction" | "mixed"  ← บังคับ (กฎ 6)
    factNote: "คำเตือนของเล่าปี่เรื่องม้าเจ๊กมีจริง แต่การที่ขงเบ้งเชื่อคือจุดแยกเอกภพ"
  },
];
```

### กฎการเขียน timeline

1. **`mapDelta` ใส่เฉพาะที่เปลี่ยน** อย่าใส่สถานะเต็ม — engine สะสมเอง
2. **`id` ห้ามเปลี่ยนหลังใช้แล้ว** เพราะ bookmark/permalink อ้างอิง id นี้
3. **`fact` บังคับทุก beat** อ้างอิงภาคผนวก MD บรรทัด 226–232
4. `text` ควรยาว 2–5 ประโยค ถ้ายาวกว่านั้นให้ตัดเป็น beat ใหม่

---

## data/battles/*.js — แผนที่ยุทธวิธี

หนึ่งไฟล์ต่อหนึ่งศึก ชื่อไฟล์ = `<id>.js`

```js
window.TK.battles = window.TK.battles || {};
window.TK.battles.jieting228 = {
  th:"ศึกเกเต๋ง", year:228,
  anchor:  [345,541],        // พิกัดบน map.jpg — ใช้ tween ตอนซูมเข้า (กฎ 4)
  viewBox: "0 0 1200 800",   // ระบบพิกัดของแผนที่ยุทธวิธีนี้เอง

  terrain: [                 // วาดเวกเตอร์เอง คมชัด 100%
    { kind:"ridge",  d:"M 0,180 C 200,120 ..." },
    { kind:"stream", d:"M 640,0 L 660,800" },
    { kind:"road",   d:"M 0,400 L 1200,400" },
    { kind:"fort",   at:[600,400], label:"ค่ายอองเป๋ง", side:"han" }
  ],

  units: [
    { id:"wangping", side:"han", shape:"square",   at:[600,400], strength:20000, who:"wangping" },
    { id:"zhanghe",  side:"wei", shape:"triangle", at:[180,400], strength:50000, who:"zhanghe"  }
  ],

  phases: [
    { th:"เตียวคับเร่งทัพยี่สิบกว่าวันถึงเกเต๋ง",
      acts:[ { u:"zhanghe", move:"M 180,400 L 460,400", ms:1600 } ] },
    { th:"โหมตีสิบวันเต็ม คูสามชั้นไม่ขยับ",
      acts:[ { u:"zhanghe", clash:"wangping", ms:2500, pressure:0.15 } ] },
    { th:"วันที่สิบเอ็ด อุยเอี๋ยนอ้อมเผากองเสบียงหลังทัพวุ่ย",
      acts:[ { u:"weiyan", spawn:[120,180] },
             { u:"weiyan", move:"M 120,180 L 90,380", ms:1200 },
             { u:"weiyan", burn:[80,400] } ] },
    { th:"เตียวคับถอนทัพอย่างมีระเบียบกลับเข้ากวนจง",
      acts:[ { u:"zhanghe", rout:false, move:"M 460,400 L 180,400", ms:1800 } ] }
  ]
};
```

### act ที่รองรับ (engine ต้องทำครบเท่านี้ พอ)

| act | ความหมาย |
|---|---|
| `move: "<path d>"`, `ms` | เดินตาม path ด้วย `getPointAtLength()` |
| `clash: "<unit id>"`, `ms`, `pressure` | ปะทะ สั่น ~4Hz · `pressure` -1..1 (ลบ = ฝ่ายนี้เสียเปรียบ) |
| `shrink: <0..1>` | หดขนาด = เสียกำลังพล |
| `rout: true` | แตกทัพ กะพริบแดง |
| `spawn: [x,y]` | หน่วยโผล่เข้าฉาก |
| `despawn: true` | หน่วยออกจากฉาก |
| `burn: [x,y]` | เอฟเฟกต์ไฟ (เผาเสบียง/เผาโซ่เหล็ก) |
| `siege: "<unit id>"` | ล้อมเมือง วงแหวนรอบเป้าหมาย |
| `label: "..."` | ป้ายอธิบายลอยขึ้นบนจอ |

**ถ้าศึกไหนต้องการ act ใหม่ ให้เพิ่มที่ตารางนี้ก่อน แล้วค่อยเพิ่มใน engine — ห้าม hard-code เฉพาะศึก**

---

## ลำดับการโหลดใน index.html

```html
<script src="data/names.js"></script>
<script src="data/places.js"></script>
<script src="data/geo.js"></script>
<script src="data/routes.js"></script>
<script src="data/timeline.js"></script>
<script src="data/battles/jieting228.js"></script>
<!-- ... battle อื่น ๆ ... -->
<script src="js/engine.js"></script>
<script src="js/strategic.js"></script>
<script src="js/battle.js"></script>
<script src="js/ui.js"></script>
```

data ต้องมาก่อน engine เสมอ (กฎ 3 — ไม่มี fetch)
