var bg =  chrome.extension.getBackgroundPage();

var addClickForInput = function() {
    var input = document.getElementById('new_channel');
    var label = input.nextElementSibling;
    // console.log(input);
    label.onclick = function(e){
        e.preventDefault();
        e.stopPropagation();
        text = input.value;
        if (text) {
            bg.addChannel(text);
        };
    };
};

var addClickForChannel = function(li, channel){
    console.log("add click");
    li.onclick = function(e){
        console.log(e.button);
        e.preventDefault();
        e.stopPropagation();
        var selected = false;
        if (e.button === 0) { //left button
            selected = true;
        }else{
            selected = false;
        };
        chrome.tabs.create({
            url: channel.url,
            selected: selected
        });
    };
};

var createDom = function(){
    console.log("create dom");
    var frag = document.createDocumentFragment();
    var channels = bg.myChannel.channels;
    for(var i=0,len=channels.length;i<len;i++){
        channel = channels[i];
        var li = document.createElement("li");
        li.innerText = channel.nickname + "   " + channel.title;
        if (channel.online){
            li.className = "online";
        }else{
            li.className = "offline";
        };
        frag.appendChild(li);
        addClickForChannel(li, channel);
    };
    document.getElementById("channelsList").appendChild(frag);
};

var callbacks = {
    success: function(responseText, url){bg.myChannel.saveChannel(responseText, url);},
    failure: function(statusCode){console.log("No Man's Room");},
    complete: function(){bg.myChannel.fetching=false;bg.myChannel.totalOnline();createDom();}
};

addClickForInput();
bg.myChannel.fetchChannels(callbacks);
