var webgl = require('./webgl')

module.exports = function wrapContext (gl) {
  var props = Object.keys(gl).concat(Object.keys(gl.constructor.prototype))
  var wrapper = new WebGLRenderingContext()

  props.forEach(function (prop) {
    if (prop[0] === '_' ||
        prop[0] === '0' ||
        prop[0] === '1') {
      return
    }
    var value = gl[prop]
    if (typeof value === 'function') {
      wrapper[prop] = value.bind(gl)
    } else {
      wrapper[prop] = value
    }
  })

  Object.defineProperties(wrapper, {
    drawingBufferWidth: {
      get: function () { return gl.drawingBufferWidth }
    },
    drawingBufferHeight: {
      get: function () { return gl.drawingBufferHeight }
    }
  })

  return wrapper
}

function WebGLRenderingContext () {}
module.exports.WebGLRenderingContext = WebGLRenderingContext

function WebGLProgram () {}
module.exports.WebGLProgram = WebGLProgram

function WebGLShader () {}
module.exports.WebGLShader = WebGLShader

function WebGLBuffer () {}
module.exports.WebGLBuffer = WebGLBuffer

function WebGLFramebuffer () {}
module.exports.WebGLFramebuffer = WebGLFramebuffer

function WebGLRenderbuffer () {}
module.exports.WebGLRenderbuffer = WebGLRenderbuffer

function WebGLTexture () {}
module.exports.WebGLTexture = WebGLTexture

function WebGLUniformLocation () {}
module.exports.WebGLUniformLocation = WebGLUniformLocation

module.exports.WebGLActiveInfo = webgl.WebGLActiveInfo
module.exports.WebGLShaderPrecisionFormat = webgl.WebGLShaderPrecisionFormat
