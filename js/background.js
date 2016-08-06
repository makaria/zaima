var channels = [
    {
        url: "http://www.douyu.com/600878",
        name: "Shanman"
    }
,
    {
        url: "http://www.douyu.com/63375",
        name: "SteamParty"
    }
];

function extend(old, add) {
    for (var name in add) {
        old[name] = add[name]
    }
}

function initChannels(callback) {
    chrome.storage.sync.get(null, function(data) {
        extend(channels, data);
        chrome.storage.sync.set(channels);
        callback && callback();
    });
};

chrome.storage.onChanged.addListenser(function(changes) {
    for (var name in changes) {
        var change = changes[name];
        channels[name] = change;
    };
});
