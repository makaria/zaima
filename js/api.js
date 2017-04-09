//各直播网站的json网址
class Rooms {
  constructor() {
    this.bilibili = {
      // 目前似乎没有slug
      api: 'https://live.bilibili.com/live/getInfo?roomid=ROOMID',
      url: 'https://live.bilibili.com/:id',
      domain: 'bilibili',
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
        avatar: 'COVER', // no avatar
        start_time: '', // no such key
        end_time: '' // no such key
      }
    },
    this.douyu = {
      // id和slug均可
      api: 'http://open.douyucdn.cn/api/RoomApi/room/ROOMID',
      url: 'https://www.douyu.com/:id',
      domain: 'douyu',
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
        avatar: 'avatar',
        start_time: 'start_time', // '2017-03-14 14:06'
        end_time: '' // no such key
      }
    },
    this.panda = {
      // 貌似没有slug
      api: 'http://www.panda.tv/api_room?roomid=ROOMID',
      url: 'http://www.panda.tv/:id',
      domain: 'panda',
      keys: {
        // error: 'errno',
        name: 'hostinfo.name',
        id: 'roominfo.id',
        online: {
          key: 'videoinfo.status',
          on: '2',
          off: '3'
        },
        title: 'roominfo.name',
        avatar: 'hostinfo.avatar',
        start_time: 'start_time', // '1489994852', second
        end_time: 'end_time' // '1489920119', second
      }
    },
    this.zhanqi = {
      // 必须是数字id，不能是slug。window.oPageConfig.oRoom的值即是json数据。
      // 如何获取到数字id？
      api: 'https://www.zhanqi.tv/api/static/live.roomid/ROOMID.json',
      url: 'https://www.zhanqi.tv/:id',
      domain: 'zhanqi',
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
        avatar: 'avatar',
        start_time: 'liveTime', // '1489988546', second
        end_time: 'end_time' // no such key
      }
    },
    this.quanmin = {
      //ROOMID可以为房间别名
      api: 'http://www.quanmin.tv/json/rooms/ROOMID/noinfo4.json',
      //数字id和别名的网址不一样。
      url: 'http://www.quanmin.tv/:id', //'http://www.quanmin.tv/v/:slug'
      domain: 'quanmin',
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
        avatar: 'avatar',
        start_time: 'play_at', // '2017-03-19 18:58:35'
        end_time: 'last_play_at' // '', string could be empty.
        // announcement: ''
      }
    }
  }
}
