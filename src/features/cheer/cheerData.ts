import type { CheerStyle } from '@/stores/usePersonalSettingsStore';

export interface TimeSlotConfig {
  id: 'early_morning' | 'morning' | 'noon' | 'afternoon' | 'evening' | 'night' | 'late_night';
  name: string;
  timeRange: string;
  icon: string;
  greetingTitle: string;
  defaultMessage: string;
  messages: Record<CheerStyle, string[]>;
  careTip: string;
  bgGradient: string;
  accentBadge: string;
}

export const TIME_SLOTS: TimeSlotConfig[] = [
  {
    id: 'early_morning',
    name: '清晨',
    timeRange: '05:00 - 08:59',
    icon: '',
    greetingTitle: '早上好呀，新的一天开始啦',
    defaultMessage: '早上好呀，今天也是元气满满的一天，清晨的阳光正好，出发吧！',
    messages: {
      energetic: [
        '早上好呀，今天也是元气满满的一天，清晨的阳光正好，出发吧！',
        '早安！新的一天就像未拆封的礼物，充满无限惊喜与可能！',
        '晨光熹微，斗志满满！今天也要竭尽全力，闪闪发光哦！',
        '太阳升起，希望也在升起！带着灿烂微笑，去创造美好吧！',
      ],
      warm: [
        '早安，昨晚睡得香甜吗？喝杯温水，慢慢开启温柔从容的一天。',
        '愿清晨的第一缕微风带走所有倦意，今天也是被温柔眷顾的一天。',
        '每一个清晨，都是生活送给你的全新画卷，请随心描绘绚烂。',
      ],
      poetic: [
        '山川温柔，晨光破晓。愿你今天眼里有光，胸中有丘壑。',
        '清风拂面，朝霞满天。行而不辍，未来可期。',
      ],
      funny: [
        '早安打工人！被窝虽好，但美味的早餐和梦想都在前方等你呢！',
        '太阳公公都打卡上班啦，伸个大大的懒腰，今天又是称霸全场的一天！',
      ],
    },
    careTip: '清晨空腹喝一杯温开水，唤醒肠胃与身体新陈代谢哦。',
    bgGradient: 'from-amber-500/10 via-orange-500/5 to-transparent',
    accentBadge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  {
    id: 'morning',
    name: '上午',
    timeRange: '09:00 - 11:59',
    icon: '',
    greetingTitle: '上午好呀，专注前行的你闪闪发光',
    defaultMessage: '上午好呀，专注当下的每一刻，收获满满的成就感！保持热爱，奔赴山海！',
    messages: {
      energetic: [
        '上午好呀！状态拉满，攻坚克难，今天的效率值爆表！',
        '专注就是最强大的超能力，稳扎稳打，每一个小目标都近在咫尺！',
        '保持热爱，奔赴山海！每一步微小的努力都在累积奇迹！',
      ],
      warm: [
        '专注的同时别忘了深呼吸，累了就抬头看看窗外的天空。',
        '你所付出的每一分努力，时光都会在未来的某一天悄悄馈赠于你。',
        '不慌不忙，心有定力，按照你自己的节奏稳步前进就很美。',
      ],
      poetic: [
        '于无声处听惊雷，在专注中见天地。静下心来，自生欢喜。',
        '行至半山不停步，长风破浪会有时。',
      ],
      funny: [
        '脑细胞正在高速运转中！如果卡壳了，吃颗薄荷糖或者摸两分钟鱼放松一下吧~',
        '今天的你比昨天的你更有智慧，连头发丝都在散发着专业的光芒！',
      ],
    },
    careTip: '保持挺拔坐姿，每隔45分钟起身活动下肩颈、喝口水哦。',
    bgGradient: 'from-sky-500/10 via-blue-500/5 to-transparent',
    accentBadge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  },
  {
    id: 'noon',
    name: '中午',
    timeRange: '12:00 - 13:59',
    icon: '',
    greetingTitle: '中午好呀，吃饱了吗？',
    defaultMessage: '中午好呀，吃饱了吗？好好享用一顿美味的午餐，给自己充充电！',
    messages: {
      energetic: [
        '中午好呀，吃饱了吗？给身体充满电，下午继续元气冲刺！',
        '干饭时间到！吃饱喝足，下午才能能量满格、所向披靡！',
        '大吃一顿，能量加倍！下午的胜利已经在向你招手！',
      ],
      warm: [
        '中午好呀，吃饱了吗？忙碌了一上午，好好享受一顿热气腾腾的美食吧。',
        '放下手中的忙碌，品尝眼前一餐一饭的温度，生活就需要这份踏实。',
        '午间小憩片刻，哪怕闭目养神十五分钟，也会让身心重新焕发活力。',
      ],
      poetic: [
        '人间烟火气，最抚凡人心。一饮一食之间，尽是生活的温存。',
        '浮生偷得半日闲，静候午后清风来。',
      ],
      funny: [
        '干饭不积极，思想有问题！今天中午犒劳自己吃点什么好吃的？',
        '碳水带来快乐，脂肪化作铠甲！吃饱了才有力气思考人生的宏大志向~',
      ],
    },
    careTip: '饭后散步10分钟或闭目养神一会儿，让肠胃和大脑都好好休息。',
    bgGradient: 'from-emerald-500/10 via-teal-500/5 to-transparent',
    accentBadge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'afternoon',
    name: '下午',
    timeRange: '14:00 - 17:59',
    icon: '',
    greetingTitle: '下午好呀，来杯水或咖啡提提神吧',
    defaultMessage: '下午好呀，来杯水或咖啡提提神，打起精神，离目标又近了一大步！',
    messages: {
      energetic: [
        '下午好呀，来杯温水或咖啡提提神，打起精神，离目标又近了一步！',
        '战胜午后困意，你就是最棒的时间掌控者！继续冲锋！',
        '胜利往往就在最关键的那一次坚持里，咬咬牙，今天大获全胜！',
      ],
      warm: [
        '下午茶时间到，给自己泡一杯温润的清茶，感受慢下来的时光。',
        '如果感觉疲惫，不妨停下来闭眼深呼吸30秒，然后再稳步前行。',
        '夕阳不远，终点在望，每一步坚持都是在为自己铺路。',
      ],
      poetic: [
        '斜阳脉脉，草木含香。在忙碌的日子里，亦能寻得一份从容。',
        '时光不语，静待花开。今日之跋涉，皆为明日之盛放。',
      ],
      funny: [
        '哈欠连连？咖啡在召唤你！你的下午战斗灵魂正在等待注入神秘力量~',
        '电量剩余50%，请接入奶茶或零食充电桩继续工作！',
      ],
    },
    careTip: '远眺窗外20秒，放松长时间盯着屏幕的眼部肌肉，伸个懒腰。',
    bgGradient: 'from-orange-500/10 via-amber-500/5 to-transparent',
    accentBadge: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  },
  {
    id: 'evening',
    name: '傍晚',
    timeRange: '18:00 - 19:59',
    icon: '',
    greetingTitle: '傍晚好呀，今天辛苦啦！',
    defaultMessage: '傍晚好呀，晚霞很美，今天辛苦啦！准备放下疲惫，享受美味晚餐吧。',
    messages: {
      energetic: [
        '傍晚好呀，今天辛苦啦！今日份成就已达成，为努力奋斗的自己热烈鼓掌！',
        '收工时刻！告别白天的奋战，切换到欢快自由的生活模式！',
      ],
      warm: [
        '傍晚好呀，今天辛苦啦！晚霞很温柔，愿一顿暖心的晚饭治愈一天的疲惫。',
        '慢慢走在回家的路上，感受傍晚柔和的晚风，生活的美好就藏在这些平凡片刻中。',
        '今天你已经尽了最大的努力，回到属于你的港湾，好好放松身心吧。',
      ],
      poetic: [
        '落日沉溺于橘色的海，晚风沦陷于赤诚的爱。今晚的天空格外温柔。',
        '暮色四合，灯火璀璨，总有一盏灯为你而留。',
      ],
      funny: [
        '滴！成功通关今天的困难副本！现在开启‘自由自在吃喝玩乐’特别支线！',
        '今天的工作已经被你按在地上摩擦完毕，下班快乐！',
      ],
    },
    careTip: '告别工作状态，深呼吸几次，将注意力切换回自己的生活与健康。',
    bgGradient: 'from-rose-500/10 via-pink-500/5 to-transparent',
    accentBadge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  },
  {
    id: 'night',
    name: '夜晚',
    timeRange: '20:00 - 22:59',
    icon: '',
    greetingTitle: '晚上好呀，享受属于自己的惬意时光',
    defaultMessage: '晚上好呀，放下白天的忙碌，听听喜欢的歌，好好宠爱自己。',
    messages: {
      energetic: [
        '晚上好！复盘今日、规划明日，有条不紊的生活会给你源源不断的安全感！',
        '做点自己由衷热爱的事情，哪怕只是看一集纪录片，都是灵魂的充电！',
      ],
      warm: [
        '晚上好呀，放下白天的奔波与纷扰，听听轻音乐，享受内心的宁静与治愈。',
        '今天的你已经做得很棒啦，接纳自己的所有节奏，慢慢来，一切皆是美好安排。',
        '泡个热水澡，敷一片面膜，给疲惫了一天的自己送上最贴心的拥抱。',
      ],
      poetic: [
        '月明如水，星河璀璨。愿你在安静的夜色里，遇见最纯粹、从容的自己。',
        '万籁俱寂，月影依依。今夜无风雨，明朝又是晴。',
      ],
      funny: [
        '晚上不睡，白天崩溃！不过在这之前，先愉快地刷会儿手机不过分吧~',
        '被窝已经准备就绪，舒适度99.9%，只等你跳进去了！',
      ],
    },
    careTip: '睡前1小时调暗屏幕亮度，远离高糖高热量零食，让神经慢慢放松。',
    bgGradient: 'from-indigo-500/10 via-purple-500/5 to-transparent',
    accentBadge: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  },
  {
    id: 'late_night',
    name: '深夜',
    timeRange: '23:00 - 04:59',
    icon: '',
    greetingTitle: '夜深了，早点休息哦',
    defaultMessage: '夜深了，星星都睡了，你也早点休息吧。充足的睡眠是明天活力的来源，晚安好梦！',
    messages: {
      energetic: [
        '夜深了，好好睡一觉，明日满血复活，迎接新的辉煌！晚安！',
        '充足的睡眠也是超级自律的一种体现，为了明天的光芒，现在就入梦吧！',
      ],
      warm: [
        '夜深了，早点休息哦。充足的睡眠是明天活力的来源，晚安好梦！',
        '把所有的焦虑与未完成交给明天，今晚你的唯一任务就是好好睡个好觉。',
        '愿柔和的星光守护你的梦境，卸下所有心防，安心休息吧。',
      ],
      poetic: [
        '银河浩瀚，繁星入梦。愿长夜温柔，伴你安眠，晚安好梦。',
        '夜阑卧听风吹雨，铁马冰河入梦来。把世界关在门外，只留安宁在心头。',
      ],
      funny: [
        '修仙模式电量告急！再不睡，头发就要闹离家出走啦！快乖乖钻进被窝~',
        '黑眼圈正在向你发出好友申请，请立即关闭手机闭上眼睛拒绝它！',
      ],
    },
    careTip: '放下手机，做4-7-8深呼吸练习（吸气4秒，屏息7秒，呼气8秒）帮助快速入眠。',
    bgGradient: 'from-violet-500/10 via-slate-500/5 to-transparent',
    accentBadge: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
  },
];

export interface InspirationalQuote {
  id?: string;
  text: string;
  author: string;
  source?: string;
  category?: string;
}

export const INSPIRATIONAL_QUOTES: InspirationalQuote[] = [
  { text: '生活不在别处，脚下即是前方。心怀浪漫与热烈，把平凡的日子过得热气腾腾。', author: '汪曾祺', source: '人间草木', category: 'life' },
  { text: '行动是治愈恐惧的良药，而犹豫、拖延将不断滋养恐惧。', author: '爱默生', source: '自立', category: 'inspiration' },
  { text: '人生没有白走的路，每一步都算数。你经历的所有波折，都是未来闪光的伏笔。', author: '李宗盛', source: '致匠心', category: 'growth' },
  { text: '愿你历经千帆，归来仍是少年。在时间的河流里，永远保持纯粹与好奇。', author: '苏轼', source: '定风波', category: 'poetry' },
  { text: '不是所有的坚持都有结果，但总有一些坚持，能从冰封的土地里培育出怒放的蔷薇。', author: '纪伯伦', source: '沙与沫', category: 'inspiration' },
  { text: '世界上只有一种真正的英雄主义，那就是认清生活的真相后依然热爱生活。', author: '罗曼·罗兰', source: '米开朗琪罗传', category: 'philosophy' },
  { text: '把每一次日出都当作生命的新序章，带着澄澈的心灵，勇敢前行。', author: '梭罗', source: '瓦尔登湖', category: 'life' },
  { text: '不要等待机会，而要创造机会。你专注当下的每一秒，都在塑造明天的自己。', author: '歌德', source: '浮士德', category: 'growth' },
  { text: '山高自有可行路，海深自有渡人舟。只要心怀向往，全世界都会为你让路。', author: '泰戈尔', source: '飞鸟集', category: 'poetry' },
  { text: '慢慢来，谁不是翻山越岭去相遇；别气馁，好运往往就藏在下一次坚持里。', author: '林清玄', source: '人间有味是清欢', category: 'life' },
  { text: '满地都是六便士，他却抬头看见了月亮。心有所向，平凡亦有光芒。', author: '毛姆', source: '月亮与六便士', category: 'literature' },
  { text: '每一个不曾起舞的日子，都是对生命的辜负。愿你热烈而赤诚。', author: '尼采', source: '查拉图斯特拉如是说', category: 'philosophy' },
  { text: '向着月亮出发，即使不能到达，也能置身于群星之中。', author: '莱斯·布朗', source: '追梦演讲', category: 'inspiration' },
  { text: '去生活，去犯错，去跌倒，去胜利，去用生命重新塑造生命。', author: '詹姆斯·乔伊斯', source: '青年艺术家的肖像', category: 'growth' },
  { text: '在最黑暗的夜里，才能看见最明亮的星光。心怀微光，终至破晓。', author: '马丁·路德·金', source: '力量的源泉', category: 'courage' },
  { text: '你走过的路、看过的风景，都会化作你的底气。心有山海，静而不争。', author: '木心', source: '文学回忆录', category: 'philosophy' },
];

export function getCurrentTimeSlot(date: Date = new Date()): TimeSlotConfig {
  const hour = date.getHours();

  if (hour >= 5 && hour < 9) {
    return TIME_SLOTS[0]; // early_morning
  }
  if (hour >= 9 && hour < 12) {
    return TIME_SLOTS[1]; // morning
  }
  if (hour >= 12 && hour < 14) {
    return TIME_SLOTS[2]; // noon
  }
  if (hour >= 14 && hour < 18) {
    return TIME_SLOTS[3]; // afternoon
  }
  if (hour >= 18 && hour < 20) {
    return TIME_SLOTS[4]; // evening
  }
  if (hour >= 20 && hour < 23) {
    return TIME_SLOTS[5]; // night
  }
  return TIME_SLOTS[6]; // late_night (23:00 - 04:59)
}

export function getGreetingForUser(
  slot: TimeSlotConfig,
  nickname: string,
  style: CheerStyle,
  locale = 'zh-CN'
): string {
  if (locale === 'en-US') {
    const cleanNickname = nickname.trim();
    const namePart = cleanNickname && cleanNickname !== '阳光旅人' ? `, ${cleanNickname}` : '';
    switch (slot.id) {
      case 'early_morning':
        return `Good morning${namePart}! A fresh day begins with unlimited possibilities.`;
      case 'morning':
        return `Good morning${namePart}! Stay focused and keep shining on your journey.`;
      case 'noon':
        return `Good day${namePart}! Enjoy a nutritious lunch and recharge your energy.`;
      case 'afternoon':
        return `Good afternoon${namePart}! Take a short break, breathe deeply, and carry on.`;
      case 'evening':
        return `Good evening${namePart}! You did great today. Unwind and enjoy the dusk.`;
      case 'night':
        return `Good evening${namePart}! Savor the quiet and relaxing night.`;
      case 'late_night':
        return `It is late${namePart}. Get some rest and recharge for tomorrow.`;
      default:
        return `Hello${namePart}! Have a wonderful time.`;
    }
  }

  const list = slot.messages[style] || slot.messages.energetic;
  const baseMessage = list[0] || slot.defaultMessage;
  const cleanNickname = nickname.trim();

  if (!cleanNickname || cleanNickname === '阳光旅人') {
    return baseMessage;
  }

  // 拼接个性昵称
  if (baseMessage.startsWith('早上好呀')) {
    return `${cleanNickname}，早上好呀，${baseMessage.slice(5)}`;
  }
  if (baseMessage.startsWith('中午好呀')) {
    return `${cleanNickname}，中午好呀，${baseMessage.slice(5)}`;
  }
  if (baseMessage.startsWith('下午好呀')) {
    return `${cleanNickname}，下午好呀，${baseMessage.slice(5)}`;
  }
  if (baseMessage.startsWith('傍晚好呀')) {
    return `${cleanNickname}，傍晚好呀，${baseMessage.slice(5)}`;
  }
  if (baseMessage.startsWith('晚上好呀')) {
    return `${cleanNickname}，晚上好呀，${baseMessage.slice(5)}`;
  }
  if (baseMessage.startsWith('夜深了')) {
    return `${cleanNickname}，夜深了，早点休息哦！`;
  }

  return `${cleanNickname}，${baseMessage}`;
}
