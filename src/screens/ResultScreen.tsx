import { DeptCard } from '../components/DeptCard'
import { RadarChart } from '../components/RadarChart'
import { ScoreBars } from '../components/ScoreBars'
import { ShareBar } from '../components/ShareBar'
import { TraitBars } from '../components/TraitBars'
import { DepartmentStoryPanel } from '../components/DepartmentStoryPanel'
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
  /**
   * 这一场实际答的题。必须由 App 传入，不能自己去 import 题池 ——
   * 满分、证据、身份判定都按「这 12 道题」算，拿池子里全部题目当分母会全线偏低。
   */
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

/**
 * 用分部帽的口吻解释结果，不把内部计分过程直接暴露给用户。
 * 证据仍来自用户刚才选过的选项，但呈现为性格倾向和瞬间回忆，
 * 而不是“答了几题、命中了多少次”的测评报告。
 */
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

/** 招新入口的排序与主次。join 是转化终点，永远排第一且用主按钮。 */
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

  return (
    // data-dept 一翻，雷达多边形／量条／辉光／边框整体换肤，零 JS 配色逻辑
    <div data-dept={verdict.winner} className="screen-enter result-screen starfield relative min-h-dvh overflow-hidden px-5 py-10 sm:px-6">
      <img
        aria-hidden="true"
        src={resultBackground}
        width={1080}
        height={1920}
        className="result-background"
        alt=""
      />
      <div className="relative z-10 mx-auto flex max-w-lg flex-col items-center">
        {/* ── 第一层：结果 ── */}
        <p className="font-display text-[0.62rem] tracking-[0.36em] text-parchment-dim/70">
          THE HAT HAS DECIDED
        </p>

        <div className="mt-6 w-44 sm:w-52">
          <DeptCard dept={dept} />
        </div>

        <h1
          className="mt-5 font-display text-3xl font-semibold sm:text-4xl"
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

        {dept.tagline !== null && (
          <p className="mt-2 max-w-sm text-center text-[0.85rem] leading-relaxed text-parchment-dim">
            {dept.tagline}
          </p>
        )}

        {/* ── 第二层：解释 ──
            此前结果页从部门名直接跳到雷达图，用户拿不到「为什么是我」。
            证据全部来自刚才自己的选择，不引入新判定。 */}
        <section className="mt-8 w-full rounded-2xl border border-night-600/70 bg-night-800/40 p-5">
          <h2 className="text-sm tracking-[0.16em] text-parchment-dim">帽子在你身上看见了什么？</h2>

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
                {explanation.evidence.map((e) => (
                <li
                  key={e.questionId}
                  className="border-l-2 pl-3"
                  style={{ borderColor: 'rgb(var(--dept-glow) / 0.45)' }}
                >
                  <p className="text-[0.72rem] tracking-[0.08em] text-parchment-dim/70">
                    {e.questionTitle}
                  </p>
                  {/* break-words：选项是整句中文，窄屏必须允许在任意字符处断行 */}
                  <p className="text-[0.82rem] leading-relaxed break-words text-parchment/90">
                    {e.choice}
                  </p>
                </li>
                ))}
              </ul>
            </>
          )}

          {hesitated ? (
            // 同低语：中文不用 italic（伪斜会把笔画拉歪、更显细），
            // 且这行本来就小，字色提到 /85 保住可读性。
            // 措辞是「争过」而非「并列」—— 胜者已经过决胜，结果是确定的。
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

        {/* ── 第三层：关键词 ── */}
        <ul className="mt-6 flex flex-wrap justify-center gap-2">
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

        {/* ── 第四层：数据。雷达图从「结果页主角」降为参考区 ── */}
        <section className="mt-8 w-full rounded-2xl border border-night-600/70 bg-night-800/55 p-5 sm:p-6">
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

        {/* ── 第四层之二：五个倾向。与部门契合度同层但独立 ──
            部门推荐来自 p/s，倾向来自 traits，两条链路解耦（docs/特质体系.md §3）。 */}
        <section className="mt-6 w-full rounded-2xl border border-night-600/70 bg-night-800/55 p-5 sm:p-6">
          <h2 className="text-center text-sm tracking-[0.16em] text-parchment-dim">你的五个倾向</h2>

          <p className="mt-3 text-center text-[0.82rem] leading-relaxed text-parchment/90">
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
            百分比 = 该倾向实得 ÷ 这套题里它的理论上限。这里只描述你更倾向怎么做，不评价能力高低。
          </p>
        </section>

        {/* ── 第五层：关于这个部门。未填写时整块不渲染，不留半截空白。 ── */}
        {dept.intro !== null && (
          <section className="mt-6 w-full rounded-2xl border border-night-600/70 bg-night-800/40 p-5">
            <h2 className="text-sm tracking-[0.16em] text-parchment-dim">关于{dept.name}</h2>
            <p className="mt-2.5 text-sm leading-relaxed text-parchment/90">{dept.intro}</p>

            {dept.doing.length > 0 && (
              <>
                <h3 className="mt-4 text-[0.78rem] tracking-[0.1em] text-parchment-dim">
                  你进来会做什么
                </h3>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {dept.doing.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-[0.85rem] leading-relaxed text-parchment/90"
                    >
                      <span aria-hidden="true" className="shrink-0 text-gold-soft/70">
                        ·
                      </span>
                      <span className="break-words">{item}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {dept.suitedFor !== null && (
              <p className="mt-4 text-[0.85rem] leading-relaxed text-parchment-dim">
                <span className="text-parchment-dim/70">适合：</span>
                {dept.suitedFor}
              </p>
            )}

            {/* 占位稿要自己承认是占位稿，但只在开发期说 ——
                招新页上挂一句「草稿」比内容本身更劝退。 */}
            {dept.contentDraft && import.meta.env.DEV && (
              <p className="mt-4 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-[0.72rem] leading-relaxed text-gold-soft/85">
                开发提示：本部门介绍仍是占位草稿，上线前请社团核对，并把 contentDraft 改为
                false。
              </p>
            )}
          </section>
        )}

        {/* 可选体验：只读自己的选择，不参与计分和分享。 */}
        <DepartmentStoryPanel department={dept.id} />

        {/* ── 第七层：行动。招新转化的终点，不能让用户看完不知道去哪。 ── */}
        {actions.length > 0 && (
          <section
            className="mt-6 w-full rounded-2xl border p-5"
            style={{ borderColor: 'rgb(var(--dept-glow) / 0.32)' }}
          >
            <h2 className="text-sm tracking-[0.16em] text-parchment-dim">
              对{dept.name}感兴趣？
            </h2>

            {liveActions.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2">
                {liveActions.map((action) => (
                  <li key={action.label}>
                    <a
                      href={actionHref(action) ?? undefined}
                      target="_blank"
                      /* noopener 必须显式写：新窗口拿到 window.opener 就能篡改本页，
                         而这些 URL 由社团后续填入、不全在我们控制下。 */
                      rel="noopener noreferrer"
                      className={`flex min-h-[2.75rem] items-center justify-center gap-2 rounded-lg px-4 text-sm transition-colors ${
                        action.kind === 'join'
                          ? 'border border-gold/55 bg-gold/10 tracking-[0.08em] text-gold-soft hover:border-gold hover:bg-gold/18'
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
                {/* 没有 URL 的入口渲染成静态条目而不是 <a>：
                    一个点进去 404 的招新按钮比没有按钮更糟。 */}
                <ul className="mt-3 flex flex-col gap-2">
                  {pendingActions.map((action) => (
                    <li
                      key={action.label}
                      className="flex min-h-[2.75rem] flex-wrap items-center justify-center rounded-lg border border-dashed border-night-500/60 px-4 text-center text-[0.82rem] leading-snug text-parchment-dim/70"
                    >
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

        {/* ── 第八层：探索其他部门。结果只是一个方向，给用户保留主动选择的入口。 ── */}
        <section className="mt-6 w-full rounded-2xl border border-night-600/70 bg-night-800/40 p-5">
          <h2 className="text-sm tracking-[0.16em] text-parchment-dim">对其他部门感兴趣？</h2>
          <p className="mt-2 text-[0.8rem] leading-relaxed text-parchment-dim/75">
            分部帽给出的只是一个方向，也可以看看其他部门，找到真正想去的地方。
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

        {/* ── 第九层：传播 ── */}
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

        {/* ── 第十层：重新体验 ── */}
        <button
          type="button"
          onClick={onRestart}
          className="mt-8 min-h-[2.75rem] rounded-full border border-gold/45 px-8 text-sm tracking-[0.16em] text-gold-soft/90 transition-all duration-300 hover:border-gold hover:bg-gold/12 active:scale-[0.98]"
        >
          再测一次
        </button>

        {/* 免责一句：雷达图 + 百分比很容易被读成心理测评，
            这里明确它只是娱乐，压掉「伪科学感」。 */}
        <p className="mt-6 max-w-xs text-center text-[0.72rem] leading-relaxed text-parchment-dim/55">
          分部帽看见的是你此刻流露出的倾向。它可以给出一个方向，但真正想去哪里，仍由你自己决定。
        </p>

        <p className="font-display mt-6 text-[0.6rem] tracking-[0.3em] text-parchment-dim/45">
          YUNA 社团 · {CAMPAIGN.label}
        </p>
      </div>
    </div>
  )
}
