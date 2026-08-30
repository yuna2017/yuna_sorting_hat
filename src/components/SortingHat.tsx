import hatHero from '../assets/hat/hat_a_storybook.webp'
import hatIdle from '../assets/hat/hat_idle.webp'
import hatThinking from '../assets/hat/hat_thinking.webp'
import hatDecided from '../assets/hat/hat_decide.webp'

export type SortingHatState = 'hero' | 'idle' | 'thinking' | 'decided'

interface SortingHatProps {
  className?: string
  /** 帽子在结果页或宣判阶段带上部门色的呼吸光晕。 */
  glow?: boolean
  /** 不同仪式阶段使用同画布的表情/光效变体。 */
  state?: SortingHatState
}

const HAT_ASSETS: Record<SortingHatState, string> = {
  hero: hatHero,
  idle: hatIdle,
  thinking: hatThinking,
  decided: hatDecided,
}

/**
 * 分部帽图片素材。
 *
 * 所有候选图都保留 1024×1024 透明画布，避免封面、开场和仪式切换时
 * 因为图片自身尺寸不同而跳动；动态浮动和部门色 glow 仍交给 CSS。
 */
export function SortingHat({
  className = '',
  glow = false,
  state = 'idle',
}: SortingHatProps) {
  return (
    <img
      src={HAT_ASSETS[state]}
      className={`${className} ${glow ? 'glow-pulse' : ''}`}
      role="img"
      aria-label="分部帽"
      alt="分部帽"
      width={1024}
      height={1024}
      draggable={false}
      decoding="async"
    />
  )
}
