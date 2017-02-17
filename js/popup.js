chrome.runtime.getBackgroundPage((bg) => {
  //下面的函数应该只在启动时执行一次而不是每次打开popup.html都重新执行一遍
  var addClickForChannel = function (li, channel) {
    console.log('add click')
    li.onclick = function (e) {
      console.log(e.button)
      e.preventDefault()
      e.stopPropagation()
      var selected = false
      if (e.button === 0) { // left button
        selected = true
      } else {
        selected = false
      }
      chrome.tabs.create({
        url: channel.url,
        selected: selected
      })
    }
  }

  var addClickForExciting = function () {
    var exciting = document.getElementById('exciting')
    exciting.onclick = function (e) {
      e.preventDefault()
      e.stopPropagation()
      chrome.tabs.getSelected(function (tab) {
        bg.myChannel.toggleExciting(tab.url, callbacks)
      })
    }
  }

  var isExciting = function () {
    var exciting = document.getElementById('exciting')
    chrome.tabs.getSelected(function (tab) {
      bg.myChannel.isExciting(tab.url, function (naive) {
        if (naive == 'none') {
          exciting.parentNode.className = 'none'
        }
        if (naive) {
          exciting.innerText = "已关注"
          exciting.className = "excited"
          exciting.setAttribute('title', 'Excited!')
        } else {
          exciting.innerText = "关注"
          exciting.className = "exciting"
          exciting.setAttribute('title', 'Exciting!')
        }
      })
    })
  }

  var createDom = function (channel) {
    if (channel) {
      var id = channel.domain + channel.id
      if (id) {
        var li = document.getElementById(id)
        if (li) {
          console.error(id + "has already been created!", channel)
        } else {
          var li = document.createElement('li')
          li.id = id
          li.setAttribute('title', channel.url)
          document.getElementById('channels_list').appendChild(li)
          addClickForChannel(li, channel)
          updateEle(channel, li)
        }
      } else {
        console.error(channel)
      }
    } else {
      document.getElementById('channels_list').innerHTML = ''
      var channels = bg.myChannel.channels
      var length = channels.length,
        channel
      for (var i = 0; i < length; i++) {
        channel = channels[i]
        createDom(channel)
      }
    }
  }

  var updateDom = function (channel) {
    if (channel) {
      var id = channel.domain + channel.id
      if (id) {
        var li = document.getElementById(id)
        if (li) {
          updateEle(channel, li)
        } else {
          createDom(channel)
        }
      } else {
        console.error(channel)
      }
    } else {
      channels = bg.myChannel.channels
      var length = channels.length,
        channel, li, id
      for (var i = 0; i < length; i++) {
        channel = channels[i]
        updateDom(channel)
      }
    }
  }

  var updateEle = function (channel, el) {
    el.innerText = channel.nickname + '   ' + channel.title
    if (channel.online) {
      el.className = 'online'
    } else {
      el.className = 'offline'
    }
  }

  var clearDom = function () {
    var channels = document.getElementById('channels_list')
    var bgChannels = bg.myChannel.channels
    if (channels.childElementCount > bgChannels.length) {
      for (var i in channels.childNodes) {
        var id = channels.childNodes[i].id
        var live = false
        for (var k in bgChannels) {
          channel = bgChannels[k]
          cid = channel.domain + channel.id
          if (id == cid) {
            live = true
          }
        }
        console.log(live)
        if (!live) {
          channels.childNodes[i].className = 'none'
        }
      }
    }
  }

  var callbacks = {
    success: function (responseText, url) {
      bg.myChannel.saveChannel(responseText, url)
    },
    failure: function (statusCode) {
      console.error("No Man's Room")
    },
    complete: function () {
      bg.myChannel.fetching = false
      bg.myChannel.timestamp = Date.now()
      bg.myChannel.totalOnline()
      bg.myChannel.saveChannels()
      isExciting()
      updateDom()
      clearDom()
    },
    timeout: function () {
      console.error("Timeout!")
    }
  }

  // var interval = bg.myChannel.interval
  var happy = function () {
    var now = Date.now()
    var timestamp = bg.myChannel.timestamp
    var interval = now - timestamp
    var recent = bg.myChannel.recent
    if (interval > recent * 0.9) {
      bg.myChannel.fetchChannels(callbacks)
    } else {
      console.log(interval, recent, now, timestamp)
    }
  }

  addClickForExciting()
  isExciting()
  createDom()
  happy()
})
