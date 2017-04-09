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
        addDom(channel)
        // updateDom(channel)
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

  function addDom(channel, fragment) {
    if (!fragment) {
      fragment = document.getElementById('channels_list')
    }
    var template = document.getElementsByClassName('channel_template')[0]
    var el = template.cloneNode(true)
    var ele = createDom(el, channel)
    template.classList.add('none')
    fragment.appendChild(ele)
    addClickForChannel(ele, channel)
  }

  // dom is created everytime when pupup.html popup
  function createDom(el, channel) {
    var id = channel.domain + channel.id
    var a = el.getElementsByClassName("detail")[0]
    var small = el.getElementsByClassName("small")[0]
    var online = ''
    el.id = id
    el.classList.remove('channel_template', 'none')
    a.href = channel.url
    a.title = channel.url
    small.innerText = (channel.start_time || '--') + ' - ' + (channel.end_time || '--')
    if (channel.online) {
      online = '在播'
      a.classList.add('online')
      a.innerText = online + ' ' + channel.name + ' ' + channel.title
      return el
    } else if (channel.timeout) {
      online = 'Timeout!'
      a.classList.add('timeout')
      a.innerText = online + ' ' + channel.name + ' ' + channel.title
      return el
    } else {
      online = '在摸'
      a.classList.add('offline')
      a.innerText = online + ' ' + channel.name + ' ' + channel.title
      return el
    }
  }

  function start() {
    if (bg.myChannel.channels.length > 0) {
      var els = []
      var fragment = document.createDocumentFragment()
      var template = document.getElementsByClassName('channel_template')[0]
      var timeout = false
      if (bg.mySetting && bg.mySetting.sort == 'online') {
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
          addDom(channel, first)
        } else if (channel.timeout) {
          timeout = true
          addDom(channel, third)
        } else {
          addDom(channel, second)
        }
      })
      fragment.appendChild(first)
      fragment.appendChild(second)
      if (timeout) {
        fragment.appendChild(third)
      }
      template.classList.add('none')
      document.getElementById('channels_list').appendChild(fragment)
    } else {
      console.log('No channel', bg.myChannel.channels)
    }
  }
  // start
  // dom will not be changed after click(except add or remove)
  start()
  toggleExciting()
})
