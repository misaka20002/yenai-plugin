import { Config } from "../components/index.js"
import { getMonitorData, getData } from "../model/State/index.js"
import { si } from "../model/State/utils.js"
import { puppeteer } from "../model/index.js"

let interval = false
export class NewState extends plugin {
  constructor() {
    super({
      name: "椰奶状态",
      event: "message",
      priority: -1000,
      rule: [
        {
          reg: "^#?(椰奶)?状态(pro)?(debug)?$",
          fnc: "state"
        },
        {
          reg: "^#椰奶监控$",
          fnc: "monitor"
        },
        {
          reg: "^#?原图$",
          fnc: "origImg"
        }
      ]

    })
    this.redisOrigImgKey = "yenai:state:origImg:"
  }

  async monitor(e) {
    const data = await getMonitorData()
    await puppeteer.render("state/monitor", data, {
      e,
      scale: 1.4
    })
  }

  async state(e) {
    if (!/椰奶/.test(e.msg) && !Config.whole.state) return false

    if (!si) return e.reply("❎ 没有检测到systeminformation依赖，请运行：\"pnpm add systeminformation -w\"进行安装")

    // 防止多次触发
    if (interval) { return false } else interval = true
    try {
      // 获取数据
      let data = await getData(e)

      // 渲染图片
      let retMsgId = await puppeteer.render("state/index", {
        ...data
      }, {
        e,
        scale: 1.4,
        retMsgId: true
      })

      // redis保存消息id
      if (retMsgId) {
        this.saveMsgId(e, retMsgId, data)
      }
    } catch (error) {
      logger.error(error)
      interval = false
    }
    interval = false
  }

  async origImg(e) {
    const message_id = e.reply_id || (e.source
      ? (e.group?.getChatHistory
          ? (await e.group.getChatHistory(e.source.seq, 1))[0].message_id
          : (await e.friend.getChatHistory(e.source.time, 1))[0].message_id
        )
      : false)
    if (!message_id) return false
    const data = await redis.get(this.redisOrigImgKey + message_id)
    if (!data) return false
    let url = data
      .replace("data:image/jpeg;base64,", "base64://")
      .replace("../../../../../", "")
    e.reply(segment.image(url))
    return true
  }

  saveMsgId(e, retMsgId, data) {
    const redisData = data.style.backdrop
    const message_id = [ e.message_id ]
    if (Array.isArray(retMsgId.message_id)) {
      message_id.push(...retMsgId.message_id)
    } else {
      message_id.push(retMsgId.message_id)
    }
    for (const i of message_id) {
      redis.set(this.redisOrigImgKey + i, redisData, { EX: 86400 })
    }
  }
}
