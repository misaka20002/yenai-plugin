import plugin from '../../../lib/plugins/plugin.js'
import { Config } from '../components/index.js'
import { Pixiv, common, setu } from '../model/index.js'
import { Admin } from './admin.js'
import { ImageRPSS } from '../constants/pixiv.js'
import moment from "moment";
// 文案
const SWITCH_ERROR = '主人没有开放这个功能哦(＊／ω＼＊)'
// 汉字数字匹配正则
const numReg = '[一壹二两三四五六七八九十百千万亿\\d]+'
// 正则
const pidReg = /^#?pid搜图\s?(\d+)$/i

const rankingrReg = new RegExp(`^#?看看((\\d{4}-\\d{1,2}-\\d{1,2})的)?(${Object.keys(Pixiv.ranktype).join('|')})(r18)?榜\\s?(第(${numReg})页)?$`, 'i')
const tagReg = new RegExp(`^#?tag(pro)?搜图(.*?)(第(${numReg})页)?$`, 'i')
const uidReg = new RegExp(`^#?uid搜图(.*?)(第(${numReg})页)?$`, 'i')
const searchUser = new RegExp(`^#?user搜索(.*?)(第(${numReg})页)?$`, 'i')
const randomImgReg = new RegExp(`^#?来(${numReg})?张(好(康|看)(的|哒)|hkd|涩图)$|^#有内鬼$`)

export class NewPixiv extends plugin {
  constructor () {
    super({
      name: '派蒙pixiv',
      event: 'message',
      priority: 500,
      rule: [
        {
          reg: pidReg,
          fnc: 'searchPid'
        },
        {
          reg: rankingrReg,
          fnc: 'pixivRank'
        },
        {
          reg: tagReg,
          fnc: 'searchTags'
        },
        {
          reg: uidReg,
          fnc: 'searchUid'
        },
        {
          reg: searchUser,
          fnc: 'searchUser'
        },
        {
          reg: randomImgReg,
          fnc: 'vilipixRandomImg'
        },
        {
          reg: '^#?(查看|获取)?热门(t|T)(a|A)(g|G)$',
          fnc: 'popularTags'
        },
        {
          reg: '^#?看?看?相关作品(\\d+)$',
          fnc: 'relatedIllust'
        },
        {
          reg: '^#来(\\d+)?张推荐图$',
          fnc: 'illustRecommended'
        },
        {
          reg: '^#?(P|p)ximg(pro)?$',
          fnc: 'pximg'
        },
        {
          reg: '^#(p站|pixiv)(查看|更换)代理',
          fnc: 'setProxy',
          permission: 'master'
        },
        {
          reg: '^#(p站|pixiv)(开启|关闭)直连$',
          fnc: 'directConnection',
          permission: 'master'
        },
        {
          reg: '^#(p站|pixiv)登录信息$',
          fnc: 'loginInfo',
          permission: 'master'
        }
      ]
    })
  }

  // pid搜图
  async searchPid (e) {
    if (!await this._Authentication(e, 'sese')) return
    e.reply(Pixiv.startMsg)
    let regRet = pidReg.exec(e.msg)
    let filter = !e.isMaster && !setu.getR18(e.group_id)
    await Pixiv.illust(regRet[1], filter)
      .then(async res => {
        await e.reply(res.msg)
        res.img.length == 1 ? common.recallsendMsg(e, res.img) : common.recallSendForwardMsg(e, res.img, false)
      })
      .catch(err => common.handleException(e, err))
  }

  // p站排行榜
  async pixivRank (e) {
    let regRet = rankingrReg.exec(e.msg)
    if (!await this._Authentication(e, 'sese')) return
    if ((regRet[4] && !setu.getR18(e.group_id)) && !e.isMaster) {
      return e.reply(SWITCH_ERROR)
    }

    e.reply(Pixiv.startMsg)

    let page = common.translateChinaNum(regRet[6])
    await Pixiv.Rank(page, regRet[2], regRet[3], regRet[4])
      .then(res => common.recallSendForwardMsg(e, res))
      .catch(err => common.handleException(e, err))
  }

