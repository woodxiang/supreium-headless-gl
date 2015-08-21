'use strict'

var tape = require('tape')
var createContext = require('../index')
var drawTriangle = require('./util/draw-triangle')
var makeShader = require('./util/make-program')

tape('simple-shader', function(t) {
  var width = 50
  var height = 50
  var gl = createContext(width, height)

  var vertex_src = [
    'attribute vec2 position;',
    'void main() { gl_Position = vec4(position,0,1); }'
  ].join('\n')

  var fragment_src = [
    'void main() { gl_FragColor = vec4(0,1,0,1); }'
  ].join('\n')

  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  var program = makeShader(gl, vertex_src, fragment_src)
  gl.useProgram(program)
  drawTriangle(gl)

  var pixels = new Uint8Array(width * height * 4)
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
  for(var i=0; i<width*height*4; i+=4) {
    t.equals(pixels[i],  0,     'red')
    t.equals(pixels[i+1], 255,  'green')
    t.equals(pixels[i+2], 0,    'blue')
    t.equals(pixels[i+3], 255,  'alpha')
  }
  
  t.end()
})
