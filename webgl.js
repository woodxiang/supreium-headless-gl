'use strict'

var nativeGL = require('bindings')('webgl')

var HEADLESS_VERSION = require('./package.json').version

//Hook clean up
process.on('exit', nativeGL.cleanup)

//Export type boxes for WebGL
exports.WebGLRenderingContext = nativeGL.WebGLRenderingContext

function WebGLProgram(_, ctx) {
  this._    = _
  this._ctx = ctx
}
exports.WebGLProgram = WebGLProgram

function WebGLShader(_, ctx) {
  this._    = _
  this._ctx = ctx
}
exports.WebGLShader = WebGLShader

function WebGLBuffer(_, ctx) {
  this._        = _
  this._ctx     = ctx
  this._binding = 0
}
exports.WebGLBuffer = WebGLBuffer

function WebGLFramebuffer(_, ctx) {
  this._        = _
  this._ctx     = ctx
  this._binding = 0
}
exports.WebGLFramebuffer = WebGLFramebuffer

function WebGLRenderbuffer(_, ctx) {
  this._        = _
  this._ctx     = ctx
  this._binding = 0
}
exports.WebGLRenderbuffer = WebGLRenderbuffer

function WebGLTexture(_, ctx) {
  this._        = _
  this._ctx     = ctx
  this._binding = 0
}
exports.WebGLTexture = WebGLTexture

function WebGLActiveInfo(_) {
  this._    = _
  this.size = _.size
  this.type = _.type
  this.name = _.name
}
exports.WebGLActiveInfo = WebGLActiveInfo

function WebGLUniformLocation(_, _prog) {
  this._ = _
}
exports.WebGLUniformLocation = WebGLUniformLocation

function WebGLContextAttributes(
  alpha,
  depth,
  stencil,
  antialias,
  premultipliedAlpha,
  preserveDrawingBuffer,
  preferLowPowerToHighPerformance,
  failIfMajorPerformanceCaveat) {
    this.alpha = alpha
    this.depth = depth
    this.stencil = stencil
    this.antialias = antialias
    this.premultipliedAlpha = premultipliedAlpha
    this.preserveDrawingBuffer = preserveDrawingBuffer
    this.preferLowPowerToHighPerformance = preferLowPowerToHighPerformance
    this.failIfMajorPerformanceCaveat = failIfMajorPerformanceCaveat
}
exports.WebGLContextAttributes = WebGLContextAttributes

//We need to wrap some of the native WebGL functions to handle certain error codes and check input values
var gl = nativeGL.WebGLRenderingContext.prototype
gl.VERSION = 0x1F02

////////////////////////////////////////////////////////////////////////////////

//Check context ownership
function checkOwns(context, object) {
  return object        !== null     &&
         typeof object === 'object' &&
         object._ctx   === context  &&
         object._      !== 0
}

function checkWrapper(context, object, type) {
  return checkOwns(context, object) && object instanceof type
}

function checkUniform(program, location) {
  return location instanceof WebGLUniformLocation &&
         location._prog === program
}

function checkLocation(location) {
  return location instanceof WebGLUniformLocation &&
         checkWrapper(location._prog)
}



//Set error code on WebGL context
function setError(context, error) {
  nativeGL.setError.call(context, error|0)
}

//Resize surface
var _resize = gl.resize
gl.resize = function(width, height) {
  width = width | 0
  height = height | 0
  if(!(width >= 0 && height >= 0)) {
    throw new Error("Invalid surface dimensions")
  } else if(width  !== this.drawingBufferWidth ||
            height !== this.drawingBufferHeight) {
    _resize.call(this, width, height)
    this.drawingBufferWidth  = width
    this.drawingBufferHeight = height
  }
}

//Destroy WebGL context
var _destroy = gl.destroy
gl.destroy = function() {
  _destroy.call(this)
}

gl.getContextAttributes = function() {
  return this._contextattributes
}

