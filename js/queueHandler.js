// xhr request
class QueueHandler {
  constructor() {
    this.timeout = 5000 // 请求超时，单位为毫秒
  }

  fetchOne(url, callback) {
    this.timeoutPromise(this.timeout, fetch(url))
    .then(req => req.json()) // 返回数据目前仅限是json。如果不是则不是合法的直播间。
    .then(json => callback(json))
    .catch(e => {
      console.error(e, url)
      callback(e)
    })
  }

  // todo: timeout shall be catch & callback('timeout')
  timeoutPromise(ms, promise) {
    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        reject(new Error("timeout"))
      }, ms)
      promise.then(resolve, reject)
    })
  }

  // 目前不考虑fetchAll之后再统一更新dom（网络传输比dom更慢）。
  // 先用storage里的channel数据渲染出dom，再分别fetch后一一更新dom
  // 考虑给每个更新中的条目加上提示，loading图标（放在images文件夹里）
  // fetchAll(urls, callback) {
  //   Promise.all(urls.map(url=> fetch(url)))
  //   .then(res => Promise.all(res.map(r => r.json())))
  //   .then(result => callback(result))
  //   .catch(e => {
  //     console.error(e)
  //   })
  // }
}
