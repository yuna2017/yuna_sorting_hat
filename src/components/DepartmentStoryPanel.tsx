import { useState } from 'react'
import type { DeptId } from '../data/constants'
import { DEPARTMENTS } from '../data/departments'
import { DEPARTMENT_STORIES } from '../data/departmentStories'

interface DepartmentStoryPanelProps {
  department: DeptId
}

export function DepartmentStoryPanel({ department }: DepartmentStoryPanelProps) {
  const stories = DEPARTMENT_STORIES[department]
  const dept = DEPARTMENTS[department]
  const [open, setOpen] = useState(false)
  const [storyIndex, setStoryIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const story = stories[storyIndex]
  const option = story?.options.find((o) => o.id === selected)

  if (!open) {
    return (
      <section className="mt-6 w-full rounded-2xl border border-night-600/70 bg-night-800/40 p-5">
        <h2 className="text-sm tracking-[0.16em] text-parchment-dim">看看你的第一个部门任务</h2>
        <p className="mt-2 text-[0.82rem] leading-relaxed text-parchment-dim/75">
          两个来自{dept.name}工作方式的体验片段。它们不会重新改变你的分部结果。
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 min-h-[2.75rem] w-full rounded-lg border border-gold/45 px-4 text-sm text-gold-soft transition-colors hover:border-gold hover:bg-gold/10"
        >
          开始体验
        </button>
      </section>
    )
  }

  if (story === undefined) return null

  return (
    <section className="mt-6 w-full rounded-2xl border border-night-600/70 bg-night-800/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] tracking-[0.14em] text-gold-soft/75">
            {dept.name}体验 · {storyIndex + 1}/{stories.length}
          </p>
          <h2 className="mt-1 text-base font-medium text-parchment">{story.title}</h2>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 shrink-0 px-2 text-xs text-parchment-dim/65 hover:text-gold-soft">
          跳过
        </button>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-parchment/90">{story.scene}</p>

      <div className="mt-4 flex flex-col gap-2">
        {story.options.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={selected !== null}
            onClick={() => setSelected(item.id)}
            className={`min-h-[2.75rem] rounded-lg border px-3 py-2 text-left text-[0.84rem] leading-relaxed transition-colors ${
              selected === item.id
                ? 'border-gold bg-gold/10 text-gold-soft'
                : 'border-night-500/70 text-parchment/90 hover:border-gold/60 disabled:opacity-55'
            }`}
          >
            {item.text}
          </button>
        ))}
      </div>

      {option !== undefined && (
        <div className="mt-4 rounded-xl border border-gold/25 bg-gold/5 p-3.5">
          <p className="text-[0.82rem] leading-relaxed text-parchment/90">{option.feedback}</p>
          <button
            type="button"
            onClick={() => {
              if (storyIndex < stories.length - 1) {
                setStoryIndex((i) => i + 1)
                setSelected(null)
              } else {
                setOpen(false)
              }
            }}
            className="mt-3 min-h-11 w-full rounded-lg border border-gold/40 px-3 text-sm text-gold-soft hover:bg-gold/10"
          >
            {storyIndex < stories.length - 1 ? '下一个片段' : '结束体验'}
          </button>
        </div>
      )}

      {story.contentDraft && import.meta.env.DEV && (
        <p className="mt-3 text-[0.68rem] leading-relaxed text-gold-soft/65">
          开发提示：此体验场景仍需对应部门核对。
        </p>
      )}
    </section>
  )
}
