//TODO 每次点击显示popup页面，都要重新生成dom，注册click事件，如何避免此过程，改成只更新dom？
// chrome.browserAction.onClicked.addListener(function (tab) {
//   chrome.browserAction.setPopup({
//     popup: 'html/popup.html'
//   })
// })

// xhr request
var QueuedHandler = function () {
  this.queue = [] // 请求队列
  this.requestInProgress = false // 判断当前是否己有别的请求
  this.retryDelay = 5 // 设置每次重新请求的时间，单位为秒
}

QueuedHandler.prototype = {
  request: function (method, url, callback, postVars, override) {
    // 如果没有设置为覆盖模式，而且当前已经有别的请求
    if (this.requestInProgress && !override) {
      this.queue.push({
        method: method,
        url: url,
        callback: callback,
        postVars: postVars
      })
    } else {
      this.requestInProgress = true
      var xhr = this.createXhrObject()
      var that = this

      var isTimeout = false,
        timer
      if (this.retryDelay > 0) {
        timer = setTimeout(function () {
          xhr.abort()
          isTimeout = true
        }, this.retryDelay * 1000 * 3)
      }

      xhr.onreadystatechange = function () {
        if ((xhr.readyState !== 4) || false) return
        if (xhr.status === 200) {
          callback.success(xhr.responseText, url)
            // 判断请求队列是否为空，如果不为空继续下一个请求
          that.advanceQueue(callback)
        } else if (xhr.status === 0) {
          callback.timeout(xhr.status)
          that.advanceQueue(callback)
        } else {
          callback.failure(xhr.status)
            // 每过一定时间重新请求
          setTimeout(function () {
            that.request(method, url, callback, postVars)
          }, that.retryDelay * 1000)
        }
        clearTimeout(timer)
      }

      xhr.open(method, url, true)
      if (method !== 'POST') postVars = null
      xhr.send(postVars)
    }
  },

  createXhrObject: function () {
    var methods = [
      function () {
        return new XMLHttpRequest()
      },
      function () {
        return new window.ActiveXObject('Msxml2.XMLHTTP')
      },
      function () {
        return new window.ActiveXObject('Microsoft.XMLHTTP')
      }
    ]
    for (var i = 0, len = methods.length; i < len; i++) {
      try {
        methods[i]()
      } catch (e) {
        continue
      }
      // 如果执行到这里就表明 methods[i] 是可用的
      this.createXhrObject = methods[i] // 记住这个方法，下次使用不用再判断
      return methods[i]()
    }

    throw new Error('SimpleHandler: Could not create an XHR object.')
  },

  advanceQueue: function (callback) {
    if (this.queue.length === 0) {
      this.requestInProgress = false
      callback.complete()
      return
    }
    var req = this.queue.shift()
    this.request(req.method, req.url, req.callback, req.postVars, true)
  }
}

var myRequest = new QueuedHandler()

// storage

var ChromeHandler = function () {

}

ChromeHandler.prototype = {
  set: function (obj, callback) {
    chrome.storage.sync.set(obj, function (data) {
      callback && callback(data)
    })
  },

  get: function (key, callback) {
    chrome.storage.sync.get(key, function (data) {
      callback && callback(data)
    })
  },

  remove: function (key, callback) {
    chrome.storage.sync.remove(key, function (data) {
      callback && callback(data)
    })
  },

  push: function (key, value, callback) {
    chrome.storage.sync.get(key, function (result) {
      var array = result[key] ? result[key] : []
      array.push(value)
      var obj = {}
      obj[key] = array
      chrome.storage.sync.set(obj, function (data) {
        callback && callback(data)
      })
    })
  },

  setBadge: function (text, callback) {
    chrome.browserAction.setBadgeText({
      text: myChannel.online.toString()
    })
    callback && callback()
  }
}

// channels
var ChannelHandler = function () {
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
}

