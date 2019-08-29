const NativeWebGL = require('bindings')('webgl')
const { WebGLRenderingContext: NativeWebGLRenderingContext } = NativeWebGL
process.on('exit', NativeWebGL.cleanup)

const gl = NativeWebGLRenderingContext.prototype

// from binding.gyp
delete gl['1.0.0']
gl.VERSION = 0x1F02
gl.IMPLEMENTATION_COLOR_READ_TYPE = 0x8B9A
gl.IMPLEMENTATION_COLOR_READ_FORMAT = 0x8B9B

// from binding.gyp
delete NativeWebGLRenderingContext['1.0.0']

module.exports = { gl, NativeWebGL, NativeWebGLRenderingContext }
