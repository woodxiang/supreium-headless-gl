var tape = require('tape')
var runConformance = require('gl-conformance')
var gl = require('../index')

//Inject types into global namespaces, required by some conformance tests
WebGLRenderingContext = require('../webgl')

module.exports = function(filter) {
  return runConformance({
    tape: tape,
    createContext: function(width, height, options) {
      return gl.createContext(width, height, options)
    },
    filter: filter
  })
}
