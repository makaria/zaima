// stored in chrome.storage.
function restore_options() {
  chrome.storage.sync.get({
    'onlinefirst': true,
    'newtab': true,
    'hidename': false,
    'hidetitle': false,
    'interval': '30'
  }, function(items) {
    document.querySelector('.onlinefirst').checked = items.onlinefirst
    document.querySelector('.newtab').checked = items.newtab
    document.querySelector('.hidename').checked = items.hidename
    document.querySelector('.hidetitle').checked = items.hidetitle
    document.querySelector('.interval').value = items.interval
  })
}

function toggleSort(e) {
  console.log(e)
  chrome.storage.sync.set({'onlinefirst': e.target.checked}, function(data) {
    console.log('onlinefirst change', data)
  })
}

function toggleNewtab(e) {
  console.log(e)
  chrome.storage.sync.set({'newtab': e.target.checked}, function(data) {
    console.log('open in new tab change', data)
  })
}

function hideName(e) {
  console.log(e)
  chrome.storage.sync.set({'hidename': e.target.checked}, function(data) {
    console.log('hidename change', data)
  })
}

function hideTitle(e) {
  console.log(e)
  chrome.storage.sync.set({'hidetitle': e.target.checked}, function(data) {
    console.log('hidetitle change', data)
  })
}

// without a save button, onchange will trigger too much. so add a save button for only this option?
function changeInterval(e) {
  console.log(e)
  if (!e) {
    var value = document.querySelector('.interval').value
  } else {
    var value = e.target.value
  }
  chrome.storage.sync.set({'interval': ~~value}, function(data) {
    console.log('interval change', data)
  })
}

function showChannels() {
  console.log('show channels start')
  chrome.runtime.getBackgroundPage(bg => {
    console.log('get bg done!')
    function createDom(template) {
      if (!template) {
        template = document.getElementsByClassName('channel_template')[0]
      }
      var el = template.cloneNode(true)
      el.classList.remove('channel_template', 'none')
      el.classList.add('channel')
      return el
    }

    function removeDom(el) {
      el.remove()
    }

    function updateDom(el, channel) {
      var parentNode = document.getElementById('channels_list')
      var statusEl = el.getElementsByClassName('status')[0]
      var nameEl = el.getElementsByClassName('nickname')[0]
      var urlEl = el.getElementsByClassName('url')[0]
      var deleteEl = el.getElementsByClassName('delete')[0]
      var insertEl = el.getElementsByClassName('insert')[0]
      var moveEl = el.getElementsByClassName('move')[0]
      deleteEl.onclick = function(e) {
        console.log('delete channel')
        removeDom(el)
      }
      insertEl.onclick = function(e) {
        console.log('insert channel')
        var emptyEl = createDom()
        parentNode.insertBefore(emptyEl, el.nextSibling)
        updateDom(emptyEl, null)
      }
      moveEl.ondragstart = function(e) {
        console.log('drag start')
      }
      if (channel) {
        el.id = channel.domain + channel.id
        statusEl.innerText = 'OK'
        if (channel.nickname !== undefined) {
          nameEl.value = channel.nickname
        } else {
          nameEl.value = channel.name
        }
        urlEl.value = channel.url
        urlEl.disabled = true
        urlEl.classList.add('disabled')
        nameEl.onblur = function(e) {
          console.log(e)
          if (channel.nickname !== e.target.value) {
            channel.nickname = e.target.value
            bg.myChannel.addChannel(channel)
          } else {
            console.log('nickname not changed', e.target.value)
          }
        }
      } else {
        urlEl.onblur = function(e) {
          var url = e.target.value
          var room = bg.myChannel.getDomainAndId(url)
          bg.getChannel(room, function(data) {
            bg.updateChannel(room, data, function(channel) {
              if (channel && !channel.timeout) {
                channel.nickname = nameEl.value
                bg.addChannel(channel)
                updateDom(el, channel)
              } else if (channel.timeout) {
                statusEl.innerText = 'Timeout!'
              } else {
                statusEl.innerText = 'Invalid URL'
              }
            })
          })
        }
      }
    }

    function start() {
      if (bg.myChannel.channels.length > 0) {
        var fragment = document.createDocumentFragment()
        var template = document.getElementsByClassName('channel_template')[0]
        template.classList.add('none')
        bg.myChannel.channels.forEach(channel => {
          var el = createDom(template)
          updateDom(el, channel)
          fragment.appendChild(el)
        })
        document.getElementById('channels_list').appendChild(fragment)
      } else {
        console.log("No channels", bg.myChannel.channels)
      }
    }

    start()
    // use fragment?
    document.querySelector('.import').addEventListener('click', function() {
      bg.importBookmarks(function(channel) {
        if (channel) {
          var el = createDom(template)
          updateDom(el, channel)
          document.getElementById('channels_list').appendChild(el)
        } else {
          console.log('ignore bookmark', channel)
        }
      })
    })
    document.querySelector('.export').addEventListener('click', function() {
      bg.exportBookmarks()
    })
    document.querySelector('.remove').addEventListener('click', function() {
      document.querySelector('.interval').value = ~~document.querySelector('.interval').value - 1
      changeInterval()
    })
    document.querySelector('.add').addEventListener('click', function() {
      document.querySelector('.interval').value = ~~document.querySelector('.interval').value + 1
      changeInterval(document.querySelector('.interval').value)
    })

  })
}

function onInit() {
  showChannels()
  restore_options()
}

document.addEventListener('DOMContentLoaded', onInit)
document.querySelector('.onlinefirst').onchange = toggleSort
document.querySelector('.newtab').onchange = toggleNewtab
document.querySelector('.hidename').onchange = hideName
document.querySelector('.hidetitle').onchange = hideTitle
document.querySelector('.interval').onchange = changeInterval
// document.getElementById('save').addEventListener('click', save_options)
