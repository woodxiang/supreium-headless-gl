'use strict'

var createContext = require('../index')
var tape = require('tape')

tape('multiple-render-targets', function (t) {
  var bufferWidth = 1
  var bufferHeight = 1
  var outputWidth = 4
  var outputHeight = 1
  var gl = createContext(outputWidth, outputHeight)
  var drawBuffers = gl.getExtension('WEBGL_draw_buffers')
  var textures = writeTextures()
  renderTextures(textures)
  var pixels = toPixels()
  var notZero = 0
  for (var i = 0; i < pixels.length; i++) {
    var pixel = pixels[i]
    if (pixel > 0) {
      notZero++
    }
  }
  t.equals(notZero, 16, `Only ${notZero} are not 0, expected 16`)
  gl.destroy()
  t.end()

  function writeTextures () {
    var vs = `void main() {
    gl_PointSize = 1.0;
    gl_Position = vec4(0, 0, 0, 1);
  }`

    var fs = `#extension GL_EXT_draw_buffers : require
  precision mediump float;

  void main() {
    gl_FragData[0] = vec4(1, .5, .3, .7);
    gl_FragData[1] = vec4(.6, .5, .4, .3);
    gl_FragData[2] = vec4(.2, .8, .01,  1);
    gl_FragData[3] = vec4(.3, .4, .9, .6);
  }`

    const vertShader = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vertShader, vs)
    gl.compileShader(vertShader)

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fragShader, fs)
    gl.compileShader(fragShader)

    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
      throw new Error('Error compiling vertex shader: ' + gl.getShaderInfoLog(vertShader))
    }
    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
      throw new Error('Error compiling fragment shader: ' + gl.getShaderInfoLog(fragShader))
    }

    var program = gl.createProgram()
    gl.attachShader(program, vertShader)
    gl.attachShader(program, fragShader)
    gl.linkProgram(program)

    var textures = []
    var fb = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    for (var i = 0; i < 4; i++) {
      var texture = gl.createTexture()
      textures.push(texture)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      var level = 0
      gl.texImage2D(gl.TEXTURE_2D, level, gl.RGBA, bufferWidth, bufferHeight, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, null)
      // attach texture to framebuffer
      gl.framebufferTexture2D(gl.FRAMEBUFFER, drawBuffers.COLOR_ATTACHMENT0_WEBGL + i,
        gl.TEXTURE_2D, texture, level)
    }

    // our framebuffer textures are only 1x1 pixels
    gl.viewport(0, 0, 1, 1)

    // tell it we want to draw to all 4 attachments
    drawBuffers.drawBuffersWEBGL([
      drawBuffers.COLOR_ATTACHMENT0_WEBGL,
      drawBuffers.COLOR_ATTACHMENT1_WEBGL,
      drawBuffers.COLOR_ATTACHMENT2_WEBGL,
      drawBuffers.COLOR_ATTACHMENT3_WEBGL
    ])

    // draw a single point
    gl.useProgram(program)
    gl.drawArrays(gl.POINT, 0, 1)
    return textures
  }

  function renderTextures () {
    var vs = `void main() {
    gl_PointSize = 4.0;
    gl_Position = vec4(0, 0, 0, 1);
  }`

    // render the 4 textures
    var fs = `precision mediump float;
  uniform sampler2D tex[4];
  void main() {
    vec4 color = vec4(0);
    for (int i = 0; i < 4; ++i) {
      float x = gl_PointCoord.x * 4.0;
      float amount = step(float(i), x) * step(x, float(i + 1));
      color = mix(color, texture2D(tex[i], vec2(0)), amount);
    }
    gl_FragColor = vec4(color.rgb, 1.0);
  }`

    var vertShader = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vertShader, vs)
    gl.compileShader(vertShader)

    var fragShader = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fragShader, fs)
    gl.compileShader(fragShader)

    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
      throw new Error('Error compiling vertex shader: ' + gl.getShaderInfoLog(vertShader))
    }
    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
      throw new Error('Error compiling fragment shader: ' + gl.getShaderInfoLog(fragShader))
    }

    var program = gl.createProgram()
    gl.attachShader(program, vertShader)
    gl.attachShader(program, fragShader)
    gl.linkProgram(program)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, outputWidth, outputHeight)
    gl.useProgram(program)
    // binds all the textures and set the uniforms
    for (var i = 0; i < textures.length; i++) {
      var texture = textures[i]
      gl.activeTexture(gl.TEXTURE0 + i)
      gl.bindTexture(gl.TEXTURE_2D, texture)
    }
    gl.uniform1iv(gl.getUniformLocation(program, 'tex[0]'), [0, 1, 2, 3])
    gl.drawArrays(gl.POINTS, 0, 1)
  }

  function toPixels () {
    var bytes = new Uint8Array(outputWidth * outputHeight * 4)
    gl.readPixels(0, 0, outputWidth, outputHeight, gl.RGBA, gl.UNSIGNED_BYTE, bytes)
    // require('../example/common/utils').bufferToFile(gl, outputWidth, outputHeight, 'multiple-render-targets.ppm')
    return bytes
  }
})
