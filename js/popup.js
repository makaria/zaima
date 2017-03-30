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
            if (index !== -1) {
              exciting.innerText = "关注"
              exciting.classList.remove("excited")
              bg.myChannel.deleteChannel(channel)
              removeDom(channel)
              bg.myChannel.totalOnline()
              bg.myChrome.setBadge(myChannel.online.toString())
              bg.myChrome.set(myChannel.saveChannel(channel))
              bg.myChrome.set({'channels': myChannel.saveChannels()})
            } else
              bg.getChannel(channel, function(data) {
                if (data) {
                  exciting.innerText = "已关注"
                  exciting.classList.add("excited")
                  updateDom(data)
                }
              })
          }
      })
    })
  }

  function removeDom(channel) {
    var ele = document.getElementById(channel.domain+channel.id)
    ele.remove()
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
    var id = channel.domain + channel.id
    var el = document.getElementById(id)
    if (el)
      updateEle(channel, el)
    else
      createDom(channel)
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
    if (channel)
      updateDom(channel)
  })
})
