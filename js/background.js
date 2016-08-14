chrome.browserAction.onClicked.addListener(function(tab) {
    console.log(tab);
    chrome.browserAction.setPopup({
        // tabId: tab.id,
        popup: "popup.html"
    });
});

//xhr request
var QueuedHandler = function(){
    this.queue = []; // 请求队列
    this.requestInProgress = false; // 判断当前是否己有别的请求
    this.retryDelay = 5; // 设置每次重新请求的时间，单位为秒
};

QueuedHandler.prototype = {
    request:function(method,url,callback,postVars,override){
        // 如果没有设置为覆盖模式，而且当前已经有别的请求
        if(this.requestInProgress && !override){
            this.queue.push({
                method:method,
                url:url,
                callback:callback,
                postVars:postVars
            });
        }else{
            this.requestInProgress = true;
            var xhr = this.createXhrObject();
            var that = this;

            xhr.onreadystatechange = function(){
                if(xhr.readyState !== 4) return;
                if(xhr.status === 200){
                    callback.success(xhr.responseText, url);
                    // 判断请求队列是否为空，如果不为空继续下一个请求
                    that.advanceQueue(callback);
                }else{
                    callback.failure(xhr.status);
                    // 每过一定时间重新请求
                    setTimeout(function(){
                        that.request(method,url,callback,postVars);
                    },that.retryDelay * 1000);
                };
            };

            xhr.open(method,url,true);
            // xhr.send(null);
            if(method!=='POST')postVars = null;
            xhr.send(postVars);
        };
    },

    createXhrObject:function(){
        var methods = [
            function(){return new XMLHttpRequest();},
            function(){return new ActiveXObject('Msxml2.XMLHTTP');},
            function(){return new ActiveXObject('Microsoft.XMLHTTP');}
        ];
        for(var i=0,len=methods.length;i<len;i++){
            try{
             methods[i]();
            }catch(e){
                continue;
            };
            // 如果执行到这里就表明 methods[i] 是可用的
            this.createXhrObject = methods[i]; // 记住这个方法，下次使用不用再判断
            return methods[i]();
        };

        throw new Error('SimpleHandler: Could not create an XHR object.');
    },

    advanceQueue:function(callback){
        if(this.queue.length === 0){
            this.requestInProgress = false;
            callback.complete();
            return;
        };
        var req = this.queue.shift();
        this.request(req.method,req.url,req.callback,req.postVars,true);
    }
};

// var callback = {
//     success:function(responseText){console.log('Success');},
//     failure:function(statusCode){console.log('Failure');},
//     complete:function(){console.log("Complete");}
// };

var myRequest = new QueuedHandler();

//storage

var ChromeHandler = function(){

};

ChromeHandler.prototype = {
    set: function(obj, callback){
        chrome.storage.sync.set(obj, function(data){
            callback && callback(data);
        });
    },

    get: function(key, callback){
        chrome.storage.sync.get(key, function(data){
            callback && callback(data);
        });
    },

    remove: function(key, callback){
        chrome.storage.sync.remove(key, function(data){
            callback && callback(data);
        });
    },

    push: function(key, value, callback){
        chrome.storage.sync.get(key, function(result){
            var array = result[key]?result[key]:[];
            array.push(value);
            var obj = {};
            obj[key] = array;
            chrome.storage.sync.set(obj, function(data){
                callback && callback(data);
            });
        });
    },

    setBadge: function(text, callback){
        chrome.browserAction.setBadgeText({
            text: online.toString()
        });
        callback && callback();
    }
};

var myChrome = new ChromeHandler();

//channels
var ChannelHandler = function(){
    this.defaultChannels = [
        {
            url: "http://www.douyu.com/63375",
            nickname: "SteamParty",
            title: "",
            domain: "douyu",
            online: false,
            data: null
        }
    ,
        {
            url: "http://live.bilibili.com/41515",
            nickname: "有C",
            title: "",
            domain: "bilibili",
            online: false,
            data: null
        }
    ];
    this.api = {
        douyu: "http://open.douyucdn.cn/api/RoomApi/room/",
        bilibili: "http://live.bilibili.com/live/getInfo?roomid="
    };
    this.online = 0;
    this.newChannel = null;
    this.channels = [];
    this.interval = 1000*60*30;
    this.start = true;
    this.fetching = false;
};

