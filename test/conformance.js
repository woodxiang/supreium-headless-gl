var tape = require('tape')
var runConformance = require('gl-conformance')
var createContext = require('../index')

//Inject WebGL types into global namespaces, required by some conformance tests
WebGLRenderingContext = require('../webgl')
WebGLBuffer                = WebGLRenderingContext.WebGLBuffer
WebGLFramebuffer           = WebGLRenderingContext.WebGLFramebuffer
WebGLProgram               = WebGLRenderingContext.WebGLProgram
WebGLRenderbuffer          = WebGLRenderingContext.WebGLRenderbuffer
WebGLShader                = WebGLRenderingContext.WebGLShader
WebGLTexture               = WebGLRenderingContext.WebGLTexture
WebGLUniformLocation       = WebGLRenderingContext.WebGLUniformLocation
WebGLActiveInfo            = WebGLRenderingContext.WebGLActiveInfo
WebGLShaderPrecisionFormat = WebGLRenderingContext.WebGLShaderPrecisionFormat

module.exports = function(filter) {
  return runConformance({
    tape: tape,
    createContext: function(width, height, options) {
      return createContext(width, height, options)
    },
    filter: filter
  })
}
