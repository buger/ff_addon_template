var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);

var console = {
    log: function (msg) {
        consoleService.logStringMessage(msg);
    },

    error: function (msg) {
        Components.utils.reportError(msg)
    },

    warn: console.log
}

function myExtension_loadSDKModule(module) {
    return Components.classes["@mozilla.org/harness-service;1?id=jid0-IqTRXaCOez4eRl9nE76oWp1G2iE"].
    getService().wrappedJSObject.loader.require(module);
}

function messagetoString(msg){
    if (!msg) {
        msg = "";
    }

    return typeof(msg) === "string" ? msg : msg.method === "__log" ? msg.message : JSON.stringify(msg)
}

var notifications = myExtension_loadSDKModule("notifications");
var panels = myExtension_loadSDKModule("panel");
var widgets = myExtension_loadSDKModule("widget");
var pageWorkers = myExtension_loadSDKModule("page-worker");
var tabs = myExtension_loadSDKModule("tabs");
var pageMod = myExtension_loadSDKModule("page-mod");

var widget, popup, background;

var ApiWrapper = {
    captureVisibleTab: function(){        
        var doc = gBrowser.contentDocument;
        var wnd = doc.defaultView;

        if (!doc.body)
            return "";
        
        var region = {
            x: wnd.scrollX, 
            y: wnd.scrollY, 
            width: doc.body.clientWidth, 
            height: doc.body.clientHeight
        }

        var canvas = document.createElementNS("http://www.w3.org/1999/xhtml", "html:canvas");

        canvas.width = region.width;
        canvas.height = region.height;
        canvas.style.width = canvas.style.maxwidth = region.width + "px";
        canvas.style.height = canvas.style.maxheight = region.height + "px";        

        var ctx = canvas.getContext("2d");
        // Draw the window at the top left of canvas, width=100, height=200, white background
        ctx.drawWindow(wnd, region.x, region.y, region.width, region.height, "rgb(255,255,255)");
        // Open another window with the thumbnail as an image
        return canvas.toDataURL("image/png");
    },

    log: function(msg) {
        console.log(msg.source+": "+msg.message);
    },
    
    createTab: function(msg){
        popup.hide();
        tabs.open(msg.url); 
    },

    activeTab: function(){
        var active_tab = tabs.activeTab;

        return {
            title: active_tab.title || "New Tab",
            url: active_tab.url
        }
    },

    popupResize: function(msg) {
        console.log("resising popup:" + msg.width + " "+msg.height);
        try {
            popup.resize(msg.width+5, msg.height+5);
        } catch(e) {
        }
    },

    callMethod: function(msg, sender){
        var error, response;

        if (ApiWrapper[msg.method]) {
            response = ApiWrapper[msg.method](msg);
        } else {
            response = "Method not supported";
            error = true;
        }
        
        if (msg.reply) {
            console.log("Sending api reply for '"+msg.method+"': " + messagetoString(response));

            sender.postMessage({ message: { reply:true, _api:true, __id: msg.__id, error: error, response: response }});
        }
    }
}

// Create a page worker that loads Wikipedia:
background = pageWorkers.Page({
    contentURL: "chrome://minus/content/extension/background.html",
    contentScriptWhen: "ready",
    contentScriptFile: ["chrome://minus/content/background.js", "chrome://minus/content/message_bridge.js"],
    onMessage: function (msg) {        
        if (msg != "bridge_init") {
            msg.source = "bg";

            if(msg._api) {
                ApiWrapper.callMethod(msg, background);   
            } else {
                if (typeof(msg) !== "string") {                    
                    try {
                        popup.postMessage(msg);
                    } catch (e) {}
                }
            }
        } else {
            createWidget()
        }
    }
});

function createPanel() {
    return popup = panels.Panel({
        width: 1,
        height: 1,
        contentURL: 'chrome://minus/content/extension/popup.html',
        contentScriptWhen: 'ready',
        contentScriptFile: 'chrome://minus/content/message_bridge.js',
        onMessage: function (msg) {
            if (msg != "bridge_init") {
                if (!msg.source) {
                    msg.source = "popup";
                }

                if (msg._api) {
                    ApiWrapper.callMethod(msg, popup);
                } else {
                    if (msg.source === "popup") {
                        background.postMessage({
                            sender: "popup",
                            message: msg
                        });
                    }
                }
            }
        },

        onHide: function() {
            this.destroy();
            widget.panel = createPanel();
        }
    });
}

function createWidget() {
    widget = widgets.Widget({
        label: 'Min.us',
        contentURL: "http://min.us/favicon.ico",
        onMessage: function (message) {

        },
        panel: createPanel()
    });
}


var minus = {
    onLoad: function () {
        var addonBar = document.getElementById("addon-bar");

        if (addonBar) {
            var addonBarCloseButton = document.getElementById("addonbar-closebutton")
            addonBar.insertItem("minus-toolbar-button");
            addonBar.collapsed = false;
        }
    },

    onMenuItemCommand: function (e) {
        popup.show();
    },

    onToolbarButtonCommand: function (e) {
        // just reuse the function above.  you can change this, obviously!
        minus.onMenuItemCommand(e);
    }

};

window.addEventListener("load", function () {
    minus.onLoad();
}, false);
