/* labeler.js — วางป้ายชื่อสถานที่อัตโนมัติ
 *
 * แก้ปัญหา "ชื่อซ้อนทับกัน" ด้วยอัลกอริทึม ไม่ใช่ด้วยการขยับพิกัดทีละอัน
 * (point-feature label placement — วิธีมาตรฐานทางแผนที่)
 *
 * สามชั้น:
 *   1. จัดลำดับความสำคัญ  นครหลวง=1 · เมืองใหญ่=2 · เมือง=3 · ด่าน/ภูเขา=4
 *   2. LOD ตามระดับซูม     ซูมออกโชว์เฉพาะอันดับต้น ซูมเข้าค่อยปล่อยอันดับรอง
 *   3. ตรวจชนแล้วหลบ       ลอง 8 ตำแหน่งรอบหมุด เอาอันแรกที่ไม่ทับใคร ไม่มีที่ว่าง = ซ่อน
 *
 * ผลลัพธ์: ไม่ต้องแก้พิกัดป้ายด้วยมือเลยตลอดโปรเจกต์
 */
window.TK = window.TK || {};

TK.labeler = (function(){

  const RANK = { capital:1, city:2, town:3, pass:4, ford:4, mountain:4, camp:4 };

  /* ซูมออกสุด (w=1650) โชว์แค่นครหลวง · ยิ่งซูมเข้ายิ่งปล่อยอันดับรองออกมา
     ด่านกับภูเขา (อันดับ 4) โผล่เฉพาะตอนซูมเข้าใกล้จริง ๆ
     — แต่ถ้าฉากนั้นพูดถึงมัน จะถูก force ให้โผล่เสมอไม่ว่าซูมระดับไหน */
  function maxRank(vbw){
    if (vbw > 1100) return 1;
    if (vbw > 650)  return 2;
    if (vbw > 330)  return 3;
    return 4;
  }

  /* วัดความกว้างข้อความจริงด้วย canvas — แม่นกว่าเดาจากจำนวนตัวอักษร
     สำคัญมากกับภาษาไทยที่สระบน-ล่างไม่กินความกว้าง */
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const wCache = new Map();
  function textWidth(text, fontPx, fontFamily){
    const key = text + '|' + fontPx;
    if (wCache.has(key)) return wCache.get(key);
    ctx.font = `600 ${fontPx}px ${fontFamily}`;
    const w = ctx.measureText(text).width;
    wCache.set(key, w);
    return w;
  }

  /* ตำแหน่งผู้สมัคร 8 จุดรอบหมุด เรียงตามความสวยงาม (ขวาก่อน แล้วซ้าย แล้วบน-ล่าง แล้วมุม) */
  const CANDIDATES = [
    { dx: 1, dy: 0.32, anchor:'start'  },   // ขวา
    { dx:-1, dy: 0.32, anchor:'end'    },   // ซ้าย
    { dx: 0, dy:-0.9,  anchor:'middle' },   // บน
    { dx: 0, dy: 1.5,  anchor:'middle' },   // ล่าง
    { dx: 1, dy:-0.75, anchor:'start'  },   // บนขวา
    { dx: 1, dy: 1.35, anchor:'start'  },   // ล่างขวา
    { dx:-1, dy:-0.75, anchor:'end'    },   // บนซ้าย
    { dx:-1, dy: 1.35, anchor:'end'    }    // ล่างซ้าย
  ];

  const overlaps = (a,b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  /**
   * @param places  {id: {th,x,y,type}}  ทั้งหมด
   * @param vb      {x,y,w,h} viewBox ปัจจุบัน
   * @param screenW ความกว้างจริงบนจอ (px)
   * @param opts    { force:Set<id>  ป้ายที่ฉากนี้พูดถึง โชว์เสมอไม่สนใจ LOD
   *                  fontPx:number  ขนาดตัวอักษรบนจอ (คงที่ทุกระดับซูม)
   *                  fontFamily:string
   *                  pinR:number    รัศมีหมุดบนจอ }
   * @returns { labels:[{id,x,y,anchor,fontMU}], pins:[id], hidden:number }
   */
  function layout(places, vb, screenW, opts){
    opts = opts || {};
    const force      = opts.force || new Set();
    const fontPx     = opts.fontPx || 12;
    const fontFamily = opts.fontFamily || '"Leelawadee UI",sans-serif';
    const pinRpx     = opts.pinR || 5;

    const mu     = vb.w / screenW;          // map-unit ต่อ 1 screen px
    const fontMU = fontPx * mu;             // ป้ายมีขนาดคงที่บนจอทุกระดับซูม
    const lineMU = fontMU * 1.15;
    const limit  = maxRank(vb.w);
    const pad    = fontMU * 0.28;

    /* คัดเฉพาะที่อยู่ในกรอบภาพ (เผื่อขอบไว้กันป้ายกระพริบตอนแพน) */
    const m = vb.w * 0.04;
    const inView = ([id,p]) =>
      p.x >= vb.x - m && p.x <= vb.x + vb.w + m &&
      p.y >= vb.y - m && p.y <= vb.y + vb.h + m;

    const visible = Object.entries(places).filter(inView);

    /* หมุดที่แสดง: ตาม LOD หรือถูก force */
    const shown = visible.filter(([id,p]) =>
      force.has(id) || (RANK[p.type] || 4) <= limit);

    /* จองพื้นที่ของหมุดทุกอันก่อน — ป้ายห้ามทับจุดของสถานที่อื่น */
    const taken = shown.map(([id,p]) => {
      const r = (p.type === 'capital' ? pinRpx + 2 : pinRpx) * mu;
      return { x:p.x - r, y:p.y - r, w:r*2, h:r*2 };
    });

    /* เรียงลำดับ: ที่ถูก force มาก่อน แล้วตามอันดับความสำคัญ
       เพื่อให้เมืองสำคัญได้เลือกที่ก่อน เมืองรองค่อยหลบ */
    shown.sort((A,B) => {
      const fa = force.has(A[0]) ? 0 : 1, fb = force.has(B[0]) ? 0 : 1;
      if (fa !== fb) return fa - fb;
      return (RANK[A[1].type]||4) - (RANK[B[1].type]||4);
    });

    const labels = [];
    let hidden = 0;
    const cap = opts.maxLabels || 26;      // เพดานกันจอรก อ่านไม่ออก

    for (const [id,p] of shown){
      if (labels.length >= cap && !force.has(id)){ hidden++; continue; }
      const wPx = textWidth(p.th, fontPx, fontFamily);
      const wMU = wPx * mu;
      const r   = (p.type === 'capital' ? pinRpx + 2 : pinRpx) * mu;

      let placed = null;
      for (const c of CANDIDATES){
        const x = p.x + c.dx * (r + pad*1.6);
        const y = p.y + c.dy * lineMU;
        const boxX = c.anchor === 'start' ? x
                   : c.anchor === 'end'   ? x - wMU
                   :                        x - wMU/2;
        const box = { x:boxX - pad, y:y - lineMU*0.82,
                      w:wMU + pad*2, h:lineMU*1.02 };
        if (!taken.some(t => overlaps(box, t))){
          taken.push(box);
          placed = { id, x, y, anchor:c.anchor, fontMU };
          break;
        }
      }
      if (placed) labels.push(placed);
      else hidden++;                       // ไม่มีที่ว่าง → เหลือแต่หมุด (hover ค่อยโผล่)
    }

    return { labels, pins: shown.map(s => s[0]), hidden, limit };
  }

  return { layout, RANK, maxRank };
})();
