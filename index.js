var WebGLContext;
if(typeof(window) === "undefined") {
  WebGLContext = (require)("./webgl.js");
}

//Creates a WebGL contex
function createContext() {
  if(process.browser) {
    //Create browser based gl context
    var canvas = document.createElement("canvas");
    var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if(!gl) {
      return null;
    } else {
      return gl;
    }
  } else {
    return new WebGLContext();
  }
}

module.exports = createContext();
if(module.exports) {
  module.exports.createContext = createContext;
}
