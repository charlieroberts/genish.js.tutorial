var gulp = require('gulp'),
    notify     = require('gulp-notify'),
    babel      = require('gulp-babel'),
    browserify = require('browserify'),
    buffer     = require('gulp-buffer'),
    source     = require('vinyl-source-stream'),
    babelify   = require('babelify'),
    mdRender   = require( './processMarkdown.gulp.js' )

gulp.task( 'js', function() {
  browserify({ debug:true, standalone:'tutorial', minified:true, comments:false })
    .require( './tutorial.js', { entry: true } ) 
    .transform( babelify, { presets:['es2015'] })
    .bundle()
    .pipe( source('index.js') )
    .pipe( gulp.dest('./') )
    .pipe( 
      notify({ 
        message:'JavaScript compiled.',
        onLast:true
      }) 
    )
})

gulp.task( 'renderMD', ()=> {
  gulp.src( './tutorial.md' )
    .pipe( mdRender() )
    .pipe( source( 'index.html' ) )
    .pipe( gulp.dest( './' ) )
    .pipe( notify({
      message: 'Markdown rendered'
    }) )
})

gulp.task( 'test', gulp.series('js'), ()=> {
  return gulp.src('tests/gen.tests.js', {read:false})
    .pipe( mocha({ reporter:'nyan' }) ) // spec, min, nyan, list
})


gulp.task( 'watch', function() {
  gulp.watch( './tutorial.js', ['js'] )
  gulp.watch( './tutorial.md', ['renderMD'] )
})

gulp.task( 'watchMarkdown', function() {
  gulp.watch( './tutoral.md', ['renderMD'] )
})

gulp.task( 'default', gulp.series('js') )
