function createContext() {
  var canvas = document.createElement("canvas")
  if(!canvas) {
    return null
  }
  try {
    var gl = canvas.getContext("experimental-webgl")
    if(gl) {
      return gl
    }
  } catch(e) {
  }
  try {
    var gl = canvas.getContext("webgl")
    if(gl) {
      return gl
    }
  } catch(e) {
  }
  return null
}

module.exports = createContext()
if(module.exports) {
  module.exports.createContext = createContext
}