ChannelHandler.prototype = {
    filter: function(key, text){
        var reg = null;
        var match = null;
        var result = null;
        if (key === "id"){
            reg = /(\.com\/(.*))|(\.tv\/(.*))|(\.tv\/star\/)(.*)/;
        }else if (key === "domain"){
            reg = /\.(.*)\.com|\.(.*)\.tv/;
        };
        match = text.match(reg);
        if (match){
            var length = match.length-1;
            for (var i=length;i--;i>0){
                result = match[i];
                if (result !== undefined){
                    return result;
                };
            };
        };
    },

    getApiUrl: function(channel){
        if (channel.apiUrl){
            return channel.apiUrl;
        }else{
            var url = channel.url;
            var id = this.filter("id", url);
            var domain = this.filter("domain", url);
            console.log(id, domain);
            console.log(this.api);
            if (id && domain){
                channel.apiUrl = this.api[domain]+id;
                return channel.apiUrl;
            };
        };
    },

    getTitle: function(channel){
        var data = channel.data;
        var url = channel.url;
        if(url.match(/douyu/)){
            channel.title = data.owner_name+data.room_name;
        }else if(url.match(/bilibili/)){
            channel.title = data.ANCHOR_NICK_NAME+data.ROOMTITLE;
        };
    },

    generateChannel: function(value){
        var id = this.filter("id", url);
        if (value.match(/douyu/)){
            var channel = {
                url: "http://www.douyu.com/"+id,
                apiUrl: api.douyu+id,
                name: "New Channel",
                domain: "douyu",
                data: null
            };
        }else if (value.match(/bilibili/)){
            var channel = {
                url: "http://live.bilibili.com/"+id,
                apiUrl: api.bilibili+id,
                name: "New Channel",
                domain: "bilibili",
                data: null
            };
        };
        return channel;
        // myRequest.request('GET',channel.apiUrl,callback);
    },

    deleteChannel: function(index, callback){
        var channels = this.channels;
        channels.splice(index,1);
        this.saveChannels(callback);
    },

    saveChannel: function(text, url, callback){
        var that = this;
        var obj = JSON.parse(text);
        var data = obj.data;
        // console.log(data);
        if (this.newChannel){
            var channel = this.newChannel;
            channel.data = data;
            this.isOnline(channel);
            this.channels.push(channel);
        }else{
            var channels = this.channels;
            for(var i=0,len=channels.length;i<len;i++){
                var channel = channels[i];
                if (channel.apiUrl === url){
                    channel.data = data;
                    this.isOnline(channel);
                    this.getTitle(channel, url);
                    this.channels[i] = channel;
                };
            };
        };
        this.saveChannels(callback);
    },

    saveChannels: function(callback){
        var that = this;
        var obj = {};
        var channels = JSON.parse(JSON.stringify(this.channels));
        for(var i=0,len=channels.length;i<len;i++){
            var channel = channels[i];
            channel.data = null;
            // channel.online = false;
        };
        obj["channels"] = channels;
        // console.log(obj);
        chrome.storage.sync.set(obj, function(data){
            that.newChannel = null;
            callback && callback();
        });
    },

    addChannel: function(value ,callback){
        var that = this;
        var channel = this.genarateChannel(value);
        this.newChannel = channel;
        // var callback = {
        //     success: function(responseText){that.saveChannel(responseText);},
        //     failure: function(statusCode){alert("No Man's Room");},
        //     complete: function(){console.log("Complete");}
        // };
        myRequest.request("GET", channel.apiUrl, callback);
    },

    initChannels: function(callback){
        var that = this;
        chrome.storage.sync.get("channels", function(data){
            // console.log(data);
            that.channels = data["channels"]?data["channels"]:that.defaultChannels;
            callback && callback(data);
        });
    },

    fetchChannels: function(callback){
        var that = this;
        this.fetching = true;
        this.initChannels(function(data){
            var channels = that.channels;
            for(var i=0,len=channels.length;i<len;i++){
                channel = channels[i];
                var url = that.getApiUrl(channel);
                if (url){
                    myRequest.request('GET',url,callback);
                };
            };
        });
    },

    isOnline: function(channel){
        var data = channel.data?channel.data:{};
        if (data.room_status == 1 || data.LIVE_STATUS === 'LIVE'){
            channel.online = true;
        }else{
            channel.online = false;
        };
    },

    totalOnline: function(callback){
        var channels = this.channels;
        this.online = 0;
        for(var i=0,len=channels.length;i<len;i++){
            channel = channels[i];
            if (channel.online){
                this.online += 1;
            };
        };
        this.setBadge();
        callback && callback();
    },

    setBadge: function(callback){
        var that = this;
        chrome.browserAction.setBadgeText({
            text: that.online.toString()
        });
        callback && callback();
    }
};

var myChannel = new ChannelHandler();

//start
var callbacks = {
    success: function(responseText, url){myChannel.saveChannel(responseText, url);},
    failure: function(statusCode){console.log("No Man's Room");},
    complete: function(){myChannel.fetching=false;myChannel.totalOnline();}
};

var 快活 = function(){
    myChannel.fetchChannels(callbacks);
    if (myChannel.start){
        setInterval(function(){
            快活();
        }, myChannel.interval);
    };
};

快活();



