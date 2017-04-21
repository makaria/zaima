'use strict'

var myChannel = new ChannelHandler()
var myChrome = new ChromeHandler()
var myQuest = new QueueHandler()
var myRoom = new Rooms()
var myBookmark = new BookmarkHandler()

// todo: use local replace unnecessary chrome.storage.sync
// todo: myChannel will be reset after background page is inactive for a few time.

// bookmark function
// bookmark convert to channel && channel convert to bookmark
function importBookmarks (callback) {
  console.log('import channels from bookmarks')
  var domains = []
  for (let domain in myRoom) {
    if (domain && myRoom[domain].url) {
      domains.push(domain)
    }
  }
  console.log(domains)
  domains.forEach(domain => {
    myBookmark.search(domain, function (bookmarks) {
      console.log(domain, bookmarks)
      bookmarks.forEach(bookmark => {
        bookmark2channel(bookmark, callback)
      })
    })
  })
}

function exportBookmarks (name, callback) {
  console.log('export channel to bookmarks')
  var channels = myChannel.channels
  if (channels.length > 0) {
    var folder = {
      parentId: '1',
      title: name || myChrome.getMessage('bookmarks_folder_name')
    }
    myBookmark.create(folder, function (data) {
      console.log(data)
      var parentId = data.id
      channels.forEach(channel => {
        channel2bookmark(channel, parentId, callback)
      })
    })
  }
}

function bookmark2channel (bookmark, callback) {
  var room = myChannel.getDomainAndId(bookmark.url)
  getChannel(room, function (data) {
    updateChannel(room, data, function (channel) {
      if (channel) {
        if (channel.timeout) {
          console.info('Timeout, please try again later', bookmark, room, channel)
          callback(false)
        } else {
          var index = myChannel.getIndex(channel)
          if (index === -1) {
            addChannel(channel)
            callback(channel)
          } else {
            console.log('channel already exist', bookmark, channel, index)
            callback(false)
          }
        }
      } else {
        console.info('invalid bookmark', bookmark, channel)
        callback(false)
      }
    })
  })
}

function channel2bookmark (channel, parentId, callback) {
  var bookmark = {
    parentId: parentId,
    title: channel.title,
    url: channel.url
  }
  myBookmark.create(bookmark, callback)
}

// save channel change to storage
// update online number && online channels' nickname or name
function updateIcon () {
  myChannel.totalOnline()
  myChannel.updateTitle()
  myChrome.setBadge(myChannel.online.toString())
  myChrome.setTitle(myChannel.title)
}

// save channel to storage
function saveChannel (channel) {
  if (channel) {
    myChrome.setLocal(myChannel.exportChannel(channel))
    myChrome.setSync(myChannel.exportChannel(channel))
  } else {
    for (let channel of myChannel.channels) {
      if (channel) {
        saveChannel(channel)
      } else {
        myChannel.validChannels()
      }
    }
  }
}

// save myChannel.channels to storage
function saveChannels () {
  myChrome.setLocal({'channels': myChannel.exportChannels()})
  myChrome.setSync({'channels': myChannel.exportChannels()})
}

// add channel for myChannel && storage
function addChannel (channel, index) {
  myChannel.addChannel(channel, index)
  updateIcon()
  saveChannel(channel)
  saveChannels()
}

// remove channel from myChannel && storage
function deleteChannel (channel) {
  myChannel.deleteChannel(channel)
  updateIcon()
  saveChannels()
  myChrome.remove(channel, function (data) {
    console.log(data)
  })
  if (myChannel.channels.length === 0) {
    myChrome.removeAlarm('schedule', function (data) {
      console.info('remove alarm schedule because no channel exists', myChannel.channels)
    })
  }
}

// create url for fetch
function createApiUrl (room) {
  if (room && room.domain && myRoom[room.domain]) {
    return myRoom[room.domain].api.replace(/ROOMID/, room.id)
  } else {
    return false
  }
}

