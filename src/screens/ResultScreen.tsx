import { DeptCard } from '../components/DeptCard'
import { RadarChart } from '../components/RadarChart'
import { ScoreBars } from '../components/ScoreBars'
import { ShareBar } from '../components/ShareBar'
import { TraitBars } from '../components/TraitBars'
import { DEPARTMENTS, DEPT_LIST } from '../data/departments'
import { TRAITS } from '../data/traits'
import { CAMPAIGN } from '../data/campaign'
import type { QuestionBank } from '../data/questions'
import { explainVerdict, verdictStrength } from '../lib/explain'
import { deriveBehaviorIdentity } from '../lib/identity'
import type { AnswerMap, Verdict } from '../lib/scoring'
import { buildShareMessage, buildShareText, buildShareUrl } from '../lib/shareCode'
import { deriveProfile } from '../lib/traits'
import resultBackground from '../assets/auxillary/result_background.webp'

interface ResultScreenProps {
  /** 这一场实际答的题。所有结果解释都只基于本场抽到的题。 */
  bank: QuestionBank
  /** 抽题种子。分享链接必须带上它，别人才能重建出同一组题。 */
  drawSeed: number
  verdict: Verdict
  /** 当前答案。用于生成分享链接与「为什么是这个部门」的证据。 */
  answers: AnswerMap
  /** 海报上的昵称。只本地渲染，不进分享码。 */
  nickname: string
  onNicknameChange: (value: string) => void
  onRestart: () => void
}

/** 用分部帽的口吻解释结果，不把内部计分过程直接暴露给用户。 */
const REASON_COPY = {
  dev: {
    decisive: '你总是愿意先动手，把一个想法推到真的能用。',
    clear: '遇到问题时，你更倾向于自己试着拆开、修好，再把它做出来。',
    narrow: '你一边想把事情做成，一边也在意它能不能稳稳地跑下去。',
  },
  sec: {
    decisive: '你很少满足于“能用”，总想再往下追一层，弄清它为什么成立。',
    clear: '你会被没想明白的问题勾住，愿意把线索一点点追到底。',
    narrow: '你在求真和动手之间来回权衡，帽子花了点时间才听清你的方向。',
  },
  ops: {
    decisive: '你会自然地接住那些不能出错的事，并把它们安稳地守下去。',
    clear: '比起一时的漂亮结果，你更在意事情能不能一直可靠地运转。',
    narrow: '你既有解决问题的冲劲，也有把细节收好的耐心。',
  },
  pr: {
    decisive: '你总能先看到人群、节奏和那句该被听见的话。',
    clear: '你习惯把人和事组织起来，让一个想法真正抵达别人。',
    narrow: '你既在意事情本身，也在意它如何被看见、被记住。',
  },
} as const

/** 招新入口的排序与主次。join 是转化终点，永远排第一。 */
const ACTION_ORDER = ['join', 'more', 'works'] as const

function shareUrlOf(bank: QuestionBank, drawSeed: number, answers: AnswerMap): string {
  if (typeof window === 'undefined') return ''
  return buildShareUrl(bank, drawSeed, answers, window.location.origin, window.location.pathname)
}

