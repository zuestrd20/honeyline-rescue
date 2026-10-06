/** Hand-built 720 × 600 puzzle rooms. Every hint is also a tested legal solution. */
const line = (...pairs) => pairs.map(([x, y]) => ({ x, y }));
const block = (x, y, w, h) => ({ x, y, w, h });
const bunny = (x, y) => ({ x, y });
const hive = (x, y) => ({ x, y });

export const levels = [
  {
    id: 1, name: '小小避風港', tag: '初次守護',
    tip: '把拱形防線接到石台上，替糯米兔蓋個小窩。',
    ink: 275, seconds: 8, targets: [bunny(360, 420)], hives: [hive(360, 122)],
    terrain: [block(220, 455, 280, 145)],
    solution: [line([317, 454], [317, 377], [403, 377], [403, 454])],
  },
  {
    id: 2, name: '安心小角落', tag: '利用地形',
    tip: '石牆和地板已經幫了一半的忙，補上缺少的防線吧。',
    ink: 195, seconds: 9, targets: [bunny(160, 446)], hives: [hive(508, 124)],
    terrain: [block(80, 300, 40, 250), block(80, 480, 300, 120)],
    solution: [line([120, 396], [205, 396], [205, 480])],
  },
  {
    id: 3, name: '蓋上小屋頂', tag: '少少就好',
    tip: '用一條短短的屋頂，封住小窩上方的開口。',
    ink: 125, seconds: 9, targets: [bunny(360, 422)], hives: [hive(350, 116)],
    terrain: [block(275, 455, 170, 145), block(275, 370, 32, 85), block(413, 370, 32, 85)],
    solution: [line([307, 369], [413, 369])],
  },
  {
    id: 4, name: '左右都有蜂', tag: '分筆作畫',
    tip: '蜜蜂會從兩端飛進來，記得把兩扇門都關好。',
    ink: 160, seconds: 9, targets: [bunny(360, 350)], hives: [hive(85, 345), hive(635, 350)],
    terrain: [block(200, 290, 320, 28), block(200, 382, 320, 28)],
    solution: [line([267, 318], [267, 382]), line([453, 318], [453, 382])],
  },
  {
    id: 5, name: '好朋友一起', tag: '雙兔任務',
    tip: '兩隻糯米兔都要保護，仔細分配你的墨水。',
    ink: 535, seconds: 10, targets: [bunny(214, 433), bunny(506, 433)], hives: [hive(100, 106), hive(620, 106)],
    terrain: [block(160, 468, 108, 132), block(452, 468, 108, 132)],
    solution: [line([170, 467], [170, 390], [258, 390], [258, 467]), line([462, 467], [462, 390], [550, 390], [550, 467])],
  },
  {
    id: 6, name: '躲進轉角裡', tag: '轉彎守護',
    tip: '高石牆只能拖慢蜜蜂，轉角小窩還需要一個屋頂。',
    ink: 220, seconds: 11, targets: [bunny(555, 465)], hives: [hive(140, 135)],
    terrain: [block(600, 300, 120, 300), block(450, 500, 150, 100), block(325, 260, 38, 340)],
    solution: [line([494, 500], [494, 412], [600, 412])],
  },
  {
    id: 7, name: '補上大缺口', tag: '開口好大',
    tip: '先別管上方的石塊，封好下面的小窩。',
    ink: 190, seconds: 10, targets: [bunny(360, 446)], hives: [hive(120, 180), hive(600, 180)],
    terrain: [block(240, 350, 32, 200), block(448, 350, 32, 200), block(240, 490, 240, 110), block(300, 285, 120, 28)],
    solution: [line([272, 349], [448, 349])],
  },
  {
    id: 8, name: '高低好鄰居', tag: '不同高度',
    tip: '兩個高度不同的小窩，都需要安全的屋頂。',
    ink: 470, seconds: 10, targets: [bunny(207, 268), bunny(517, 458)], hives: [hive(590, 105), hive(105, 120)],
    terrain: [block(155, 300, 105, 300), block(465, 490, 105, 110)],
    solution: [line([170, 299], [170, 225], [244, 225], [244, 299]), line([480, 489], [480, 415], [554, 415], [554, 489])],
  },
  {
    id: 9, name: '最後一小段', tag: '細心觀察',
    tip: '這間小屋快完成了，找出唯一的缺口吧。',
    ink: 108, seconds: 10, targets: [bunny(360, 462)], hives: [hive(360, 118)],
    terrain: [block(220, 500, 280, 100), block(220, 350, 28, 150), block(472, 350, 28, 150), block(220, 350, 95, 26), block(405, 350, 95, 26)],
    solution: [line([315, 349], [405, 349])],
  },
  {
    id: 10, name: '左右兩扇門', tag: '別忘側邊',
    tip: '屋頂已經蓋好了，守住左右兩邊的入口。',
    ink: 145, seconds: 10, targets: [bunny(360, 347)], hives: [hive(100, 345), hive(620, 345)],
    terrain: [block(255, 275, 210, 26), block(255, 395, 210, 26), block(255, 275, 26, 40), block(255, 375, 26, 46), block(439, 275, 26, 40), block(439, 375, 26, 46)],
    solution: [line([255, 315], [255, 375]), line([465, 315], [465, 375])],
  },
  {
    id: 11, name: '同一個屋簷', tag: '共享小窩',
    tip: '一個寬寬的小窩，就能保護兩位好朋友。',
    ink: 430, seconds: 10, targets: [bunny(287, 418), bunny(433, 418)], hives: [hive(160, 150), hive(560, 150)],
    terrain: [block(230, 453, 260, 147), block(345, 270, 30, 80)],
    solution: [line([240, 452], [240, 370], [480, 370], [480, 452])],
  },
  {
    id: 12, name: '草地的邊邊', tag: '換個方向',
    tip: '草地邊界也是一道牆，只要封好側邊開口。',
    ink: 125, seconds: 10, targets: [bunny(622, 350)], hives: [hive(90, 340)],
    terrain: [block(515, 270, 205, 30), block(515, 404, 205, 30)],
    solution: [line([515, 300], [515, 404])],
  },
  {
    id: 13, name: '繞遠路回家', tag: '蜜蜂會繞路',
    tip: '蜜蜂會繞過大石牆，別忘了補好另一邊的小窩。',
    ink: 220, seconds: 12, targets: [bunny(540, 457)], hives: [hive(140, 140)],
    terrain: [block(300, 0, 32, 410), block(460, 492, 150, 108), block(600, 370, 120, 230)],
    solution: [line([495, 492], [495, 409], [600, 409])],
  },
  {
    id: 14, name: '熱鬧的午後', tag: '三座蜂巢',
    tip: '只要防線沒有缺口，再多蜜蜂也不怕。',
    ink: 265, seconds: 11, beeCount: 9, targets: [bunny(360, 433)], hives: [hive(125, 115), hive(595, 115), hive(360, 80)],
    terrain: [block(280, 468, 160, 132), block(105, 290, 105, 45), block(510, 290, 105, 45)],
    solution: [line([318, 467], [318, 386], [402, 386], [402, 467])],
  },
  {
    id: 15, name: '雙胞胎小窩', tag: '省墨水挑戰',
    tip: '墨水剛好夠畫兩個屋頂，每個開口都要封好。',
    ink: 230, seconds: 11, beeCount: 8, targets: [bunny(224, 434), bunny(496, 434)], hives: [hive(130, 120), hive(360, 120), hive(590, 120)],
    terrain: [block(145, 470, 158, 130), block(417, 470, 158, 130), block(145, 360, 26, 110), block(277, 360, 26, 110), block(417, 360, 26, 110), block(549, 360, 26, 110), block(347, 265, 26, 335)],
    solution: [line([171, 359], [277, 359]), line([443, 359], [549, 359])],
  },
  {
    id: 16, name: '守護整片草地', tag: '最後的挑戰',
    tip: '兩隻兔子、三座蜂巢，最後一次仔細畫好防線。你可以的！',
    ink: 550, seconds: 12, beeCount: 10, speed: 120, targets: [bunny(205, 452), bunny(515, 452)], hives: [hive(100, 90), hive(360, 115), hive(620, 90)],
    terrain: [block(145, 488, 120, 112), block(455, 488, 120, 112), block(320, 300, 80, 300)],
    solution: [line([162, 487], [162, 399], [248, 399], [248, 487]), line([472, 487], [472, 399], [558, 399], [558, 487])],
  },
];

export default levels;
