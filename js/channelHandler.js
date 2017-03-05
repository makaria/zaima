// channels
class ChannelHandler {
  constructor() {
    this.defaultChannels = [{
      url: 'http://www.douyu.com/63375',
      nickname: 'SteamParty',
      title: '',
      domain: 'douyu',
      id: '63375',
      alterId: null,
      online: false,
      hide: false, //暂时不想知道这个房间是否online。获取数据时忽略此房间
      color: false, //自定义online颜色
      data: null
    }, {
      url: 'http://live.bilibili.com/41515',
      nickname: '有C',
      title: '',
      domain: 'bilibili',
      id: '41515',
      alterId: null,
      online: false,
      hide: false,
      color: false,
      data: null
    }]
    this.api = {
      douyu: 'http://open.douyucdn.cn/api/RoomApi/room/',
      bilibili: 'http://live.bilibili.com/live/getInfo?roomid='
    }
    this.online = 0
    this.newChannel = null
    this.channels = []
    this.interval = 1000 * 60 * 30 //每隔一定时间间隔重新获取数据
    this.recent = 1000 * 60 * 5 //如果最近刚获取过数据则不再请求
    this.start = true
    this.fetching = false
    this.timestamp = 0
    this.myRequest = new QueueHandler()
  }

  filter(key, text) {
    if (text.match(/douyu/) || text.match(/live\.bilibili/)) {
      var reg = null
      var match = null
      var result = null
      if (key === 'id') {
        reg = /(\.com\/(.*))|(\.tv\/(.*))|(\.tv\/star\/)(.*)/
      } else if (key === 'domain') {
        reg = /\.(.*)\.com|\.(.*)\.tv/
      };
      match = text.match(reg)
      if (match) {
        var length = match.length - 1
        for (var i = length; i--; i > 0) {
          result = match[i]
          if (result !== undefined) {
            return result
          }
        }
      }
    }
  }

  getApiUrl(channel) {
    if (channel.apiUrl) {
      return channel.apiUrl
    } else {
      var domain = channel.domain
      var id = channel.id
      if (id && domain) {
        channel.apiUrl = this.api[domain] + id
        return channel.apiUrl
      }
    }
  }

  getTitle(channel) {
    var data = channel.data
    var url = channel.url
    if (url.match(/douyu/)) {
      channel.title = data.owner_name + data.room_name
      this.setNickname(channel, data.owner_name)
    } else if (url.match(/bilibili/)) {
      channel.title = data.ANCHOR_NICK_NAME + data.ROOMTITLE
      this.setNickname(channel, data.ANCHOR_NICK_NAME)
    }
  }

  setNickname(channel, nickname) {
    if (channel.nickname === 'New' || !channel.nickname) {
      channel.nickname = nickname
    }
  }

  isNewChannel(channel) {
    var isNew = true
    var channels = this.channels
    var length = channels.length
    var data = channel.data
    var id = data.room_id || data.ROOMID
    // 更改id&&别名id&&apiUrl中的id
    if (id !== channel.id) {
      channel.alterId = channel.id
      channel.id = id
      channel.apiUrl = this.api[channel.domain] + id
    }
    for (var i = 0; i < length; i++) {
      if (channels[i].apiUrl === channel.apiUrl) {
        isNew = isNew && false
      }
    }
    if (isNew) {
      this.channels.push(channel)
    }
    this.newChannel = null
  }

  generateChannel(value) {
    var id = this.filter('id', value)
    var domain = this.filter('domain', value)
    var channel = {
      apiUrl: this.api[domain] + id,
      nickname: 'New',
      domain: domain,
      id: id,
      data: null
    }
    // 补全url，有必要吗？
    if (domain === 'douyu') {
      channel.url = 'http://www.douyu.com/' + id
    } else if (domain === 'bilibili') {
      channel.url = 'http://live.bilibili.com/' + id
    }
    return channel
  }

