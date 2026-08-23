import { useEffect, useRef } from 'react'
import { useTypewriter } from '../hooks/useTypewriter'
import { prefersReducedMotion } from '../lib/motion'

/**
 * 版式占位。真文案写进 questions.ts 的 detail 之后，
 * 这个常量连同下面那条开发提示一起删掉。
 */
const DETAIL_PLACEHOLDER =
  '（占位）帽子还在斟酌该怎么说这一条 —— 这里会写上它对这个选择的点评，两到三行。'

interface OptionDetailCardProps {
  /** 供选项按钮的 aria-describedby 指向。 */
  id: string
  /** 帽子低语。原先显示在整个列表下方，现在收进卡片。 */
  whisper: string
  detail: string | undefined
  /** 刚作答（播打字机）还是回看已答题（直接全文）。 */
  animate: boolean
}

/**
 * 选项说明卡。就地展开在被选中的那个选项**正下方**，其余选项保留不动、被它撑开。
 *
 * 为什么贴着选项而不是放在列表下方（原先的做法）：反馈得落在视线与手指已经在的位置。
 * 点的是第一个选项、反馈出现在四条选项之外的下方，视线要空跑一趟。
 *
 * **刻意不放任何可交互元素。** 卡片正好长在手指刚点完的坐标上，
 * 在这里摆按钮等于送一个误触 —— 推进按钮因此改为吸底常驻（见 QuizScreen）。
 *
 * 同样**不透露部门配色**：装饰一律用中性金色，与 OptionButton 的理由一致，
 * 否则等于把选项到部门的映射直接标出来。
 */
export function OptionDetailCard({ id, whisper, detail, animate }: OptionDetailCardProps) {
  const { shown, done } = useTypewriter(whisper, {
    speed: 52,
    enabled: animate,
    startDelay: 260,
  })

  /* 选到靠后的选项时，展开的卡片可能落在视口之外。
     block: 'nearest' 只在真的看不见时才滚 —— 选第一个选项时完全不动。

     必须等展开动画走完再滚：挂载那一帧卡片高度还是 0，
     此时 'nearest' 会认为「已经看得见了」而不动，等它长出来就露在屏幕外了。
     卡片的 scroll-mb 负责把吸底栏的高度让出来，否则会滚到栏底下去。 */
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!animate) return
    const reduce = prefersReducedMotion()
    const timer = window.setTimeout(
      () => {
        ref.current?.scrollIntoView({
          block: 'nearest',
          behavior: reduce ? 'auto' : 'smooth',
        })
      },
      // 与 index.css 的 card-expand 时长对齐；reduce 下动画被归零，不用等
      reduce ? 0 : 380,
    )
    return () => window.clearTimeout(timer)
  }, [animate])

  /* 占位文案**只在开发期**出现：它的用途是让版式现在就能验收。
     生产环境下 detail 还没写时，卡片就只有低语 —— 少一段，
     总好过拿「（占位）」糊在招新页上。同 departments.ts 对 intro 的处理：
     没填就不渲染该段，不留半截空白。 */
  const showDetail = detail !== undefined || import.meta.env.DEV

  return (
    <div ref={ref} className="card-expand mt-1.5 scroll-mb-20">
      <div>
        {/* 左侧金色竖线负责「这张卡属于上面那个选项」。
            刻意**不做左缩进** —— 320px 下外层 px-5 已吃掉 40px，
            再缩进会把中文压到每行十几个字。 */}
        <div
          id={id}
          className="rounded-xl border border-l-2 border-gold/25 border-l-gold/50 bg-night-800/70 px-4 py-3.5"
        >
          {/* 不用 italic：中文没有真正的斜体，浏览器只能伪斜（合成倾斜），
              笔画会被拉歪、更显细。低语的语气交给「」与金色承担。 */}
          <p className="text-[0.925rem] leading-relaxed text-gold-soft/90">
            <span aria-hidden="true" className={done ? '' : 'caret'}>
              {shown}
            </span>
            {/* 读屏另挂一份完整文本 —— 否则逐字过程会被念成乱码 */}
            <span className="sr-only">{whisper}</span>
          </p>

          {showDetail && (
            <p className="mt-3 border-t border-night-600/50 pt-3 text-[0.85rem] leading-relaxed text-parchment-dim break-words">
              {detail ?? DETAIL_PLACEHOLDER}
            </p>
          )}

          {/* 占位稿要自己承认是占位稿，但只在开发期说 ——
              照 ResultScreen 的 contentDraft 提示同一套做法。 */}
          {detail === undefined && import.meta.env.DEV && (
            <p className="mt-3 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-[0.72rem] leading-relaxed text-gold-soft/85">
              开发提示：本选项的点评还没写，上面是占位文案。真文案填进 questions.ts 的 detail。
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
