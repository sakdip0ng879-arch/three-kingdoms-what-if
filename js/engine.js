/* engine.js — แกนสถานะของเรื่อง
 *
 * หน้าที่เดียว: รู้ว่า "ตอนนี้อยู่ beat ไหน และกระดานหน้าตาเป็นยังไง"
 * ไม่ยุ่งกับการวาด ไม่ยุ่งกับ DOM — ส่วนนั้นเป็นของ strategic.js กับ ui.js
 *
 * หัวใจคือ DECISIONS กฎ 2: สถานะเก็บเป็น delta ไม่ใช่ snapshot
 * สถานะ ณ beat ที่ i = เจ้าของตั้งต้นใน geo.js + สะสม mapDelta ของ beat 0..i
 * ทำให้แก้ beat หนึ่งไม่กระทบ beat อื่น และเลื่อนแถบเวลาไป-กลับได้ฟรี
 */
window.TK = window.TK || {};

TK.engine = (function(){

  const beats = TK.timeline;
  let i = 0;
  const subs = {};

  /* ── สถานะที่คำนวณจาก delta ── */

  function ownersAt(n){
    const o = {};
    for (const id in TK.regions) o[id] = TK.regions[id].owner;
    for (let k = 0; k <= n && k < beats.length; k++){
      if (beats[k].mapDelta) Object.assign(o, beats[k].mapDelta);
    }
    return o;
  }

  /* field ที่ "ค้างไว้จนกว่าจะมีค่าใหม่" — เอาค่าล่าสุดที่เจอย้อนหลัง */
  function latest(n, field){
    for (let k = Math.min(n, beats.length-1); k >= 0; k--){
      if (beats[k][field]) return beats[k][field];
    }
    return null;
  }

  function tally(n){
    const o = ownersAt(n);
    const c = { han:0, wei:0, wu:0, none:0 };
    for (const id in o) c[o[id]] = (c[o[id]] || 0) + 1;
    return c;
  }

  /* ── นำทาง ── */

  function goTo(n, how){
    n = Math.max(0, Math.min(beats.length - 1, n));
    const from = i;
    i = n;
    emit('beat', { index:i, beat:beats[i], from, how: how || 'jump',
                   owners: ownersAt(i), hud: latest(i,'hud'), tally: tally(i) });
  }
  const next = () => { if (i < beats.length - 1) goTo(i + 1, 'next'); };
  const prev = () => { if (i > 0) goTo(i - 1, 'prev'); };

  /* ── event เล็ก ๆ พอใช้ ── */
  function on(evt, fn){ (subs[evt] = subs[evt] || []).push(fn); }
  function emit(evt, data){ (subs[evt] || []).forEach(fn => fn(data)); }

  /* ── tween ทั่วไป ใช้ทั้งกล้องและอย่างอื่น ──
     easeInOutCubic: ออกตัวนุ่ม เข้าที่นุ่ม เหมาะกับการแพนกล้อง */
  const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;

  function tween(from, to, ms, onStep, onDone){
    if (ms <= 0){ onStep(to, 1); if (onDone) onDone(); return () => {}; }
    const t0 = performance.now();
    let raf, cancelled = false;
    const keys = Object.keys(to);
    (function step(now){
      if (cancelled) return;
      /* ⚠ ต้องหนีบทั้งสองด้าน ไม่ใช่แค่ Math.min(1, …)
         requestAnimationFrame ส่ง timestamp ของ "ตอนเฟรมเริ่ม" ซึ่งเก่ากว่า
         performance.now() ที่เพิ่งอ่านไปตอนตั้ง t0 ได้ → now - t0 ติดลบ
         ease เป็น 4t³ ช่วง t<.5 ค่าติดลบจึงไม่ได้แค่เพี้ยนนิดหน่อย มันระเบิด
         (วัดจริงตอนกดปุ่มรัว ๆ: t = -4.72 → ease = -421.8 กล้องกระเด็นไป
          viewBox กว้าง -14,919,678 วงปะทะถูกสเกลเป็น 321,582px ทับจอเป็นสีทองทั้งแผ่น) */
      const t = Math.min(1, Math.max(0, (now - t0) / ms)), e = ease(t);
      const cur = {};
      for (const k of keys) cur[k] = from[k] + (to[k] - from[k]) * e;
      onStep(cur, t);
      if (t < 1) raf = requestAnimationFrame(step);
      else if (onDone) onDone();
    })(t0);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }

  return {
    beats,
    get index(){ return i; },
    get beat(){ return beats[i]; },
    get length(){ return beats.length; },
    ownersAt, latest, tally, goTo, next, prev, on, emit, tween, ease
  };
})();
