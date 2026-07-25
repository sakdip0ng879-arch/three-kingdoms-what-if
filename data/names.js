/* names.js — ตารางชื่อกลาง (DECISIONS §4 กฎ 5)
 * ผูก ไทย <-> พินอิน  เขียนที่เดียว ใช้ทุกที่
 * ห้ามพิมพ์ชื่อคนตรง ๆ ในไฟล์อื่น ให้อ้าง id เสมอ
 * ชื่อไทยยึดตามที่ใช้ใน What_If_First_Northern_Expedition.md
 */
window.TK = window.TK || {};

/* color = สีระบายพื้นที่/สัญลักษณ์ · text = สีเดียวกันแต่สว่างพอใช้เป็นตัวอักษรบนพื้นมืด
 *
 * ทำไมต้องแยกสองค่า: ตรวจด้วยเกณฑ์ WCAG แล้วพบว่าน้ำเงินวุ่ยได้ 2.87:1
 * และแดงง่อได้ 3.44:1 บนพื้นมืด ซึ่งต่ำกว่าเกณฑ์ 4.5:1 สำหรับข้อความ
 * (เขียวฮั่นได้ 5.15:1 ผ่านอยู่แล้ว จึงใช้ค่าเดิม)
 * ส่วนสีระบายพื้นที่ไม่ต้องแก้ — ตรวจแล้วผ่านทุกข้อรวมถึงการแยกสีสำหรับคนตาบอดสี
 * (คู่ที่แย่ที่สุดคือแดง-น้ำเงิน ΔE 17.3 สูงกว่าเกณฑ์ 8 เท่าตัว)
 */
window.TK.factions = {
  han:  { th: "ฮั่น (จ๊กก๊ก)", py: "Shu-Han", color: "#2E9E5B", text: "#2E9E5B" },
  wei:  { th: "วุ่ยก๊ก",       py: "Wei",      color: "#2563A8", text: "#5585BB" },
  wu:   { th: "ง่อก๊ก",        py: "Wu",       color: "#C2413A", text: "#CD635D" },
  none: { th: "ไม่มีเจ้าของ",  py: "Neutral",  color: "#9AA0A6", text: "#B4BAC4" }
};

