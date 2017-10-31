let history = [];
let histItem = -1;
let cursorPos = 0;
let cursorState = '_';
let cmdString = '';
let mouseDown = false;
let socket;
    
window.onload = () => {
    //evt listeners
    window.onkeypress = (e) => {input(e);};
    window.onkeydown = (e) => {specialInput(e);};
    document.body.onpaste = (e) => {paste(e);};
    window.onmousedown = () => {mouseDown = true;};
    window.onmouseup = () => {mouseDown = false;};
    //our loop for visual updates
    setInterval(() => {updateVisuals();}, 600);
    updateLine();
};

//key handler for typing normal text
function input(e) {
    histItem = -1;
    switch (e.key) {
        case 'Enter':
            break;
        default:
            if (e.shiftKey) {
                editAtCursor('add', e.key.toUpperCase());
            } else {
                editAtCursor('add', e.key);
            }
    }
    updateLine();
}

//key handler for keys that have special effects other than just adding text to the line
function specialInput(e) {
    switch (e.key) {
        case 'Backspace':
            histItem = -1;
            if (cmdString.length > 0) {
                editAtCursor('backspace');
            }
            break;
        case 'Delete':
            histItem = -1;
            editAtCursor('delete');
            break;
        case 'Enter':
            histItem = -1;
            let oldLine = '>' + cmdString;
            addLine(oldLine);
            if (cmdString.length > 0) {
                //clean up whitespace and add to history
                let cleanedCmd = cmdString.replace(/\s+/g, ' ').replace(/^\s|\s$/g, '');
                history.unshift(cleanedCmd);
                command(cleanedCmd);
            }
            cmdString = '';
            cursorPos = 0;
            break;
        case 'ArrowUp':
            e.preventDefault();
            if (history.length > 0 && histItem < history.length-1) {
                histItem++;
                cmdString = history[histItem];
                cursorPos = cmdString.length;
            }
            break;
        case 'ArrowDown':
            e.preventDefault();
            if (history.length > 0 && histItem >= 0) {
                histItem--;
                if (histItem !== -1) {
                    cmdString = history[histItem];
                    cursorPos = cmdString.length;
                } else {
                     cmdString = '';
                     cursorPos = 0;
                }
            }
            break;
        case 'ArrowLeft':
            if (cursorPos > 0) {
                cursorPos--;
            }
            break;
        case 'ArrowRight':
            if (cursorPos < cmdString.length-1) {
                cursorPos++;
            }
            break;
    }
    updateLine();
}

//our override for pasting
function paste(e) {
    e.preventDefault();
    let clip = e.clipboardData.getData('text');
    if (typeof(clip) == 'string' && clip.length > 0) {
        editAtCursor('add', clip);
    }
    updateLine();
}

//function that adds lines to the terminal. If sanatize is false, html tags will be applied and not sanitized
function addLine(msg, sanitize) {
    let line = document.createElement('div');
    if (sanitize == undefined || sanitize) {
        let text;
        if (typeof(msg) == 'string' && msg.length > 0) {
            text = document.createTextNode(msg); 
        } else {
            text = document.createTextNode('Error.');
        }
        line.appendChild(text);
    } else if (!sanitize) {
        if (typeof(msg) == 'string' && msg.length > 0) {
            line.innerHTML = msg;
        } else {
            line.innerHTML = 'Error.';
        }
    }
    line.className = 'line';
    document.getElementById('oldLines').appendChild(line);
}

//function for removing and adding characters at the cursor's position
function editAtCursor(mode, char) {
    if (mode === 'add' && typeof(char) == 'string' && char.length > 0) {
        if (cursorPos == cmdString.length) {
            cmdString += char;
        } else {
            cmdString = cmdString.slice(0, cursorPos) + char + cmdString.slice(cursorPos);
        }
        cursorPos += char.length;
    } else if (mode === 'backspace') {
        if (cursorPos > 0) {
            cmdString = cmdString.slice(0, cursorPos-1) + cmdString.slice(cursorPos);
            cursorPos--;
        }
    } else if (mode === 'delete') {
        if (cursorPos < cmdString.length) {
            cmdString = cmdString.slice(0, cursorPos) + cmdString.slice(cursorPos + 1);
        }
    }
}

