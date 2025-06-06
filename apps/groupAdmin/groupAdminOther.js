import moment from "moment"
import _ from "lodash"
import { QQApi, common, puppeteer } from "../../model/index.js"
import { API_ERROR } from "../../constants/errorMsg.js"

export class GroupAdminOther extends plugin {
  constructor() {
    super({
      name: "椰奶群管-其他",
      event: "message.group",
      priority: 500,
      rule: [
        {
          reg: "^#?(谁|哪个吊毛|哪个屌毛|哪个叼毛)是龙王$",
          fnc: "dragonKing"
        },
        {
          reg: "^#群星级$",
          fnc: "Group_xj"
        },
        {
          reg: "^#群数据((7|七)天)?$",
          fnc: "groupData"
        },
        {
          reg: "^#今日打卡$",
          fnc: "DaySigned"
        },
        {
          reg: "^#(查看|获取)?群?发言(榜单|排行)((7|七)天)?",
          fnc: "SpeakRank"
        }
      ]
    })
  }

  get Bot() {
    return this.e.bot ?? Bot
  }

  // 谁是龙王
  async dragonKing(e) {
    const url = `https://qun.qq.com/interactive/honorlist?gc=${e.group_id}&type=1&_wv=3&_wwv=129`
    // 浏览器截图
    let screenshot = await puppeteer.Webpage(url, {
      headers: { Cookie: this.Bot.cookies["qun.qq.com"] },
      font: true
    })
    if (screenshot) return e.reply(screenshot)
    // 数据版
    let res = await new QQApi(e).dragon(e.group_id)
    if (!res) return e.reply(API_ERROR)
    e.reply([
      `本群龙王：${res.nick}`,
      segment.image(`https://q1.qlogo.cn/g?b=qq&s=100&nk=${res.uin}`),
      `蝉联天数：${res.avatar_size}`
    ])
  }

  /**
   * 群星级
   * @param e
   */
  async Group_xj(e) {
    const url = `https://qqweb.qq.com/m/business/qunlevel/index.html?gc=${e.group_id}&from=0&_wv=1027`
    let screenshot = await puppeteer.Webpage(url, {
      cookie: common.getck("qqweb.qq.com", this.Bot, true),
      emulate: "QQTheme",
      font: true
    })
    if (screenshot) return e.reply(screenshot)
    // 出错后发送数据
    let result = await new QQApi(e).getCreditLevelInfo(e.group_id)
    if (!result) return e.reply(API_ERROR)
    if (result.ec != 0) return e.reply("❎ 查询错误\n" + JSON.stringify(result))
    let { uiGroupLevel, group_name, group_uin } = result.info
    let str = "⭐"
    str = str.repeat(uiGroupLevel)
    e.reply([
      `群名：${group_name}\n`,
      `群号：${group_uin}\n`,
      `群星级：${str}`
    ])
  }

  // 群发言榜单
  async SpeakRank(e) {
    if (!common.checkPermission(e, "all", "admin")) return
    const isSeven = /(7|七)天/.test(e.msg)
    const url = `https://qun.qq.com/m/qun/activedata/speaking.html?gc=${e.group_id}&time=${isSeven ? 1 : 0}`
    // 图片截图
    let screenshot = await puppeteer.Webpage(url, {
      headers: { Cookie: this.Bot.cookies["qun.qq.com"] },
      font: true
    })
    if (screenshot) return e.reply(screenshot)
    // 出错后发送文字数据
    let res = await new QQApi(e).SpeakRank(e.group_id, isSeven)
    if (!res) return e.reply(API_ERROR)
    if (res.retcode != 0) return e.reply("❎ 未知错误\n" + JSON.stringify(res))
    let msg = _.take(res.data.speakRank.map((item, index) =>
      `${index + 1}:${item.nickname}-${item.uin}\n连续活跃${item.active}天:发言${item.msgCount}次`
    ), 10).join("\n")
    e.reply(msg)
  }

  // 今日打卡
  async DaySigned(e) {
    const url = `https://qun.qq.com/v2/signin/list?gc=${e.group_id}`
    // 浏览器截图
    let screenshot = await puppeteer.Webpage(url, {
      emulate: "iPhone 6",
      cookie: common.getck("qun.qq.com", this.Bot, true),
      font: true
    })
    if (screenshot) return e.reply(screenshot)
    // 出错后使用接口
    let res = await new QQApi(e).signInToday(e.group_id)
    if (!res) return e.reply(API_ERROR)
    if (res.retCode != 0) return e.reply("❎ 未知错误\n" + JSON.stringify(res))

    let list = res.response.page[0]
    if (list.total == 0) return e.reply("❎ 今天还没有人打卡")
    // 发送消息
    let msg = list.infos.map((item, index) => `${index + 1}:${item.uidGroupNick}-${item.uid}\n打卡时间:${moment(item.signedTimeStamp * 1000).format("YYYY-MM-DD HH:mm:ss")}`).join("\n")
    e.reply(msg)
  }

  // 群数据
  async groupData(e) {
    if (!common.checkPermission(e, "all", "admin")) return
    const afterLaunch = async(page) => {
      await page.click("#app > div.tabbar > div.tabbar__time > div.tabbar__time__date")
      await common.sleep(500)
      await page.click("#app > div.tabbar > div.tabbar__date-selector > div > div:nth-child(3)")
      await common.sleep(1000)
    }
    const url = `https://qun.qq.com/m/qun/activedata/active.html?_wv=3&_wwv=128&gc=${e.group_id}&src=2`
    // 浏览器截图
    let screenshot = await puppeteer.Webpage(url, {
      cookie: common.getck("qun.qq.com", this.Bot, true),
      afterLaunch: /(7|七)天/.test(e.msg) ? afterLaunch : false,
      font: true
    })
    if (screenshot) return e.reply(screenshot)
    // 数据
    let res = await new QQApi(e).groupData(e.group_id, /(7|七)天/.test(e.msg))
    if (!res) return e.reply(API_ERROR)
    if (res.retcode != 0) return e.reply(res.msg || JSON.stringify(res))
    let { groupInfo, activeData, msgInfo, joinData, exitData, applyData } = res.data
    e.reply(
      [
        `${groupInfo.groupName}(${groupInfo.groupCode})${/(7|七)天/.test(e.msg) ? "七天" : "昨天"}的群数据\n`,
        "------------消息条数---------\n",
        `消息条数：${msgInfo.total}\n`,
        "------------活跃人数---------\n",
        `活跃人数：${activeData.activeData}\n`,
        `总人数：${activeData.groupMember}\n`,
        `活跃比例：${activeData.ratio}%\n`,
        "-----------加退群人数--------\n",
        `申请人数：${joinData.total}\n`,
        `入群人数：${applyData.total}\n`,
        `退群人数：${exitData.total}`
      ]
    )
  }
}
