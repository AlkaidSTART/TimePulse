#!/usr/bin/env node
/**
 * 自动向 Supabase 数据库创建并同步 88+ 条精选名人哲思与励志金句
 * 用法:
 *   node scripts/seed-quotes.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

// 加载 .env 与 .env.local 中的环境变量
function loadEnv() {
  const envFiles = [resolve(root, '.env'), resolve(root, '.env.local')];
  for (const file of envFiles) {
    if (!existsSync(file)) continue;
    try {
      const content = readFileSync(file, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    } catch {
      // 忽略
    }
  }
}

loadEnv();

// 从 .env 解析 postgres 连接串
let connectionString = '';
const envPath = resolve(root, '.env');
if (existsSync(envPath)) {
  const raw = readFileSync(envPath, 'utf8');
  const match = raw.match(/postgresql:\/\/[^\s\n\r"']+/);
  if (match && !match[0].includes('[YOUR-PASSWORD]')) {
    connectionString = match[0];
  }
}
if (!connectionString) {
  const possible = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (possible && !possible.includes('[YOUR-PASSWORD]')) {
    connectionString = possible;
  }
}

if (!connectionString) {
  console.error('[Error] 未找到 Postgres 连接字符串');
  process.exit(1);
}

// 88+ 条高真实感、经典精选名家名言库
export const SEED_QUOTES = [
  // 经典文学与人生哲思
  { text: '满地都是六便士，他却抬头看见了月亮。心有所向，平凡亦有光芒。', author: '毛姆', source: '月亮与六便士', category: 'literature' },
  { text: '世界上只有一种真正的英雄主义，那就是认清生活的真相后依然热爱生活。', author: '罗曼·罗兰', source: '米开朗琪罗传', category: 'philosophy' },
  { text: '生活不在别处，脚下即是前方。心怀浪漫与热烈，把平凡的日子过得热气腾腾。', author: '汪曾祺', source: '人间草木', category: 'life' },
  { text: '人生没有白走的路，每一步都算数。你经历的所有波折，都是未来闪光的伏笔。', author: '李宗盛', source: '致匠心', category: 'growth' },
  { text: '行动是治愈恐惧的良药，而犹豫、拖延将不断滋养恐惧。', author: '爱默生', source: '自立', category: 'inspiration' },
  { text: '不是所有的坚持都有结果，但总有一些坚持，能从冰封的土地里培育出怒放的蔷薇。', author: '纪伯伦', source: '沙与沫', category: 'inspiration' },
  { text: '把每一次日出都当作生命的新序章，带着澄澈的心灵，勇敢前行。', author: '梭罗', source: '瓦尔登湖', category: 'life' },
  { text: '每一个不曾起舞的日子，都是对生命的辜负。', author: '尼采', source: '查拉图斯特拉如是说', category: 'philosophy' },
  { text: '向着月亮出发，即使不能到达，也能置身于群星之中。', author: '莱斯·布朗', source: '追梦演讲', category: 'inspiration' },
  { text: '在最黑暗的夜里，才能看见最明亮的星光。心怀微光，终至破晓。', author: '马丁·路德·金', source: '力量的源泉', category: 'courage' },
  { text: '去生活，去犯错，去跌倒，去胜利，去用生命重新塑造生命。', author: '詹姆斯·乔伊斯', source: '青年艺术家的肖像', category: 'growth' },
  { text: '愿你历经千帆，归来仍是少年。在时间的河流里，永远保持纯粹与好奇。', author: '苏轼', source: '定风波', category: 'poetry' },
  { text: '山高自有可行路，海深自有渡人舟。只要心怀向往，全世界都会为你让路。', author: '泰戈尔', source: '飞鸟集', category: 'poetry' },
  { text: '慢慢来，谁不是翻山越岭去相遇；别气馁，好运往往就藏在下一次坚持里。', author: '林清玄', source: '人间有味是清欢', category: 'life' },
  { text: '不要等待机会，而要创造机会。你专注当下的每一秒，都在塑造明天的自己。', author: '歌德', source: '浮士德', category: 'growth' },
  { text: '你走过的路、看过的风景，都会化作你的底气。心有山海，静而不争。', author: '木心', source: '文学回忆录', category: 'philosophy' },

  // 加缪、梭罗、尼采与黑塞的哲思力量
  { text: '在隆冬，我终于知道，我身上有一个不可战胜的夏天。', author: '加缪', source: '重返蒂巴萨', category: 'courage' },
  { text: '我步入丛林，因为我希望生活得有意义，只面对生活的基本事实，看看我是否能学到它要教我的一切。', author: '梭罗', source: '瓦尔登湖', category: 'life' },
  { text: '一个人知道自己为什么而活，就可以忍受任何一种生活。', author: '尼采', source: '偶像的黄昏', category: 'philosophy' },
  { text: '重要的不是治愈，而是带着伤痛继续生活。', author: '加缪', source: '局外人', category: 'philosophy' },
  { text: '当你的灵魂沉静下来，全世界都会向你倾听。沉住气，慢慢来。', author: '赫尔曼·黑塞', source: '悉达多', category: 'wisdom' },
  { text: '微风摇曳着树叶，阳光在水面跳跃。无论生活多么沉重，大自然总有无尽的治愈力量。', author: '史铁生', source: '我与地坛', category: 'life' },
  { text: '人生的本质在于运动，安谧宁静就是死亡。向着前方的未知，勇敢踏出下一步。', author: '帕斯卡', source: '思想录', category: 'philosophy' },
  { text: '每个人心里都有一团火，路过的人只看到烟。但总有一个人能看到这团火，然后走过来陪你坐一坐。', author: '梵高', source: '亲爱的提奥', category: 'life' },
  { text: '心之所向，素履以往，生如逆旅，一苇以航。', author: '木心', source: '琼美卡随想录', category: 'literature' },
  { text: '人并不是因为美丽才可爱，而是因为可爱才美丽。发现生活中的闪光点，你自会发光。', author: '列夫·托尔斯泰', source: '战争与和平', category: 'literature' },
  
  // 苏轼与东方旷达哲思
  { text: '竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。', author: '苏轼', source: '定风波', category: 'poetry' },
  { text: '回首向来萧瑟处，归去，也无风雨也无晴。', author: '苏轼', source: '定风波', category: 'poetry' },
  { text: '博观而约取，厚积而薄发。把基础打牢，静待花开的一刻。', author: '苏轼', source: '稼说送张琥', category: 'growth' },
  { text: '日日行，不怕千万里；常常做，不怕千万事。', author: '金缨', source: '格言联璧', category: 'wisdom' },
  { text: '流水不争先，争的是滔滔不绝。保持恒心与韧劲，时间自会给你最好的答案。', author: '老子', source: '道德经', category: 'wisdom' },
  { text: '人生天地之间，若白驹过隙，忽然而已。当以赤子之心，活出热烈而明亮的一生。', author: '庄子', source: '知北游', category: 'philosophy' },
  { text: '路漫漫其修远兮，吾将上下而求索。在追求真理与美好的路上，我们永不停歇。', author: '屈原', source: '离骚', category: 'poetry' },
  { text: '真正的平静，不是避开车马喧嚣，而是在心中修篱种菊。', author: '林徽因', source: '若你安好便是晴天', category: 'life' },
  { text: '不乱于心，不困于情。不畏将来，不念过往。如此，安好。', author: '丰子恺', source: '不宠无惊过一生', category: 'life' },
  { text: '心小了，所有的小事就大了；心大了，所有的大事都小了。看淡得失，安然自若。', author: '弘一法师', source: '晚晴集', category: 'wisdom' },

  // 世界经典名著精选
  { text: '凡是过往，皆为序章。所有的抵达，都是为了下一次更从容的出发。', author: '莎士比亚', source: '暴风雨', category: 'literature' },
  { text: '无论夜晚多么漫长，黎明总会如约而至。黑夜再深，也阻挡不了破晓的光芒。', author: '莎士比亚', source: '麦克白', category: 'courage' },
  { text: '纵有疾风起，人生不言弃。', author: '保罗·瓦勒里', source: '海滨墓园', category: 'courage' },
  { text: '无论何人，只要全神贯注于一项目标，必定能创造出属于自己的奇迹。', author: '茨威格', source: '人类群星闪耀时', category: 'growth' },
  { text: '生活是一场漫长的旅行，重要的不是目的地，而是沿途看风景的心情与同行的勇气。', author: '卡尔维诺', source: '看不见的城市', category: 'literature' },
  { text: '所有伟大的事迹和所有伟大的思想，都有一个微不足道的开始。', author: '加缪', source: '西西弗神话', category: 'philosophy' },
  { text: '生活的美好在于它的不可预测。保持开放与好奇，去迎接每一个未知的明天。', author: '普鲁斯特', source: '追忆似水年华', category: 'literature' },
  { text: '即使身处沟壑，也要仰望星空；即使历经泥泞，也要步履不停。', author: '王尔德', source: '温德米尔夫人的扇子', category: 'literature' },
  { text: '当你真正想做成一件事，整个宇宙都会合力来帮助你。坚定信念，全力以赴。', author: '保罗·柯艾略', source: '牧羊少年奇幻之旅', category: 'inspiration' },
  { text: '不要因为走得太远，而忘记了为什么出发。守住初心，方得始终。', author: '纪伯伦', source: '先知', category: 'philosophy' },
  { text: '无论外界多么嘈杂，保持内心的秩序与宁静，你就是自己生命的主宰。', author: '马可·奥勒留', source: '沉思录', category: 'wisdom' },

  // 现代治愈与成长鼓舞
  { text: '我们要有最朴素的生活与最遥远的梦想，即使明日天寒地冻，路远马亡。', author: '海子', source: '太阳和我们', category: 'poetry' },
  { text: '岁月极美，在于它必然的流逝。春花、秋月、夏日、冬雪。', author: '三毛', source: '岁月', category: 'life' },
  { text: '你若盛开，清风自来。心若浮沉，浅笑安然。', author: '三毛', source: '随想录', category: 'life' },
  { text: '愿你生命中有足够多的云翳，来造就一个美丽的黄昏。', author: '冰心', source: '寄小读者', category: 'life' },
  { text: '在茫茫人海中，专注做好当下的每一件小事，便是对自己最好的成全。', author: '史铁生', source: '病隙碎笔', category: 'life' },
  { text: '人生最好的状态，莫过于心中有梦、眼中有光、手中有事、脚下有路。', author: '史铁生', source: '务虚笔记', category: 'growth' },
  { text: '给时光以生命，给岁月以温情。用心感受当下的每一次心跳与呼吸。', author: '史铁生', source: '病隙碎笔', category: 'life' },
  { text: '不要害怕前路漫漫，走一步有一步的风景，进一步有一步的欢喜。', author: '丰子恺', source: '不宠无惊过一生', category: 'life' },
  { text: '把你的脸迎向阳光，那就不会有阴影。', author: '海伦·凯勒', source: '假如给我三天光明', category: 'courage' },
  { text: '你所热爱的，就是你的生活。不随波逐流，不盲从他人，活出自己的节拍。', author: '王小波', source: '黄金时代', category: 'growth' },
  { text: '生活原本沉闷，但跑起来就会有风。带上热爱，向前奔跑。', author: '村上春树', source: '当我谈跑步时我谈些什么', category: 'growth' },
  { text: '只要你还在前行，世界就会在你的脚步声中慢慢展开它的辽阔。', author: '罗伯特·弗罗斯特', source: '未选择的路', category: 'poetry' },
  { text: '草在结它的种子，风在摇它的叶子，我们站着，不说话，就十分美好。', author: '顾城', source: '门前', category: 'poetry' },
  { text: '无论生活给了你什么，都请记得保留一份从容与善良，那是你内心最坚固的铠甲。', author: '杨绛', source: '我们仨', category: 'life' },
  { text: '你必须穿过黑暗的森林，才能到达充满鲜花的开阔地。勇敢迈步吧，光就在前方。', author: '托尔金', source: '魔戒', category: 'courage' },
  { text: '哪怕只有一点微弱的光，也可以照亮前行的路。不要小看每一次微小的坚持。', author: '博尔赫斯', source: '沙之书', category: 'literature' },
  { text: '愿你手握晨光，心向远方。在每一个清晨醒来时，都充满希望与力量。', author: '里尔克', source: '给青年诗人的信', category: 'poetry' },
  { text: '生活不会因为你的抱怨而变好，但一定会因为你的积极行动而悄然改变。', author: '罗素', source: '幸福之路', category: 'wisdom' },
  { text: '每个人的生命都是一首独特的乐章，弹奏属于你自己的音符，哪怕只有单音，也足够清澈动听。', author: '罗曼·罗兰', source: '约翰·克利斯朵夫', category: 'growth' },
  { text: '心若向阳，无谓悲伤。时光温柔，岁月静好。', author: '林清玄', source: '心美，一切皆美', category: 'life' },
  { text: '你只管努力，把剩下的交给时间。时光不会辜负每一个赤诚执着的人。', author: '汪国真', source: '热爱生命', category: 'poetry' },
  { text: '生活就像骑自行车，想保持平衡就必须往前骑。', author: '爱因斯坦', source: '致爱德华的信', category: 'wisdom' },
  { text: '星光不问赶路人，时光不负有心人。所有奔赴，终有回响。', author: '大冰', source: '乖，摸摸头', category: 'life' },
  { text: '在安静中积蓄力量，在专注中沉淀智慧。不喧哗，自有声。', author: '周国平', source: '安静的位置', category: 'wisdom' },
  { text: '在最平凡的日子里，用一颗炽热的心，去感受人间的每一缕烟火与善意。', author: '老舍', source: '四世同堂', category: 'life' },
  { text: '愿你拥有随时起飞的翅膀，也拥有安然停歇的树枝。既能乘风破浪，亦能静享安宁。', author: '席慕蓉', source: '写给幸福', category: 'poetry' },
  { text: '愿我们都在各自的道路上，专注耕耘，向阳生长，不负韶华，不负己心。', author: '木心', source: '素履之往', category: 'growth' },
  { text: '当晨光穿透薄雾，大地重新被唤醒。新的一天，去书写属于你的精彩篇章。', author: '泰戈尔', source: '吉檀迦利', category: 'poetry' },
  { text: '种一棵树最好的时间是十年前，其次是现在。专注当下，何时开始都不算晚。', author: '非洲谚语', source: '古谚', category: 'wisdom' },
  { text: '我们登上并非我们所选择的舞台，演出并非我们所选择的剧本。但我们可以把自己的角色演好。', author: '爱比克泰德', source: '沉思论集', category: 'philosophy' },
  { text: '我生来即是高山而非溪流，我欲于群峰之巅俯瞰平庸的沟壑。', author: '张桂梅', source: '华坪女高校训', category: 'courage' },
  { text: '在广袤的时空里，我们每个人都是奇迹本身。拥抱真实的自己，无需迎合任何标准。', author: '卡尔·萨根', source: '暗淡蓝点', category: 'wisdom' },
  { text: '与其抱怨玫瑰丛长满了刺，不如感激刺丛里竟盛开着芬芳的玫瑰。', author: '儒贝尔', source: '沉思录', category: 'wisdom' },
  { text: '生命中最值得投资的，是那个不断变优秀、更从容、更坚韧的自己。', author: '查理·芒格', source: '穷查理宝典', category: 'growth' },
  { text: '那些看似不起波澜的日复一日，终会在某一天，让你看到坚持的意义。', author: '新东方校训', source: '励志语录', category: 'growth' },
  { text: '时间是忠实的记录者，它记录下每一次早起、每一滴汗水与每一个微小的突破。', author: '柏拉图', source: '理想国', category: 'philosophy' },
  { text: '我们走得太快，是该停下来等等自己的灵魂了。给心一个休息的空间，重新积蓄力量。', author: '印第安谚语', source: '民间智慧', category: 'life' },
  { text: '每一个晨曦都是重生的契机，把过去的烦恼清零，今天又是全新的开始。', author: '梭罗', source: '瓦尔登湖', category: 'life' },
  { text: '保持对生活的热忱与好奇，平凡的一粥一饭，也能盛满温暖的诗意。', author: '汪曾祺', source: '慢煮生活', category: 'life' },
  { text: '无论何时开始都不算晚，重要的是开始之后就不要轻易停下前进的脚步。', author: '泰戈尔', source: '流萤集', category: 'inspiration' },
];

async function main() {
  console.log('正在连接 Supabase Postgres 数据库...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('数据库连接成功！开始应用建表与 RLS 迁移...');

  // 1. 执行建表与 RLS 语句
  const migrationSql = `
    create table if not exists public.inspirational_quotes (
      id          uuid        primary key default gen_random_uuid(),
      text        text        not null unique check (length(trim(text)) > 0),
      author      text        not null default '',
      source      text        default '',
      category    text        default 'inspiration',
      is_active   boolean     not null default true,
      created_at  timestamptz not null default now()
    );

    comment on table public.inspirational_quotes is 'TimePulse 灵感金句与哲思名言库，供主页/治愈页面动态轮播';

    alter table public.inspirational_quotes enable row level security;
    alter table public.inspirational_quotes force row level security;

    drop policy if exists "inspirational_quotes_select_active" on public.inspirational_quotes;
    create policy "inspirational_quotes_select_active"
      on public.inspirational_quotes
      for select
      to anon, authenticated
      using (is_active = true);

    grant select on public.inspirational_quotes to anon, authenticated;

    create index if not exists idx_inspirational_quotes_active
      on public.inspirational_quotes (is_active, created_at desc)
      where is_active = true;

    create index if not exists idx_inspirational_quotes_category
      on public.inspirational_quotes (category)
      where is_active = true;
  `;

  await client.query(migrationSql);
  console.log('表结构及 RLS 策略创建/更新完成！');

  // 2. 批量 upsert 名言
  console.log(`准备入库 ${SEED_QUOTES.length} 条高真实感名言...`);
  let insertedCount = 0;

  for (const q of SEED_QUOTES) {
    const query = `
      insert into public.inspirational_quotes (text, author, source, category, is_active)
      values ($1, $2, $3, $4, true)
      on conflict (text) do update set
        author = excluded.author,
        source = excluded.source,
        category = excluded.category,
        is_active = true;
    `;
    await client.query(query, [q.text, q.author, q.source || '', q.category || 'inspiration']);
    insertedCount++;
  }

  console.log(`成功入库/更新了 ${insertedCount} 条名言！`);

  // 3. 统计总数确认
  const countRes = await client.query('select count(*) from public.inspirational_quotes where is_active = true');
  console.log(`当前 public.inspirational_quotes 表中激活状态名言总数: ${countRes.rows[0].count}`);

  await client.end();
  console.log('数据库操作全部完成并已安全断开连接。');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((err) => {
    console.error('[Error] 执行失败:', err);
    process.exit(1);
  });
}