  /** 关键词搜图 */
  async searchTags (e) {
    let regRet = tagReg.exec(e.msg)
    if (!await this._Authentication(e, 'sese')) return
    if (regRet[1] && !await this._Authentication(e, 'sesepro')) return

    e.reply(Pixiv.startMsg)

    let page = common.translateChinaNum(regRet[4])
    await Pixiv[`${regRet[1] ? 's' : 'vilipixS'}earchTags`](regRet[2], page, !setu.getR18(e.group_id))
      .then(res => common.recallSendForwardMsg(e, res))
      .catch(err => common.handleException(e, err))
  }

  /** 获取热门tag */
  async popularTags (e) {
    if (!await this._Authentication(e, 'sese')) return
    e.reply(Pixiv.startMsg)
    await Pixiv.PopularTags()
      .then(res => common.recallSendForwardMsg(e, res))
      .catch(err => common.handleException(e, err))
  }

  /** 以uid搜图**/
  async searchUid (e) {
    if (!await this._Authentication(e, 'sese')) return

    e.reply(Pixiv.startMsg)

    let regRet = uidReg.exec(e.msg)
    let page = common.translateChinaNum(regRet[3])

    await Pixiv.userIllust(regRet[1], page, !setu.getR18(e.group_id))
      .then(res => common.recallSendForwardMsg(e, res))
      .catch(err => common.handleException(e, err))
  }

  // 随机原创插画
  async vilipixRandomImg (e) {
    if (!await this._Authentication(e, 'sese')) return
    e.reply(Pixiv.startMsg)
    let regRet = randomImgReg.exec(e.msg)

    let num = regRet[1] || 1
    if (num > 20) {
      e.reply('你要的太多辣，奴家只给你一张辣(•́へ•́ ╬)')
      num = 1
    }
    num = common.translateChinaNum(num)
    await Pixiv.vilipixRandomImg(num)
      .then(res => common.recallSendForwardMsg(e, res))
      .catch(err => common.handleException(e, err))
  }

  // 相关作品
  async relatedIllust (e) {
    if (!await this._Authentication(e, 'sese')) return

    e.reply(Pixiv.startMsg)

    let regRet = e.msg.match(/\d+/)
    await Pixiv.relatedIllust(regRet[0], !setu.getR18(e.group_id))
      .then(res => common.recallSendForwardMsg(e, res))
      .catch(err => common.handleException(e, err))
  }

  // p站单图
  async pximg (e) {
    let ispro = /pro/.test(e.msg)
    if (!await this._Authentication(e, 'sese')) return
    if (ispro && !await this._Authentication(e, 'sesepro', false)) return

    await Pixiv.pximg(ispro)
      .then(res => ispro ? common.recallSendForwardMsg(e, [res]) : common.recallsendMsg(e, res, false, { anony: true }))
      .catch(err => common.handleException(e, err))
  }

  /** 搜索用户 */
  async searchUser (e) {
    if (!await this._Authentication(e, 'sese')) return

    e.reply(Pixiv.startMsg)
    let regRet = e.msg.match(searchUser)
    let page = common.translateChinaNum(regRet[3])
    await Pixiv.searchUser(regRet[1], page, !setu.getR18(e.group_id))
      .then(res => common.recallSendForwardMsg(e, res))
      .catch(err => common.handleException(e, err))
  }

