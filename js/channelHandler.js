'use strict'

// channels, 异步操作移至eventPage
class ChannelHandler {
  constructor () {
    // this.defaultChannels = [{
    //   domain: 'douyu', //属于哪个网站
    //   id: '63375', //数字，必须有
    //   online: false, //是否在线
    //   name: '63375',//字符串，主播名, 有时候可以替代id.
    //   title: '', //当前房间名称，一般主播会改来改去，rua
    //   slug: '', //字符串，房间url别名，可以替代id
    //   nickname: 'SteamParty', //自定义昵称，所有自定义内容（nickname/hide/color）统一放到setting里？
    //   // avatar: '', //头像图片地址，B站没有
    //   start_time: '', // 上次/本次开播时间。用于显示主播最近直播时段(仅部分网站)（某些主播太摸鱼了）
    //   end_time: '', // 上次关播时间
    //   loading: false, // 是否正在更新直播间信息
    //   data: null //json返回的原始数据，可以不放在这。
    // }]
    this.online = 0 // 关注的主播在线人数
    this.title = '' // 在线的主播名
    this.channels = [] // 显示popup用
    this.interval = 30 // minutes, 每隔一定时间间隔重新获取数据
    this.recent = 1000 * 60 * 5 // 如果最近刚获取过数据则不再请求
    // this.start = true
    // this.fetching = false
    this.timestamp = 0
    this.newtab = true
    this.onlinefirst = true
    this.hide_lastonline = false
    this.hidename = false
    this.hidetitle = false
    this.restored = false
  }

  // too many "if"!

  // 提取网站名，如bilibili,panda.正则获取.com或.tv前面的内容
  getDomainAndId (url) {
    var reg1 = /(.+)\.com\/(.+)/ // 把.com前后的字符串提取出来
    var reg2 = /(.+)\.tv\/(.+)/ // 把.tv后的字符串提取出来
    var reg3 = /(.+)\.tv\/v\/(.+)/ // 针对quanmin.tv的slug网址
    var regs = [reg3, reg2, reg1]
    for (let reg of regs) {
      var result = url.match(reg)
      if (result && result[1] && result[2] !== undefined && result[2] !== null) {
        return {domain: result[1].replace(/.*\./, ''), id: result[2].replace(/\/.*/, '')}
      }
    }
    return false
  }

  // 转化成统一的date格式
  date2string (date) {
    // 如果是纯数字('1490999000'),则new Date(date*1000)
    // 如果是string('2017-03-14 14:06'),则new Date(date)
    // 预设只有两种格式，有其他格式需要改api.
    if (date && !isNaN(date)) {
      return new Date(date * 1000)
    } else {
      return date
    }
  }

  // http://stackoverflow.com/questions/6393943/convert-javascript-string-in-dot-notation-into-an-object-reference
  getByDot (obj, key, value) {
    if (!key || !obj) {
      return value
    } else if (typeof key === 'string') {
      return this.getByDot(obj, key.split('.'), value)
    } else if (key.length === 1) {
      return obj[key[0]]
    } else if (key.length === 0) {
      return value
    } else {
      return this.getByDot(obj[key[0]], key.slice(1), value)
    }
  }

  // 将返回的数据格式化成统一的格式以作为dom的数据
  json2channel (data, channel) {
    if (!channel || !data) {
      return false
    }
    var online = false
    // 没有用===，是为了 "1"==1
    if (this.getByDot(data, channel.keys.online.key) === channel.keys.online.on) {
      online = true
    }
    return {
      domain: channel.domain,
      id: this.getByDot(data, channel.keys.id), // 数字id，可能与room.id(有可能是slug)不同
      online: online,
      name: this.getByDot(data, channel.keys.name),
      slug: this.getByDot(data, channel.keys.slug),
      title: this.getByDot(data, channel.keys.title),
      url: channel.url.replace(/:id/, this.getByDot(data, channel.keys.id)),
      apiUrl: channel.api.replace(/ROOMID/, this.getByDot(data, channel.keys.id)),
      // nickname: 'SteamParty',
      avatar: this.getByDot(data, channel.keys.avatar),
      start_time: this.date2string(this.getByDot(data, channel.keys.start_time)),
      end_time: this.date2string(this.getByDot(data, channel.keys.end_time)),
      // loading: false,
      data: data
    }
  }

  isExists (one, two) {
    return one.domain === two.domain && ~~one.id === ~~two.id
  }

  getIndex (channel) {
    return this.channels.findIndex(item => this.isExists(item, channel))
  }

  addChannel (channel, index) {
    if (index !== undefined && index !== null) {
      this.channels.splice(index, 0, channel)
    } else {
      const newIndex = this.getIndex(channel)
      if (newIndex !== -1) {
        this.channels[newIndex] = channel
      } else {
        this.channels.push(channel)
      }
    }
  }

  deleteChannel (channel) {
    var index = this.getIndex(channel)
    if (index !== -1) {
      this.channels.splice(index, 1)
    } else {
      console.error(channel, 'not found in', this.channels)
    }
  }

  // 保存一个channel数据，key为domain+id，value即生成的channel对象
  exportChannel (channel) {
    var channelID = channel.domain + '-' + channel.id
    var size = JSON.stringify(channel).length // 小于8192
    var obj = {}
    // item's key+value.length must < 8192 for storage.sync
    if ((size + channelID.length) < 8100) {
      obj[channelID] = channel
    } else {
      obj[channelID] = JSON.parse(JSON.stringify(channel))
      obj[channelID].data = null
    }
    return obj
  }

  // 保存所有的channels数据，一个只含有channel的domain+id信息的数组
  exportChannels () {
    var channels = []
    var invalid = false
    for (let channel of this.channels) {
      if (channel && channel.domain && channel.id !== undefined && channel.id !== null) {
        channels.push(channel.domain + '-' + channel.id)
      } else {
        invalid = true
      }
    }
    if (invalid) {
      this.validChannels()
    }
    return channels
  }

  // this shall never run
  validChannels () {
    var validChannels = this.channels.filter(channel => {
      console.log(channel)
      return channel && channel.domain && channel.id !== undefined && channel.id !== null
    })
    console.error(validChannels, this.channels)
    this.channels = validChannels
  }

  totalOnline () {
    var online = 0
    for (let channel of this.channels) {
      if (channel.online) {
        online += 1
      }
    }
    this.online = online
  }

  updateTitle () {
    var title = ''
    for (let channel of this.channels) {
      if (channel.online) {
        if (channel.nickname !== undefined) {
          title += ' '
          title += channel.nickname
        } else {
          title += ' '
          title += channel.name
        }
      }
    }
    this.title = title
  }
}
