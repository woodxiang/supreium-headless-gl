'use strict'

var tape = require('tape')
var createContext = require('../index')

tape('create context', function (t) {
  var width = 10
  var height = 10
  createContext(width, height)
  t.end()
})
