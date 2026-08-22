import { DeptCard } from '../components/DeptCard'
import { RadarChart } from '../components/RadarChart'
import { ScoreBars } from '../components/ScoreBars'
import { DEPARTMENTS } from '../data/departments'
import type { Verdict } from '../lib/scoring'

interface ResultScreenProps {
  verdict: Verdict
  onRestart: () => void
}

export function ResultScreen({ verdict, onRestart }: ResultScreenProps) {
  const dept = DEPARTMENTS[verdict.winner]
  const hesitated = verdict.tiedWith.length > 0

  return (
    // data-dept 一翻，雷达多边形／量条／辉光／边框整体换肤，零 JS 配色逻辑
    <div data-dept={verdict.winner} className="starfield min-h-dvh px-5 py-10 sm:px-6">
      <div className="mx-auto flex max-w-lg flex-col items-center">
        {/* 宣判 */}
        <p className="font-display text-[0.62rem] tracking-[0.36em] text-parchment-dim/70">
          THE HAT HAS DECIDED
        </p>

        <div className="mt-6 w-44 sm:w-52">
          <DeptCard dept={dept} />
        </div>

        <h1
          className="mt-5 font-body text-3xl font-semibold sm:text-4xl"
          style={{ color: 'var(--dept-accent)' }}
        >
          {dept.name}
        </h1>
        <p className="font-display mt-1.5 text-[0.68rem] tracking-[0.3em] text-parchment-dim/80 uppercase">
          {dept.latinName}
        </p>

        <div className="rule-gold mt-5 w-28" />

        <p className="mt-5 max-w-sm text-center text-[1.02rem] leading-relaxed text-parchment">
          {dept.slogan}
        </p>

        {/* 关键词 */}
        <ul className="mt-5 flex flex-wrap justify-center gap-2">
          {dept.keywords.map((kw) => (
            <li
              key={kw}
              className="rounded-full border px-3 py-1 text-xs text-parchment/90"
              style={{ borderColor: 'rgb(var(--dept-glow) / 0.4)' }}
            >
              {kw}
            </li>
          ))}
        </ul>

        {/* 学院氛围点缀 */}
        <p className="mt-4 text-xs text-parchment-dim/70">
          若在霍格沃兹，这里是
          <span className="mx-1 text-gold-soft">{dept.house}</span>
          <span className="font-display tracking-wider">({dept.houseLatin})</span>
        </p>

        {hesitated && (
          <p className="mt-4 max-w-xs text-center text-xs leading-relaxed text-parchment-dim/75 italic">
            「帽子在你头上停顿了很久……
            {verdict.tiedWith.map((d) => DEPARTMENTS[d].name).join('、')}
            也一直在争你。」
          </p>
        )}

        {/* 契合度：雷达给形状，下面的读数给精确数字 */}
        <section className="mt-9 w-full rounded-2xl border border-night-600/70 bg-night-800/55 p-5 sm:p-6">
          <h2 className="text-center text-sm tracking-[0.16em] text-parchment-dim">
            四部门契合度
          </h2>

          <div className="mt-3">
            <RadarChart normalized={verdict.normalized} winner={verdict.winner} />
          </div>

          <div className="mt-4">
            <ScoreBars
              normalized={verdict.normalized}
              scores={verdict.scores}
              maxScore={verdict.maxScore}
              winner={verdict.winner}
            />
          </div>

          <p className="mt-4 text-center text-[0.7rem] leading-relaxed text-parchment-dim/60">
            百分比 = 该部门得分 ÷ 单部门满分 {verdict.maxScore}
          </p>
        </section>

        {/* TODO（社团填写）：部门介绍。未填写时整块不渲染，不留半截空白。 */}
        {dept.intro !== null && (
          <section className="mt-6 w-full rounded-2xl border border-night-600/70 bg-night-800/40 p-5">
            <h2 className="text-sm tracking-[0.16em] text-parchment-dim">关于{dept.name}</h2>
            <p className="mt-2.5 text-sm leading-relaxed text-parchment/90">{dept.intro}</p>
          </section>
        )}

        {/* TODO（社团填写）：招新/作品链接。空数组时不渲染。 */}
        {dept.links.length > 0 && (
          <ul className="mt-5 flex w-full flex-col gap-2">
            {dept.links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-[2.75rem] items-center justify-center rounded-lg border border-night-500/70 px-4 text-sm text-parchment/90 transition-colors hover:border-gold/60 hover:text-gold-soft"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={onRestart}
          className="mt-9 min-h-[2.75rem] rounded-full border border-gold/45 px-8 text-sm tracking-[0.16em] text-gold-soft/90 transition-all duration-300 hover:border-gold hover:bg-gold/12 active:scale-[0.98]"
        >
          再测一次
        </button>

        <p className="font-display mt-8 text-[0.6rem] tracking-[0.3em] text-parchment-dim/45">
          YUNA 社团 · 2026 招新季
        </p>
      </div>
    </div>
  )
}
