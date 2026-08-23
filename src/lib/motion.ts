/**
 * 系统是否要求「减少动态效果」。
 *
 * CSS 侧已在 index.css 里把动画时长压到 0.001ms，但**由 JS 计时驱动的时序**
 * （打字机、揭示仪式）拿不到那条规则，必须自己问一次 —— 否则开了这个偏好的人
 * 仍要干等五秒。
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
