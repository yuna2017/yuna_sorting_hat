import { SortingHat } from '../components/SortingHat'
import { useTypewriter } from '../hooks/useTypewriter'

interface OpeningScreenProps {
  onContinue: () => void
}

/**
 * 开场独白，文案取自 docs/页面细节.md。
 *
 * 四段用 \n\n 拼成单串、配 whitespace-pre-line 渲染 ——
 * 与一行帽子低语共用同一个 useTypewriter，不做两套实现。
 *
 * 注：原文档此处写作「宣传部」，而部门映射表的规范名是「组宣部」，
 * 这里统一用后者。
 */
const MONOLOGUE = [
  '「啊……又一个新生……」',
  '「让我看看，你身上藏着什么样的特质……」',
  '「是开发部的冒险精神？\n网安部的求知渴望？\n运维部的忠诚耐心？\n还是组宣部的野心与谋略？」',
  '「来吧，回答我的问题……」',
].join('\n\n')

export function OpeningScreen({ onContinue }: OpeningScreenProps) {
  const { shown, done, skip } = useTypewriter(MONOLOGUE, { speed: 42, startDelay: 500 })

  return (
    <div
      className="screen-enter starfield flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-9"
      onClick={done ? undefined : skip}
    >
      <SortingHat state="idle" className="w-20 shrink-0 sm:w-24" />

      <div className="flex min-h-[13rem] w-full max-w-md items-start justify-center sm:min-h-[14rem]">
        {/* 动画节点对读屏隐藏，另挂完整文本，避免逐字被念成乱码 */}
        <p
          aria-hidden="true"
          className={`text-center text-[0.98rem] leading-relaxed whitespace-pre-line text-parchment sm:text-lg ${
            done ? '' : 'caret'
          }`}
        >
          {shown}
        </p>
        <p className="sr-only">{MONOLOGUE}</p>
      </div>

      {done ? (
        <button
          type="button"
          onClick={onContinue}
          className="rise-in min-h-[3rem] rounded-full border border-gold/70 bg-gold/10 px-8 text-[0.95rem] tracking-[0.2em] text-gold-soft transition-all duration-300 hover:border-gold hover:bg-gold/20 active:scale-[0.98]"
        >
          开始
        </button>
      ) : (
        <button
          type="button"
          onClick={skip}
          className="text-xs tracking-[0.2em] text-parchment-dim/60 transition-colors hover:text-gold-soft"
        >
          跳过 →
        </button>
      )}
    </div>
  )
}
