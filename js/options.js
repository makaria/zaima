var bg = chrome.extension.getBackgroundPage()

var addClickForInput = function () {
  var input = document.getElementById('new_channel')
  var label = input.nextElementSibling
  // console.log(input)
  label.onclick = function (e) {
    e.preventDefault()
    e.stopPropagation()
    var text = input.value
    if (text) {
      bg.myChannel.addChannel(text, callbacks)
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
    createDom()
  },
  timeout: function () {
    console.error("Timeout!")
  }
}

addClickForInput()