// get channel' info, from fetch or storage.local
function getChannel (room, callback) {
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

// callback for schedule update
function scheduleCallback (channel) {
  console.log('schedule update callback')
  if (channel && channel.domain && channel.id !== null && channel.id !== undefined) {
    // channel may exists and not changed(schedule update), or not(start update)
    myChannel.addChannel(channel)
    // if channel doesn't change
    if (channel.timeout) {
      console.log('Timeout when get channel info', channel)
      // when reload extension, need to run this
    } else {
      updateIcon()
      // saveChannel(channel)
      myChrome.setLocal(myChannel.exportChannel(channel))
    }
  } else {
    console.error('schedule update error', channel)
  }
}

// after schedule update, there are something to do
// convert data to a new channel, room is old channel.
function updateChannel (room, data, callback) {
  console.log('schedule update channel')
  if (room && room.domain) {
    if (data && (data.data || data.no)) {
      var json = data.data || data.no
      var channel = myChannel.json2channel(json, myRoom[room.domain])
      if (channel && channel.id !== null && channel.id !== undefined) {
        if (channel.id !== room.id) {
          channel.slug = room.id
        }
        channel.nickname = room.nickname
        channel.timestamp = Date.now()
        callback(channel)
      } else {
        // console.error("unknown data", room, data, channel, json)
        callback(false)
      }
    } else if (data && data.message === 'timeout') {
      console.log('timeout', room, data)
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
function scheduleUpdate (callback) {
  console.log('scheduleUpdate start!')
  // "Use a repeating alarm so that it fires again if there was a problem
  // setting the next alarm. "
  // So what is the problem? anyway overwrite alarm everytime schedule update start.
  myChrome.createAlarm('refresh', {periodInMinutes: ~~myChannel.interval})
  if (Date.now() - myChannel.timestamp > myChannel.recent) {
    // maybe update shall not be so regular, add random interval
    myChannel.timestamp = Date.now()
    var channels = myChannel.channels
    if (channels.length > 0) {
      channels.forEach(channel => {
        getChannel(channel, function (data) {
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
    myChannel.channels.forEach(channel => {
      callback(channel)
    })
    // callback && callback('Updated')
  }
  // check onAlarm has eventListener
  myChrome.hasListeners(function (data) {
    if (!data) {
      console.error('alarm has no event listener')
      myChrome.onAlarm(onAlarm)
    }
  })
}

// clear invalid channel, why those channels exist?
function invalidChannels () {
  // clear sync && local
  console.error('clear invalid channels')
  myChrome.getSync('channels', function (data) {
    if (data && data.channels) {
      myChrome.getSync(data.channels, function (channels) {
        for (let key in channels) {
          let channel = channels[key]
          if (!(channel && channel.domain && channel.id !== undefined && channel.id !== null)) {
            myChrome.remove(key, function (data) {
              console.info('remove invalid data.', key, data)
            })
          }
        }
      })
    } else {
      console.info('No channels key in storage', data)
    }
  })
}

// start update channels' info
function startUpdate (callback) {
  console.log('startUpdate start!')
  myChrome.getSync('channels', function (data) {
    // overwrite myChannel.channels here?
    if (data && data.channels && data.channels.length > 0) {
      myChannel.channels = data.channels.map(key => {
        return {
          domain: key.split('-')[0],
          id: ~~key.split('-')[1]
        }
      })
      myChannel.timestamp = Date.now()
      // myChrome.createAlarm('schedule', {periodInMinutes: 30})
      myChrome.getSync(data.channels, function (channels) {
        for (let key in channels) {
          let channel = channels[key]
          getChannel(channel, function (data) {
            updateChannel(channel, data, callback)
          })
        }
      })
    } else {
      console.info('No channels in storage', data)
    }
  })
}

function restoreOptions () {
  console.log('restore options')
  if (myChannel.restored) return
  myChrome.getSync({
    'onlinefirst': true,
    'newtab': true,
    'hidename': true,
    'hidetitle': false,
    'recent': 1000 * 60 * 5,
    'interval': 30
  }, function (options) {
    console.log(options)
    myChannel.onlinefirst = options.onlinefirst
    myChannel.newtab = options.newtab
    myChannel.hidename = options.hidename
    myChannel.hidetitle = options.hidetitle
    myChannel.recent = options.recent
    if (options.interval && myChannel.interval !== options.interval) {
      myChannel.interval = options.interval
    }
    myChannel.restored = true
    // myChrome.createAlarm('watchdog', {periodInMinutes: ~~myChannel.interval})
  })
}

// update channels from other machine or not
function mergeChannel (array) {
  var expire = false
  var channels = myChannel.channels
  if (array.length !== channels.length) {
    expire = true
  } else {
    if (channels.length > 0) {
      channels.forEach((one, i) => {
        var two = array[i]
        if (one.domain !== two.domain || one.id !== two.id) {
          expire = true
          // shall break here, but forEach don't
        }
      })
    } else {
      expire = true
    }
  }
  if (expire) {
    console.log('schedule update from sync changed', array)
    restoreOptions()
    startUpdate(scheduleCallback)
  }
}

// storage.onChanged
function onChanged (changes, namespace) {
  for (let key in changes) {
    console.log('Storage key "%s" in namespace "%s" changed. ', key, namespace)
  }
  if (namespace === 'sync') {
    for (let key in changes) {
      const storageChange = changes[key]
      if (key === 'channels') {
        if (storageChange.newValue && storageChange.newValue.length > 0) {
          var array = storageChange.newValue.map(key => {
            return {
              domain: key.split('-')[0],
              id: ~~key.split('-')[1]
            }
          })
          mergeChannel(array)
        } else {
          console.info('All channels has been removed from sync!', storageChange, myChannel)
          myChannel.channels = []
          myChrome.setLocal({'channels': []})
        }
      } else if (key === 'onlinefirst') {
        myChannel.onlinefirst = storageChange.newValue
      } else if (key === 'newtab') {
        myChannel.newtab = storageChange.newValue
      } else if (key === 'hidename') {
        myChannel.hidename = storageChange.newValue
      } else if (key === 'hidetitle') {
        myChannel.hidetitle = storageChange.newValue
      } else if (key === 'recent') {
        myChannel.recent = storageChange.newValue
      } else if (key === 'interval') {
        changeAlarm(storageChange.newValue)
      } else {
        console.log(key, storageChange)
      }
    }
  }
}

// change update interval
function changeAlarm (interval) {
  console.log('change alarm?', interval, myChannel.interval)
  if (interval && myChannel.interval !== interval) {
    myChannel.interval = interval
    myChrome.createAlarm('refresh', {periodInMinutes: ~~myChannel.interval})
  }
}

// alarm could  miss?
function onAlarm (alarm) {
  console.log('Got alarm', alarm)
  if (alarm && alarm.name === 'watchdog') {
    onWatchdog()
  } else {
    console.log('schedule update from alarm', alarm)
    restoreOptions()
    scheduleUpdate(scheduleCallback)
  }
}

function onWatchdog () {
  chrome.alarms.get('refresh', function (alarm) {
    if (alarm) {
      console.log('Refresh alarm exists. Yay.')
    } else {
      console.log('Refresh alarm doesn\'t exist!? ' +
                  'Refreshing now and rescheduling.')
      restoreOptions()
      scheduleUpdate(scheduleCallback)
    }
  })
}

// extension/chrome start
function onStart () {
  console.log('onStart')
  restoreOptions()
  startUpdate(scheduleCallback)
  // todo: maybe better when startUpdate success
  // todo: periodInMinutes should be changable in settings
  // myChrome.createAlarm('schedule', {periodInMinutes: 30})
}

function onInstalled () {
  console.log('onInstalled')
  onStart()
  myChrome.createAlarm('watchdog', {periodInMinutes: 5})
  // myChrome.onAlarm(onAlarm)
}
// "only doing so at runtime.onInstalled by itself is insufficient."
myChrome.onStartup(onStart)
myChrome.onChanged(onChanged)
// todo: onInstall?
myChrome.onInstalled(onInstalled)
myChrome.onAlarm(onAlarm)
