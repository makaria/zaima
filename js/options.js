// stored in chrome.storage.
function restore_options() {
  chrome.storage.sync.get({
    'onlinefirst': true,
    'newtab': true,
    'hidename': true,
    'hidetitle': false,
    'recent': false,
    'interval': 30
  }, function(items) {
    document.querySelector('.onlinefirst').checked = items.onlinefirst
    document.querySelector('.newtab').checked = items.newtab
    document.querySelector('.hidename').checked = items.hidename
    document.querySelector('.hidetitle').checked = items.hidetitle
    document.querySelector('.recent').checked = !items.recent
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


function changeRecent(e) {
  console.log(e)
  if (e.target.checked) {
    var recent = 0
  } else {
    var recent = 1000 * 60 * 5
  }
  chrome.storage.sync.set({'recent': recent}, function(data) {
    console.log('recent change', data)
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

// i18n. seems wired
function translate() {
  var names = [
    "options_manage",
    "head_status",
    "head_nickname",
    "head_url",
    "head_actions",
    "options_status",
    "options_nickname",
    "options_url",
    // "options_actions",
    "options_delete",
    "options_insert",
    "options_move",
    "options_import",
    "options_export",
    "options_customize",
    "options_onlinefirst",
    "options_newtab",
    "options_hidename",
    "options_hidename_detail",
    "options_hidetitle",
    "options_hidetitle_detail",
    "options_immediately",
    "options_immediately_detail",
    "options_interval",
    "options_interval_detail"
  ]
  chrome.runtime.getBackgroundPage(bg => {
    console.log('translate start')
    names.forEach(name => {
      let classname = "." + name
      document.querySelector(classname).innerText = bg.myChrome.getMessage(name)
    })
    var template = document.getElementsByClassName('channel_template')[0]
    var input_nickname = template.getElementsByClassName('nickname')[0]
    var input_url = template.getElementsByClassName('url')[0]
    input_nickname.placeholder = bg.myChrome.getMessage("options_nickname_placeholder")
    input_url.placeholder = bg.myChrome.getMessage("options_url_placeholder")
  })
}

function start() {
  console.log('start')
  chrome.runtime.getBackgroundPage(bg => {
    console.log('get bg done!')
    //
    function createDom(template) {
      if (!template) {
        template = document.getElementsByClassName('channel_template')[0]
        template.classList.add('none')
      }
      var el = template.cloneNode(true)
      el.classList.remove('channel_template', 'none')
      el.classList.add('channel')
      return el
    }

    function removeDom(el) {
      el.remove()
      if (bg.myChannel.channels.length === 0) {
        var template = document.getElementsByClassName('channel_template')[0]
        template.classList.remove('none')
      }
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
        if (channel) {
          bg.deleteChannel(channel)
        }
        removeDom(el)
      }
      if (channel) {
        el.id = channel.domain + '-' + channel.id
        if (channel.timeout) {
          statusEl.innerText = bg.myChrome.getMessage('timeout')
        } else if (channel.online) {
          statusEl.innerText = bg.myChrome.getMessage('online')
        } else {
          statusEl.innerText = bg.myChrome.getMessage('offline')
        }
        if (channel.nickname !== undefined) {
          nameEl.value = channel.nickname
        } else {
          nameEl.value = channel.name
        }
        urlEl.value = channel.url
        urlEl.disabled = true
        urlEl.classList.add('disabled')
        insertEl.disabled = false
        moveEl.disabled = false
        statusEl.onclick = function(e) {
          bg.myChrome.createTab({
            url: channel.apiUrl,
            active: true
          })
        }
        nameEl.onblur = function(e) {
          console.log(e)
          if (channel.nickname !== e.target.value) {
            channel.nickname = e.target.value
            bg.addChannel(channel)
          } else {
            console.log('nickname not changed', e.target.value)
          }
        }
        insertEl.onclick = function(e) {
          console.log('insert channel')
          var emptyEl = createDom()
          parentNode.insertBefore(emptyEl, el.nextSibling)
          // todo: seems to be quite stupid
          updateDom(emptyEl, null)
        }
        moveEl.onclick = function(e) {
          console.log('move up')
          parentNode.insertBefore(el, el.previousSibling)
          if (channel) {
            var index = bg.myChannel.getIndex(channel)
            if (index !== -1) {
              if (index > 0) {
                var channels = bg.myChannel.channels
                var head = channels.slice(0, index-1)
                var middle = channels.slice(index-1, index+1).reverse()
                var tail = channels.slice(index+1)
                var array = head.concat(middle, tail)
                bg.myChannel.channels = array
                bg.saveChannels()
              } else {
                console.log('Already on the top', index)
              }
            } else {
              console.error("channel hasn't save", channel, bg.myChannel.channels)
            }
          }
        }
      } else {
        insertEl.disabled = true
        moveEl.disabled = true
        urlEl.onblur = function(e) {
          var url = e.target.value
          var room = bg.myChannel.getDomainAndId(url)
          bg.getChannel(room, function(data) {
            bg.updateChannel(room, data, function(channel) {
              if (channel && !channel.timeout) {
                channel.nickname = nameEl.value
                // get index first!
                var id = el.previousSibling.id
                if (id) {
                  var room = {
                    domain: id.split('-')[0],
                    id: id.split('-')[1],
                  }
                  var index = bg.myChannel.getIndex(room)
                }
                bg.addChannel(channel, index+1)
                updateDom(el, channel)
              } else if (channel.timeout) {
                statusEl.innerText = bg.myChrome.getMessage('timeout')
              } else {
                statusEl.innerText = bg.myChrome.getMessage('invalid_url')
              }
            })
          })
        }
      }
    }

    function showChannels() {
      console.log('show channels start')
      var parentNode = document.getElementById('channels_list')
      var template = document.getElementsByClassName('channel_template')[0]
      bg.scheduleUpdate(function(channel) {
        if (channel && channel.domain && channel.id !== null && channel.id !== undefined) {
          template.classList.add('none')
          var el = createDom(template)
          updateDom(el, channel)
          parentNode.appendChild(el)
        } else {
          console.log('invalid channel', channel)
        }
        bg.myChannel.addChannel(channel)
        bg.updateIcon()
        bg.myChrome.setLocal(bg.myChannel.exportChannel(channel))
      })
    }

    showChannels()
    // use fragment?
    document.querySelector('.import').addEventListener('click', function() {
      // confirm('This will import avaliable channels from your bookmarks', function() {
      bg.importBookmarks(function(channel) {
        if (channel) {
          var el = createDom()
          updateDom(el, channel)
          document.getElementById('channels_list').appendChild(el)
        } else {
          console.log('ignore bookmark', channel)
        }
      })
      // })
    })
    document.querySelector('.export').addEventListener('click', function() {
      // confirm('This will import avaliable channels from your bookmarks', function() {
      bg.exportBookmarks()
      // })
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
  translate()
  restore_options()
  start()
}

document.addEventListener('DOMContentLoaded', onInit)
document.querySelector('.onlinefirst').onchange = toggleSort
document.querySelector('.newtab').onchange = toggleNewtab
document.querySelector('.hidename').onchange = hideName
document.querySelector('.hidetitle').onchange = hideTitle
document.querySelector('.recent').onchange = changeRecent
document.querySelector('.interval').onchange = changeInterval
// document.getElementById('save').addEventListener('click', save_options)