window.TK.people = {
  /* --- ฮั่น --- */
  kongming:  { th: "ขงเบ้ง",     py: "Zhuge Liang", side: "han" },
  masu:      { th: "ม้าเจ๊ก",     py: "Ma Su",       side: "han" },
  wangping:  { th: "อองเป๋ง",    py: "Wang Ping",   side: "han" },
  weiyan:    { th: "อุยเอี๋ยน",   py: "Wei Yan",     side: "han" },
  zhaoyun:   { th: "จูล่ง",       py: "Zhao Yun",    side: "han" },
  dengzhi:   { th: "เตงจื๋อ",     py: "Deng Zhi",    side: "han" },
  jiangwei:  { th: "เกียงอุย",    py: "Jiang Wei",   side: "han" },
  liushan:   { th: "เล่าเสี้ยน",  py: "Liu Shan",    side: "han" },
  liubei:    { th: "เล่าปี่",      py: "Liu Bei",     side: "han" },
  jiangwan:  { th: "เจียวอ้วน",   py: "Jiang Wan",   side: "han" },
  feiyi:     { th: "บิฮุย",       py: "Fei Yi",      side: "han" },
  dongyun:   { th: "ตังอุ๋น",     py: "Dong Yun",    side: "han" },
  yangyi:    { th: "เอียวหงี",    py: "Yang Yi",     side: "han" },
  liaohua:   { th: "เลียวฮัว",    py: "Liao Hua",    side: "han" },
  /* ย้ายข้างจากวุ่ยมาฮั่น (จุดที่แต่งขึ้น) */
  dengai:    { th: "เตงงาย",     py: "Deng Ai",     side: "han", was: "wei" },
  yanghu:    { th: "หยางฮู่",     py: "Yang Hu",     side: "han", was: "wei" },
  duyu:      { th: "ตู้อวี้",      py: "Du Yu",       side: "han", was: "wei" },
  wangjun:   { th: "หวางจุ้น",    py: "Wang Jun",    side: "han", was: "wei" },
  luoxian:   { th: "โลเฮี้ยน",    py: "Luo Xian",    side: "han" },

  /* --- วุ่ย --- */
  zhanghe:   { th: "เตียวคับ",    py: "Zhang He",     side: "wei" },
  caozhen:   { th: "โจจิ๋น",      py: "Cao Zhen",     side: "wei" },
  caorui:    { th: "โจยอย",       py: "Cao Rui",      side: "wei" },
  guohuai:   { th: "กุยห้วย",     py: "Guo Huai",     side: "wei" },
  haozhao:   { th: "เฮ่าเจา",     py: "Hao Zhao",     side: "wei" },
  xiahoumao: { th: "เซี่ยโหวเม่า", py: "Xiahou Mao",   side: "wei" },
  simayi:    { th: "สุมาอี้",     py: "Sima Yi",      side: "wei" },
  simashi:   { th: "สุมาสู",      py: "Sima Shi",     side: "wei" },
  simazhao:  { th: "สุมาเจียว",   py: "Sima Zhao",    side: "wei" },
  caoxiu:    { th: "โจฮิว",       py: "Cao Xiu",      side: "wei" },
  caoshuang: { th: "โจซอง",       py: "Cao Shuang",   side: "wei" },
  caofang:   { th: "โจฮอง",       py: "Cao Fang",     side: "wei" },
  caomao:    { th: "โจมอ",        py: "Cao Mao",      side: "wei" },
  caohuan:   { th: "โจฮวน",       py: "Cao Huan",     side: "wei" },
  wangling:  { th: "อองเล้ง",     py: "Wang Ling",    side: "wei" },
  guanqiu:   { th: "บู๊ขิวเขียม",  py: "Guanqiu Jian", side: "wei" },
  wenqin:    { th: "บุนขิม",      py: "Wen Qin",      side: "wei" },
  wenyang:   { th: "บุนเอียง",    py: "Wen Yang",     side: "wei" },
  zhugedan:  { th: "จูกัดตั้น",   py: "Zhuge Dan",    side: "wei" },
  zhonghui:  { th: "จงโฮย",       py: "Zhong Hui",    side: "wei" },
  guoxun:    { th: "กัวสิว",      py: "Guo Xun",      side: "wei" },
  jiachong:  { th: "เจี่ยชง",     py: "Jia Chong",    side: "wei" },
  chengji:   { th: "เฉิงจี้",     py: "Cheng Ji",     side: "wei" },
  gongsun:   { th: "กงซุนยวน",    py: "Gongsun Yuan", side: "wei" },
  hanlong:   { th: "หานหลง",      py: "Han Long",     side: "wei" },

  /* --- ง่อ --- */
  sunquan:   { th: "ซุนกวน",      py: "Sun Quan",  side: "wu" },
  sunxiu:    { th: "ซุนฮิว",      py: "Sun Xiu",   side: "wu" },
  sunhao:    { th: "ซุนโฮ",       py: "Sun Hao",   side: "wu" },
  sunhe:     { th: "ซุนเหอ",      py: "Sun He",    side: "wu" },
  sunba:     { th: "ซุนป๋า",      py: "Sun Ba",    side: "wu" },
  luxun:     { th: "ลกซุน",       py: "Lu Xun",    side: "wu" },
  lukang:    { th: "ลกข้อง",      py: "Lu Kang",   side: "wu" },
  zhoufang:  { th: "โจวฝาง",      py: "Zhou Fang", side: "wu" },
  zhangti:   { th: "จางที",       py: "Zhang Ti",  side: "wu" },
  buchan:    { th: "ปู้ฉั่น",     py: "Bu Chan",   side: "wu" },

  /* --- นอกสามก๊ก --- */
  kebineng:  { th: "เคอปี่เหนิง", py: "Kebineng",  side: "none" },
  liuyuan:   { th: "หลิวยวน",     py: "Liu Yuan",  side: "none" }
};
