interface SortingHatProps {
  className?: string
  /** 让帽子带上部门色的呼吸光晕（结果页用）。 */
  glow?: boolean
}

/**
 * 手绘分部帽（占位素材）。
 * 纯 SVG，无外部图片依赖 —— 之后换成最终立绘时只替换这个组件。
 *
 * 造型要点：**底要宽**（几乎铺满帽檐）+ 锥体向右倾 + 尖端往右下垂。
 * 底一窄就会变成「弯管/靴子」而不是帽子。
 */
export function SortingHat({ className = '', glow = false }: SortingHatProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={`${className} ${glow ? 'glow-pulse' : ''}`}
      role="img"
      aria-label="分部帽"
    >
      <defs>
        <linearGradient id="hat-felt" x1="0.1" y1="0" x2="0.75" y2="1">
          <stop offset="0%" stopColor="#8A6C3F" />
          <stop offset="40%" stopColor="#54411F" />
          <stop offset="100%" stopColor="#2A2013" />
        </linearGradient>
        <linearGradient id="hat-brim" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor="#6B5330" />
          <stop offset="100%" stopColor="#261C10" />
        </linearGradient>
      </defs>

      {/* 地面阴影 */}
      <ellipse cx="100" cy="172" rx="70" ry="11" fill="#000" opacity="0.4" />

      {/* 锥体：宽底、右倾、尖端下垂 */}
      <path
        d="M 54 154
           Q 64 104 94 60
           Q 110 34 134 27
           Q 152 23 149 41
           Q 145 57 127 54
           Q 114 51 113 64
           Q 123 104 146 154
           Z"
        fill="url(#hat-felt)"
      />

      {/* 帽檐：压在锥体底部之上 */}
      <ellipse cx="100" cy="156" rx="71" ry="15" fill="url(#hat-brim)" />
      <ellipse cx="100" cy="152" rx="71" ry="15" fill="url(#hat-felt)" />

      {/* 褶皱：两道眉眼与一张嘴，让它像有表情 */}
      <g stroke="#1B1409" strokeWidth="3.2" fill="none" strokeLinecap="round" opacity="0.8">
        <path d="M 76 104 Q 85 98 94 103" />
        <path d="M 108 106 Q 117 100 125 106" />
        <path d="M 82 128 Q 100 140 120 129" />
      </g>

      {/* 布料折痕高光 */}
      <g stroke="#B79764" strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round">
        <path d="M 92 66 Q 80 106 84 146" />
        <path d="M 130 32 Q 126 42 136 46" />
      </g>

      {/* 檐口金线 */}
      <path
        d="M 30 151 Q 100 176 170 151"
        stroke="#D4AF37"
        strokeWidth="1.3"
        fill="none"
        opacity="0.45"
      />
    </svg>
  )
}
