let CodeMirror = require( 'codemirror' ),
    genish     = require( 'genish.js'  ),
    picoModal  = require( 'picomodal'  ),
    //Babel = require( 'babel-standalone' ),
    textareas, buttons, playStart

//require( 'babel-polyfill' )  
require( './node_modules/codemirror/mode/javascript/javascript.js' )

textareas = document.querySelectorAll( 'textarea' )

for( let area of textareas ) {
  let txt = area.innerHTML

  let cm = CodeMirror.fromTextArea( area, {
    lineNumbers: true,
    value: txt,
    mode: 'javascript',
    viewportMargin:Infinity
  })

  area.cm = cm
}

buttons = document.querySelectorAll( 'button' )

for( let button of buttons ) {
  let id = button.id,
      txtAreaID = id.split('-' ),
      type = txtAreaID[2] === 'buttonRun'

  button.state = 0

  txtAreaID = txtAreaID[0] + '-' + txtAreaID[1]

  if( button.getAttribute( 'noaudio' ) === null ) {
    button.addEventListener( 'click', e => {
      if( type === true ) {
        playStart( txtAreaID )
      }else{
        utilities.clear()
        window.onmousemove = null  
      }
    })
  }else{
    button.addEventListener( 'click', e => {
      gen.mode = ''
      playStart( txtAreaID )
      gen.mode = 'worklet'
    })
  }
}

let sectionHeaders = document.querySelectorAll( 'h3' ),
    menu = document.querySelector( '#menu' )

for( let header of sectionHeaders ) {
  let anchor = header.firstChild,
      id  = '#' + anchor.getAttribute( 'id' ),
      txt = header.firstChild.innerHTML,
      li  = document.createElement( 'li' ),
      a   = document.createElement( 'a' )
  
  a.innerHTML = txt
  a.setAttribute( 'href', id )

  li.appendChild( a )
  menu.appendChild( li )
}
// globalize so ugens can be called from tutorial code editors 
genish.export( window )

//utilities.createContext().createScriptProcessor()
utilities.createContext(2048)

window.play = function( v,  debug, name ) { //, memType=Float32Array ) {
  if( name === undefined || name === null ) {
    name = 'ugen' + ( Math.round( Math.random() * 100000 ) )
  }

  var cb = utilities.playWorklet( v, name, debug ) 

  return cb
}
// globalize so it can be called from tutorial code editors
//window.play = function( v, debug ) {
//  return utilities.playGraph( v, debug )
//}

playStart = function( id ) {
  let textarea = document.querySelector( '#'+id ),
      cm  = textarea.cm,
      txt = cm.getValue(),
      //txtTranspiled = Babel.transform( txt, { presets: ['es2015'] }).code,
      func = new Function( txt )//txtTranspiled )

  func()
}

let flash_stack = [],
    currentFlash = null,
    modal = null,
    running = false

// globalize so it can be called from tutorial code editors
window.flash = v => {
  modal = picoModal({ content:''+v, closeButton:false })
  flash_stack.push( modal )
  
  if( flash_stack.length === 1 ) progressFlashStack()
}

let progressFlashStack = () => {
  let flash = flash_stack[ 0 ]
  flash.show()

  flash.afterClose( ()=> {
    flash_stack.shift()
    if( flash_stack.length > 0 )  progressFlashStack()
  })
}
