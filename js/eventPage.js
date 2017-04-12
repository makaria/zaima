var myChannel = new ChannelHandler()
var myChrome = new ChromeHandler()
var myQuest = new QueueHandler()
var myRoom = new Rooms()
var myBookmark = new BookmarkHandler()


// todo: use local replace unnecessary chrome.storage.sync

// bookmark function
// bookmark convert to channel && channel convert to bookmark
function importBookmarks(callback) {
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
        bookmark2channel(bookmark, callback)
      })
    })
  })
}

function exportBookmarks(name, callback) {
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

function bookmark2channel(bookmark, callback) {
  var room = myChannel.getDomainAndId(bookmark.url)
  getChannel(room, function(data) {
    updateChannel(room, data, function(channel) {
      if (channel) {
        if (channel.timeout) {
          console.info('Timeout, please try again later')
          callback(false)
        } else {
          var index = myChannel.getIndex(channel)
          if (index !== -1) {
            addChannel(channel)
            callback(channel)
          } else {
            callback(false)
          }
        }
      } else {
        console.info("invalid bookmark", bookmark, channel)
        callback(false)
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


// save channel change to storage
// update online number && online channels' nickname or name
function updateIcon() {
  myChannel.totalOnline()
  myChannel.updateTitle()
  myChrome.setBadge(myChannel.online.toString())
  myChrome.setTitle(myChannel.title)
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
  updateIcon()
  saveChannel(channel)
  saveChannels()
}

// remove channel from myChannel && storage
function deleteChannel(channel) {
  myChannel.deleteChannel(channel)
  updateIcon()
  saveChannels()
  myChrome.remove(channel, function(data) {
    console.log(data)
  })
  if (myChannel.channels.length == 0) {
    myChrome.removeAlarm('schedule', function(data) {
      console.info("remove alarm schedule because no channel exists", myChannel.channels)
    })
  }
}


// create url for fetch
function createApiUrl(room) {
  if (room && room.domain && myRoom[room.domain]) {
    return myRoom[room.domain].api.replace(/ROOMID/, room.id)
  } else {
    return false
  }
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

//callback for schedule update
function scheduleCallback(channel) {
  if (channel && channel.domain && channel.id !== null && channel.id !== undefined) {
    // channel may exists and not changed(schedule update), or not(start update)
    myChannel.addChannel(channel)
    // if channel doesn't change
    if (channel.timeout || Date.now() - channel.timestamp > myChannel.recent) {
      console.log('channel info not changed', channel)
    } else {
      updateIcon()
      // saveChannel(channel)
      myChrome.setLocal(myChannel.exportChannel(channel))
    }
  } else {
    console.error("schedule update error", channel)
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
        channel.timestamp = Date.now()
        callback(channel)
      } else {
        // console.error("unknown data", room, data, channel, json)
        callback(false)
      }
    } else if (data && data.message == 'timeout') {
      room.timeout = Date.now()
      callback(room)
    } else {
      // console.error('Unknown data', data, room)
      // invalidChannels()
      callback(false)
    }
  } else {
    callback(false)
  }
}

// regular update channels' info, interval is set by setting or default, a certain number.
function scheduleUpdate(callback) {
  if (Date.now() - myChannel.timestamp > myChannel.recent) {
    // maybe update shall not be so regular, add random interval
    console.log("scheduleUpdate start!")
    myChannel.timestamp = Date.now()
    var channels = myChannel.channels
    if (channels.length > 0) {
      channels.forEach(channel => {
        getChannel(channel, function(data) {
          updateChannel(channel, data, callback)
        })
      })
    } else { // should never run. when local channels.length=0, schedule update shall just stop.
      // todo: sync everytime v.s. storage.onChanged(or use both)
      console.log('scheduleUpdate from sync')
      startUpdate(callback)
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
    if (data && data.channels) {
      myChrome.getSync(data.channels, function(channels) {
        for (let key in channels) {
          let channel = channels[key]
          if (!(channel && channel.domain && channel.id !== undefined && channel.id !== null)) {
            myChrome.remove(key, function(data) {
              console.info('remove invalid data.', key, data)
            })
          }
        }
      })
    } else {
      console.info("No channels key in storage", data)
    }
  })
}

// start update channels' info
function startUpdate(callback) {
  console.log("startUpdate start!")
  myChrome.getSync('channels', function(data) {
    // overwrite myChannel.channels here?
    if (data && data.channels && data.channels.length > 0) {
      myChannel.channels = data.channels.map(key => {
        return {
          domain: key.split('-')[0],
          id: key.split('-')[1]
        }
      })
      myChannel.timestamp = Date.now()
      // myChrome.createAlarm('schedule', {periodInMinutes: 30})
      myChrome.getSync(data.channels, function(channels) {
        for (let key in channels) {
          let channel = channels[key]
          getChannel(channel, function(data) {
            updateChannel(channel, data, callback)
          })
        }
      })
    } else {
      console.info("No channels in storage", data)
    }
  })
}


function restoreOptions() {
  myChrome.getSync({
    'interval': true,
    'hidename': true,
    'hidetitle': true
  }, function(options) {
    myChannel.hidename = options.hidename
    myChannel.hidetitle = options.hidetitle
    if (options.interval && myChannel.interval != options.interval) {
      myChannel.interval = options.interval
    }
    myChrome.createAlarm('schedule', {periodInMinutes: ~~myChannel.interval})
  })
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
    startUpdate(scheduleCallback)
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
        var array = storageChange.newValue.map(key => {
          return {
            domain: key.split('-')[0],
            id: key.split('-')[1]
          }
        })
        mergeChannel(array)
      } else if (key == 'onlinefirst') {
        myChannel.onlinefirst = storageChange.newValue
      } else if (key == 'newtab') {
        myChannel.newtab = storageChange.newValue
      } else if (key == 'hidename') {
        myChannel.hidename = storageChange.newValue
      } else if (key == 'hidetitle') {
        myChannel.hidetitle = storageChange.newValue
      } else if (key == 'interval') {
        changeAlarm(storageChange.newValue)
      } else {
        console.log(key, storageChange)
        var room = {
          domain: key.split('-')[0],
          id: key.split('-')[1]
        }
        getChannel(room, function(data) {
          updateChannel(room, data, function(channel) {
            if (channel && !channel.timeout) {
              myChannel.addChannel(channel)
            }
          })
        })
      }
    }
  }
}

// change update interval
function changeAlarm(interval) {
  console.log('change alarm?', interval, myChannel.interval)
  if (interval && myChannel.interval != interval) {
    myChannel.interval = interval
    myChrome.removeAlarm('schedule', function(data) {
      myChrome.createAlarm('schedule', {periodInMinutes: ~~myChannel.interval})
    })
  }
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

// extension/chrome start
function onStart() {
  console.log("onStart")
  startUpdate(scheduleCallback)
  // todo: maybe better when startUpdate success
  // todo: periodInMinutes should be changable in settings
  restoreOptions()
  // myChrome.createAlarm('schedule', {periodInMinutes: 30})
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
