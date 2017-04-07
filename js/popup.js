chrome.runtime.getBackgroundPage((bg) => {
  console.log("popup")
  // var addClickForChannel = function(li, channel) {
  //   li.onclick = function (e) {
  //     e.preventDefault()
  //     e.stopPropagation()
  //     var selected = false
  //     if (e.button === 0) { // left button
  //       selected = true
  //     } else {
  //       selected = false
  //     }
  //     chrome.tabs.create({
  //       url: channel.url,
  //       selected: selected
  //     })
  //   }
  // }

  function toggleExciting() {
    var exciting = document.getElementById('exciting')
    chrome.tabs.getSelected(function(tab) {
      bg.isChannel(tab.url, function(channel) {
        if (!channel)
          exciting.classList.add('none')
        else
          var index = bg.myChannel.getIndex(channel)
          if (index !== -1) {
            exciting.innerText = "已关注"
            exciting.classList.add("excited")
          } else
            exciting.innerText = "关注"
            exciting.classList.remove("excited")
          exciting.onclick = function(e) {
            e.preventDefault()
            e.stopPropagation()
            var index = bg.myChannel.getIndex(channel)
            if (index !== -1) { // remove a channel
              exciting.innerText = "关注"
              exciting.classList.remove("excited")
              bg.deleteChannel(channel)
              removeDom(channel)
            } else { // add a channel
              bg.getChannel(channel, function(data) {
                if (data && data.domain) {
                  exciting.innerText = "已关注"
                  exciting.classList.add("excited")
                  bg.addChannel(data)
                  updateDom(data)
                }
              })
            }
          }
      })
    })
  }

  function removeDom(channel) {
    var ele = document.getElementById(channel.domain+channel.id)
    ele.remove()
    if (bg.myChannel.channels.length == 0) {
      var template = document.getElementsByClassName('channel_template')[0]
      template.classList.remove('none')
    }
  }

  function createDom(channel) {
    var id = channel.domain + channel.id
    var template = document.getElementsByClassName('channel_template')[0]
    var el = template.cloneNode(true)
    !template.classList.contains('none') && template.classList.add('none')
    el.id = id
    el.classList.remove('channel_template', 'none')
    el.getElementsByClassName("detail")[0].href = channel.url
    el.getElementsByClassName("detail")[0].title = channel.url
    document.getElementById('channels_list').appendChild(el)
    updateEle(channel, el)
  }

  function updateDom(channel) {
    if (channel) {
      var id = channel.domain + channel.id
      var el = document.getElementById(id)
      if (el)
        updateEle(channel, el)
      else
        createDom(channel)
    } else {
      var channels = bg.myChannel.channels
      channels.forEach(channel => updateDom(channel))
    }
  }

  function updateEle(channel, el) {
    var a = el.getElementsByClassName("detail")[0]
    var small = el.getElementsByClassName("small")[0]
    if (channel.online) {
      online = '在播'
      el.classList.remove('offline')
      if (!el.classList.contains('online'))
        el.classList.add('online')
    }
    else {
      online = '在摸'
      el.classList.remove('online')
      if (!el.classList.contains('offline'))
        el.classList.add('offline')
    }
    a.innerText = online + ' ' + channel.name + ' ' + channel.title
    a.className = el.className
    small.innerText = (channel.start_time || '--') + ' - ' + (channel.end_time || '--')
  }

  // function clearDom() {
  //   var channels = document.getElementById('channels_list')
  //   var bgChannels = bg.myChannel.channels
  //   if (channels.childElementCount > bgChannels.length) {
  //     for (var i in channels.childNodes) {
  //       var id = channels.childNodes[i].id
  //       var live = false
  //       for (var k in bgChannels) {
  //         channel = bgChannels[k]
  //         cid = channel.domain + channel.id
  //         if (id == cid) {
  //           live = true
  //         }
  //       }
  //       if (!live) {
  //         channels.childNodes[i].className = 'none'
  //       }
  //     }
  //   }
  // }

  toggleExciting()
  bg.scheduleUpdate(function(channel) {
    console.log(channel)
    if (typeof channel == 'string' && channel == 'Updated') {
      updateDom()
    } else if (channel && channel.domain && channel.id !== undefined && channel.id !== null) {
      updateDom(channel)
    } else {
      bg.invalidChannels()
    }
  })
})
