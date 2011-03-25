var bridge = document.createElement('div');
bridge.id = "ff_message_bridge";
bridge.style.display = 'none';
document.body.appendChild(bridge);

onMessage = function(msg) {    
    var _m = document.createElement('textarea');
    _m.className = 'to_page';
    _m.innerHTML = typeof(msg.message) == "string" ? msg.message : JSON.stringify(msg.message);
    bridge.appendChild(_m);
}

postMessage("bridge_init");

function checkMessages() {
    var messages = bridge.querySelectorAll('.from_page');    
    var length = messages.length;

    if (length > 0) {
        for(var i=0; i<length; i++) {
            var msg = messages[i].innerHTML;
            
            postMessage(msg[0] == '{' ? JSON.parse(msg) : msg);
            
            bridge.removeChild(messages[i])
        }
    }

    setTimeout(checkMessages, 50);
}
checkMessages();
