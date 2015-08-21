//Create context
var width   = 1056;
var height  = 1056;
var gl = require("../index.js")(width, height);

//Create texture
var tex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, tex)
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);


//Create frame buffer
var fbo = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

//Clear screen to red
gl.clearColor(1.0, 1.0, 1.0, 1.0);
gl.colorMask(true, true, true, true);
gl.clear(gl.COLOR_BUFFER_BIT);

//Write output
var pixels = new Uint8Array(width * height * 4);
gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
process.stdout.write(["P3\n# gl.ppm\n", width, " ", height, "\n255\n"].join(""));
for(var i=0; i<pixels.length; i+=3) {
    process.stdout.write(pixels[i] + " " + pixels[i+1] + " " + pixels[i+2] + " ");
}

gl.destroy();
