# headless-gl
`headless-gl` lets you create a WebGL context in node.js without making a window or loading a full browser environment.

It aspires to be fully conformant with the WebGL 1.0 specification.

## Example

```javascript
//Create context
var width   = 64
var height  = 64
var gl = require("gl")(width, height)

//Clear screen to red
gl.clearColor(1, 0, 0, 1)
gl.clear(gl.COLOR_BUFFER_BIT)

//Write output as a PPM formatted image
var pixels = new Uint8Array(width * height * 4)
gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
process.stdout.write(["P3\n# gl.ppm\n", width, " ", height, "\n255\n"].join(""))
for(var i=0; i<pixels.length; i += 4) {
  for(var j=0; j<3; ++j) {
    process.stdout.write(pixels[i + j] + " ")
  }
}
```

## Install
Because `headless-gl` uses native code, it is a bit more involved to set up than a typical JavaScript npm module.  Before you can use it, you will need to ensure that your system has the correct dependencies installed.

### System dependencies

#### Mac OS X

* Python 2.7
* XCode

#### Linux

* Python 2.7
* A GNU C++ environment (available via the `build-essential` package on `apt`)
* Working and up to date OpenGL drivers
* GLEW

#### Windows

* Python 2.7
* Microsoft Visual Studio

### npm

## API

#### `var gl = require('gl')(width, height[, options])`

#### `gl.resize(width, height)`

#### `gl.destroy()`


## Building locally

## More information

### Changes from version 1.0.0

* Improved conformance
* ANGLE
* No default context
* .destroy
* .resize

### Why use this thing instead of `node-webgl`?

It depends on what you are trying to do.  [node-webgl](https://github.com/mikeseven/node-webgl) is good if you are making a graphical application like a game, and allows for access to some features which are not part of ordinary WebGL.  On the other hand, because headless-gl does not create any windows, it is suitable for running in a server environment.  This means that you can use it to generate figures using OpenGL or perform GPGPU computations using shaders. Also, unlike `node-webgl`, `headless-gl` attempts to correctly implement the full WebGL standard making it more reliable.

### Why use this thing instead of `nw.js`?

`nw.js` is good if you need a full DOM implementation.  On the other hand, because it is a larger dependency it can be more difficult to set up and configure.  `headless-gl` is lighter weight and more modular in the sense that it just implements WebGL and nothing else.

### How are <image> and <video> elements implemented?

They aren't for now.  If you want to upload data to a texture, you will need to unpack the pixels into a `Uint8Array` and stick on the GPU yourself.

## License

See LICENSES
