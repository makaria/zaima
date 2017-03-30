var myChannel = new ChannelHandler()
var myChrome = new ChromeHandler()
var myQuest = new QueueHandler()
var myRoom = new Rooms()

// start
 // 返回url的fetch结果
function fetchJson(url, callback) {
  myQuest.fetchOne(url, function(data) {
    if (data && data.data)
      callback(data.data)
    else if (data && data.no) // quanmin
      callback(data)
    else
      callback(false)
  })
}

function createApiUrl(room) {
  if (room && room.domain && myRoom[room.domain])
    return myRoom[room.domain].api.replace(/ROOMID/, room.id)
  else
    return false
}

function isChannel(url, callback) {
  var room = myChannel.getDomainAndId(url)
  var apiUrl = createApiUrl(room)
  if (room && apiUrl)
    fetchJson(apiUrl, function(data) {
      if (data)
        callback(room)
      else
        callback(false)
    })
  else
    callback(false)
}

function getChannel(room, callback) {
  var apiUrl = createApiUrl(room)
  if (apiUrl)
    fetchJson(apiUrl, function(json) {
      var channel = myChannel.json2channel(json, myRoom[room.domain])
      if (channel) {
        var channel_key = channel.domain + '-' + channel.id
        myChannel.updateChannel(channel)
        myChannel.totalOnline()
        myChrome.setBadge(myChannel.online.toString())
        myChrome.set(myChannel.saveChannel(channel))
        myChrome.set({'channels': myChannel.saveChannels()})
        callback && callback(channel)
      } else
        callback && callback(false)
    })
  else
    callback && callback(false)
}

function scheduleUpdate(callback) {
  console.log("scheduleUpdate start!")
  var recent = false
  if (Date.now() - myChannel.timestamp < myChannel.recent) {
    recent = true
  }
  myChannel.timestamp = Date.now()
  myChrome.get('channels', function(data) {
    var channels = data['channels'] ? data['channels'] : []
    for (let channel_key of channels) {
      myChrome.get(channel_key, function(item) {
        if (recent) {
          callback(item[channel_key])
        } else {
          getChannel(item[channel_key], callback)
        }
      })
    }
  })
}

function onAlarm(alarm) {
  scheduleUpdate()
}

function onInit() {
  console.log("onInit")
  scheduleUpdate()
  myChrome.setBadge(myChannel.online.toString())
  myChrome.createAlarm('init', {periodInMinutes: 30})
  myChrome.onAlarm(onAlarm)
}

onInit()
