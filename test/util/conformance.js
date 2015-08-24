var tape = require('tape')
var runConformance = require('gl-conformance')
var createContext = require('../../index')

//Inject WebGL types into global namespaces, required by some conformance tests
var webgl = require('../../webgl')
WebGLRenderingContext      = webgl.WebGLRenderingContext
WebGLBuffer                = webgl.WebGLBuffer
WebGLFramebuffer           = webgl.WebGLFramebuffer
WebGLProgram               = webgl.WebGLProgram
WebGLRenderbuffer          = webgl.WebGLRenderbuffer
WebGLShader                = webgl.WebGLShader
WebGLTexture               = webgl.WebGLTexture
WebGLUniformLocation       = webgl.WebGLUniformLocation
WebGLActiveInfo            = webgl.WebGLActiveInfo
WebGLShaderPrecisionFormat = webgl.WebGLShaderPrecisionFormat
WebGLContextAttributes     = webgl.WebGLContextAttributes

module.exports = function(filter) {
  return runConformance({
    tape: tape,
    createContext: function(width, height, options) {
      return createContext(width, height, options)
    },
    filter: filter
  })
}
