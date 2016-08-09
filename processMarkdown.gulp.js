let rm = require( 'remarkable' ),
    md = new rm({ html:true }),
    through = require('through2'),
    fs = require( 'fs' ),
    mirrors = {}

md.renderer.rules.fence_custom[ 'jsmirroraudio' ] = function (tokens, idx, options, env, instance) {
  let token = tokens[ idx ]

  mirrors[ idx ] = {
    context: token.content,
    id: 'cm-'+idx
  }

  return `
<textarea id='${mirrors[idx].id}'>${token.content}</textarea>
<div style='text-align:right'>
  <button class="button-primary" id='${mirrors[idx].id}-buttonRun'>Run</button>
  <button class="button-primary" id='${mirrors[idx].id}-buttonStop'>Stop</button>
</div>
`
}

md.renderer.rules.fence_custom[ 'jsmirror' ] = function (tokens, idx, options, env, instance) {
  let token = tokens[ idx ]

  mirrors[ idx ] = {
    context: token.content,
    id: 'cm-'+idx
  }

  return `
<textarea id='${mirrors[idx].id}'>${token.content}</textarea>
<div style='text-align:right'><button class="button-primary" id='${mirrors[idx].id}-button' noaudio>Run</button></div>
`
}

md.block.ruler.enable([ 'footnote' ])

let renderMarkdown = function( text ) {
  let template, out
  
  template = fs.readFileSync( './template.html', 'utf-8' )

  out = template.replace( 'REPLACE_ME', md.render( text ) )

  return out
}

module.exports = function() {

  return through.obj(function(file, encoding, callback) {
    file = file.contents.toString( 'utf8' )
    let error = null,
        output = renderMarkdown( file )
      
    callback( error, output )
  })

}
