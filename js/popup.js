

var defaultChannels = [
    {
        url: "http://www.douyu.com/63375",
        name: "SteamParty",
        website: "douyu"
    }
,
    {
        url: "http://www.douyu.com/3614",
        name: "Mr.Quin",
        website: "douyu"
    }
,
    {
        url: "http://www.douyu.com/600878",
        name: "Shanman",
        website: "douyu"
    }
,
    {
        url: "http://www.douyu.com/532152",
        name: "Pis",
        website: "douyu"
    }
];

var newChannel = null;

var api = {
    douyu: "http://open.douyucdn.cn/api/RoomApi/room/",
    bilibili: "http://live.bilibili.com/live/getInfo?roomid="
};

var channels = [];

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
                    callback.success(xhr.responseText,url);
                    // 判断请求队列是否为空，如果不为空继续下一个请求
                    that.advanceQueue();
                }else{
                    callback.failure(xhr.status);
                    // 每过一定时间重新请求
                    setTimeout(function(){
                        that.request(method,url,callback,postVars);
                    },that.retryDelay * 1000);
                }
            };

            xhr.open(method,url,true);
            if(method!=='POST')postVars = null;
            xhr.send(postVars);
        };
    },
    createXhrObject:function(){
        var methods = [
            function(){return new XMLHttpRequest();},
            function(){return new ActiveXObject('Msxml2.XMLHTTP');},
            function(){return new ActiveXObject('Microsoft.XMLHTTP');},
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

    advanceQueue:function(){
        if(this.queue.length === 0){
            this.requestInProgress = false;
            return;
        };
        var req = this.queue.shift();
        this.request(req.method,req.url,req.callback,req.postVars,true);
    }
};

var myHandler = new QueuedHandler();

// var frag = document.createDocumentFragment();

var createDom = function(text, url) {
    var data = JSON.parse(text).data;
    var li = document.createElement("li");
    var channel = getChannel(url, data);
    if (url.match(/douyu/)){
        li.innerText = data.owner_name+data.room_name;
        if (data.room_status == 1) {
            li.className = "online";
        } else {
            li.className = "offline";
        };
    }else if (url.match(/bilibili/)) {
        li.innerText = data.ANCHOR_NICK_NAME+data.ROOMTITLE;
        if (data.LIVE_STATUS == 'LIVE') { //data._satatus=='on'
            li.className = "online";
        } else {
            li.className = "offline";
        };
    };
    document.getElementById("channelsList").appendChild(li);
    addClick(li, channel);
};

var addClick = function(li, channel){
    li.onclick = function(e){
        e.preventDefault();
        e.stopPropagation();
        var selected = false;
        if (e.button === '0') {
            selected = true;
        }else{
            selected = false;
        }
        chrome.tabs.create({
            url: channel.url,
            selected: selected
        });
    }
};

var getChannel = function(url, data){
    if (newChannel){
        saveChannel(url, data);
        return newChannel;
    }else{
        for(var i=0,len=channels.length;i<len;i++){
            channel = channels[i];
            if (channel.apiUrl == url){
                return channel;
            };
            // var reg = new RegExp(channel.website);
            // if (url.match(reg)){
                // if (channel.name !== room.owner_name){
                //     channel.name = room.owner_name;
                //     chrome.storage.sync.set({"channels":channels},function(){console.log("save");});
                // };
                // return channel;
            // };
        };
    };
};

var saveChannel = function(url, data) {
    if (url.match(/douyu/)){
        newChannel.name = data.owner_name;
    }else if (url.match(/bilibili/)){
        newChannel.name = data.ANCHOR_NICK_NAME;
    };
    channels.push(newChannel);
    chrome.storage.sync.set({"channels":channels},function(){console.log("save");});
    newChannel = null;
}

var callback = {
    success:function(responseText, url){console.log('Success');createDom(responseText, url)},
    failure:function(statusCode){console.log('Failure');}
};

var getId = function(text){
    if (text.match(/douyu/)){
        var reg = /douyu.com\/(.*)/;
        var match = text.match(reg);
        return match[1];
    }else if (text.match(/bilibili/)){
        var reg = /bilibili.com\/(.*)/;
        var match = text.match(reg);
        return match[1];
    };
};

var getUrl = function(channel) {
    if (!channel.apiUrl) {
        var id = getId(channel.url);
        if (id){
            channel.apiUrl = api[channel.website]+id;
            return channel.apiUrl;
        };
    }else{
        return channel.apiUrl;
    };
};



var addChannel = function(text){
    var id = getId(text);
    if (text.match(/douyu/)){
        var channel = {
            url: "http://www.douyu.com/"+id,
            apiUrl: api.douyu+id,
            name: "New Channel",
            website: "douyu"
        };
    }else if (text.match(/bilibili/)){
        var channel = {
            url: "http://live.bilibili.com/"+id,
            apiUrl: api.bilibili+id,
            name: "New Channel",
            website: "bilibili"
        };
    };
    newChannel = channel;
    // var url = getUrl(channel);
    myHandler.request('GET',channel.apiUrl,callback);
};

var regClick = function() {
    var input = document.getElementById('new_channel');
    var label = input.nextElementSibling;
    label.onclick = function(e){
        e.preventDefault();
        e.stopPropagation();
        text = input.value;
        if (text) {
            addChannel(text);
        };
    }
};

chrome.storage.onChanged.addListenser = function(changes){
    console.log(changes);
    // for (key in changes) {
    //     channels[key] = changes[key];
    // };
    // console.log(channels);
};

// chrome.browserAction.onClicked.addListener(function() {
//     regClick();
//     initChannels();
//     fetchArray();
// });

var fetchArray = function(){

    console.log(channels);
    for(var i=0,len=channels.length;i<len;i++){
        channel = channels[i];
        var url = getUrl(channel);
        if (url) {
            myHandler.request('GET',url,callback);
        };
    };
};

var initChannels = function(){
    chrome.storage.sync.get({"channels":channels}, function(data){
        console.log(data);
        channels = data.channels;
        // for (key in data) {
        //     channels[key] = data[key];
        // };
        console.log(channels);
        if(channels.length<1){
            channels = defaultChannels;
            console.log(channels);
            chrome.storage.sync.set({"channels":channels},function(){console.log("save");});
        };
        fetchArray();
    });
};

regClick();

initChannels();