var _getSupportedExtensions = gl.getSupportedExtensions
gl.getSupportedExtensions = function getSupportedExtensions() {
  return _getSupportedExtensions.call(this).split(" ")
}

var _getExtension = gl.getExtension;
gl.getExtension = function getExtension(name) {
  //TODO
  return null
}

var _activeTexture = gl.activeTexture
gl.activeTexture = function activeTexture(texture) {
  return _activeTexture.call(this, texture|0)
}

var _attachShader = gl.attachShader
gl.attachShader = function attachShader(program, shader) {
  if(checkOwns(this, program) &&
     checkOwns(this, shader) &&
     program instanceof WebGLProgram &&
     shader instanceof WebGLShader) {
    return _attachShader.call(
      this,
      program._|0,
      shader._|0)
  }
  setError(this, gl.INVALID_OPERATION)
}

var _bindAttribLocation = gl.bindAttribLocation;
gl.bindAttribLocation = function bindAttribLocation(program, index, name) {
  if(checkWrapper(this, program, WebGLProgram)) {
    return _bindAttribLocation.call(
      this,
      program._|0,
      index|0,
      name+'')
  }
  setError(this, gl.INVALID_OPERATION)
}

function bindObject(method, wrapper) {
  var native = gl[method]
  gl[method] = function(target, object) {
    if(object === null) {
      return native.call(
        this,
        target|0,
        0)
    } else if(checkWrapper(this, object, wrapper) &&
       !(object._binding && object._binding != target)) {
      object._binding = target
      return native.call(
        this,
        target|0,
        object._|0)
    }
    setError(this, gl.INVALID_OPERATION)
  }
}

bindObject('bindBuffer',        WebGLBuffer)
bindObject('bindFramebuffer',   WebGLFramebuffer)
bindObject('bindRenderbuffer',  WebGLRenderbuffer)
bindObject('bindTexture',       WebGLTexture)

var _blendColor = gl.blendColor
gl.blendColor = function blendColor(red, green, blue, alpha) {
  return _blendColor.call(this, +red, +green, +blue, +alpha)
}

var _blendEquation = gl.blendEquation
gl.blendEquation = function blendEquation(mode) {
  return _blendEquation.call(this, mode|0)
}

var _blendEquationSeparate = gl.blendEquationSeparate
gl.blendEquationSeparate = function blendEquationSeparate(modeRGB, modeAlpha) {
  return _blendEquationSeparate.call(this, modeRGB|0, modeAlpha|0)
}

var _blendFunc = gl.blendFunc
gl.blendFunc = function blendFunc(sfactor, dfactor) {
  return _blendFunc.call(this, sfactor|0, dfactor|0)
}

var _blendFuncSeparate = gl.blendFuncSeparate
gl.blendFuncSeparate = function blendFuncSeparate(
  srcRGB,
  dstRGB,
  srcAlpha,
  dstAlpha) {
  return _blendFuncSeparate.call(
    this,
    srcRGB|0,
    dstRGB|0,
    srcAlpha|0,
    dstAlpha|0)
}

var _bufferData = gl.bufferData
gl.bufferData = function bufferData(target, data, usage) {
  target |= 0
  usage  |= 0
  if(typeof data === 'object') {
    if(data) {
      if(data.buffer) {
        return _bufferData.call(
          this,
          target,
          new Uint8Array(data.buffer),
          usage)
      } else if(data instanceof ArrayBuffer) {
        return _bufferData.call(
          this,
          target,
          new Uint8Array(data),
          usage)
      }
    }
  } else {
    return _bufferData.call(
      this,
      target,
      data|0,
      usage)
  }
  setError(this, gl.INVALID_OPERATION)
}

var _bufferSubData = gl.bufferSubData
gl.bufferSubData = function bufferSubData(target, offset, data) {
  target |= 0
  offset |= 0
  if(data != null && typeof data === 'object') {
    if(data.buffer) {
      return _bufferSubData.call(
        this,
        target,
        offset,
        new Uint8Array(data.buffer))
    } else if(data instanceof ArrayBuffer) {
      return _bufferSubData.call(
        this,
        target,
        offset,
        new Uint8Array(data))
    }
  }
}

