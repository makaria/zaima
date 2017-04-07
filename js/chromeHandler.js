// storage, 简单的包装, 可有可无
class ChromeHandler {
  constructor() {}
  setLocal(obj, callback) {
    chrome.storage.local.set(obj, callback)
  }

  setSync(obj, callback) {
    chrome.storage.sync.set(obj, callback)
  }

  setLocalByKey(key, value, callback) {
    var obj = {}
    obj[key] = value
    this.setLocal(obj, callback)
  }

  setSyncByKey(key, value, callback) {
    var obj = {}
    obj[key] = value
    this.setSync(obj, callback)
  }

  getSync(key, callback) {
    chrome.storage.sync.get(key, callback)
  }

  getLocal(key, callback) {
    chrome.storage.local.get(key, callback)
  }

  removeLocal(key, callback) {
    chrome.storage.local.remove(key, callback)
  }

  removeSync(key, callback) {
    chrome.storage.sync.remove(key, callback)
  }

  remove(channel, callback) {
    if (typeof channel == 'string') {
      this.removeLocal(channel, callback)
      this.removeSync(channel, callback)
    } else if (typeof channel == 'object') {
      var key = channel.domain + '-' + 'channel.id'
      this.removeLocal(key, callback)
      this.removeSync(key, callback)
    } else {
      callback && callback()
    }
  }

  setBadge(text) {
    chrome.browserAction.setBadgeText({text: text})
  }

  getAlarm(name, callback) {
    chrome.alarms.get(name, callback)
  }

  createAlarm(name, alarmInfo) {
    chrome.alarms.create(name, alarmInfo)
  }

  removeAlarm(name, callback) {
    chrome.alarms.clear(name, callback)
  }

  onAlarm(callback) {
    chrome.alarms.onAlarm.addListener(callback)
  }

  onChanged(callback) {
    chrome.storage.onChanged.addListener(callback)
  }

  onStartup(callback) {
    chrome.runtime.onStartup.addListener(callback)
  }

  onInstalled(callback) {
    chrome.runtime.onInstalled.addListener(callback)
  }
}
