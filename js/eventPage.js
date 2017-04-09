var myChannel = new ChannelHandler()
var myChrome = new ChromeHandler()
var myQuest = new QueueHandler()
var myRoom = new Rooms()
var myBookmark = new BookmarkHandler()

// save channel change to storage
// update online number
function updateOnline() {
  myChannel.totalOnline()
  myChrome.setBadge(myChannel.online.toString())
}

// save channel to storage
function saveChannel(channel) {
  myChrome.setLocal(myChannel.exportChannel(channel))
  myChrome.setSync(myChannel.exportChannel(channel))
}

// save myChannel.channels to storage
function saveChannels() {
  myChrome.setLocal({'channels': myChannel.exportChannels()})
  myChrome.setSync({'channels': myChannel.exportChannels()})
}

// add channel for myChannel && storage
function addChannel(channel) {
  myChannel.addChannel(channel)
  updateOnline()
  saveChannel(channel)
  saveChannels()
}

// remove channel from myChannel && storage
function deleteChannel(channel) {
  myChannel.deleteChannel(channel)
  updateOnline()
  saveChannels()
  myChrome.remove(channel, function(data) {
    console.log(data)
  })
}


// create url for fetch
function createApiUrl(room) {
  if (room && room.domain && myRoom[room.domain])
    return myRoom[room.domain].api.replace(/ROOMID/, room.id)
  else
    return false
}

// get channel' info, from fetch or storage.local
function getChannel(room, callback) {
  if (room) {
    var apiUrl = room.apiUrl || createApiUrl(room)
    if (apiUrl) {
      myQuest.fetchOne(apiUrl, callback)
    } else {
      callback(false)
    }
  } else {
    callback(false)
  }
}



// after schedule update, there are something to do
// convert data to a new channel, room is old channel.
function updateChannel(room, data, callback) {
  console.log('schedule update channel')
  if (room && room.domain) {
    if (data && (data.data || data.no)) {
      var json = data.data || data.no
      var channel = myChannel.json2channel(json, myRoom[room.domain])
      if (channel && channel.id !== null && channel.id !== undefined) {
        if (channel.id != room.id) {
          channel.slug = room.id
        }
        if (callback) {
          callback(channel)
        } else {
          myChannel.addChannel(channel)
          updateOnline()
          saveChannel(channel)
        }
      } else {
        console.error("unknown data", room, data, channel, json)
        callback && callback(false)
      }
    } else if (data && data.message == 'timeout') {
      room.timeout = Date.now()
      if (callback) {
        callback(room)
      } else {
        myChannel.addChannel(room)
        updateOnline()
        saveChannel(room)
      }
    } else {
      console.error('Unknown data', data, room)
      invalidChannels()
      callback && callback(false)
    }
  } else {
    callback && callback(false)
  }
}

// regular update channels' info, interval is set by setting or default, a certain number.
function scheduleUpdate() {
  if (Date.now() - myChannel.timestamp > myChannel.recent) {
    // maybe update shall not be so regular, add random interval
    console.log("scheduleUpdate start!")
    myChannel.timestamp = Date.now()
    var channels = myChannel.channels
    if (channels.length > 0) {
      channels.forEach(channel => {
        getChannel(channel, function(data) {
          updateChannel(channel, data)
        })
      })
    } else { // should never run. when local channels.length=0, schedule update shall just stop.
      // todo: sync everytime v.s. storage.onChanged(or use both)
      console.log('scheduleUpdate from sync')
      startUpdate()
    }
  } else { // only trig when click browserAction
    console.log('Lasest Update at: ' + new Date(myChannel.timestamp))
    // callback && callback('Updated')
  }
}

// clear invalid channel, why those channels exist?
function invalidChannels() {
  // clear sync && local
  console.error('clear invalid channels')
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

// start update channels' info
function startUpdate() {
  console.log("startUpdate start!")
  myChrome.getSync('channels', function(data) {
    // overwrite myChannel.channels here?
    myChannel.channels = []
    myChannel.timestamp = Date.now()
    channels = data['channels'] ? data['channels'] : []
    // todo: Does getSync work great when channels.length>>>>>>>>=511(maxitems when sync)?
    channels.forEach(channel_key => {
      myChrome.getSync(channel_key, function(data) {
        let channel = data[channel_key] ? data[channel_key] : false
        getChannel(channel, function(data) {
          updateChannel(channel, data)
        })
      })
    })
  })
}


// bookmark function
// bookmark convert to channel && channel convert to bookmark
function importBookmark() {
  var domains = []
  for (let domain in myRoom) {
    if (domain && myRoom[domain].url) {
      domains.push(domain)
    }
  }
  console.log(domains)
  domains.forEach(domain => {
    myBookmark.search(domain, function(bookmarks) {
      bookmarks.forEach(bookmark => {
        bookmark2channel(bookmark)
      })
    })
  })
}

function exportBookmark(name, callback) {
  var channels = myChannel.channels
  if (channels.length > 0) {
    var folder = {
      parentId: '1',
      title: name || 'Live Stream',
    }
    myBookmark.create(folder, function(data) {
      console.log(data)
      var parentId = data.id
      channels.forEach(channel => {
        channel2bookmark(channel, parentId, callback)
      })
    })
  }
}

function bookmark2channel(bookmark) {
  var room = myChannel.getDomainAndId(bookmark.url)
  getChannel(room, function(data) {
    updateChannel(room, data, function(channel) {
      if (channel) {
        addChannel(channel)
      } else {
        console.info("invalid bookmark", bookmark, channel)
      }
    })
  })

}

function channel2bookmark(channel, parentId, callback) {
  var bookmark = {
    parentId: parentId,
    title: channel.title,
    url: channel.url
  }
  myBookmark.create(bookmark, callback)
}


// update channels from other machine or not
function mergeChannel(array) {
  var expire = false
  var channels = myChannel.channels
  channels.forEach((one, i) => {
    var two = array[i]
    if (one.domain != two.domain || one.id != two.id) {
      expire = true
      // shall break here, but forEach don't
    }
  })
  if (expire) {
    startUpdate()
  }
}

// storage.onChanged
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
        var array = []
        storageChange.newValue.forEach(key => {
          array.push({
            domain: key.split('-')[0],
            id: key.split('-')[1]
          })
        })
        mergeChannel(array)
      } else if (key == 'setting') {
        console.log(storageChange.newValue)
      } else {
        myChannel.addChannel(storageChange.newValue)
      }
    }
  }
}

// change update interval
function changeAlarm(interval) {
  if (!interval) {
    interval = myChannel.interval
  } else if (interval < 5) { //better apply this limit in input && popup a warn message
    interval = 5
  }
  myChrome.removeAlarm('schedule', function(data) {
    myChrome.createAlarm('schedule', {periodInMinutes: interval})
  })
}

// alarm could  miss?
function onAlarm(alarm) {
  console.log('Got alarm', alarm)
  if (alarm && alarm.name == 'schedule') {
    scheduleUpdate()
  } else {
    console.error('Unknown alarm', alarm)
    if (alarm.name) {
      myChrome.removeAlarm(alarm.name)
    }
  }
}

// extension/chrome start
function onStart() {
  console.log("onStart")
  startUpdate()
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
