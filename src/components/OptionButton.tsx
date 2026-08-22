const DISPLAY_LETTERS = ['A', 'B', 'C', 'D'] as const

interface OptionButtonProps {
  /** 显示位置下标。徽标字母按**显示顺序**给，而不是用规范 option id
      —— 选项被洗过牌，否则会出现「C A D B」这种看起来像坏了的编号。 */
  index: number
  text: string
  selected: boolean
  /** 已作出选择后，未选中的项淡出，让焦点留在被选的那条上。 */
  dimmed: boolean
  disabled: boolean
  onSelect: () => void
}

/**
 * 选项按钮。
 *
 * 刻意**不透露部门配色** —— 选中态一律用中性金色。
 * 若按部门给选项上色，等于把答案映射直接告诉用户，测试就失去意义了。
 */
export function OptionButton({
  index,
  text,
  selected,
  dimmed,
  disabled,
  onSelect,
}: OptionButtonProps) {
  const letter = DISPLAY_LETTERS[index] ?? '·'

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        // min-h-[3.5rem] ≈ 56px，稳稳超过 44px 的移动端点击区下限
        'group flex w-full min-h-[3.5rem] items-center gap-3 rounded-lg border px-3.5 py-3',
        'text-left text-[0.95rem] leading-relaxed transition-all duration-300 sm:gap-4 sm:px-4 sm:text-base',
        selected
          ? 'border-gold bg-gold/12 text-parchment shadow-[0_0_20px_-4px_rgba(212,175,55,0.45)]'
          : 'border-night-500/70 bg-night-800/60 text-parchment/85',
        !selected && !disabled
          ? 'hover:border-gold/60 hover:bg-night-700/70 active:scale-[0.995]'
          : '',
        dimmed ? 'opacity-40' : 'opacity-100',
        disabled ? 'cursor-default' : 'cursor-pointer',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={[
          'font-display grid size-7 shrink-0 place-items-center rounded-full border text-xs',
          'transition-colors duration-300',
          selected
            ? 'border-gold bg-gold text-night-900'
            : 'border-gold/40 text-gold/70 group-hover:border-gold/70',
        ].join(' ')}
      >
        {letter}
      </span>
      <span className="flex-1">{text}</span>
    </button>
  )
}
