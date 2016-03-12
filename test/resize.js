'use strict'

var tape = require('tape')
var createContext = require('../index')

tape('resize', function (t) {
  var width = 2
  var height = 2
  var gl = createContext(width, height)

  function testColor (width, height, r, g, b, a) {
    gl.resize(width, height)

    t.equals(gl.drawingBufferWidth, width, 'width updated')
    t.equals(gl.drawingBufferHeight, height, 'height updated')

    gl.clearColor(r / 255, g / 255, b / 255, a / 255)
    gl.clear(gl.COLOR_BUFFER_BIT)

    var pixels = new Uint8Array((width + 2) * (height + 2) * 4)
    gl.readPixels(-1, -1, width + 2, height + 2, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

    var ptr = 0
    for (var row = -1; row <= height; ++row) {
      for (var col = -1; col <= width; ++col) {
        if (row < 0 || col < 0 || row === height || col === width) {
          t.equals(pixels[ptr++], 0, 'out of bounds red')
          t.equals(pixels[ptr++], 0, 'out of bounds green')
          t.equals(pixels[ptr++], 0, 'out of bounds blue')
          t.equals(pixels[ptr++], 0, 'out of bounds alpha')
        } else {
          t.equals(pixels[ptr++], r, 'in bounds red')
          t.equals(pixels[ptr++], g, 'in bounds green')
          t.equals(pixels[ptr++], b, 'in bounds blue')
          t.equals(pixels[ptr++], a, 'in bounds alpha')
        }
      }
    }

    for (var i = 0; i < width * height * 4; i += 4) {
    }
  }

  testColor(2, 2, 255, 255, 255, 255)
  testColor(4, 4, 255, 0, 255, 0)
  testColor(1, 1, 0, 255, 255, 255)

  gl.destroy()

  t.end()
})
