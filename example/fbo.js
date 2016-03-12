// Create context
var width = 256
var height = 256
var gl = require('../index.js')(width, height)

// Clear screen to red
gl.clearColor(1.0, 1.0, 1.0, 1.0)
gl.colorMask(true, true, true, true)
gl.clear(gl.COLOR_BUFFER_BIT)

// Write output
var pixels = new Uint8Array(width * height * 4)
gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
process.stdout.write(['P3\n# gl.ppm\n', width, ' ', height, '\n255\n'].join(''))
for (var i = 0; i < pixels.length; i += 3) {
  process.stdout.write(pixels[i] + ' ' + pixels[i + 1] + ' ' + pixels[i + 2] + ' ')
}

gl.destroy()
