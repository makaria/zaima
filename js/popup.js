chrome.runtime.getBackgroundPage((bg) => {
  console.log("popup")
  // add left click support for open a new tab
  function openChannel(el, channel) {
    console.log('add click for channel', channel)
    el.onclick = function (e) {
      e.preventDefault()
      e.stopPropagation()
      if (bg.myChannel.newtab) { // left button
        chrome.tabs.create({
          url: channel.url,
          active: true
        })
      } else {
        chrome.tabs.update({
          url: channel.url,
          active: true
        })
      }
    }
  }

  // add click function for subscribe/unsubscribe
  function toggleSubscribe(el, channel) {
    console.log('add click for subcribe button', channel)
    el.onclick = function(e) {
      e.preventDefault()
      e.stopPropagation()
      var index = bg.myChannel.getIndex(channel)
      if (index !== -1) { // remove a channel
        el.innerText = "关注"
        el.classList.remove("subscribed")
        bg.deleteChannel(channel)
        removeDom(channel)
      } else { // add a channel
        el.innerText = "已关注"
        el.classList.add("subscribed")
        bg.addChannel(channel)
        addDom(channel)
      }
    }
  }

  // add a toggle subscribe button for avaliabe channel
  function isChannel() {
    console.log('is channel start')
    var button = document.getElementById('subscribe')
    chrome.tabs.getSelected(function(tab) {
      var room = bg.myChannel.getDomainAndId(tab.url)
      bg.getChannel(room, function(data) {
        bg.updateChannel(room, data, function(channel) {
          console.log('got channel data', channel)
          if (!channel || channel.timout) {
            button.classList.add('none')
          } else {
            var index = bg.myChannel.getIndex(channel)
            if (index !== -1) {
              button.innerText = "已关注"
              button.classList.add("subscribed")
            } else
              button.innerText = "关注"
              button.classList.remove("subscribed")
            toggleSubscribe(button, channel)
          }
        })
      })
    })
  }

  // when toggle subscribe, remove channel element
  function removeDom(channel) {
    console.log('remove dom', channel)
    var el = document.getElementById(channel.domain+channel.id)
    el.remove()
    if (bg.myChannel.channels.length == 0) {
      var template = document.getElementsByClassName('channel_template')[0]
      template.classList.remove('none')
    }
  }

  function addDom(channel, template, fragment) {
    console.log('add dom', channel)
    // var el = template.cloneNode(true)
    // el.classList.remove('channel_template', 'none')
    var el = createDom(channel, template)
    updateEle(el, channel)
    openChannel(el, channel)
    if (!fragment) {
      var parentNode = document.getElementById('channels_list')
      if (bg.myChannel.onlinefirst && channel.online) {
        var refNode = parentNode.getElementsByClassName('channel_template')[0]
        parentNode.insertBefore(el, refNode.nextSibling)
      } else {
        parentNode.appendChild(el)
      }
    } else {
      fragment.appendChild(el)
    }
  }

  // dom is created everytime when pupup.html popup
  function createDom(channel, template) {
    console.log('create dom', channel)
    if (!template) {
      template = document.getElementsByClassName('channel_template')[0]
    }
    var el = template.cloneNode(true)
    var id = channel.domain + channel.id
    el.id = id
    el.classList.remove('channel_template', 'none')
    el.classList.add('channel')
    return el
  }

  function openOptions() {
    document.querySelector('#go-to-options').addEventListener('click', function() {
      if (chrome.runtime.openOptionsPage) {
        // New way to open options pages, if supported (Chrome 42+).
        chrome.runtime.openOptionsPage();
      } else {
        // Reasonable fallback.
        window.open(chrome.runtime.getURL('options.html'));
      }
    })
  }

  // update dom after schedule update
  function updateDom(channel) {
    console.log('update dom', channel)
    if (channel.timestamp)
    var id = channel.domain + channel.id
    var el = document.getElementById(id)
    if (el) {
      if (bg.myChannel.onlinefirst) {
        var parentNode = document.getElementById('channels_list')
        var a = el.getElementsByClassName("detail")[0]
        if (a.classList.contains('offline') && channel.online) {
          // move online channel to the top
          var refNode = parentNode.getElementsByClassName('channel_template')[0]
          parentNode.insertBefore(el, refNode.nextSibling)
        } else if (a.classList.contains('online') && !channel.online) {
          // move offline channel to the bottom
          parentNode.appendChild(el)
        } else {
          console.log("channel status not changed", channel)
        }
      }
      updateEle(el, channel)
    } else {
      addDom(channel)
    }
  }

  // change online && title
  function updateEle(el, channel) {
    console.log('update el', el, channel)
    var a = el.getElementsByClassName("detail")[0]
    var small = el.getElementsByClassName("small")[0]
    var online, name, title, nickname
    if (channel.nickname !== undefined) {
      nickname = channel.nickname
    } else {
      nickname = ''
    }
    if (bg.myChannel.hidename) {
      name = ' ' + nickname
    } else {
      name = nickname + ' ' + channel.name
    }
    if (bg.myChannel.hidetitle) {
      title = ''
    } else {
      title = channel.title || ''
    }
    a.href = channel.url
    a.title = channel.url
    small.innerText = (channel.start_time || '--') + ' - ' + (channel.end_time || '--')
    if (channel.online) {
      online = '在播'
      a.classList.remove('offline', 'timeout')
      a.classList.add('online')
      a.innerText = online + name + ' ' + title
    } else if (channel.timeout) {
      online = 'Timeout!'
      a.classList.remove('online', 'offline')
      a.classList.add('timeout')
      a.innerText = online + name + ' ' + title
    } else {
      online = '在摸'
      a.classList.remove('online', 'timeout')
      a.classList.add('offline')
      a.innerText = online + name + ' ' + title
    }
  }

  function start() {
    console.log('start')
    if (bg.myChannel.channels.length > 0) {
      var fragment = document.createDocumentFragment()
      var template = document.getElementsByClassName('channel_template')[0]
      var timeout = false
      template.classList.add('none')
      if (bg.myChannel.onlinefirst) {
        var first = document.createDocumentFragment()
        var second = document.createDocumentFragment()
        var third = document.createDocumentFragment()
      } else {
        var first = document.createDocumentFragment()
        var second = first
        var third = document.createDocumentFragment()
      }
      bg.myChannel.channels.forEach(channel => {
        if (channel.online) {
          addDom(channel, template, first)
        } else if (channel.timeout) {
          timeout = true
          addDom(channel, template, third)
        } else {
          addDom(channel, template, second)
        }
      })
      fragment.appendChild(first)
      fragment.appendChild(second)
      if (timeout) {
        fragment.appendChild(third)
      }
      console.log('fragment done, ready to append to dom')
      document.getElementById('channels_list').appendChild(fragment)
    } else {
      console.log('No channel', bg.myChannel.channels)
    }
  }
  // start
  // create dom use bg.myChannel.channels
  // channel num will not change after popup except click subcribe button
  // todo: first display popup.html then add channel item one by one
  isChannel()
  start()
  openOptions()
  // if set bg.myChannel.recent=0, update all whenever popup.
  // bg.scheduleUpdate(function(channel) {
  //   if (channel && channel.domain && channel.id !== null && channel.id !== undefined) {
  //     if (channel.timeout || Date.now() - channel.timestamp > bg.myChannel.recent) {
  //       console.log('channel not changed', channel)
  //     } else {
  //       bg.myChannel.adsdChannel(channel)
  //       bg.updateIcon()
  //       bg.saveChannel(channel)
  //       updateDom(channel)
  //     }
  //   } else {
  //     console.error("popup update error", channel)
  //   }
  // })
})
