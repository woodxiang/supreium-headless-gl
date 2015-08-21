'use strict'

var tape = require('tape')
var createContext = require('../index')

tape('clear color', function(t) {
  var width = 10
  var height = 10
  var gl = createContext(width, height)

  function testColor(r, g, b, a) {
    gl.clearColor(r/255, g/255, b/255, a/255)
    gl.clear(gl.COLOR_BUFFER_BIT)

    var pixels = new Uint8Array(width * height * 4)
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

    for(var i=0; i<width*height*4; i+=4) {
      t.equals(pixels[i],  r)
      t.equals(pixels[i+1], g)
      t.equals(pixels[i+2], b)
      t.equals(pixels[i+3], a)
    }
  }

  testColor(0, 0, 0, 0)
  testColor(255, 255, 255, 255)
  testColor(0, 255, 0, 255)
  testColor(255, 0, 255, 0)

  gl.destroy()

  t.end()
})
