// storage, 简单的包装, 可有可无
class ChromeHandler {
  constructor() {}
  set(obj, callback) {
    chrome.storage.sync.set(obj, callback)
  }

  setByKey(key, value, callback) {
    var obj = {}
    obj[key] = value
    this.set(obj, callback)
  }

  get(key, callback) {
    chrome.storage.sync.get(key, callback)
  }

  remove(key, callback) {
    chrome.storage.sync.remove(key, callback)
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

  onAlarm(callback) {
    chrome.alarms.onAlarm.addListener(callback)
  }
}
