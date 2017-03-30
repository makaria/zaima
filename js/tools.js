class Tools {
  constructor() {}

  date2string(date) {
    // 如果是纯数字('1490999000'),则new Date(date*1000)
    // 判断是否是纯数字的方法参考:http://stackoverflow.com/questions/175739/is-there-a-built-in-way-in-javascript-to-check-if-a-string-is-a-valid-number
    // 如果是string('2017-03-14 14:06'),则new Date(date)
    // 预设只有两种格式，有其他格式需要改api.
    if (isNaN(date)) {
      return new Date(date*1000)
    } else {
      return new Date(date)
    }
  }
}
