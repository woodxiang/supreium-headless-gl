'use strict'

var tape = require('tape')
var createContext = require('../index')

tape('create context', function(t) {
  var width = 10
  var height = 10
  var gl = createContext(width, height)
  t.end()
})
