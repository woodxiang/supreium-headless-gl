const { WebGLActiveInfo } = require('./webgl-active-info')
const { WebGLBuffer } = require('./webgl-buffer')
const { WebGLFramebuffer } = require('./webgl-framebuffer')
const { WebGLProgram } = require('./webgl-program')
const { WebGLRenderbuffer } = require('./webgl-renderbuffer')
const { WebGLRenderingContext } = require('./webgl-rendering-context')
const { WebGLShader } = require('./webgl-shader')
const { WebGLShaderPrecisionFormat } = require('./webgl-shader-precision-format')
const { WebGLTexture } = require('./webgl-texture')
const { WebGLUniformLocation } = require('./webgl-uniform-location')

// const webgl = require('./webgl')

const privateMethods = [
  'resize',
  'destroy'
]

function bindPublics (props, wrapper, privateInstance) {
  for (let i = 0; i < props.length; i++) {
    const prop = props[i]
    const value = privateInstance[prop]
    if (typeof value === 'function') {
      if (privateMethods.indexOf(prop) === -1) {
        wrapper[prop] = value.bind(privateInstance)
      }
    } else {
      if (prop[0] === '_' ||
        prop[0] === '0' ||
        prop[0] === '1') {
        continue
      }
      wrapper[prop] = value
    }
  }
}

module.exports = function wrapContext (gl) {
  const wrapper = new WebGLRenderingContext()
  bindPublics(Object.keys(gl), wrapper, gl)
  bindPublics(Object.keys(gl.constructor.prototype), wrapper, gl)
  bindPublics(Object.getOwnPropertyNames(gl), wrapper, gl)
  bindPublics(Object.getOwnPropertyNames(gl.constructor.prototype), wrapper, gl)

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

Object.assign(module.exports, {
  WebGLRenderingContext,
  WebGLProgram,
  WebGLShader,
  WebGLBuffer,
  WebGLFramebuffer,
  WebGLRenderbuffer,
  WebGLTexture,
  WebGLUniformLocation,
  WebGLActiveInfo,
  WebGLShaderPrecisionFormat
})
