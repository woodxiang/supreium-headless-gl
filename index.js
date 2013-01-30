if(typeof window !== "undefined") {
  //Create browser based gl context
} else {
  module.exports = require("./" + "webgl.js");
}