var _checkFramebufferStatus = gl.checkFramebufferStatus
gl.checkFramebufferStatus = function checkFramebufferStatus(target) {
  return _checkFramebufferStatus.call(this, target|0)
}

var _clear = gl.clear
gl.clear = function clear(mask) {
  return _clear.call(this, mask|0)
}

var _clearColor = gl.clearColor
gl.clearColor = function clearColor(red, green, blue, alpha) {
  return _clearColor.call(this, +red, +green, +blue, +alpha)
}

var _clearDepth = gl.clearDepth
gl.clearDepth = function clearDepth(depth) {
  return _clearDepth.call(this, +depth)
}

var _clearStencil = gl.clearStencil
gl.clearStencil = function clearStencil(s) {
  return _clearStencil.call(this, s|0)
}

var _colorMask = gl.colorMask
gl.colorMask = function colorMask(red, green, blue, alpha) {
  return _colorMask.call(this, !!red, !!green, !!blue, !!alpha)
}

var _compileShader = gl.compileShader
gl.compileShader = function compileShader(shader) {
  if(checkWrapper(this, shader, WebGLShader)) {
    return _compileShader.call(this, shader._)
  }
  setError(this, gl.INVALID_OPERATION)
}

var _copyTexImage2D = gl.copyTexImage2D
gl.copyTexImage2D = function copyTexImage2D(
  target,
  level,
  internalformat,
  x, y, width, height,
  border) {
  return _copyTexImage2D.call(
    this,
    target|0,
    level|0,
    internalformat|0,
    x|0,
    y|0,
    width|0,
    height|0,
    border|0)
}

var _copyTexSubImage2D = gl.copyTexSubImage2D
gl.copyTexSubImage2D = function copyTexSubImage2D(
  target,
  level,
  xoffset,
  yoffset,
  x, y, width, height) {
  return _copyTexSubImage2D.call(
    this,
    target|0,
    level|0,
    xoffset|0,
    yoffset|0,
    x|0,
    y|0,
    width|0,
    height|0)
}

var _cullFace = gl.cullFace;
gl.cullFace = function cullFace(mode) {
  return _cullFace.call(this, mode|0)
}

//Object constructor methods
function createObject(method, wrapper, refset) {
  var native = gl[method]
  gl[method] = function(type) {
    var id = native.call(this, type)
    if(id <= 0) {
      return null
    } else {
      return this[refset][id] = new wrapper(id, this)
    }
  }
}
createObject('createBuffer', WebGLBuffer, '_buffers')
createObject('createFramebuffer', WebGLFramebuffer, '_framebuffers')
createObject('createProgram', WebGLProgram, '_programs')
createObject('createRenderbuffer', WebGLRenderbuffer, '_renderbuffers')
createObject('createShader', WebGLShader, '_shaders')
createObject('createTexture', WebGLTexture, '_textures')

//Generic object deletion method
function deleteObject(name, type, refset) {
  var native = gl[name]
  gl[name] = function(object) {
    if(checkOwns(this, object) &&
       object instanceof type) {
      var id = object._
      if(id in this[refset]) {
        delete this[refset][id]
        object._ = 0
        return native.call(this, id)
      }
    }
    setError(this, gl.INVALID_OPERATION)
  }
}

deleteObject('deleteBuffer', WebGLBuffer, '_buffers')
deleteObject('deleteFramebuffer', WebGLFramebuffer, '_framebuffers')
deleteObject('deleteProgram', WebGLProgram, '_programs')
deleteObject('deleteRenderbuffer', WebGLRenderbuffer, '_renderbuffers')
deleteObject('deleteShader', WebGLShader, '_shaders')
deleteObject('deleteTexture', WebGLTexture, '_textures')

