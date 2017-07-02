let history = [];
let histItem = -1;
let cursorPos = 0;
let cursorChar = '_';
let cmdString = '';
let mouseDown = false;

window.onload = () => {
    //evt listeners
    document.body.onkeypress = (e) => {input(e);};
    document.body.onkeydown = (e) => {specialInput(e);};
    document.body.onpaste = (e) => {paste(e);};
    document.body.onmousedown = () => {mouseDown = true;};
    document.body.onmouseup = () => {mouseDown = false;};
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
            editAtCursor('delete');
            break;
        case 'Enter':
            histItem = -1;
            let oldLine = document.createElement('div');
            oldLine.innerHTML = '>' + cmdString;
            oldLine.className = 'line';
            document.getElementById('oldLines').appendChild(oldLine);
            if (cmdString.length > 0) {
                //clean up whitespace and add to history
                let historyItem = cmdString.replace(/\s+/g, ' ').replace(/^\s|\s$/g, '');
                history.unshift(historyItem);
            }
            cmdString = '';
            cursorPos = 0;
            break;
        case 'ArrowUp':
            if (history.length > 0 && histItem < history.length-1) {
                histItem++;
                cmdString = history[histItem];
                cursorPos = cmdString.length;
            }
            break;
        case 'ArrowDown':
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
            if (cursorPos < cmdString.length) {
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

//function to change the text in the main line div, and also add finishing touches like the command character ( > ) and cursor.
function updateLine() {
    cmdString.length = cmdString.length === 0 ? ' ' : cmdString.length;
    let output = '>';
    //we stop updating when the mouse is held down for easier text selection, as a blinking cursor wipes your selection
    if (!mouseDown) {
        output += cmdString.substring(0, cursorPos) + cursorChar + cmdString.substring(cursorPos+1);
        document.getElementById('lineMain').innerHTML = output;
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
    cursorChar = cursorChar == '_' ? ' ' : '_';
    //and also the page title because why not
    if (cursorChar === ' ') {
        document.title = document.title.slice(0, document.title.length-1);
    } else {
        document.title += cursorChar;
    } 
    updateLine();
}