  deleteChannel(channel, callback) {
    var channels = this.channels
    var index = channels.indexOf(channel)
    if (index !== -1) {
      channels.splice(index, 1)
      this.saveChannels(callback)
    }
  }

  saveChannel(text, url, callback) { //找到对应的channel然后更新。考虑更改callback的方式以直接更新，不用找。
    var obj = JSON.parse(text)
    var data = obj.data,
      channel
    if (this.newChannel) {
      channel = this.newChannel
      channel.data = data
      this.isOnline(channel)
      this.getTitle(channel, url)
      this.isNewChannel(channel)
    } else {
      var channels = JSON.parse(JSON.stringify(this.channels))
      var length = channels.length
      for (var i = 0; i < length; i++) {
        channel = channels[i]
        if (channel.apiUrl === url) {
          channel.data = data
          var id = data.room_id || data.ROOMID
          // 更改id&&别名id&&apiUrl中的id
          if (id !== channel.id) {
            channel.alterId = channel.id
            channel.id = id
            channel.apiUrl = this.api[channel.domain] + id
          }
          this.isOnline(channel)
          this.getTitle(channel)
          this.channels[i] = channel
        }
      }
    }
  }

  saveChannels(callback) {
    var that = this
    var obj = {}
    var channels = JSON.parse(JSON.stringify(this.channels))
    var length = channels.length
    for (var i = 0; i < length; i++) {
      var channel = channels[i]
      channel.data = null // 否则数据太大会超过限制无法存储
    }
    obj['channels'] = channels
    chrome.storage.sync.set(obj, function (data) {
      callback && callback()
    })
  }

  addChannel(value, callback) { //TODO 无法同时添加多个？没有检验是否重复
    var channel = this.generateChannel(value)
    var url = this.getApiUrl(channel)
    this.newChannel = channel
    this.myRequest.request('GET', url, callback)
  }

  initChannels(callback) {
    var that = this
    chrome.storage.sync.get('channels', function (data) {
      that.channels = data['channels'] ? data['channels'] : that.defaultChannels
      callback && callback(data)
    })
  }

  fetchChannels(callback) {
    var that = this
    this.fetching = true
    this.initChannels(function (data) {
      var channels = that.channels
      var length = channels.length
      // console.log(channels)
      var channel
      for (var i = 0; i < length; i++) {
        channel = channels[i]
        var url = that.getApiUrl(channel)
        // console.log(url)
        if (url) {
          that.myRequest.request('GET', url, callback)
        }
      }
    })
  }

  isOnline(channel) {
    var data = channel.data ? channel.data : {}
    if (data.room_status == 1 || data.LIVE_STATUS == 'LIVE') {
      channel.online = true
    } else {
      channel.online = false
    }
  }

  totalOnline(callback) {
    this.online = 0
    var channels = this.channels
    var length = channels.length
    var channel
    for (var i = 0; i < length; i++) {
      channel = channels[i]
      if (channel.online) {
        this.online += 1
      }
    }
    this.setBadge()
    callback && callback()
  }

  setBadge(callback) {
    var that = this
    chrome.browserAction.setBadgeText({
      text: that.online.toString()
    })
    callback && callback()
  }

  isExciting(url, callback) {
    var naive = false
    var id = this.filter('id', url)
    if (id) {
      var channels = this.channels
      var length = channels.length
      var channel
      for (var i = 0; i < length; i++) {
        channel = channels[i]
        // 此处id为String，但是channel.id是Number，不能用===
        if (channel.id == id || channel.alterId == id) {
          naive = true
        }
      }
    } else {
      naive = 'none'
    }
    callback && callback(naive)
  }

  toggleExciting(url, callback) {
    var id = this.filter("id", url)
    var naive = this.channels.find((channel) => channel.id == id || channel.alterId == id)
    if (naive) {
      this.deleteChannel(naive, callback.complete)
    } else {
      this.addChannel(url, callback)
    }
  }
}
