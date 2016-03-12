'use strict'

var compileShader = require('./make-shader')

module.exports = function setupShader (gl, VERT_SRC, FRAG_SRC) {
  var fragShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC)
  var vertShader = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC)

  var program = gl.createProgram()
  gl.attachShader(program, fragShader)
  gl.attachShader(program, vertShader)
  gl.linkProgram(program)

  return program
}
