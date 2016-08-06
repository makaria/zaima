var channels = [
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

var api = {
    douyu: "http://open.douyucdn.cn/api/RoomApi/room/"
};

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
                    callback.success(xhr.responseText,xhr.responseXML);
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
        }
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
            }
            // 如果执行到这里就表明 methods[i] 是可用的
            this.createXhrObject = methods[i]; // 记住这个方法，下次使用不用再判断
            return methods[i]();
        }

        throw new Error('SimpleHandler: Could not create an XHR object.');
    },

    advanceQueue:function(){
        if(this.queue.length === 0){
            this.requestInProgress = false;
            return;
        }
        var req = this.queue.shift();
        this.request(req.method,req.url,req.callback,req.postVars,true);
    }
};

var myHandler = new QueuedHandler();

// var frag = document.createDocumentFragment();

//only for douyu
var createDom = function(text) {
    var room = JSON.parse(text).data;
    console.log(room);
    var li = document.createElement("li");
    var name = getName(room);
    li.id = room.room_id;
    li.innerText = name+"   "+room.room_name;
    if (room.room_status == 1) {
        li.className = "online";
    } else {
        li.className = "offline";
    };
    document.getElementById("channelsList").appendChild(li);
    addClick(room.room_id);
};

var addClick = function(id){
    var li = document.getElementById(id);
    li.onclick = function(e){
        e.preventDefault();
        e.stopPropagation();
        chrome.tabs.create({
            url: "http://www.douyu.com/"+id
        });
    };
};

var getName = function(room){
    for(var i=0,len=channels.length;i<len;i++){
        channel = channels[i];
        var reg = new RegExp(room.room_id);
        if (channel.url.match(reg)){
            return channel.name;
        };
    };
}

var callback = {
    success:function(responseText){console.log('Success');createDom(responseText)},
    failure:function(statusCode){console.log('Failure');}
};

var getUrl = function(channel) {
    if (channel.website == "douyu"){
        var reg = /douyu.com\/(.*)/;
        var match = channel.url.match(reg);
        var id = match[1];
        var url = api.douyu+id;
        console.log(url);
        return url;
    };
};

var fetchArray = function(){
    for(var i=0,len=channels.length;i<len;i++){
        channel = channels[i];
        var url = getUrl(channel);
        myHandler.request('GET',url,callback);
    };
};

fetchArray();
