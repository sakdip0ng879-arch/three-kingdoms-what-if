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

  function tally(n){
    const o = ownersAt(n);
    const c = { han:0, wei:0, wu:0, none:0 };
    for (const id in o) c[o[id]] = (c[o[id]] || 0) + 1;
    return c;
  }

  /* ── ประชากรกับกำลังพล คำนวณจากพื้นที่ที่ถืออยู่จริง ──
     เดิมอ่านจากช่อง hud ที่ประกาศไว้แค่ 7 ฉากจาก 71 ตัวเลขจึงแช่แข็งยาวสุด 22 ฉาก
     ทั้งที่ "จำนวนเขต" ข้างกันคำนวณสดอยู่แล้ว — บรรทัดเดียวเลยขัดกันเอง

     เขตที่เป็น none (กบฏ/แยกตัว) ไม่นับให้ใคร ซึ่งถูกแล้ว เพราะระหว่างกบฏ
     เจ้าของเดิมเก็บภาษีและเกณฑ์คนจากที่นั่นไม่ได้

     losses = กำลังพลที่เสียถาวรจากการรบ หน่วยเป็นหมื่น สะสมไปเรื่อย ๆ
     จำเป็นเพราะบางศึกเสียคนโดยไม่เสียแผ่นดิน (สือถิง อู่กวน) ซึ่งพื้นที่อย่างเดียวจับไม่ได้ */
  /* ฐานกำลังพลของแต่ละฝ่ายตอนเปิดเรื่อง — ใช้วัดว่าตอนนี้ถูกบีบไปแค่ไหน
     คิดครั้งเดียวตอนโหลด ไม่ต้องคิดใหม่ทุกฉาก */
  const BASE228 = (() => {
    const b = { han:0, wei:0, wu:0 };
    for (const id in TK.regions){
      const r = TK.regions[id];
      if (b[r.owner] !== undefined && r.troops !== undefined) b[r.owner] += r.troops;
    }
    return b;
  })();

  /* กองทัพที่เสียไปไม่ได้หายถาวร — รัฐเกณฑ์คนมาทดแทนได้ในไม่กี่ปี
     0.68 ต่อปี = ผ่านไปสามปีเหลือผลราวหนึ่งในสาม ห้าปีแทบหมด */
  const RECOVER = 0.68;
  /* ถูกบีบมากก็เกณฑ์หนักขึ้น — เสียแผ่นดินไปครึ่งหนึ่งจะรีดกำลังจากที่เหลือได้อีกราวหนึ่งในสี่
     ที่ปี 228 ทุกฝ่ายยังถือแผ่นดินตัวเองครบ ค่านี้จึงเป็น 1.0 พอดี ตัวเลขเปิดเรื่องไม่เพี้ยน */
  const DESPERATION = 0.5;

  function strength(n){
    const o = ownersAt(n);
    const s = { han:{pop:0,troops:0}, wei:{pop:0,troops:0}, wu:{pop:0,troops:0} };
    for (const id in o){
      const side = s[o[id]], r = TK.regions[id];
      if (!side || !r || r.pop === undefined) continue;
      side.pop += r.pop; side.troops += r.troops;   /* troops ตรงนี้คือ "แผ่นดินนี้เลี้ยงทหารได้เท่าไร" */
    }

    const year = beats[Math.min(n, beats.length-1)].year;
    for (const k in s){
      /* เกณฑ์หนักขึ้นตามสัดส่วนแผ่นดินเดิมที่เสียไป */
      const share = BASE228[k] ? s[k].troops / BASE228[k] : 1;
      s[k].troops *= 1 + DESPERATION * Math.max(0, 1 - share);
    }
    /* หักส่วนที่เพิ่งเสียไปและยังเกณฑ์คืนไม่ทัน */
    for (let k = 0; k <= n && k < beats.length; k++){
      const L = beats[k].losses; if (!L) continue;
      const age = Math.max(0, year - beats[k].year);
      for (const side in L) if (s[side]) s[side].troops -= L[side] * Math.pow(RECOVER, age);
    }
    for (const k in s){
      s[k].pop    = Math.round(s[k].pop * 10) / 10;
      s[k].troops = Math.max(0, Math.round(s[k].troops));
    }
    return s;
  }

  /* ── นำทาง ── */

  function goTo(n, how){
    n = Math.max(0, Math.min(beats.length - 1, n));
    const from = i;
    i = n;
    emit('beat', { index:i, beat:beats[i], from, how: how || 'jump',
                   owners: ownersAt(i), tally: tally(i), strength: strength(i) });
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
    ownersAt, tally, strength, goTo, next, prev, on, emit, tween, ease
  };
})();
