import plugin from "../../../lib/plugins/plugin.js"
import { Config } from "../components/index.js"
import { setu, common } from "../model/index.js"
import { Admin_Fun } from "./admin/fun.js"
import translateChinaNum from "../tools/translateChinaNum.js"

const NumReg = "[零一壹二两三四五六七八九十百千万亿\\d]+"

export class SeSe extends plugin {
  constructor() {
    super({
      name: "派蒙搜图",
      event: "message",
      priority: 500,
      rule: [
        {
          reg: "^#派蒙搜图(.*)$",
          fnc: "setuTag"
        },
        {
          reg: `^#(setu|色图|涩图)\\s?((${NumReg})张)?$`, // 无内鬼
          fnc: "setuRandom"
        },
        {
          reg: `^#(撤回间隔|群(c|C)(d|D))(${NumReg})(s|秒)?$`,
          fnc: "setGroupRecallAndCD",
          event: "message.group",
          permission: "master"
        },
        {
          reg: "^#(开启|关闭)(私聊)?涩涩$",
          fnc: "setSeSe",
          permission: "master"
        },
        {
          reg: `^#?设置cd\\s?((\\d+)\\s)?(${NumReg})(s|秒)?$`, // 设置cd
          fnc: "setCd",
          permission: "master"
        }
      ]
    })
  }

  async setuRandom(e) {
    if (!await this._Authentication(e)) return

    const cdTime = setu.getRemainingCd(e.user_id, e.group_id)

    if (cdTime) return e.reply(` ${setu.CDMsg}你的CD还有${cdTime}`, false, { at: true })

    let num = e.msg.match(new RegExp(NumReg))
    num = num ? translateChinaNum(num[0]) : 1
    if (num > 20) {
      return e.reply("❎ 最大张数不能大于20张哦")
    } else if (num > 16) {
      e.reply("诶，这...这么多，派蒙要找很久的，要慢慢等哦")
    }

    // 开始执行
    e.reply(setu.startMsg)

    await setu.setuApi(setu.getR18(e.group_id), num)
      .then(res => setu.sendMsgOrSetCd(e, res))
      .catch(err => common.handleException(e, err))
  }

  // tag搜图
  async setuTag(e) {
    if (!await this._Authentication(e)) return

    let cdTime = setu.getRemainingCd(e.user_id, e.group_id)
    if (cdTime) return e.reply(` ${setu.CDMsg}，你的CD还有${cdTime}`, false, { at: true })

    let tag = e.msg.replace("#派蒙搜图", '').trim()
    let num = e.msg.match(new RegExp(`(${NumReg})张`))
    if (!num) {
      num = 1
    } else {
      tag = tag.replace(num[0], "").trim()
      num = translateChinaNum(num[1])
    }

    if (num > 20) {
      return e.reply("❎ 最大张数不能大于20张哦")
    } else if (num > 16) {
      e.reply("诶，这...这么多，派蒙要找很久的，要慢慢等哦")
    } else {
      e.reply(setu.startMsg)
    }

    if (!tag) return e.reply("tag为空！！！", false, { at: true })
    tag = tag.split(" ")?.map(item => item.split("|"))
    if (tag.length > 3) return e.reply("tag最多只能指定三个哦~", false, { at: true })

    await setu.setuApi(setu.getR18(e.group_id), num, tag)
      .then(res => setu.sendMsgOrSetCd(e, res))
      .catch(err => common.handleException(e, err))
  }

  async _Authentication(e) {
    if (e.isMaster) return true
    const { allowPM, limit } = Config.setu
    if (!allowPM && !e.isGroup) {
      e.reply("主人已禁用私聊该功能")
      return false
    }
    if (!common.checkSeSePermission(e, "sesepro")) return false
    if (!await common.limit(e.user_id, "setu", limit)) {
      e.reply("您已达今日「派蒙搜图」次数上限", true, { at: true })
      return false
    }
    return true
  }

  // 设置群撤回间隔和cd
  async setGroupRecallAndCD(e) {
    let num = e.msg.match(new RegExp(NumReg))
    num = translateChinaNum(num[0])
    let type = /撤回间隔/.test(e.msg) ? "recall" : "cd"
    setu.setGroupRecallTimeAndCd(e.group_id, num, type)
    new Admin_Fun().sendImg(e)
    e.reply("OK")
  }

  // 开启r18
  async setSeSe(e) {
    let isopen = !!/开启/.test(e.msg)
    setu.setR18(e.group_id, isopen)
    new Admin_Fun().sendImg(e)
    e.reply("OK")
  }

  // 指令设置
  async setCd(e) {
    let reg = `^#?设置cd\\s?((\\d+)\\s)?(${NumReg})(s|秒)?$`
    let regRet = e.msg.match(new RegExp(reg))
    let qq = e.message.find(item => item.type == "at")?.qq ?? regRet[2]
    let cd = translateChinaNum(regRet[3])
    if (!qq) return e.reply("❎ 请输入要设置QQ", true)
    if (!cd) return e.reply("❎ CD为空，请检查", true)
    setu.setUserCd(qq ?? regRet[2], cd)
    e.reply(`✅ 设置用户${qq}的cd成功，cd时间为${cd}秒`)
  }
}
