"use strict"

var WebGLContext = require("./webgl.js");

function flag(options, name, dflt) {
  if(!options || !(typeof options === 'object') || !(name in options)) {
    return dflt
  }
  return !!options[name]
}

module.exports.createContext = function(width, height, options) {
    var alpha                 = flag(options, 'alpha', true)
    var depth                 = flag(options, 'depth', true)
    var stencil               = flag(options, 'stencil', false)
    var antialias             = flag(options, 'antialias', true)
    var premultipliedAlpha    = flag(options, 'premultipliedAlpha', true)
    var preserveDrawingBuffer = flag(options, 'preserveDrawingBuffer', false)
    var preferLowPowerToHighPerformance = flag(options, 'preferLowPowerToHighPerformance', false)
    var failIfMajorPerformanceCaveat = flag(options, 'failIfMajorPerformanceCaveat', false);

    //TODO: Handle options
    var context = new WebGLContext(width, height);
    context.drawingBufferWidth = width
    context.drawingBufferHeight = height
    return context
}
