// storage
class ChromeHandler {
  constructor() {}
  set(obj, callback) {
    chrome.storage.sync.set(obj, function (data) {
      callback && callback(data)
    })
  }

  get(key, callback) {
    chrome.storage.sync.get(key, function (data) {
      callback && callback(data)
    })
  }

  remove(key, callback) {
    chrome.storage.sync.remove(key, function (data) {
      callback && callback(data)
    })
  }

  push(key, value, callback) {
    chrome.storage.sync.get(key, function (result) {
      var array = result[key] ? result[key] : []
      array.push(value)
      var obj = {}
      obj[key] = array
      chrome.storage.sync.set(obj, function (data) {
        callback && callback(data)
      })
    })
  }

  setBadge(text, callback) {
    chrome.browserAction.setBadgeText({
      text: myChannel.online.toString()
    })
    callback && callback()
  }
}