var _depthFunc = gl.depthFunc
gl.depthFunc = function depthFunc(func) {
  return _depthFunc.call(this, func|0)
}

var _depthMask = gl.depthMask
gl.depthMask = function depthMask(flag) {
  return _depthMask.call(this, !!flag)
}

var _depthRange = gl.depthRange
gl.depthRange = function depthRange(zNear, zFar) {
  return _depthRange.call(this, +zNear, +zFar)
}

var _detachShader = gl.detachShader
gl.detachShader = function detachShader(program, shader) {
  if(checkWrapper(this, program, WebGLProgram) &&
     checkWrapper(this, shader, WebGLShader)) {
    return _detachShader.call(this, program._, shader._)
  }
  setError(this, gl.INVALID_OPERATION)
}

var _disable = gl.disable
gl.disable = function disable(cap) {
  return _disable.call(this, cap|0)
}

var _disableVertexAttribArray = gl.disableVertexAttribArray
gl.disableVertexAttribArray = function disableVertexAttribArray(index) {
  return _disableVertexAttribArray.call(this, index|0)
}

var _drawArrays = gl.drawArrays
gl.drawArrays = function drawArrays(mode, first, count) {
  return _drawArrays.call(this, mode|0, first|0, count|0)
}

var _drawElements = gl.drawElements
gl.drawElements = function drawElements(mode, count, type, offset) {
  return _drawElements.call(this, mode|0, count|0, type|0, offset|0)
}

var _enable = gl.enable
gl.enable = function enable(cap) {
  return _enable.call(this, cap|0)
}

var _enableVertexAttribArray = gl.enableVertexAttribArray
gl.enableVertexAttribArray = function enableVertexAttribArray(index) {
  return _enableVertexAttribArray.call(this, index|0)
}

var _finish = gl.finish
gl.finish = function finish() {
  return _finish.call(this)
}

var _flush = gl.flush
gl.flush = function flush() {
  return _flush.call(this)
}

var _framebufferRenderbuffer = gl.framebufferRenderbuffer
gl.framebufferRenderbuffer = function framebufferRenderbuffer(
  target,
  attachment,
  renderbuffertarget,
  renderbuffer) {
  if(checkWrapper(this, renderbuffer, WebGLRenderbuffer)) {
    return _framebufferRenderbuffer.call(
      this,
      target|0,
      attachment|0,
      renderbuffertarget|0,
      renderbuffer._)
  }
  setError(this, gl.INVALID_OPERATION)
}

var _framebufferTexture2D = gl.framebufferTexture2D
gl.framebufferTexture2D = function framebufferTexture2D(
  target,
  attachment,
  textarget,
  texture,
  level) {
  if(checkWrapper(this, texture, WebGLTexture)) {
    return _framebufferTexture2D.call(
      this,
      target|0,
      attachment|0,
      textarget|0,
      texture._|0,
      level|0)
  }
  setError(this, gl.INVALID_OPERATION)
}

var _frontFace = gl.frontFace
gl.frontFace = function frontFace(mode) {
  return _frontFace.call(this, mode|0)
}

var _generateMipmap = gl.generateMipmap
gl.generateMipmap = function generateMipmap(target) {
  return _generateMipmap.call(this, target|0)|0
}

var _getActiveAttrib = gl.getActiveAttrib
gl.getActiveAttrib = function getActiveAttrib(program, index) {
  if(checkWrapper(this, program, WebGLProgram)) {
    return new WebGLActiveInfo(
      _getActiveAttrib.call(this, program._|0, index|0))
  }
  setError(this, gl.INVALID_OPERATION)
  return null
}

var _getActiveUniform = gl.getActiveUniform
gl.getActiveUniform = function getActiveUniform(program, index) {
  if(checkWrapper(this, program, WebGLProgram)) {
    return new WebGLActiveInfo(
      _getActiveUniform.call(this, program._|0, index|0))
  }
  setError(this, gl.INVALID_OPERATION)
  return null
}

