import type { Department } from '../data/departments'

interface DeptCardProps {
  dept: Department
  className?: string
}

/**
 * 部门立绘卡片。
 *
 * 立绘是带 alpha 的 die-cut 贴纸（已核实 VP8X alpha 位为 1），
 * 所以直接压在夜底 + 部门色辉光上 —— 白色刀模描边在暗底上会「发光」，
 * 正是贴纸想要的效果。
 *
 * 这个组件将来会被分享卡复用，所以尺寸交给外部用 className 控制。
 */
export function DeptCard({ dept, className = '' }: DeptCardProps) {
  return (
    <div className={`relative ${className}`}>
      {/* 部门色辉光背衬 */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full blur-2xl"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgb(var(--dept-glow) / 0.42), transparent 68%)',
        }}
      />
      {/* 光环 */}
      <div
        aria-hidden="true"
        className="absolute inset-[8%] rounded-full border"
        style={{ borderColor: 'rgb(var(--dept-glow) / 0.28)' }}
      />
      <img
        src={dept.image}
        alt={`${dept.name}形象`}
        width={600}
        height={600}
        loading="eager"
        decoding="async"
        className="relative w-full drop-shadow-[0_10px_28px_rgba(0,0,0,0.55)]"
      />
    </div>
  )
}
