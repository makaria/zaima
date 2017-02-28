// xhr request
class QueueHandler {
  constructor() {
    this.queue = [] // 请求队列
    this.requestInProgress = false // 判断当前是否己有别的请求
    this.retryDelay = 5 // 设置每次重新请求的时间，单位为秒
  }

  request(method, url, callback, postVars, override) {
    // 如果没有设置为覆盖模式，而且当前已经有别的请求
    if (this.requestInProgress && !override) {
      this.queue.push({
        method: method,
        url: url,
        callback: callback,
        postVars: postVars
      })
    } else {
      this.requestInProgress = true
      var xhr = this.createXhrObject()
      var that = this

      var isTimeout = false,
        timer
      if (this.retryDelay > 0) {
        timer = setTimeout(function () {
          xhr.abort()
          isTimeout = true
        }, this.retryDelay * 1000 * 3)
      }

      xhr.onreadystatechange = function () {
        if ((xhr.readyState !== 4) || false) return
        if (xhr.status === 200) {
          callback.success(xhr.responseText, url)
          // 判断请求队列是否为空，如果不为空继续下一个请求
          that.advanceQueue(callback)
        } else if (xhr.status === 0) {
          callback.timeout(xhr.status)
          that.advanceQueue(callback)
        } else {
          callback.failure(xhr.status)
          // 每过一定时间重新请求
          setTimeout(function () {
            that.request(method, url, callback, postVars)
          }, that.retryDelay * 1000)
        }
        clearTimeout(timer)
      }

      xhr.open(method, url, true)
      if (method !== 'POST') postVars = null
      xhr.send(postVars)
    }
  }

  createXhrObject() {
    var methods = [
      function () {
        return new XMLHttpRequest()
      },
      function () {
        return new window.ActiveXObject('Msxml2.XMLHTTP')
      },
      function () {
        return new window.ActiveXObject('Microsoft.XMLHTTP')
      }
    ]
    for (var i = 0, len = methods.length; i < len; i++) {
      try {
        methods[i]()
      } catch (e) {
        continue
      }
      // 如果执行到这里就表明 methods[i] 是可用的
      this.createXhrObject = methods[i] // 记住这个方法，下次使用不用再判断
      return methods[i]()
    }

    throw new Error('SimpleHandler: Could not create an XHR object.')
  }

  advanceQueue(callback) {
    if (this.queue.length === 0) {
      this.requestInProgress = false
      callback.complete()
      return
    }
    var req = this.queue.shift()
    this.request(req.method, req.url, req.callback, req.postVars, true)
  }
}
