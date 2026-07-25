/* places.js — พิกัดสถานที่ (DECISIONS §4 กฎ 4)
 * x,y = พิกเซลบน assets/map.jpg  ระบบพิกัดเดียว 1650 x 1950
 * map = ข้อความที่พิมพ์อยู่บนแผนที่จริง (null = ไม่มีบนแผนที่ เราใส่เพิ่มเอง)
 * chk: true = พิกัดยังไม่ชัวร์ ต้องยืนยันด้วยตาใน tools/calibrate.html
 * type: capital | city | town | pass | mountain | ford | camp
 */
window.TK = window.TK || {};

window.TK.places = {

  /* ═══ นครหลวงและเมืองเอก ═══ */
  chengdu:   { th:"เซงโต๋",   py:"Chengdu",   map:"Cheng Du",  x:267,  y:987,  type:"capital" },
  changan:   { th:"เตียงอาน", py:"Chang'an",  map:"Chang An",  x:643,  y:644,  type:"capital" },
  luoyang:   { th:"ลกเอี๋ยง", py:"Luoyang",   map:"Luo Yang",  x:901,  y:602,  type:"capital" },
  xuchang:   { th:"ฮูโต๋",    py:"Xuchang",   map:"Xu Chang",  x:1039, y:654,  type:"capital" },
  jianye:    { th:"เกี๋ยนเงียบ", py:"Jianye", map:"Jian Ye",   x:1428, y:847,  type:"capital" },
  yecheng:   { th:"เงียบกุ๋น", py:"Yecheng",  map:"Ye Cheng",  x:1047, y:488,  type:"capital" },
  wuchang:   { th:"บู๊เชียง", py:"Wuchang",   map:"Wu Chang",  x:1095, y:1073, type:"capital", chk:true },

  /* ═══ ฮันต๋ง / ฐานทัพฮั่น ═══ */
  hanzhong:  { th:"ฮันต๋ง",   py:"Hanzhong",  map:"Han Zhong (Nan Zhen)", x:477, y:805, type:"city" },
  baocheng:  { th:"เปาเซีย",  py:"Baocheng",  map:"Bao Cheng", x:450,  y:795,  type:"town" },
  chenggu:   { th:"เฉิงกู้",  py:"Chenggu",   map:"Cheng Gu",  x:508,  y:793,  type:"town" },
  wuxiang:   { th:"อู่เซียง", py:"Wuxiang",   map:"Wu Xiang",  x:459,  y:818,  type:"town" },
  dingjun:   { th:"เขาเตงกุนซัน", py:"Mt. Dingjun", map:"Mount. Ding Jun", x:432, y:755, type:"mountain" },
  mianyang:  { th:"เหมี่ยนหยาง", py:"Mianyang", map:"(Mian Yang) Pei Cheng", x:275, y:876, type:"town" },
  jiangzhou: { th:"กังจิ๋ว",  py:"Jiangzhou", map:"Ba Jun (Jiang Zhou)", x:416, y:1121, type:"city" },
  baidi:     { th:"เป๊กเต้เสีย", py:"Baidicheng", map:"(Yong An) Bai Di Cheng", x:721, y:976, type:"city" },
  jianning:  { th:"เกี้ยนหลิง", py:"Jianning", map:"Jiao Zhou Jian Ning", x:248, y:1420, type:"city", chk:true },

  /* ═══ ด่านและหุบเขาสายบุกเหนือ ═══ */
  yangping:  { th:"ด่านหยางผิง", py:"Yangping Pass", map:"Yang Ping Pass", x:396, y:776, type:"pass" },
  baishui:   { th:"ด่านไป๋สุ่ย", py:"Baishui Pass",  map:"Bai Shui Pass",  x:407, y:807, type:"pass" },
  qigu:      { th:"หุบเขากิก๊ก", py:"Ji Valley",     map:"Qi Gu",          x:461, y:751, type:"pass" },
  xiegu:     { th:"หุบเขาเสียกู่", py:"Xie Valley",  map:"Xie Gu",         x:486, y:689, type:"pass" },
  xiegupass: { th:"ด่านเสียกู่", py:"Xiegu Pass",    map:"Xie Gu Pass",    x:518, y:686, type:"pass" },
  ziwugu:    { th:"หุบเขาจื่ออู่", py:"Ziwu Valley", map:"Zi Wi Gu",       x:597, y:693, type:"pass" },
  luogu:     { th:"หุบเขาลั่วกู่", py:"Luo Valley",  map:"Luo Gu",         x:563, y:723, type:"pass" },
  sanpass:   { th:"ด่านซาน",   py:"San Pass",        map:"San Pass",       x:444, y:661, type:"pass" },
  qingni:    { th:"ด่านชิงหนี", py:"Qingni Pass",    map:"Qing Ni Pass",   x:682, y:700, type:"pass" },

  /* ═══ สี่ประตูกวนจง ═══ */
  tongguan:  { th:"ถงกวน",   py:"Tong Pass", map:"Tong Pass", x:733, y:625, type:"pass" },
  wuguan:    { th:"อู่กวน",  py:"Wu Pass",   map:"Wu Pass",   x:743, y:725, type:"pass" },
  puban:     { th:"ท่าข้ามผู่ปั่น", py:"Puban Ford", map:"Pu Ban", x:740, y:559, type:"ford" },
  xiaoguan:  { th:"เซียวกวน", py:"Xiao Pass", map:null,       x:452, y:520, type:"pass", chk:true },
  hangu:     { th:"ด่านฮันก๋ก", py:"Hangu Pass", map:"Han Gu Pass", x:777, y:633, type:"pass" },
  hulao:     { th:"ฮูโลก",   py:"Hulao Pass", map:"Hu Lao Pass", x:944, y:590, type:"pass" },

  /* ═══ หลงโหย่ว — สนามรบภาคหนึ่ง ═══ */
  jieting:   { th:"เกเต๋ง",   py:"Jieting",  map:"Jie Ting",  x:348, y:549, type:"town" },
  qishan:    { th:"กิสาน",    py:"Qishan",   map:"Qi Shan",   x:270, y:705, type:"mountain" },
  tianshui:  { th:"เทียนซุย", py:"Tianshui", map:"Tian Shui Qin Zhou", x:356, y:607, type:"city" },
  longxi:    { th:"หลงเส",    py:"Longxi",   map:"Long Xi",   x:295, y:570, type:"city" },
  didao:     { th:"ตี๋เต้า",  py:"Didao",    map:"Di Dao",    x:294, y:505, type:"town" },
  jicheng:   { th:"จี้เฉิง",  py:"Jicheng",  map:"Yi Cheng",  x:311, y:597, type:"town", chk:true },
  shangbang: { th:"ชั่งกุย",  py:"Shanggui", map:"Shang Bang", x:365, y:625, type:"town" },
  mumen:     { th:"ช่องเขามู่เหมิน", py:"Mumen", map:"Mu Men", x:311, y:636, type:"pass" },
  beiyuan:   { th:"เป่ยหยวน", py:"Beiyuan",  map:"Bei Yuan",  x:302, y:595, type:"town" },
  yinping:   { th:"อิมเป๋ง",  py:"Yinping",  map:"Yin Ping",  x:328, y:720, type:"town" },
  wudu:      { th:"บู๊โต๋",   py:"Wudu",     map:"Wu Du",     x:362, y:658, type:"town" },
  lueyang:   { th:"เลวี่ยหยาง", py:"Lueyang", map:"Lue Yang", x:388, y:743, type:"town" },
  xiabian:   { th:"เซี่ยเปี้ยน", py:"Xiabian", map:"Xia Bian", x:416, y:705, type:"town" },
  nanan:     { th:"หนานอัน",  py:"Nan'an",   map:null,        x:330, y:640, type:"city", chk:true },
  anding:    { th:"อันติ้ง",  py:"Anding",   map:"An Ding",   x:468, y:445, type:"city", chk:true },
  jincheng:  { th:"กิมเสีย",  py:"Jincheng", map:"Jin Cheng", x:280, y:463, type:"city" },

  /* ═══ กวนจง ═══ */
  chencang:  { th:"ตันฉอง",   py:"Chencang", map:"Chen Cang", x:451, y:637, type:"city" },
  mei:       { th:"เหมย",     py:"Mei",      map:"Mei",       x:516, y:663, type:"town" },
  wuzhang:   { th:"อู่จ้างหยวน", py:"Wuzhangyuan", map:"Wu Zhang Yuan", x:503, y:661, type:"camp" },
  fufeng:    { th:"ฝูเฟิง",   py:"Fufeng",   map:"Fu Feng (Kui Li)", x:528, y:620, type:"town" },
  xianyang:  { th:"เสียนหยาง", py:"Xianyang", map:"Xian Yang", x:568, y:623, type:"town" },
  fengxiang: { th:"เฟิงเสียง", py:"Fengxiang", map:"Feng Xiang", x:693, y:598, type:"town" },
  weinan:    { th:"เว่ยหนาน", py:"Weinan",   map:"Wei Nan",   x:686, y:622, type:"town" },
  huayin:    { th:"ฮัวอิม",   py:"Huayin",   map:"Hua Yin",   x:714, y:639, type:"town" },
  puzhou:    { th:"ผู่จิ๋ว",  py:"Puzhou",   map:"Pu Zhou",   x:712, y:570, type:"town" },
  lantian:   { th:"หลันเถียน", py:"Lantian", map:"Lan Tiao",  x:673, y:672, type:"town" },

  /* ═══ เลียงจิ๋ว / ระเบียงเหอซี ═══ */
  wuwei:     { th:"อู่เวย",   py:"Wuwei",    map:"Liang Zhou Wu Wei (Xi Liang)", x:197, y:247, type:"city" },
  zhangye:   { th:"จางเย่",   py:"Zhangye",  map:"Zhang Ye",  x:24,  y:183, type:"city" },
  xijun:     { th:"ซีจวิ้น",  py:"Xijun",    map:"Xi Jun",    x:82,  y:242, type:"town" },
  longyou_t: { th:"หลงโหย่ว", py:"Longyou",  map:"Long You",  x:133, y:357, type:"town" },
  /* หมายเหตุ: จิ่วเฉวียน และ ตุนหวง อยู่นอกขอบแผนที่ทางตะวันตก — ดู PROGRESS.md */

  /* ═══ เหอตง / เป๊งจิ๋ว ═══ */
  hedong:    { th:"เหอตง",    py:"Hedong",   map:"He Dong (An Yi)", x:775, y:561, type:"city" },
  pingyang:  { th:"ผิงหยาง",  py:"Pingyang", map:"Ping Yang", x:834, y:465, type:"city" },
  hanei:     { th:"เหอเน่ย์", py:"Hanei",    map:"He Nei (Huai)", x:943, y:555, type:"city" },
  jinyang:   { th:"จิ้นหยาง", py:"Jinyang",  map:"Bing Zhou Jin Yang (Yang Qu)", x:848, y:358, type:"city", chk:true },
  shangdang: { th:"เซี่ยงตั่ง", py:"Shangdang", map:"Shang Dang", x:909, y:443, type:"city" },
  gupass:    { th:"ด่านกู่",  py:"Gu Pass",  map:"Gu Pass",   x:959, y:429, type:"pass" },
  wenxi:     { th:"เหวินสี่", py:"Wenxi",    map:"Wen Xi",    x:814, y:528, type:"town" },
  shenchi:   { th:"เหมียนฉือ", py:"Mianchi", map:"Shen Chi",  x:846, y:609, type:"town" },
  hongnong:  { th:"หงหนง",    py:"Hongnong", map:"Hong Nong", x:804, y:642, type:"town" },
  chaoge:    { th:"เฉาเกอ",   py:"Chaoge",   map:"Chao Ge",   x:1011, y:520, type:"town" },
  weijun:    { th:"เว่ยจวิ้น", py:"Weijun",  map:"Wei Jun",   x:1031, y:465, type:"city" },

  /* ═══ กิจิ๋ว / อิวจิ๋ว / ชิงจิ๋ว / กุนจิ๋ว / ชีจิ๋ว ═══ */
  handan:    { th:"หันตัน",   py:"Handan",   map:"Han Dan",   x:1022, y:412, type:"city" },
  xindu:     { th:"ซินตู",    py:"Xindu",    map:"Yi Zhou Xin Du (An Ping Guo)", x:1102, y:292, type:"city" },
  zhending:  { th:"เจินติ้ง", py:"Zhending", map:"Chang Shan (Zhen Ding)", x:1032, y:292, type:"city" },
  bohai:     { th:"ป๋อไห่",   py:"Bohai",    map:"Bo Hai",    x:1195, y:248, type:"town" },
  nanpi:     { th:"หนานผี",   py:"Nanpi",    map:"Nan Pi",    x:1204, y:307, type:"town" },
  fanyang:   { th:"ฟ่านหยาง", py:"Fanyang",  map:"You Zhou Fan Yang", x:1113, y:141, type:"city", chk:true },
  linzi:     { th:"หลินจือ",  py:"Linzi",    map:"Qing Zhou Lin Zi", x:1328, y:383, type:"city" },
  dongjun:   { th:"ตงจวิ้น",  py:"Dongjun",  map:"Bao Zhou Dong Jun", x:1138, y:533, type:"city" },
  puyang:    { th:"ผูหยาง",   py:"Puyang",   map:"Pu Yang",   x:1104, y:497, type:"town" },
  liyang:    { th:"หลี่หยาง", py:"Liyang",   map:"Li Yang",   x:1067, y:515, type:"ford" },
  baima:     { th:"ไป๋หม่า",  py:"Baima",    map:"Bai Ma",    x:1098, y:538, type:"ford" },
  guandu:    { th:"กัวต๋อ",   py:"Guandu",   map:"Guan Du",   x:1034, y:589, type:"town" },
  chenliu:   { th:"ตันลิว",   py:"Chenliu",  map:"Chen Liu (Da Liang)", x:1059, y:601, type:"city" },
  dingtao:   { th:"ติ้งเถา",  py:"Dingtao",  map:"Ding Tao",  x:1133, y:585, type:"town" },
  pengcheng: { th:"เผิงเฉิง", py:"Pengcheng", map:"Xu Zhou Peng Cheng (Yan)", x:1300, y:610, type:"city", chk:true },
  xiangping: { th:"เซียงเพ้ง", py:"Xiangping", map:null,      x:1470, y:85,  type:"city", chk:true },

  /* ═══ อิจ๋ว / หวยหนำ — แนวรบง่อ ═══ */
  wancheng:  { th:"อ้วนเซีย", py:"Wancheng", map:"Jing Zhou Nan Yang (Wan Cheng)", x:921, y:738, type:"city" },
  runan:     { th:"หยูหนำ",   py:"Runan",    map:"Yu Zhou Ru Nan", x:1038, y:760, type:"city" },
  shouchun:  { th:"โซ่วชุน",  py:"Shouchun", map:"Huai Nan Shou Chun / Yang Zhou", x:1279, y:763, type:"city" },
  hefei:     { th:"หับป๋า",   py:"Hefei",    map:"He Fei",    x:1250, y:812, type:"city", chk:true },
  shiting:   { th:"สือถิง",   py:"Shiting",  map:"Shi Ting",  x:1258, y:894, type:"town", chk:true },
  wanchengS: { th:"อ้วนเซีย (ลู่เจียง)", py:"Wan (Lujiang)", map:"Lu Jiang Wan Cheng", x:1279, y:939, type:"city" },
  ruxu:      { th:"หยูซวี",   py:"Ruxu",     map:"Wu Xu",     x:1329, y:879, type:"camp" },
  chaoxian:  { th:"เฉาเสียน", py:"Chaoxian", map:"Chao Xian", x:1331, y:854, type:"town" },
  guangling: { th:"กว่างหลิง", py:"Guangling", map:"Guang Ling Jiang Du", x:1518, y:823, type:"city" },
  danyang:   { th:"ตันตู",    py:"Danduo",   map:"Dan Du (Nan Xu)", x:1488, y:859, type:"town" },

  /* ═══ เกงจิ๋ว ═══ */
  xiangyang: { th:"เซียงหยาง", py:"Xiangyang", map:"Xiang Yang", x:829, y:899, type:"city" },
  fancheng:  { th:"ฝานเฉิง",  py:"Fancheng", map:"Fan Cheng", x:837, y:877, type:"city" },
  jiangling: { th:"กังเหลง",  py:"Jiangling", map:"Jing Zhou Nan Jun / Jiang Ling", x:882, y:1022, type:"city" },
  xiling:    { th:"ซีหลิง",   py:"Xiling",   map:"Yi Ling / Xi Ling", x:816, y:1003, type:"city" },
  yidao:     { th:"อี๋เต้า",  py:"Yidao",    map:"Yi Dao",    x:806, y:1019, type:"town" },
  jianping:  { th:"เจี้ยนผิง", py:"Jianping", map:"Jian Ping", x:743, y:977, type:"town" },
  wuxia:     { th:"ช่องเขาอูเสีย", py:"Wu Gorge", map:"Wu Xia", x:724, y:985, type:"mountain" },
  kuipass:   { th:"ด่านขุยเหมิน", py:"Kui Pass", map:"Kui Pass", x:689, y:979, type:"pass" },
  jiangxia:  { th:"กังแฮ",    py:"Jiangxia", map:"Jiang Xia", x:1052, y:1038, type:"city" },
  xiakou:    { th:"เห็กเค้า", py:"Xiakou",   map:"Xia Kou",   x:1039, y:1035, type:"town" },
  chibi:     { th:"เซ็กเพ็ก", py:"Chibi",    map:"Chi Bi",    x:1027, y:1068, type:"town" },
  gongan:    { th:"กองอั๋น",  py:"Gong'an",  map:"Gong An Chan Ling", x:853, y:1068, type:"town" },
  baling:    { th:"ปาหลิง",   py:"Baling",   map:"Ba Ling",   x:975, y:1113, type:"town" },
  changsha:  { th:"เตียงสา",  py:"Changsha", map:"Chang Sha (Ling Xiang)", x:962, y:1182, type:"city" },
  wuling:    { th:"บู๊เหลง",  py:"Wuling",   map:"Wu Ling",   x:795, y:1172, type:"city" },

  /* ═══ กังตั๋ง / ง่อ ═══ */
  chaisang:  { th:"ไฉสัง",    py:"Chaisang", map:"Chai Sang", x:1183, y:1098, type:"town" },
  jiujiang:  { th:"กิ๋วกั๋ง", py:"Jiujiang", map:"Jiu Jiang", x:1183, y:1085, type:"city" },
  poyang:    { th:"พัวเอี๋ยง", py:"Poyang",  map:"Po Yang",   x:1236, y:1099, type:"city" },
  yuzhang:   { th:"อิจงจิ๋ว", py:"Yuzhang",  map:"Nan Chang Yu Zhang", x:1192, y:1137, type:"city" },
  wujun:     { th:"ง่อกุ๋น",  py:"Wujun",    map:"Wu Jun",    x:1549, y:931, type:"city" },
  kuaiji:    { th:"ห้อยเข",   py:"Kuaiji",   map:"Hui Ji Shan Yin", x:1571, y:1054, type:"city" },
  fuchun:    { th:"ฟู่ชุน",   py:"Fuchun",   map:"Fu Chun",   x:1507, y:1016, type:"town" },
  qiantang:  { th:"เฉียนถัง", py:"Qiantang", map:"Qian Tang", x:1536, y:986, type:"town" },
  nanhai:    { th:"หนานไห่",  py:"Nanhai",   map:"Guang Zhou Nan Hai (Nan Yue)", x:950, y:1712, type:"city", chk:true }
};
