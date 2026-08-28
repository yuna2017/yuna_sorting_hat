import type { DeptId } from './constants'

export interface StoryOption {
  id: string
  text: string
  feedback: string
}

export interface DepartmentStory {
  id: string
  department: DeptId
  title: string
  scene: string
  options: StoryOption[]
  /** 正式上线前由对应部门核对场景是否符合真实工作。 */
  contentDraft: boolean
}

export const DEPARTMENT_STORIES: Record<DeptId, DepartmentStory[]> = {
  dev: [
    {
      id: 'dev-recruit-page',
      department: 'dev',
      title: '招新页只剩三天',
      scene: '协会需要一个能在手机上打开的招新页面。需求还在变化，但上线日期不会等人。你先做什么？',
      options: [
        { id: 'scope', text: '先把必须上线的功能圈出来', feedback: '你先保住最短可用路径，让团队知道什么必须现在完成。' },
        { id: 'prototype', text: '先做一个能点起来的原型', feedback: '页面很粗糙，但大家终于能对着真实东西讨论需求。' },
        { id: 'research', text: '先把旧项目和部署方式摸清楚', feedback: '你避开了重复造轮子，也找到了上线时最容易出问题的接缝。' },
      ],
      contentDraft: true,
    },
    {
      id: 'dev-production-bug',
      department: 'dev',
      title: '上线后有人打不开',
      scene: '你刚发出新功能，群里就有人说按钮点了没反应。你会怎样开始排查？',
      options: [
        { id: 'reproduce', text: '先复现问题并记录设备环境', feedback: '当问题可以稳定复现，修复就从猜测变成了工程。' },
        { id: 'rollback', text: '先准备回退，保证旧功能可用', feedback: '你先守住用户还能使用，再争取时间修根因。' },
        { id: 'logs', text: '查看报错、日志和最近改动', feedback: '你顺着证据缩小范围，很快找到了那条不起眼的改动。' },
      ],
      contentDraft: true,
    },
  ],
  sec: [
    {
      id: 'sec-ctf',
      department: 'sec',
      title: 'CTF 题目没有入口',
      scene: '题面只给了一段奇怪的响应和一个地址。所有人都在猜漏洞类型，你会先做什么？',
      options: [
        { id: 'observe', text: '整理已有现象和可控输入', feedback: '你把“感觉不对”变成了一组可以验证的假设。' },
        { id: 'minimal', text: '用最小请求逐步改变参数', feedback: '一次只改变一个变量，系统终于暴露了它真正依赖的条件。' },
        { id: 'review', text: '查相似题型并验证原理', feedback: '资料给了方向，但你仍用自己的实验确认它为什么成立。' },
      ],
      contentDraft: true,
    },
    {
      id: 'sec-review',
      department: 'sec',
      title: '项目准备公开上线',
      scene: '协会的新系统马上开放给全校。你只有一个晚上做安全检查，会先看哪里？',
      options: [
        { id: 'surface', text: '列出登录、上传和管理入口', feedback: '你先画清攻击面，有限时间不再平均分给所有页面。' },
        { id: 'permission', text: '重点检查身份和权限边界', feedback: '很多风险不在“能不能访问”，而在“谁本来不该访问”。' },
        { id: 'secrets', text: '检查前端产物、仓库和配置里的凭据', feedback: '你发现安全检查有时从最朴素的“不该公开什么”开始。' },
      ],
      contentDraft: true,
    },
  ],
  ops: [
    {
      id: 'ops-outage',
      department: 'ops',
      title: '活动开始前服务异常',
      scene: '活动还有十分钟开始，页面忽然变慢。群里不断有人催问，你先做什么？',
      options: [
        { id: 'health', text: '先看监控、日志和资源状态', feedback: '你先确认系统到底在哪里吃紧，而不是在所有地方同时动手。' },
        { id: 'stabilize', text: '先限流或关闭非关键功能', feedback: '你用功能换稳定，优先保证最重要的入口还能打开。' },
        { id: 'communicate', text: '同步现状并明确下一次更新时间', feedback: '稳定服务也包括稳定预期，团队不再靠不断追问获取信息。' },
      ],
      contentDraft: true,
    },
    {
      id: 'ops-handover',
      department: 'ops',
      title: '服务要交给下一届',
      scene: '系统目前运行正常，但部署过程只有你记得。你准备怎样交接？',
      options: [
        { id: 'docs', text: '写清部署、备份和恢复步骤', feedback: '真正可靠的系统，不会把一个人的记忆当作基础设施。' },
        { id: 'drill', text: '让接手的人独立完成一次演练', feedback: '演练暴露了文档里那些“你以为大家都知道”的空白。' },
        { id: 'alerts', text: '整理监控告警和联系人边界', feedback: '下一次异常发生时，接手的人知道先看什么，也知道该找谁。' },
      ],
      contentDraft: true,
    },
  ],
  pr: [
    {
      id: 'pr-campaign',
      department: 'pr',
      title: '活动很好，但没人知道',
      scene: '技术分享准备得很扎实，报名人数却很少。距离活动只剩五天，你会先改哪里？',
      options: [
        { id: 'audience', text: '先说清楚这场活动适合谁', feedback: '当受众能一眼认出“这是给我的”，传播才真正开始。' },
        { id: 'message', text: '把主题改成一个具体问题', feedback: '抽象的技术名词变成了新生能理解、愿意点击的困惑。' },
        { id: 'channels', text: '重新安排不同渠道的发布时间', feedback: '同一份内容在合适的时间抵达合适的人，效果完全不同。' },
      ],
      contentDraft: true,
    },
    {
      id: 'pr-record',
      department: 'pr',
      title: '活动结束以后',
      scene: '现场很成功，但照片、文字和资料散在不同人的设备里。你会怎样留下这次活动？',
      options: [
        { id: 'archive', text: '先收齐素材并统一命名归档', feedback: '未来的人终于能找到这次活动，而不是只听说“以前办过”。' },
        { id: 'story', text: '挑一个具体瞬间写成复盘', feedback: '你没有只报数字，而是让没到现场的人理解那天为什么值得记住。' },
        { id: 'reuse', text: '整理成下次可复用的模板和清单', feedback: '传播不只留下作品，也留下让下一次更轻松的方法。' },
      ],
      contentDraft: true,
    },
  ],
}
