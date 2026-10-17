/**
 * 待办事项与检查清单的优先级色彩预设系统
 * 融合清新纯净调色与 GTD 敏捷优先级原则
 */

import type { PriorityLevel } from '../types';
export type { PriorityLevel };

export interface PriorityPreset {
  id: string;
  level: PriorityLevel;
  code: string; // P1, P2...
  name: string;
  nameEn: string;
  label: string;
  labelEn: string;
  color: string;
  weight: number; // 排序权重：1 最高，数字越小优先级越高
  bgLight: string;
  borderLight: string;
}

export const PRIORITY_COLOR_PRESETS: readonly PriorityPreset[] = [
  {
    id: 'p1_urgent',
    level: 'urgent',
    code: 'P1',
    name: '最高优先 (P1)',
    nameEn: 'Highest (P1)',
    label: '紧急重要',
    labelEn: 'Urgent & Critical',
    color: '#EF4444', // 珊瑚绯红
    weight: 1,
    bgLight: 'rgba(239, 68, 68, 0.12)',
    borderLight: 'rgba(239, 68, 68, 0.3)',
  },
  {
    id: 'p2_high',
    level: 'high',
    code: 'P2',
    name: '高优先级 (P2)',
    nameEn: 'High (P2)',
    label: '重要关注',
    labelEn: 'High Priority',
    color: '#F97316', // 暖阳暖橙
    weight: 2,
    bgLight: 'rgba(249, 115, 22, 0.12)',
    borderLight: 'rgba(249, 115, 22, 0.3)',
  },
  {
    id: 'p3_medium',
    level: 'medium',
    code: 'P3',
    name: '中优先级 (P3)',
    nameEn: 'Medium (P3)',
    label: '按序推进',
    labelEn: 'Medium Priority',
    color: '#F59E0B', // 晨曦暖金
    weight: 3,
    bgLight: 'rgba(245, 158, 11, 0.12)',
    borderLight: 'rgba(245, 158, 11, 0.3)',
  },
  {
    id: 'p4_low',
    level: 'low',
    code: 'P4',
    name: '普通次要 (P4)',
    nameEn: 'Low (P4)',
    label: '常规备选',
    labelEn: 'Low Priority',
    color: '#10B981', // 薄荷翠绿
    weight: 4,
    bgLight: 'rgba(16, 185, 129, 0.12)',
    borderLight: 'rgba(16, 185, 129, 0.3)',
  },
  {
    id: 'p5_focus',
    level: 'focus',
    code: 'P5',
    name: '专注聚焦 (P5)',
    nameEn: 'Focus (P5)',
    label: '本轮核心',
    labelEn: 'In Focus',
    color: '#0EA5E9', // 澄澈天青
    weight: 5,
    bgLight: 'rgba(14, 165, 233, 0.12)',
    borderLight: 'rgba(14, 165, 233, 0.3)',
  },
  {
    id: 'p6_idea',
    level: 'idea',
    code: 'P6',
    name: '灵感备忘 (P6)',
    nameEn: 'Idea (P6)',
    label: '灵感待定',
    labelEn: 'Idea / Backlog',
    color: '#8B5CF6', // 暮霭浅紫
    weight: 6,
    bgLight: 'rgba(139, 92, 246, 0.12)',
    borderLight: 'rgba(139, 92, 246, 0.3)',
  },
];

/**
 * 根据颜色或优先级等级查找对应的预设信息
 */
export function findPriorityPreset(color?: string, priority?: string): PriorityPreset | undefined {
  if (!color && !priority) return undefined;
  return PRIORITY_COLOR_PRESETS.find(
    (p) =>
      (color && p.color.toLowerCase() === color.toLowerCase()) ||
      (priority && p.level === priority) ||
      (priority && p.code.toLowerCase() === priority.toLowerCase()),
  );
}

/**
 * 快速获取优先级排序权重 (1 ~ 6，无标记为 99)
 */
export function getPriorityWeight(color?: string, priority?: string): number {
  const preset = findPriorityPreset(color, priority);
  if (preset) return preset.weight;
  // 如果是自定义设置了颜色但不在预设中，给予介于中间的权重 7
  if (color) return 7;
  return 99;
}