var _getAttachedShaders = gl.getAttachedShaders
gl.getAttachedShaders = function getAttachedShaders(program) {
  if(checkWrapper(this, program, WebGLProgram)) {
    return _getAttachedShaders.call(this, program._|0)
  }
  setError(this, gl.INVALID_OPERATION)
  return null
}

var _getAttribLocation = gl.getAttribLocation
gl.getAttribLocation = function getAttribLocation(program, name) {
  if(checkWrapper(this, program, WebGLProgram)) {
    return _getAttribLocation.call(this, program._|0, name+'')
  }
  setError(this, gl.INVALID_OPERATION)
  return null
}

var _getParameter = gl.getParameter
gl.getParameter = function getParameter(pname) {
  pname |= 0
  switch(pname) {
    case gl.ARRAY_BUFFER_BINDING:
    case gl.ELEMENT_ARRAY_BUFFER:
      return this._buffers[_getParameter.call(this, pname)] || null
    case gl.CURRENT_PROGRAM:
      return this._programs[_getParameter.call(this, pname)] || null
    case gl.FRAMEBUFFER_BINDING:
      return this._framebuffers[_getParameter.call(this, pname)] || null
    case gl.RENDERBUFFER_BINDING:
      return this._renderbuffers[_getParameter.call(this, pname)] || null
    case gl.TEXTURE_BINDING_2D:
      return this._textures[_getParameter.call(this, pname)] || null
    case gl.TEXTURE_BINDING_CUBE:
      return this._textures[_getParameter.call(this, pname)] || null
    case gl.VERSION:
      return 'WebGL 1.0 headless-gl ' + HEADLESS_VERSION
    case gl.VENDOR:
      return 'stackgl'
    case gl.RENDERER:
      return 'ANGLE'
    case gl.SHADING_LANGUAGE_VERSION:
      return 'WebGL 1.0 headless-gl'
    default:
      return _getParameter.call(this, pname)
  }
}

var _getBufferParameter = gl.getBufferParameter
gl.getBufferParameter = function getBufferParameter(target, pname) {
  return _getBufferParameter.call(this, target|0, pname|0);
}

var _getError = gl.getError
gl.getError = function getError() {
  return _getError.call(this)
}

var _getFramebufferAttachmentParameter = gl.getFramebufferAttachmentParameter
gl.getFramebufferAttachmentParameter = function getFramebufferAttachmentParameter(target, attachment, pname) {
  return _getFramebufferAttachmentParameter.call(
    this,
    target|0,
    attachment|0,
    pname|0)
}

var _getProgramParameter = gl.getProgramParameter
gl.getProgramParameter = function getProgramParameter(program, pname) {
  if(checkWrapper(this, program, WebGLProgram)) {
    return _getProgramParameter.call(this, program._|0, pname|0)
  }
  setError(this, gl.INVALID_OPERATION)
}

var _getProgramInfoLog = gl.getProgramInfoLog
gl.getProgramInfoLog = function getProgramInfoLog(program) {
  if(checkWrapper(this, program, WebGLProgram)) {
    return _getProgramInfoLog.call(this, program._|0)
  }
  setError(this, gl.INVALID_OPERATION)
}

var _getRenderbufferParameter = gl.getRenderbufferParameter
gl.getRenderbufferParameter = function getRenderbufferParameter(target, pname) {
  return _getRenderbufferParameter.call(this, target|0, pname|0)
}

var _getShaderParameter = gl.getShaderParameter
gl.getShaderParameter = function getShaderParameter(shader, pname) {
  if(checkWrapper(this, shader, WebGLShader)) {
    return _getShaderParameter.call(this, shader._|0, pname|0)
  }
  setError(this, gl.INVALID_OPERATION)
}

