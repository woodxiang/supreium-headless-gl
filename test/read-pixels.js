'use strict'

var tape = require('tape')
var createContext = require('../index')

tape('clear color', function(t) {
  var width = 10
  var height = 10
  var gl = createContext(width, height)

  gl.clearColor(16/255, 32/255, 64/255, 128/255)
  gl.clear(gl.COLOR_BUFFER_BIT)


  //Basic read pixels TEST

  function testPixels()


  gl.destroy()

  t.end()
})
