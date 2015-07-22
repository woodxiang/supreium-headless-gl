'use strict'

var WebGLContext = require('./webgl.js');

function flag(options, name, dflt) {
  if(!options || !(typeof options === 'object') || !(name in options)) {
    return dflt
  }
  return !!options[name]
}

function createContext(width, height, options) {
    var context = new WebGLContext(
      width,
      height,
      flag(options, 'alpha', true),
      flag(options, 'depth', true),
      flag(options, 'stencil', false),
      flag(options, 'antialias', true),
      flag(options, 'premultipliedAlpha', true),
      flag(options, 'preserveDrawingBuffer', false),
      flag(options, 'preferLowPowerToHighPerformance', false),
      flag(options, 'failIfMajorPerformanceCaveat', false))
    context.drawingBufferWidth = width
    context.drawingBufferHeight = height
    return context
}

module.exports = createContext
