'use strict'

// just show chrome api used in this extension, maybe delete in future.
class ChromeHandler {
  // storage
  setLocal (obj, callback) {
    chrome.storage.local.set(obj, callback)
  }

  setSync (obj, callback) {
    chrome.storage.sync.set(obj, callback)
  }

  setLocalByKey (key, value, callback) {
    var obj = {}
    obj[key] = value
    this.setLocal(obj, callback)
  }

  setSyncByKey (key, value, callback) {
    var obj = {}
    obj[key] = value
    this.setSync(obj, callback)
  }

  getSync (key, callback) {
    chrome.storage.sync.get(key, callback)
  }

  getLocal (key, callback) {
    chrome.storage.local.get(key, callback)
  }

  removeLocal (key, callback) {
    chrome.storage.local.remove(key, callback)
  }

  removeSync (key, callback) {
    chrome.storage.sync.remove(key, callback)
  }

  remove (channel, callback) {
    if (typeof channel === 'string') {
      this.removeLocal(channel, callback)
      this.removeSync(channel, callback)
    } else if (typeof channel === 'object') {
      var key = channel.domain + '-' + 'channel.id'
      this.removeLocal(key, callback)
      this.removeSync(key, callback)
    } else {
      callback && callback()
    }
  }

  // badgeAction text
  setTitle (title) {
    chrome.browserAction.setTitle({'title': title})
  }

  setBadge (text) {
    chrome.browserAction.setBadgeText({text: text})
  }

  // tabs
  getSelected (callback) {
    chrome.tabs.getSelected(callback)
  }

  createTab (tab) {
    chrome.tabs.create(tab)
  }

  updateTab (tab) {
    chrome.tabs.updateTab(tab)
  }

  // alarms
  getAlarm (name, callback) {
    chrome.alarms.get(name, callback)
  }

  createAlarm (name, alarmInfo) {
    chrome.alarms.create(name, alarmInfo)
  }

  removeAlarm (name, callback) {
    chrome.alarms.clear(name, callback)
  }

  onAlarm (callback) {
    console.log('on alarm')
    chrome.alarms.onAlarm.addListener(callback)
  }

  // hasListener always return false?
  hasListeners (callback) {
    chrome.alarms.onAlarm.hasListeners(callback)
  }

  // i18n
  getMessage (name) {
    return chrome.i18n.getMessage(name)
  }

  // install, start, change
  onChanged (callback) {
    chrome.storage.onChanged.addListener(callback)
  }

  onStartup (callback) {
    chrome.runtime.onStartup.addListener(callback)
  }

  onInstalled (callback) {
    chrome.runtime.onInstalled.addListener(callback)
  }
}