ChannelHandler.prototype = {
  filter: function (key, text) {
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
  },

  getApiUrl: function (channel) {
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
  },

  getTitle: function (channel) {
    var data = channel.data
    var url = channel.url
    if (url.match(/douyu/)) {
      channel.title = data.owner_name + data.room_name
      this.setNickname(channel, data.owner_name)
    } else if (url.match(/bilibili/)) {
      channel.title = data.ANCHOR_NICK_NAME + data.ROOMTITLE
      this.setNickname(channel, data.ANCHOR_NICK_NAME)
    }
  },

  setNickname: function (channel, nickname) {
    if (channel.nickname === 'New' || !channel.nickname) {
      channel.nickname = nickname
    }
  },

  isNewChannel: function (channel) {
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
  },

  generateChannel: function (value) {
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
  },

  deleteChannel: function (index, callback) {
    var channels = this.channels
    channels.splice(index, 1)
    this.saveChannels(callback)
  },

  saveChannel: function (text, url, callback) { //找到对应的channel然后更新。考虑更改callback的方式以直接更新，不用找。
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
  },

  saveChannels: function (callback) {
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
  },

  addChannel: function (value, callback) { //TODO 无法同时添加多个？没有检验是否重复
    var channel = this.generateChannel(value)
    var url = this.getApiUrl(channel)
    this.newChannel = channel
    myRequest.request('GET', url, callback)
  },

  initChannels: function (callback) {
    var that = this
    chrome.storage.sync.get('channels', function (data) {
      that.channels = data['channels'] ? data['channels'] : that.defaultChannels
      callback && callback(data)
    })
  },

  fetchChannels: function (callback) {
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
          myRequest.request('GET', url, callback)
        }
      }
    })
  },

  isOnline: function (channel) {
    var data = channel.data ? channel.data : {}
    if (data.room_status == 1 || data.LIVE_STATUS == 'LIVE') {
      channel.online = true
    } else {
      channel.online = false
    }
  },

  totalOnline: function (callback) {
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
  },

  setBadge: function (callback) {
    var that = this
    chrome.browserAction.setBadgeText({
      text: that.online.toString()
    })
    callback && callback()
  },

  isExciting: function (url, callback) {
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
  },

  toggleExciting: function (url, callback) {
    // var naive = false
    var id = this.filter("id", url)
      // var channels = this.channels
      // var length = channels.length
      // var channel, index
      // for (var i = 0; i < length; i++) {
      //   channel = channels[i]
      //   if (channel.id === id || channel.alterId === id) {
      //     naive = true
      //     index = i
      //   }
      // }
    var naive = this.channels.find((channel) => channel.id == id || channel.alterId == id)
    if (naive) {
      this.deleteChannel(index, callback.complete)
    } else {
      this.addChannel(url, callback)
    }
  }
}

var myChannel = new ChannelHandler()

var Setting = function () {
  this.showHidden = true //是否显示hide的房间
  this.showOnline = false //只显示上线的房间
  this.interval = 1000 * 60 * 30 //刷新时间间隔
  this.disableNickname = false //不显示昵称
  this.diableName = false //不显示主播名
  this.disableExciting = false //不显示关注/已关注按钮
  this.disableTitle = false //不显示房间名
  this.customOnlineColor = false //自定义online的颜色，修改popup.css中的相应样式
  this.customOfflineColor = false //自定义offline的颜色
}

Setting.prototype = {
  toggleShowHidden: function () {
    this.showHidden = !this.showHidden
  },

  toggleShowOnline: function () {
    this.showOnline = !this.showOnline
  },

  toggleDisableNickname: function () {
    this.disableNickname = !this.disableNickname
  },

  toggleDisableName: function () {
    this.disableName = !this.disableName
  },

  toggleDisableExciting: function () {
    this.disableExciting = !this.disableExciting
  },

  toggleDisableTitle: function () {
    this.disableTitle = !this.disableTitle
  },

  changeInterval: function (interval) {
    this.interval = interval * 1000 //最小单位是秒
  },

  changeOnlineColor: function (color) {
    this.customOnlineColor = color
  },

  changeOfflineColor: function (color) {
    this.customOfflineColor = color
  },

  saveSetting: function () {
    var setting = {
      showHidden: this.showHidden,
      showOnline: this.showOnline,
      interval: this.interval,
      disableNickname: this.disableNickname,
      diableName: this.disableName,
      disableExciting: this.disableExciting,
      disableTitle: this.disableTitle,
      customOnlineColor: this.customOnlineColor,
      customOfflineColor: this.customOfflineColor
    }
    chrome.storage.sync.set({
      'setting': setting
    }, function (data) {
      console.log("设置已保存！")
      console.log(data)
    })
  },

  initSetting: function () {
    var that = this
    chrome.storage.sync.get('setting', function (data) {
      var setting = data.setting || {}
      for (var key in setting) {
        that[key] = setting[key]
      }
    })
  }
}

var mySetting = new Setting()

// start
var callbacks = {
  success: function (responseText, url) {
    myChannel.saveChannel(responseText, url)
  },
  failure: function (statusCode) {
    console.error("No Man's Room")
  },
  complete: function () {
    myChannel.fetching = false
    myChannel.timestamp = Date.now()
    myChannel.totalOnline()
    myChannel.saveChannels()
  },
  timeout: function (statusCode) {
    console.error("Timeout!")
  }
}

var 快活 = function () {
  console.log(new Date())
  myChannel.fetchChannels(callbacks)
  if (myChannel.start) {
    setTimeout(function () {
      // console.log(new Date())
      快活()
    }, myChannel.interval)
  }
}

快活()
