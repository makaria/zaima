chrome.runtime.getBackgroundPage((bg) => {
  console.log("popup")
  // add left click support for open a new tab
  function addClickForChannel(el, channel) {
    el.onclick = function (e) {
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

  function addClickForExciting(el, channel) {
    console.log('add click for subcribe button', channel)
    el.onclick = function(e) {
      e.preventDefault()
      e.stopPropagation()
      var index = bg.myChannel.getIndex(channel)
      if (index !== -1) { // remove a channel
        exciting.innerText = "关注"
        exciting.classList.remove("excited")
        bg.deleteChannel(channel)
        removeDom(channel)
      } else { // add a channel
        exciting.innerText = "已关注"
        exciting.classList.add("excited")
        bg.addChannel(channel)
        updateDom(channel)
      }
    }
  }

  // add a toggle subscribe button for avaliabe channel
  function toggleExciting() {
    console.log('toggleExcitng')
    var exciting = document.getElementById('exciting')
    chrome.tabs.getSelected(function(tab) {
      var room = bg.myChannel.getDomainAndId(tab.url)
      bg.getChannel(room, function(data) {
        bg.updateChannel(room, data, function(channel) {
          if (!channel) {
            exciting.classList.add('none')
          } else {
            var index = bg.myChannel.getIndex(channel)
            if (index !== -1) {
              exciting.innerText = "已关注"
              exciting.classList.add("excited")
            } else
              exciting.innerText = "关注"
              exciting.classList.remove("excited")
            addClickForExciting(exciting, channel)
          }
        })
      })
    })
  }

  // when toggle subscribe, remove channel element
  function removeDom(channel) {
    var ele = document.getElementById(channel.domain+channel.id)
    ele.remove()
    if (bg.myChannel.channels.length == 0) {
      var template = document.getElementsByClassName('channel_template')[0]
      template.classList.remove('none')
    }
  }

  // dom is created everytime when pupup.html popup
  function createDom(channel) {
    console.log('creatDom', channel)
    var id = channel.domain + channel.id
    var template = document.getElementsByClassName('channel_template')[0]
    var el = template.cloneNode(true)
    !template.classList.contains('none') && template.classList.add('none')
    el.id = id
    el.classList.remove('channel_template', 'none')
    el.getElementsByClassName("detail")[0].href = channel.url
    el.getElementsByClassName("detail")[0].title = channel.url
    if (bg.mySetting && bg.mySetting.sort == 'online') {
      if (channel.online) {
        document.getElementsByClassName('first')[0].appendChild(el)
      } else {
        document.getElementsByClassName('second')[0].appendChild(el)
      }
    } else {
      document.getElementById('channels_list').appendChild(el)
    }
    updateEle(el, channel)
  }

  // dom is created everytime, never updated
  function updateDom(channel) {
    console.log("updateDom", channel)
    if (channel) {
      var id = channel.domain + channel.id
      var el = document.getElementById(id)
      if (el)
        updateEle(el, channel)
      else
        createDom(channel)
    } else {
      var channels = bg.myChannel.channels
      channels.forEach(channel => updateDom(channel))
    }
  }

  // just add some css after append el to dom.or before append?
  function updateEle(el, channel) {
    console.log('updateEle', channel)
    var a = el.getElementsByClassName("detail")[0]
    var small = el.getElementsByClassName("small")[0]
    if (channel.online) {
      online = '在播'
      el.classList.remove('offline')
      if (!el.classList.contains('online'))
        el.classList.add('online')
    } else {
      online = '在摸'
      el.classList.remove('online')
      if (!el.classList.contains('offline'))
        el.classList.add('offline')
    }
    if (channel.timeout) {
      online = "Timeout!"
    }
    a.innerText = online + ' ' + channel.name + ' ' + channel.title
    a.className = el.className
    small.innerText = (channel.start_time || '--') + ' - ' + (channel.end_time || '--')
    addClickForChannel(el, channel)
  }

  // start
  // delay is too long for only ten channel
  bg.myChannel.channels.forEach(channel => updateDom(channel))
  toggleExciting()
})
