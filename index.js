if(typeof window !== "undefined") {
  //Create browser based gl context
  var canvas = document.createElement("canvas");
  var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if(!gl) {
    module.exports = null;
  } else {
    module.exports = gl;
  }
} else {
  module.exports = require("./" + "webgl.js");
}