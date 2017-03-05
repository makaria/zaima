//TODO 每次点击显示popup页面，都要重新生成dom，注册click事件，如何避免此过程，改成只更新dom？
// chrome.browserAction.onClicked.addListener(function (tab) {
//   chrome.browserAction.setPopup({
//     popup: 'html/popup.html'
//   })
// })

var myChannel = new ChannelHandler()
// start
var callbacks = {
  success: function (responseText, url) {
    myChannel.saveChannel(responseText, url)
  },
  failure: function (statusCode) {
    console.error("No Man's Room")
  },
  complete: function () {
    myChannel.fetching = false
    myChannel.timestamp = Date.now()
    myChannel.totalOnline()
    myChannel.saveChannels()
  },
  timeout: function (statusCode) {
    console.error("Timeout!")
  }
}

var 快活 = function () {
  myChannel.fetchChannels(callbacks)
  if (myChannel.start) {
    setTimeout(function () {
      // console.log(new Date())
      快活()
    }, myChannel.interval)
  }
}

快活()