//contains a set of clientside commands. Otherwise, queries the server.
function command(cmd) {
    //split 'cmd' arg into a set of: command word, then any following arguments
    let splitCmd = cmd.split(' ');
    let args = splitCmd.length > 1 ? splitCmd.splice(1) : undefined;
    splitCmd = args === undefined ? splitCmd[0] : splitCmd.splice(0, 1)[0];
    splitCmd = splitCmd.toLowerCase();

    switch(splitCmd) {
        case 'clear':
            document.getElementById('oldLines').innerHTML = '';
            break;
        case 'connect':
            if (socket) {
                addLine('Already connected.');
            } else if (args) {
                openSocket(args);
            } else {
                addLine('Please provide an address.');
            }
            break;
        case 'disconnect':
            if (socket) {
                closeSocket();
            } else {
                addLine('Not connected to a websocket.');
            }
            break;
        //remove this later, testing only
        case 'addline':
            if(args) {
                let newLine = args.join(' ');
                addLine(newLine);
            }
            break;
        case 'help':
            addLine('<p class = \'lineMain\'>clear:</p> Clears the terminal.', false);
            addLine('<p class = \'lineMain\'>connect:</p> Attempts to connect to the provided websocket address. eg. \'connect ws:localhost\'. Port optional.', false);
            addLine('<p class = \'lineMain\'>disconnect:</p> Disconnects from an open websocket.', false);
            addLine('<p class = \'lineMain\'>addline:</p> Testing only. Prints text to the terminal.', false);
            break;
        default:
            if (!socket) {
                addLine('Not connected to a Websocket. Use the command \'connect\'');
            }else if (socket.readyState === 1) {
                socket.send(cmd);
            } else {
                addLine('Error connecting to the Websocket. \nPlease try again later.');
            }
    }

}

//opens a websocket to the provided URL and establishes event listeners
function openSocket(args) {
    //check for valid url
    if (args[0].match(/[(ws)(wss)]:[-a-zA-Z0-9@:%_\+.~#?&//=]+/g)) {
        socket = new WebSocket(args[0]);
        socket.onopen = () => {addLine('Connection to \'' + args[0] + '\' established.');};
        socket.onclose = (e) => {closeSocket(e);};
        socket.onerror = () => {addLine('Websocket error.'); closeSocket();};
        socket.onmessage = (e) => {addLine(e.data);};
    } else {
        addLine('Please enter a valid URL. Example: \'ws:location\'');
    }
}

//closes an open socket properly
function closeSocket(e) {
    if (socket) {
        let reason = e ? ' Code: ' + e.code : '';
        addLine('Connection closed.' + reason);
        socket.close(); 
        socket = undefined;
    }
}

//function to change the text in the main line div, and also add finishing touches like the command character ( > ) and cursor.
function updateLine() {
    cmdString = cmdString.length === 0 ? ' ' : cmdString;
    let output = '>';
    //we stop updating when the mouse is held down for easier text selection, as a blinking cursor wipes your selection
    if (!mouseDown) {
        let cursorChar = cursorState ? '_' : cmdString.substring(cursorPos, cursorPos+1);
        output += cmdString.substring(0, cursorPos) + cursorChar + cmdString.substring(cursorPos+1);
        document.getElementById('lineMain').innerHTML = '';
        let text = document.createTextNode(output);
        document.getElementById('lineMain').appendChild(text);
    }
}

//function to update visuals, such as making the cursor change states, and other misc effects.
function updateVisuals() {
    //add a light flicker to past command text
    let lines = document.getElementsByClassName('line');
    for (i=0; i < lines.length; i++) {
        if (Math.random() > 0.85) {
            let newOpacity = 1 - (Math.random() / 6);
            lines[i].style.opacity = newOpacity;
        }
    }
    //toggle the cursor char every interval
    cursorState = !cursorState;
    //and also the page title because why not
    if (cursorState) {
        document.title = document.title.slice(0, document.title.length-1);
    } else {
        document.title += '_';
    } 
    updateLine();
}