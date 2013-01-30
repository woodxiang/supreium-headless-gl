var gl = require("../index.js");


var data = new Uint8Array(64 * 64);

var tex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, tex)
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 64, 64, 0, gl.RGB, gl.UNSIGNED_BYTE, data);

var fbo = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);