var _getShaderInfoLog = gl.getShaderInfoLog
gl.getShaderInfoLog = function getShaderInfoLog(shader) {
  if(checkWrapper(this, shader, WebGLShader)) {
    return _getShaderInfoLog.call(this, shader._|0)
  }
  setError(this, gl.INVALID_OPERATION)
}

var _getShaderSource = gl.getShaderSource
gl.getShaderSource = function getShaderSource(shader) {
  if(checkWrapper(this, shader, WebGLShader)) {
    return _getShaderSource.call(this, shader._|0)
  }
  setError(this, gl.INVALID_OPERATION)
}

var _getTexParameter = gl.getTexParameter
gl.getTexParameter = function getTexParameter(target, pname) {
  return _getTexParameter.call(this, target|0, pname|0)
}

var _getUniform = gl.getUniform
gl.getUniform = function getUniform(program, location) {
  if(checkWrapper(this, program, WebGLProgram) &&
     checkUniform(program, location)) {
    return _getUniform.call(this, program._|0, location._|0)
  }
  setError(this, gl.INVALID_OPERATION)
}

var _getUniformLocation = gl.getUniformLocation
gl.getUniformLocation = function getUniformLocation(program, name) {
  if(checkWrapper(this, program, WebGLProgram)) {
    var loc = _getUniformLocation.call(this, program._|0, name+'')
    if(loc > 0) {
      return new WebGLUniformLocation(loc, program)
    } else {
      return null
    }
  }
  setError(this, gl.INVALID_OPERATION)
}

var _getVertexAttrib = gl.getVertexAttrib
gl.getVertexAttrib = function getVertexAttrib(index, pname) {
  return _getVertexAttrib.call(this, index|0, pname|0)
}

var _getVertexAttribOffset = gl.getVertexAttribOffset
gl.getVertexAttribOffset = function getVertexAttribOffset(index, pname) {
  if(pname === gl.CURRENT_VERTEX_ATTRIB) {
    var buf = _getVertexAttribOffset(index|0, pname|0)
    return new Float32Array(buf)
  }
  return _getVertexAttribOffset.call(this, index|0, pname|0)
}

var _hint = gl.hint
gl.hint = function hint(target, mode) {
  return _hint.call(this, target|0, mode|0)
}

function isObject(method, wrapper) {
  var native = gl[method]
  gl[method] = function(object) {
    if(checkWrapper(this, object, wrapper)) {
      return native.call(this, object._|0)
    }
    return false
  }
}

isObject('isBuffer', WebGLBuffer)
isObject('isFrameBuffer', WebGLFramebuffer)
isObject('isProgram', WebGLProgram)
isObject('isRenderbuffer', WebGLRenderbuffer)
isObject('isShader', WebGLShader)
isObject('isTexture', WebGLTexture)

var _isEnabled = gl.isEnabled
gl.isEnabled = function isEnabled(cap) {
  return _isEnabled.call(this, cap|0)
}

var _lineWidth = gl.lineWidth
gl.lineWidth = function lineWidth(width) {
  return _lineWidth.call(this, +width)
}

var _linkProgram = gl.linkProgram
gl.linkProgram = function linkProgram(program) {
  if(checkWrapper(this, program, WebGLProgram)) {
    return _linkProgram.call(this, program._|0)
  }
  setError(this, gl.INVALID_OPERATION)
}

var _pixelStorei = gl.pixelStorei
gl.pixelStorei = function pixelStorei(pname, param) {
  return _pixelStorei.call(this, pname|0, param|0)
}

var _polygonOffset = gl.polygonOffset
gl.polygonOffset = function polygonOffset(factor, units) {
  return _polygonOffset.call(this, +factor, +units)
}

