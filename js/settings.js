class Setting {
  constructor() {
    this.showHidden = true //是否显示hide的房间
    this.showOnline = false //只显示上线的房间
    this.interval = 1000 * 60 * 30 //刷新时间间隔
    this.disableNickname = false //不显示昵称
    this.diableName = false //不显示主播名
    this.disableExciting = false //不显示关注/已关注按钮
    this.disableTitle = false //不显示房间名
    this.customOnlineColor = false //自定义online的颜色，修改popup.css中的相应样式
    this.customOfflineColor = false //自定义offline的颜色
  }

  toggleShowHidden() {
    this.showHidden = !this.showHidden
  }

  toggleShowOnline() {
    this.showOnline = !this.showOnline
  }

  toggleDisableNickname() {
    this.disableNickname = !this.disableNickname
  }

  toggleDisableName() {
    this.disableName = !this.disableName
  }

  toggleDisableExciting() {
    this.disableExciting = !this.disableExciting
  }

  toggleDisableTitle() {
    this.disableTitle = !this.disableTitle
  }

  changeInterval(interval) {
    this.interval = interval * 1000 //最小单位是秒
  }

  changeOnlineColor(color) {
    this.customOnlineColor = color
  }

  changeOfflineColor(color) {
    this.customOfflineColor = color
  }

  saveSetting() {
    var setting = {
      showHidden: this.showHidden,
      showOnline: this.showOnline,
      interval: this.interval,
      disableNickname: this.disableNickname,
      diableName: this.disableName,
      disableExciting: this.disableExciting,
      disableTitle: this.disableTitle,
      customOnlineColor: this.customOnlineColor,
      customOfflineColor: this.customOfflineColor
    }
    chrome.storage.sync.set({
      'setting': setting
    }, function (data) {
      console.log("设置已保存！")
      console.log(data)
    })
  }

  initSetting() {
    var that = this
    chrome.storage.sync.get('setting', function (data) {
      var setting = data.setting || {}
      for (var key in setting) {
        that[key] = setting[key]
      }
    })
  }
}
