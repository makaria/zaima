var bg = chrome.extension.getBackgroundPage()

// move this to options.js.
var addClickForInput = function () {
  var input = document.getElementById('new_channel')
  var label = input.nextElementSibling
  // console.log(input);
  label.onclick = function (e) {
    e.preventDefault()
    e.stopPropagation()
    var text = input.value
    if (text) {
      bg.myChannel.addChannel(text, callbacks)
    }
  }
}

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
    };
    chrome.tabs.create({
      url: channel.url,
      selected: selected
    })
  }
}

var createDom = function () {
  console.log('create dom')
  document.getElementById('channels_list').innerHTML = ''
  var frag = document.createDocumentFragment()
  var channels = bg.myChannel.channels
  var length = channels.length
  var channel
  for (var i = 0; i < length; i++) {
    channel = channels[i]
    var li = document.createElement('li')
    li.innerText = channel.nickname + '   ' + channel.title
    if (channel.online) {
      li.className = 'online'
    } else {
      li.className = 'offline'
    };
    frag.appendChild(li)
    addClickForChannel(li, channel)
  };
  document.getElementById('channels_list').appendChild(frag)
}

var callbacks = {
  success: function (responseText, url) {
    bg.myChannel.saveChannel(responseText, url)
  },
  failure: function (statusCode) {
    console.log("No Man's Room")
  },
  complete: function () {
    bg.myChannel.fetching = false
    bg.myChannel.timestamp = Date.now()
    bg.myChannel.totalOnline()
    createDom()
  }
}

var happy = function () {
  var now = Date.now()
  var timestamp = bg.myChannel.timestamp
  var interval = now - timestamp
  if (interval > 10 * 60 * 1000) {
    bg.myChannel.fetchChannels(callbacks)
  } else {
    console.log(interval)
    createDom()
  }
}

addClickForInput()
happy()
