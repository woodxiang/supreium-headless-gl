'use strict'

var tape = require('tape')
var createContext = require('../index')
var drawTriangle = require('./util/draw-triangle')
var makeShader = require('./util/make-program')

tape('blending', function (t) {
  var width = 16
  var height = 16
  var gl = createContext(width, height)

  var vertex_src = [
    'precision mediump float;',
    'attribute vec2 position;',
    'void main() {',
    'gl_Position = vec4(position,0,1);',
    '}'
  ].join('\n')

  var fragment_src = [
    'precision mediump float;',
    'void main() {',
    'gl_FragColor = vec4(0.5, 0.5, 0.5, 1);',
    '}'
  ].join('\n')

  gl.clearColor(0.5, 0.5, 0.5, 0.5)
  gl.clear(gl.COLOR_BUFFER_BIT)

  var data = new Uint8Array(width * height * 4)
  for (var i = 0; i < width * height * 4; i += 4) {
    data[i] = 127
    data[i] = 127
    data[i] = 127
    data[i] = 255
  }

  var program = makeShader(gl, vertex_src, fragment_src)

  gl.useProgram(program)

  gl.enable(gl.BLEND)
  gl.blendEquation(gl.FUNC_ADD)
  gl.blendFunc(gl.ONE, gl.ONE)

  drawTriangle(gl)

  t.equals(gl.getError(), gl.NO_ERROR)

  gl.disable(gl.BLEND)

  var pixels = new Uint8Array(width * height * 4)
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

  for (i = 0; i < width * height * 4; i += 4) {
    t.equals(pixels[i], 255, 'red')
    t.equals(pixels[i + 1], 255, 'green')
    t.equals(pixels[i + 2], 255, 'blue')
    t.equals(pixels[i + 3], 255, 'alpha')
  }

  t.end()
})