export function ResultScreen({
  bank,
  drawSeed,
  verdict,
  answers,
  nickname,
  onNicknameChange,
  onRestart,
}: ResultScreenProps) {
  const dept = DEPARTMENTS[verdict.winner]
  const hesitated = verdict.tiedWith.length > 0
  const explanation = explainVerdict(bank, answers, verdict)
  const strength = verdictStrength(bank, explanation)
  const identity = deriveBehaviorIdentity(bank, answers, verdict, explanation)
  const profile = deriveProfile(bank, answers)

  const shareUrl = shareUrlOf(bank, drawSeed, answers)
  const actions = [...dept.actions].sort(
    (a, b) => ACTION_ORDER.indexOf(a.kind) - ACTION_ORDER.indexOf(b.kind),
  )
  const actionIsOpen = (action: (typeof actions)[number]) => {
    if (action.status === 'closed') return false
    if (action.href !== null) return action.status === undefined || action.status === 'open'
    if (action.kind === 'join') return CAMPAIGN.status === 'open' && CAMPAIGN.publicJoinUrl !== null
    if (action.kind === 'more') return CAMPAIGN.siteUrl !== null && CAMPAIGN.status !== 'closed'
    return false
  }
  const liveActions = actions.filter(actionIsOpen)
  const pendingActions = actions.filter((a) => !liveActions.includes(a))
  const actionHref = (action: (typeof actions)[number]) => {
    if (action.href !== null) return action.href
    if (action.kind === 'join') return CAMPAIGN.publicJoinUrl
    if (action.kind === 'more') return CAMPAIGN.siteUrl
    return null
  }
  const pendingLabel = CAMPAIGN.status === 'closed' ? '本期暂未开放' : '入口待公布'
  const primaryAction = liveActions.find((action) => action.kind === 'join') ?? liveActions[0]

  return (
    <div
      data-dept={verdict.winner}
      className="screen-enter result-screen starfield relative min-h-dvh overflow-x-hidden px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-10"
    >
      <img
        aria-hidden="true"
        src={resultBackground}
        width={1080}
        height={1920}
        className="result-background"
        alt=""
      />

      <div className="result-content relative z-10 mx-auto flex w-full max-w-xl flex-col items-center">
        {/* ── 结果主视觉 ── */}
        <section className="result-hero w-full text-center" aria-labelledby="result-title">
          <p className="font-display text-[0.62rem] tracking-[0.36em] text-parchment-dim/70">
            THE HAT HAS DECIDED
          </p>

          <div className="result-hero-art mx-auto mt-5 w-44 sm:w-56">
            <DeptCard dept={dept} />
          </div>

          <h1
            id="result-title"
            className="mt-4 font-display text-3xl font-semibold sm:text-4xl"
            style={{ color: 'var(--dept-accent)' }}
          >
            {dept.name}
          </h1>
          <p className="font-display mt-1.5 text-[0.68rem] tracking-[0.3em] text-parchment-dim/80 uppercase">
            {dept.latinName}
          </p>

          <div className="rule-gold mx-auto mt-5 w-28" />

          <p className="mx-auto mt-5 max-w-md text-[1.02rem] leading-relaxed text-parchment">
            {dept.slogan}
          </p>

          {dept.tagline !== null && (
            <p className="mx-auto mt-2 max-w-lg text-[0.86rem] leading-relaxed text-parchment-dim">
              {dept.tagline}
            </p>
          )}

          <div className="result-hero-actions mx-auto mt-6 flex w-full max-w-md flex-col gap-2.5 sm:flex-row sm:justify-center">
            {primaryAction !== undefined && actionHref(primaryAction) !== null && (
              <a
                href={actionHref(primaryAction) ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="result-primary-action flex min-h-[2.9rem] flex-1 items-center justify-center rounded-lg px-5 text-sm tracking-[0.08em]"
              >
                {primaryAction.label}
              </a>
            )}
            <a
              href="#department-info"
              className="flex min-h-[2.9rem] flex-1 items-center justify-center rounded-lg border border-night-500/75 px-5 text-sm text-parchment/90 transition-colors hover:border-gold/60 hover:text-gold-soft"
            >
              先了解{dept.name}
            </a>
          </div>

          <ul className="mt-5 flex flex-wrap justify-center gap-2" aria-label="部门关键词">
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

          <p className="mt-4 text-xs text-parchment-dim/70">
            若在霍格沃兹，这里是
            <span className="mx-1 text-gold-soft">{dept.house}</span>
            <span className="font-display tracking-wider">({dept.houseLatin})</span>
          </p>
        </section>

        {/* ── 为什么是这个部门 ── */}
        <section className="result-section mt-9 w-full rounded-2xl border border-night-600/70 bg-night-800/45 p-5 sm:p-6" aria-labelledby="explanation-title">
          <h2 id="explanation-title" className="text-sm tracking-[0.16em] text-parchment-dim">
            帽子在你身上看见了什么？
          </h2>

          <p className="mt-2.5 text-sm leading-relaxed text-parchment/90">
            {REASON_COPY[dept.id][strength]}
          </p>

          <div className="mt-4 rounded-xl border border-gold/25 bg-gold/5 px-3.5 py-3">
            <p className="text-[0.72rem] tracking-[0.12em] text-gold-soft/80">你的行为身份</p>
            <p className="mt-1 text-base font-medium text-gold-soft">{identity.name}</p>
            <p className="mt-1 text-[0.8rem] leading-relaxed text-parchment-dim">{identity.desc}</p>
          </div>

          {explanation.evidence.length > 0 && (
            <>
              <p className="mt-4 text-[0.78rem] leading-relaxed text-parchment-dim/80">
                帽子记住了这些瞬间：
              </p>
              <ul className="mt-2.5 flex flex-col gap-2.5">
                {explanation.evidence.slice(0, 3).map((e) => (
                  <li
                    key={e.questionId}
                    className="border-l-2 pl-3"
                    style={{ borderColor: 'rgb(var(--dept-glow) / 0.45)' }}
                  >
                    <p className="text-[0.72rem] tracking-[0.08em] text-parchment-dim/70">
                      {e.questionTitle}
                    </p>
                    <p className="break-words text-[0.82rem] leading-relaxed text-parchment/90">
                      {e.choice}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}

          {hesitated ? (
            <p className="mt-3.5 text-[0.8rem] leading-relaxed text-parchment-dim/85">
              「帽子在你头上停顿了很久……
              {verdict.tiedWith.map((d) => DEPARTMENTS[d].name).join('、')}
              也一直在争你。」
            </p>
          ) : (
            explanation.gap > 0 && (
              <p className="mt-3.5 text-[0.8rem] leading-relaxed text-parchment-dim/85">
                不过，{DEPARTMENTS[explanation.runnerUp].name}也曾让帽子犹豫了一会儿。
              </p>
            )
          )}
        </section>

        {/* ── 方向摘要 ── */}
        <section className="result-section result-section--data mt-6 w-full rounded-2xl border border-night-600/70 bg-night-800/55 p-5 sm:p-6" aria-labelledby="scores-title">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[0.68rem] tracking-[0.2em] text-gold-soft/75">YOUR DIRECTION</p>
              <h2 id="scores-title" className="mt-1 text-base font-medium text-parchment">
                四部门契合度
              </h2>
            </div>
            <p className="text-right text-[0.72rem] leading-relaxed text-parchment-dim/65">
              分数只用于参考
            </p>
          </div>

          <div className="result-chart-wrap mt-3">
            <RadarChart normalized={verdict.normalized} winner={verdict.winner} />
          </div>

          <p className="mt-3 text-center text-[0.78rem] leading-relaxed text-parchment-dim/75">
            雷达图先给你看整体方向；详细分数可以按需展开。
          </p>

          <details className="result-details result-score-details mt-4 rounded-xl border border-night-600/70 bg-night-900/25 px-3.5 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[0.82rem] text-parchment-dim [&::-webkit-details-marker]:hidden">
              <span>查看详细契合度</span>
              <span aria-hidden="true" className="result-details-icon text-gold-soft">＋</span>
            </summary>

            <div className="result-details-content">
              <div className="mt-4">
                <ScoreBars
                  normalized={verdict.normalized}
                  scores={verdict.scores}
                  maxScore={verdict.maxScore}
                  winner={verdict.winner}
                />
              </div>

              <p className="mt-4 text-center text-[0.7rem] leading-relaxed text-parchment-dim/60">
                结果只用于自我探索，不代表能力高低。
              </p>
            </div>
          </details>
        </section>

        {/* ── 完整行为画像：默认展开，让用户先看到自己的行为倾向 ── */}
        <details open className="result-section result-details mt-6 w-full rounded-2xl border border-night-600/70 bg-night-800/45 p-5 sm:p-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm tracking-[0.12em] text-parchment-dim [&::-webkit-details-marker]:hidden">
            <h2 className="font-body text-sm font-normal tracking-[0.12em] text-parchment-dim">查看完整行为画像</h2>
            <span aria-hidden="true" className="result-details-icon text-gold-soft">＋</span>
          </summary>

          <div className="result-details-content">
            <p className="mt-4 text-[0.82rem] leading-relaxed text-parchment/90">
              其中
              <span className="mx-1 text-gold-soft">{TRAITS[profile.dominant].name}</span>
              最突出
              {profile.tiedWith.length > 0 && (
                <>
                  ，不过
                  {profile.tiedWith.map((trait) => TRAITS[trait].name).join('、')}
                  和它分得很近
                </>
              )}
              。
            </p>

            <div className="mt-4">
              <TraitBars profile={profile} />
            </div>

            <p className="mt-4 text-center text-[0.7rem] leading-relaxed text-parchment-dim/60">
              这里只描述你更倾向怎么做，不评价能力高低。
            </p>
          </div>
        </details>

        {/* ── 部门介绍 ── */}
        {dept.intro !== null && (
          <section id="department-info" className="result-section mt-6 w-full rounded-2xl border border-night-600/70 bg-night-800/40 p-5 sm:p-6" aria-labelledby="about-title">
            <h2 id="about-title" className="text-sm tracking-[0.16em] text-parchment-dim">
              关于{dept.name}
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-parchment/90">{dept.intro}</p>

            {dept.doing.length > 0 && (
              <>
                <h3 className="mt-5 text-[0.78rem] tracking-[0.1em] text-parchment-dim">
                  你进来会做什么
                </h3>
                <ul className="mt-2.5 flex flex-col gap-2">
                  {dept.doing.map((item) => (
                    <li key={item} className="flex gap-2 text-[0.85rem] leading-relaxed text-parchment/90">
                      <span aria-hidden="true" className="shrink-0 text-gold-soft/70">·</span>
                      <span className="break-words">{item}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {dept.suitedFor !== null && (
              <p className="mt-5 text-[0.85rem] leading-relaxed text-parchment-dim">
                <span className="text-parchment-dim/70">适合：</span>
                {dept.suitedFor}
              </p>
            )}
          </section>
        )}

        {/* ── 行动入口 ── */}
        {actions.length > 0 && (
          <section className="result-section result-actions mt-6 w-full rounded-2xl border p-5 sm:p-6" style={{ borderColor: 'rgb(var(--dept-glow) / 0.32)' }} aria-labelledby="actions-title">
            <h2 id="actions-title" className="text-sm tracking-[0.16em] text-parchment-dim">
              想进一步了解{dept.name}？
            </h2>

            {liveActions.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2">
                {liveActions.map((action) => (
                  <li key={action.label}>
                    <a
                      href={actionHref(action) ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex min-h-[2.85rem] items-center justify-center gap-2 rounded-lg px-4 text-sm transition-colors ${
                        action.kind === 'join'
                          ? 'result-primary-action tracking-[0.08em]'
                          : 'border border-night-500/70 text-parchment/90 hover:border-gold/60 hover:text-gold-soft'
                      }`}
                    >
                      <span className="break-words">{action.label}</span>
                      {action.note !== undefined && (
                        <span className="text-[0.72rem] text-parchment-dim/70">{action.note}</span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {pendingActions.length > 0 && (
              <>
                <ul className="mt-3 flex flex-col gap-2">
                  {pendingActions.map((action) => (
                    <li key={action.label} className="flex min-h-[2.75rem] flex-wrap items-center justify-center rounded-lg border border-dashed border-night-500/60 px-4 text-center text-[0.82rem] leading-snug text-parchment-dim/70">
                      <span className="break-words">{action.label}</span>
                      <span className="ml-1.5 text-[0.72rem]">（{action.status === 'closed' ? '本期暂未开放' : pendingLabel}）</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2.5 text-[0.72rem] leading-relaxed text-parchment-dim/60">
                  招新渠道确定后会更新在这里。
                </p>
              </>
            )}
          </section>
        )}

        {/* ── 探索其他部门 ── */}
        <section className="result-section mt-6 w-full rounded-2xl border border-night-600/70 bg-night-800/40 p-5 sm:p-6" aria-labelledby="other-departments-title">
          <h2 id="other-departments-title" className="text-sm tracking-[0.16em] text-parchment-dim">
            对其他部门也感兴趣？
          </h2>
          <p className="mt-2 text-[0.8rem] leading-relaxed text-parchment-dim/75">
            分部帽给出的是一个方向，你也可以看看其他部门，找到真正想去的地方。
          </p>

          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {DEPT_LIST.filter((otherDept) => otherDept.id !== dept.id).map((otherDept) => {
              const detailAction = otherDept.actions.find((action) => action.kind === 'more')
              const isOpen =
                detailAction !== undefined &&
                detailAction.href !== null &&
                detailAction.status !== 'closed' &&
                detailAction.status !== 'pending'
              const pendingDetailLabel = detailAction?.status === 'closed' ? '本期暂未开放' : '入口待公布'

              return (
                <li key={otherDept.id}>
                  {isOpen && detailAction !== undefined ? (
                    <a
                      href={detailAction.href ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-[3.5rem] items-center justify-between gap-2 rounded-lg border border-night-500/70 px-3.5 py-2.5 text-sm text-parchment/90 transition-colors hover:border-gold/60 hover:text-gold-soft"
                    >
                      <span className="break-words">{otherDept.name}</span>
                      <span aria-hidden="true" className="shrink-0 text-gold-soft/70">→</span>
                    </a>
                  ) : (
                    <div className="flex min-h-[3.5rem] items-center justify-between gap-2 rounded-lg border border-dashed border-night-500/60 px-3.5 py-2.5 text-sm text-parchment-dim/70">
                      <span className="break-words">{otherDept.name}</span>
                      <span className="shrink-0 text-[0.68rem]">{pendingDetailLabel}</span>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        {/* ── 分享：海报默认可见 ── */}
        {shareUrl !== '' && (
          <ShareBar
            url={shareUrl}
            text={buildShareText(dept.name, identity.name, shareUrl)}
            message={buildShareMessage(dept.name, identity.name)}
            bank={bank}
            drawSeed={drawSeed}
            verdict={verdict}
            answers={answers}
            nickname={nickname}
            onNicknameChange={onNicknameChange}
          />
        )}

        <footer className="result-footer mt-8 flex w-full flex-col items-center text-center">
          <button
            type="button"
            onClick={onRestart}
            className="min-h-[2.85rem] rounded-full border border-gold/45 px-8 text-sm tracking-[0.16em] text-gold-soft/90 transition-all duration-300 hover:border-gold hover:bg-gold/12 active:scale-[0.98]"
          >
            再测一次
          </button>

          <p className="mt-5 max-w-md text-[0.72rem] leading-relaxed text-parchment-dim/60">
            分部帽看见的是你此刻流露出的倾向。它可以给出一个方向，但真正想去哪里，仍由你自己决定。
          </p>

          <p className="font-display mt-5 text-[0.6rem] tracking-[0.3em] text-parchment-dim/45">
            燕山大学大学生网络信息协会 · {CAMPAIGN.label}
          </p>

          <p className="mt-6 text-[0.7rem] text-parchment-dim/55">
            想继续探索燕大生活？{' '}
            <a
              href="https://game.yuna.team/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-soft/75 underline decoration-gold/30 underline-offset-4 transition-colors hover:text-gold-soft"
            >
              进入燕山大学人生模拟器
            </a>
          </p>
        </footer>
      </div>
    </div>
  )
}