  /** 推荐作品 */
  async illustRecommended(e) {
    // 判断个人CD---------------------------------------------------------    
    let cd_time = 60
    let cd_time_batch = 300
    let currentTime = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
    let lastTime = await redis.get(`Yz:PaimongLaiFenTuiJianTu:${e.group_id}:${e.user_id}`);
    let PaimongLaiFenTuiJianTuBatchLastTime = await redis.get(`Yz:PaimongLaiFenTuiJianTuBatch:${e.group_id}:${e.user_id}`);
    if (PaimongLaiFenTuiJianTuBatchLastTime && !e.isMaster) {
      let seconds = moment(currentTime).diff(moment(PaimongLaiFenTuiJianTuBatchLastTime), "seconds");
      if ((cd_time_batch - seconds) <= 0) {
        await this.clearCD(e)
        return await e.reply(`派蒙数据库错误，已尝试修复，请重试`, false, { recallMsg: 30 });
      }
      return await e.reply(`人家刚刚找了太多啦，好累了，请等待${cd_time_batch - seconds}秒后再使用`, false, { recallMsg: 15 });
    }
    if (lastTime && !e.isMaster) {
      let seconds = moment(currentTime).diff(moment(lastTime), "seconds");
      if ((cd_time - seconds) <= 0) {
        await this.clearCD(e)
        return await e.reply(`派蒙数据库错误，已尝试修复，请重试`, false, { recallMsg: 30 });
      }
      return await e.reply(`人家累了，请等待${cd_time - seconds}秒后再使用`, false, { recallMsg: 15 });
    }

    // 判断权限
    if (!await this._Authentication(e, 'sese')) return
    e.reply(Pixiv.startMsg)
    let num = e.msg.match(/\d+/) || 1
    if (num > 10) {
      e.reply('嘤嘤嘤，人家累了，给你一张吧QAQ')
      num = 1
    }

    // 写入cd---------------------------------------------------------
    if (num == 1) {
      currentTime = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
      redis.set(`Yz:PaimongLaiFenTuiJianTu:${e.group_id}:${e.user_id}`, currentTime, { EX: cd_time });
    }
    else {
      currentTime = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
      redis.set(`Yz:PaimongLaiFenTuiJianTuBatch:${e.group_id}:${e.user_id}`, currentTime, { EX: cd_time_batch });
    }

    // 执行来份推荐图
    await Pixiv.illustRecommended(num).then(res => {
      res.length == 1
        ? common.recallsendMsg(e, res[0], true)
        : common.recallSendForwardMsg(e, res)
    }).catch(err => common.handleException(e, err))
  }

  // 更换代理
  async setProxy (e) {
    if (/查看/.test(e.msg)) return e.reply(await redis.get('yenai:proxy'))
    let proxy = e.msg.replace(/#|(p站|pixiv)更换代理/g, '').trim()
    if (new RegExp(`^[1-${ImageRPSS.length}]$`).test(proxy)) {
      proxy = ImageRPSS[proxy - 1]
    }
    if (!/([\w\d]+\.){2}[\w\d]+/.test(proxy)) {
      return e.reply('请检查代理地址是否正确')
    }
    logger.mark(`${e.logFnc}切换为${proxy}`)
    Config.modify('pixiv', 'pixivImageProxy', proxy)
    new Admin().SeSe_Settings(e)
  }

  /** 图片直连 */
  async directConnection (e) {
    let isSwitch = /开启/.test(e.msg)
    Config.modify('pixiv', 'pixivDirectConnection', isSwitch)
    new Admin().SeSe_Settings(e)
  }

  /** 登录信息 */
  async loginInfo (e) {
    await Pixiv.loginInfo()
      .then(res => e.reply(res))
      .catch(err => common.handleException(e, err))
  }

  async _Authentication (e, type = 'sese', limit = true) {
    if (e.isMaster) return true
    if (!Config.pixiv.allowPM && !e.isGroup) {
      e.reply('主人已禁用私聊该功能')
      return false
    }
    if (!common.checkSeSePermission(e, type)) return false
    if (limit && !await common.limit(e.user_id, 'pixiv', Config.pixiv.limit)) {
      e.reply('您已达今日「Pixiv」次数上限', true, { at: true })
      return false
    }
    return true
  }

  /**
  * 清除指定用户的cd
  * @return {*} 
  */
  async clearCD(e) {
    await redis.del(`Yz:PaimongLaiFenTuiJianTu`);
    await redis.del(`Yz:PaimongLaiFenTuiJianTu:${e.group_id}`);
    await redis.del(`Yz:PaimongLaiFenTuiJianTu:${e.group_id}:${e.user_id}`);
    await redis.del(`Yz:PaimongLaiFenTuiJianTuBatch:${e.group_id}:${e.user_id}`);
    return true;
  }
  
}
