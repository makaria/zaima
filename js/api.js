//各直播网站的json网址
var ROOMS = function(){
  this.bilibili = {
    // 目前似乎没有slug
    api: 'https://live.bilibili.com/live/getInfo?roomid='+ROOMID,
    url: 'live.bilibili.com/:id',
    keys: {
      // error: 'code',
      name: 'ANCHOR_NICK_NAME',
      id: 'ROOMID',
      // _status: 'on/off'
      online: {
        key: 'LIVE_STATUS',
        on: 'LIVE',
        off: 'PREPARING'
      },
      title: 'ROOMTITLE',
      avatar: 'COVER' // no avatar
    }
  },
  this.douyu = {
    // id和slug均可
    api: 'http://open.douyucdn.cn/api/RoomApi/room/'+ROOMID,
    url: 'https://www.douyu.com/:id',
    keys: {
      // error: 'error',
      name: 'owner_name',
      id: 'room_id',
      online: {
        key: 'room_status',
        on: '1',
        off: '2'
      },
      title: 'room_name',
      avatar: 'avatar'
    }
  },
  this.panda = {
    // 貌似没有slug
    api: 'http://www.panda.tv/api_room?roomid='+ROOMID,
    url: 'http://www.panda.tv/:id',
    keys: {
      // error: 'errno',
      name: 'hostinfo.name',
      id: 'roominfo.id',
      online: {
        key: 'roominfo.status',
        on: '1',
        off: '2'
      },
      title: 'roominfo.name',
      avatar: 'hostinfo.avatar'
    }
  },
  this.zhanqi = {
    // 最后面需要加上'.json'才会返回json数据。必须是数字id，不能是slug。window.oPageConfig.oRoom里是房间信息，好像需要content script才能获取原始页面变量。
    api: 'https://www.zhanqi.tv/api/static/live.roomid/'+ROOMID+'.json',
    url: 'https://www.zhanqi.tv/:id',
    keys: {
      // error: 'code',
      name: 'nickname',
      id: 'id',
      online: {
        key: 'status',
        on: '4',
        off: '0'
      },
      title: 'title',
      avatar: 'avatar'
    }
  },
  this.quanmin = {
    //ROOMID可以为房间别名
    api: 'http://www.quanmin.tv/json/rooms/'+ROOMID+'/noinfo4.json',
    //数字id和别名的网址不一样。
    url: 'http://www.quanmin.tv/:id', //'http://www.quanmin.tv/v/:slug'
    keys: {
      name: 'nick',
      id: 'uid', // 'no'
      slug: 'slug',
      online: {
        key: 'status', // 'play_status'
        on: '2',
        off: '0'
      },
      title: 'title',
      avatar: 'avatar'
      // announcement: ''
    }
  }
}

//json生成的channel模板
var channel = {
  name: '63375',//字符串，类似个性化域名，可以为空
  id: 63375, //数字，必须有
  online: false, //是否在线
  domain: 'douyu', //属于哪个网站
  title: '', //当前房间名称，一般主播会改来改去，rua
  avatar: '', //头像图片地址，B站没有
  nickname: 'SteamParty', //自定义昵称，所有自定义内容（nickname/hide/color）统一放到setting里？
  // url: 'http://www.douyu.com/63375',
  // hide: false, //暂时不想知道这个房间是否online。获取数据时忽略此房间
  // color: false, //自定义online颜色
  data: null //json返回的原始数据，可以不放在这。
}

var json2Channel = function(domain, json) {
  //or 从json结构求出domain
  var channel = {}
  if (domain == 'bilibili'){

  }

}

var getJson = function (url) {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then(req => req.json())
      .then(data => {
        if (data.code == 0 || data.error == 0 || data.erron == 0){
          resolve(data.data)
        }else{
          reject(data)
        }
      })
      .catch(error => reject(error))
  })
}
