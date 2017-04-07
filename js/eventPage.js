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
    else if (data && data.message) {
      callback(data)
    } else {
      callback(false)
    }
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
      if (data && data.message == 'timeout') {
        callback(false)
      } else {
        var channel = myChannel.json2channel(data, myRoom[room.domain])
        if (room.id != channel.id) {
          channel.slug = room.id
        }
        callback(channel)
      }
    })
  else
    callback(false)
}

function getChannel(room, callback) {
  var apiUrl = createApiUrl(room)
  if (apiUrl)
    fetchJson(apiUrl, function(data) {
      // 'when timeout try use local data'
      if (data && data.message == 'timeout') {
        var channel_key = room.domain + '-' + 'room.id'
        myChrome.getLocal(channel_key, function(data) {
          channel = data[channel_key] ? data[channel_key] : false
          callback(channel)
        })
      } else {
        var channel = myChannel.json2channel(data, myRoom[room.domain])
        if (room.id != channel.id) {
          channel.slug = room.id
        }
        callback(channel)
      }
    })
  else
    callback && callback(false)
}

function updateOnline() {
  myChannel.totalOnline()
  myChrome.setBadge(myChannel.online.toString())
}

function saveChannel(channel) {
  myChrome.setLocal(myChannel.exportChannel(channel))
  myChrome.setSync(myChannel.exportChannel(channel))
}

function saveChannels() {
  myChrome.setLocal({'channels': myChannel.exportChannels()})
  myChrome.setSync({'channels': myChannel.exportChannels()})
}

function addChannel(channel) {
  myChannel.updateChannel(channel)
  updateOnline()
  saveChannel(channel)
  saveChannels()
}

function deleteChannel(channel) {
  myChannel.deleteChannel(channel)
  updateOnline()
  saveChannels()
  myChrome.remove(channel, function(data) {
    console.log(data)
  })
}

function scheduleCallback(channel) {
  console.log('schedule callback', channel)
  if (channel && channel.domain) {
    myChannel.updateChannel(channel)
    updateOnline()
    saveChannel(channel)
  } else if (typeof channel == 'string') { // 'Updated'
    console.log(channel)
  } else {
    console.error('Unknown data', channel)
    invalidChannels()
  }
}

function scheduleUpdate(callback) {
  if (Date.now() - myChannel.timestamp < myChannel.recent) {
    console.log("scheduleUpdate start!")
    myChannel.timestamp = Date.now()
    var channels = myChannel.channels
    if (channels.length > 0) {
      channels.forEach(channel => getChannel(channel, callback))
    } else { // should never run. when local channels.length=0, schedule update shall just stop.
      // todo: sync everytime v.s. storage.onChanged(or use both)
      console.log('scheduleUpdate from sync')
      startUpdate(callback)
    }
  } else { // only trig when click browserAction
    console.log('Lasest Update at: ' + Date(myChannel.timestamp))
    callback && callback('Updated')
  }
}

function invalidChannels() {
  // clear sync && local
  myChrome.getSync('channels', function(data) {
    channels = data['channels'] ? data['channels'] : []
    channels.forEach(channel_key => {
      myChrome.getSync(channel_key, function(data) {
        var channel = data[channel_key] ? data[channel_key] : false
        if (!(channel && channel.domain && channel.id !== undefined && channel.id !== null)) {
          myChrome.remove(channel_key, function(data) {
            console.info('remove invalid data.', key, data)
          })
        }
      })
    })
  })

}

// alarm could  miss?
function onAlarm(alarm) {
  console.log('Got alarm', alarm)
  if (alarm && alarm.name == 'schedule') {
    scheduleUpdate(scheduleCallback)
  } else {
    console.error('Unknown alarm', alarm)
    if (alarm.name) {
      myChrome.removeAlarm(alarm.name)
    }
  }
}

function startUpdate(callback) {
  console.log("startUpdate start!")
  // overwrite myChannel.channels here?
  var arr = myChannel.channels
  myChannel.channels = []
  myChrome.getSync('channels', function(data) {
    channels = data['channels'] ? data['channels'] : []
    // todo: Does getSync work great when channels.length>>>>>>>>=511(maxitems when sync)?
    channels.forEach(channel_key => {
      myChrome.getSync(channel_key, function(data) {
        channel = data[channel_key] ? data[channel_key] : {}
        getChannel(channel, callback)
      })
    })
  })
}

// // DRY
// function mergeArray(one, two) {
//   var first = one.filter(i => {
//     return two.findIndex(j => {return j.domain == i.domain && j.id == i.id}) !== -1
//   })
//   two.forEach(k => {
//     var index = first.findIndex(l => {return k.domain == l.domain && k.id == l.id})
//     if (index !== -1) {
//       first.push(k)
//     }
//   })
//   return first
// }

function mergeChannel(array) {
  var expire = false
  var channels = myChannel.channels
  channels.forEach((one, i) => {
    var two = array[i]
    if (one.domain != two.domain || one.id != two.id) {
      expire = true
    }
  })
  // for (let one of channels) {
  //   if (one.domain != two.domain || one.id != two.id) {
  //     expire = true
  //     break
  //   }
  // }
  if (expire) {
    startUpdate(scheduleCallback)
  }
}

function onChanged(changes, namespace) {
  for (let key in changes) {
    var storageChange = changes[key]
    console.log('Storage key "%s" in namespace "%s" changed. ', key, namespace)
    console.log('Old value was: ', storageChange.oldValue, 'new value is: ', storageChange.newValue)
  }
  if (namespace == 'sync') {
    for (let key in changes) {
      var storageChange = changes[key]
      if (key == 'channels') {
        var arr = []
        storageChange.newValue.forEach(key => {
          arr.push({
            domain: key.split('-')[0],
            id: key.split('-')[1]
          })
        })
        mergeChannel(arr)
        // sync from other machine need update myChannel.channels
        // otherwise myChannel.channels shall be equal to storageChange.newValue

        // item order may change. sort by order?
        // myChannel.channels = mergeArray(arr, myChannel.channels)
        // save to local?
        // myChrome.setLocal({'channels': storageChange.newValue})
      } else if (key == 'setting') {
        console.log(storageChange.newValue)
      } else {
        myChannel.updateChannel(storageChange.newValue)
        // myChrome.setLocalByKey(key, storageChange.newValue)
      }
    }
  }
}

function onStart() {
  console.log("onStart")
  startUpdate(scheduleCallback)
  // todo: maybe better when startUpdate success
  // todo: periodInMinutes should be changable in settings
  myChrome.createAlarm('schedule', {periodInMinutes: 30})
}

function onInstalled() {
  console.log('onInstalled')
  onStart()
  myChrome.onAlarm(onAlarm)
}

myChrome.onStartup(onStart)
myChrome.onChanged(onChanged)
// todo: onInstall?
myChrome.onInstalled(onInstalled)
