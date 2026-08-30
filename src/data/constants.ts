/**
 * 全局常量与基础类型。
 *
 * DEPT_ORDER 承担两个职责，务必留意：
 *   1. 四个部门的规范遍历顺序（雷达图轴序、分数表键序）；
 *   2. 并列决胜的**最终**回退顺序 —— 题目文档指定为 dev > sec > ops > pr。
 * 改动它的顺序会同时改变结果判定，不要随手调整。
 */
export const DEPT_ORDER = ['dev', 'sec', 'ops', 'pr'] as const

export type DeptId = (typeof DEPT_ORDER)[number]

/** 主推部门权重。每题恰有一个选项主推某部门。 */
export const PRIMARY_WEIGHT = 3

/** 副推部门权重。 */
export const SECONDARY_WEIGHT = 1

/** 四部门得分表。用 Record 保证雷达四轴永不缺项。 */
export type Scores = Record<DeptId, number>

/** 归一化后的四部门占比，取值 0～1。 */
export type NormalizedScores = Record<DeptId, number>

/**
 * 人格特质轴序。与 DEPT_ORDER 不同，它**不参与任何判定**，只决定
 * 雷达轴序、分数表键序与并列时的取首顺序。详见 docs/特质体系.md §2。
 */
export const TRAIT_ORDER = ['explore', 'insight', 'create', 'guard', 'connect'] as const

export type TraitId = (typeof TRAIT_ORDER)[number]

/** 特质得分表。 */
export type TraitScores = Record<TraitId, number>

/** 归一化后的特质占比，取值 0～1。 */
export type NormalizedTraitScores = Record<TraitId, number>

/**
 * 单个选项的 trait 权重预算：四个选项对画像的总影响力必须相等，
 * 否则写得更饱满的选项会顺带拿到更高的画像分。见 docs/特质体系.md §4.1。
 */
export const OPTION_TRAIT_BUDGET = 3

/** 单个 trait 权重的取值范围（含端点）。 */
export const TRAIT_WEIGHT_MIN = 1
export const TRAIT_WEIGHT_MAX = 3