var _readPixels = gl.readPixels
gl.readPixels = function readPixels(x, y, width, height, format, type, pixels) {
  console.log('reading pixels', x, y, width, height, format, type, this.drawingBufferWidth, this.drawingBufferHeight)
  width = width|0
  height = height|0
  if(width < 0 || height < 0) {
    setError(this, gl.INVALID_VALUE)
  } else if(pixels instanceof Uint8Array &&
    width * height * 4 <= pixels.length) {
    if(width * height > 0) {
      return _readPixels.call(
        this,
        x|0,
        y|0,
        width,
        height,
        format|0,
        type|0,
        new Uint8Array(pixels.buffer))
    }
  } else {
    setError(this, gl.INVALID_OPERATION)
  }
}

var _renderbufferStorage = gl.renderbufferStorage
gl.renderbufferStorage = function renderbufferStorage(
  target,
  internalformat,
  width,
  height) {
  return _renderbufferStorage.call(
    this,
    target|0,
    internalformat|0,
    width|0,
    height|0)
}

var _sampleCoverage = gl.sampleCoverage
gl.sampleCoverage = function sampleCoverage(value, invert) {
  return _sampleCoverage.call(this, +value, +invert)
}

var _scissor = gl.scissor
gl.scissor = function scissor(x, y, width, height) {
  return _scissor.call(this, x|0, y|0, width|0, height|0)
}

var _shaderSource = gl.shaderSource
gl.shaderSource = function shaderSource(shader, source) {
  if(checkWrapper(this, shader, WebGLShader)) {
    return _shaderSource.call(this, shader._|0, source+'')
  }
  setError(this, gl.INVALID_OPERATION)
}

var _stencilFunc = gl.stencilFunc
gl.stencilFunc = function stencilFunc(func, ref, mask) {
  return _stencilFunc.call(this, func|0, ref|0, mask|0)
}

var _stencilFuncSeparate = gl.stencilFuncSeparate
gl.stencilFuncSeparate = function stencilFuncSeparate(face, func, ref, mask) {
  return _stencilFuncSeparate.call(this, face|0, func|0, ref|0, mask|0)
}

var _stencilMask = gl.stencilMask
gl.stencilMask = function stencilMask(mask) {
  return _stencilMask.call(this, mask|0)
}

var _stencilMaskSeparate = gl.stencilMaskSeparate
gl.stencilMaskSeparate = function stencilMaskSeparate(face, mask) {
  return _stencilMaskSeparate.call(this, face|0, mask|0)
}

var _stencilOp = gl.stencilOp
gl.stencilOp = function stencilOp(fail, zfail, zpass) {
  return _stencilOp.call(this, fail|0, zfail|0, zpass|0)
}

var _stencilOpSeparate = gl.stencilOpSeparate
gl.stencilOpSeparate = function stencilOpSeparate(face, fail, zfail, zpass) {
  return _stencilOpSeparate.call(this, face|0, fail|0, zfail|0, zpass|0)
}

var _texImage2D = gl.texImage2D
gl.texImage2D = function texImage2D(
  target, level, internalformat, width, height, border, format, type, pixels) {
  if(pixels instanceof Uint8Array) {
    return _texImage2D.call(
      this,
      target|0,
      level|0,
      internalformat|0,
      width|0,
      height|0,
      border|0,
      format|0,
      type|0,
      new Uint8Array(pixels.buffer))
  } else if(pixels === null) {
    return _texImage2D.call(
      this,
      target|0,
      level|0,
      internalformat|0,
      width|0,
      height|0,
      border|0,
      format|0,
      type|0,
      null)
  }
  setError(this, gl.INVALID_OPERATION)
}

var _texParameterf = gl.texParameterf
gl.texParameterf = function texParameterf(target, pname, param) {
  return _texParameterf.call(this, target|0, pname|0, +param)
}

var _texParameteri = gl.texParameteri
gl.texParameteri = function texParameteri(target, pname, param) {
  return _texParameteri.call(this, target|0, pname|0, param|0)
}

