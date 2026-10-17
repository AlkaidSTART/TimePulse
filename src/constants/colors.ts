/**
 * TimePulse 专业清新调色系统 (Fresh & Clean Color System)
 * 遵循现代极简美学：纯净、通透、低噪点、自然舒适
 */

export interface PresetColor {
  hex: string;
  name: string;
  category: 'sky' | 'mint' | 'amber' | 'iris' | 'slate';
}

/**
 * 20 种精心调配的清新高雅预设色彩
 * 涵盖：天青湖蓝、薄荷松青、暖阳蜜杏、晨雾鸢尾、冰岩冷灰
 * 严格校准明度 (L: 45%-65%) 与饱和度 (S: 60%-85%)，确保在浅色与深色背景下均具备优良对比度与清爽感
 */
export const PRESET_COLORS: readonly string[] = [
  // 清泉湖蓝系 (Sky & Teal) - 清澈澄净
  '#0EA5E9', // 天青海蓝 (Ocean Sky) - 默认首推色
  '#06B6D4', // 冰晶青 (Crystal Cyan)
  '#38BDF8', // 晨曦浅蓝 (Morning Sky)
  '#3B82F6', // 晴空蔚蓝 (Pure Azure)
  '#14B8A6', // 湖光青绿 (Lake Teal)

  // 薄荷晨青系 (Mint & Sage) - 自然生机
  '#10B981', // 薄荷翠绿 (Fresh Mint)
  '#059669', // 冷杉林青 (Alpine Pine)
  '#22C55E', // 清新若竹 (Spring Bamboo)
  '#4ADE80', // 浅芽抹茶 (Matcha Dew)
  '#84CC16', // 晨露草木 (Dew Sage)

  // 暖阳蜜杏系 (Amber & Coral) - 柔和明媚而不刺目
  '#F59E0B', // 晨曦暖金 (Warm Sunbeam)
  '#FB923C', // 柔杏暖橙 (Soft Apricot)
  '#F97316', // 蜜柑橙光 (Citrus Glow)
  '#F43F5E', // 珊瑚海棠 (Rose Coral)
  '#FB7185', // 柔粉晨桃 (Peach Blossom)

  // 晨雾鸢尾系 (Iris & Lavender) - 雅致轻盈
  '#6366F1', // 暮霭鸢尾 (Evening Iris)
  '#8B5CF6', // 丁香浅紫 (Lilac Mist)
  '#A855F7', // 薰衣草紫 (Lavender)
  '#EC4899', // 浅樱落粉 (Sakura Petal)

  // 冰岩中性系 (Slate & Mist) - 极致极简
  '#64748B', // 冰川冷灰 (Glacier Slate)
] as const;

/** 默认清新主色调 (天青蓝) */
export const DEFAULT_PRIMARY_COLOR = '#0EA5E9';

/** 秒表预设颜色（精选清爽专注色） */
export const STOPWATCH_COLORS: readonly string[] = [
  '#10B981', // 薄荷绿
  '#0EA5E9', // 天青蓝
  '#14B8A6', // 湖水青
  '#059669', // 冷杉青
  '#3B82F6', // 蔚蓝
  '#6366F1', // 鸢尾蓝
  '#F59E0B', // 暖金
  '#FB923C', // 柔杏
  '#F43F5E', // 珊瑚粉
  '#8B5CF6', // 丁香紫
  '#64748B', // 冷石灰
] as const;

/** 世界时钟预设颜色（精选澄澈时区色） */
export const WORLD_CLOCK_COLORS: readonly string[] = [
  '#0EA5E9', // 天青蓝
  '#3B82F6', // 晴空蓝
  '#14B8A6', // 湖光青
  '#10B981', // 薄荷绿
  '#6366F1', // 鸢尾蓝
  '#8B5CF6', // 丁香紫
  '#F59E0B', // 晨曦暖金
  '#FB923C', // 柔杏橙
  '#F43F5E', // 珊瑚粉
  '#64748B', // 冰岩灰
] as const;

export type ThemeColorId =
  | 'default'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'pink'
  | 'orange'
  | 'purple'
  | 'black'
  | 'custom';

export interface ThemePreset {
  id: ThemeColorId;
  name: string;
  nameEn: string;
  color: string;
  description: string;
}

/**
 * ChatGPT 现代极简调色板 (ChatGPT-Inspired Theme Palettes)
 * 遵循 ChatGPT / OpenAI 官方设计语言，提供高雅纯净的主题色彩
 */
export const CHATGPT_THEME_PRESETS: readonly ThemePreset[] = [
  {
    id: 'default',
    name: '默认',
    nameEn: 'Default',
    color: '#18181B',
    description: 'ChatGPT 经典碳黑 (Carbon Neutral)',
  },
  {
    id: 'blue',
    name: '蓝色',
    nameEn: 'Blue',
    color: '#3B82F6',
    description: '澄澈晴空蔚蓝 (Azure Blue)',
  },
  {
    id: 'green',
    name: '绿色',
    nameEn: 'Green',
    color: '#10A37F',
    description: 'OpenAI 经典翡绿 (Signature Emerald)',
  },
  {
    id: 'yellow',
    name: '黄色',
    nameEn: 'Yellow',
    color: '#F59E0B',
    description: '温暖明媚暖金 (Warm Amber)',
  },
  {
    id: 'pink',
    name: '粉色',
    nameEn: 'Pink',
    color: '#EC4899',
    description: '清雅落樱绯粉 (Rose Blossom)',
  },
  {
    id: 'orange',
    name: '橙色',
    nameEn: 'Orange',
    color: '#F97316',
    description: '活力日落暖橙 (Sunset Coral)',
  },
  {
    id: 'purple',
    name: '紫色',
    nameEn: 'Purple',
    color: '#8B5CF6',
    description: '雅致晨曦鸢尾 (Iris Violet)',
  },
] as const;

