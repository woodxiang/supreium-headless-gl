'use strict'

var tape = require('tape')
var createContext = require('../index')
var drawTriangle = require('./util/draw-triangle')
var makeShader = require('./util/make-shader')

var vertex_src = "\n\
attribute vec4 a_position;\n\
attribute vec4 a_color;\n\
varying vec4 v_color;\n\
bool isCorrectColor(vec4 v) {\n\
  return v.x == 0.0 && v.y == 0.0 && v.z == 0.0 && v.w == 1.0;\n\
}\n\
void main() {\n\
  gl_Position = a_position;\n\
  v_color = isCorrectColor(a_color) ? vec4(0, 1, 0, 1) : vec4(1, 0, 0, 1);\n\
}\n"

var fragment_src = "\n\
precision mediump float;\n\
varying vec4 v_color;\n\
void main() {\n\
  gl_FragColor = v_color;\n\
}\n"

tape('simple-shader', function(t) {
  var width = 50
  var height = 50
  var gl = createContext(width, height)

  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  var fragShader = compileShader(gl, gl.FRAGMENT_SHADER, fragment_src)
  var vertShader = compileShader(gl, gl.VERTEX_SHADER, vertex_src)

  var numVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS)
  for (var ii = 0; ii < numVertexAttribs; ++ii) {
      var colorLocation = (ii + 1) % numVertexAttribs
      var positionLocation = colorLocation ? 0 : 1

      var program = gl.createProgram()
      gl.attachShader(program, fragShader)
      gl.attachShader(program, vertShader)
      gl.linkProgram(program)


      //wtu.setupIndexedQuad(gl, gridRes, positionLocation);
      //wtu.clearAndDrawIndexedQuad(gl, gridRes);


      var pixels = new Uint8Array(width * height * 4)
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
      for(var i=0; i<width*height*4; i+=4) {
        t.equals(pixels[i],  0,     'red')
        t.equals(pixels[i+1], 255,  'green')
        t.equals(pixels[i+2], 0,    'blue')
        t.equals(pixels[i+3], 255,  'alpha')
      }
  }

  t.end()
})