var _texSubImage2D = gl.texSubImage2D
gl.texSubImage2D = function texSubImage2D(
  target, level, xoffset, yoffset, width, height, format, type, pixels) {
  if(pixels instanceof Uint8Array) {
    return _texSubImage2D.call(
      this,
      target|0,
      level|0,
      xoffset|0,
      yoffset|0,
      width|0,
      height|0,
      format|0,
      type|0,
      new Uint8Array(pixels.buffer))
  }
  setError(this, gl.INVALID_OPERATION)
}

//Generate uniform binding code
function makeUniforms() {
  function makeMatrix(i) {
    var func = 'uniformMatrix' + i + 'fv'
    var native = gl[func]

    gl[func] = function(location, transpose, v) {
      if(checkLocation(this, location) &&
         typeof v === 'object' &&
         v !== null &&
         v.length === i*i) {
           if(v instanceof Float32Array) {
             return native.call(this,
               location._|0,
               !!transpose,
               new Float32Array(v.buffer))
           } else {
             return native.call(this,
               location._|0,
               !!transpose,
               new Float32Array(v))
           }
      }
      setError(this, gl.INVALID_OPERATION)
    }
  }

  for(var n=1; n<=4; ++n) {
    if(n > 1) {
      makeMatrix(n)
    }

    ['i', 'f'].forEach(function(type) {
      var i = n
      var func = 'uniform' + i + type
      var native = gl[func]

      gl[func] = function(location, x, y, z, w) {
        if(checkLocation(this, location)) {
          return native.call(this, location._|0, x, y, z, w)
        }
        setError(this, gl.INVALID_OPERATION)
      }

      gl[func + 'v'] = function(location, v) {
        if(checkLocation(this, location) &&
           typeof v === 'object' &&
           v !== null &&
           v.length === i) {
          switch(i) {
            case 1: return native.call(this, location._|0, v[0])
            case 2: return native.call(this, location._|0, v[0], v[1])
            case 3: return native.call(this, location._|0, v[0], v[1], v[2])
            case 4: return native.call(this, location._|0, v[0], v[1], v[2], v[3])
          }
        }
        setError(this, gl.INVALID_OPERATION)
      }
    })
  }
}
makeUniforms()

var _useProgram = gl.useProgram
gl.useProgram = function useProgram(program) {
  if(checkWrapper(this, program, WebGLProgram)) {
    return _useProgram.call(this, program._|0)
  }
  setError(this, gl.INVALID_OPERATION)
}

var _validateProgram = gl.validateProgram
gl.validateProgram = function validateProgram(program) {
  if(checkWrapper(this, program, WebGLProgram)) {
    return _validateProgram.call(this, program._|0)
  }
  setError(this, gl.INVALID_OPERATION)
}

function makeVertexAttribs() {
  function makeVertex(i) {
    var func = 'vertexAttrib' + i + 'f'
    var native = gl[func]
    gl[func] = function(idx, x, y, z, w) {
      return native.call(this, idx|0, +x, +y, +z, +w)
    }
    gl[func+'v'] = function(idx, v) {
      if(typeof v === 'object' &&
         v !== null &&
         v.length === i) {
        switch(i) {
          case 1: return native.call(this, idx|0, +v[0])
          case 2: return native.call(this, idx|0, +v[0], +v[1])
          case 3: return native.call(this, idx|0, +v[0], +v[1], +v[2])
          case 4: return native.call(this, idx|0, +v[0], +v[1], +v[2], +v[3])
        }
      }
      setError(this, gl.INVALID_OPERATION)
    }
  }
  for(var n=1; n<=4; ++n) makeVertex(n)
}
makeVertexAttribs()

var _vertexAttribPointer = gl.vertexAttribPointer
gl.vertexAttribPointer = function vertexAttribPointer(
  indx,
  size,
  type,
  normalized,
  stride,
  offset) {
  return _vertexAttribPointer.call(this,
    indx|0,
    size|0,
    type|0,
    !!normalized,
    stride|0,
    offset|0)
}

var _viewport = gl.viewport
gl.viewport = function viewport(x, y, width, height) {
  return _viewport.call(this, x|0, y|0, width|0, height|0)
}
