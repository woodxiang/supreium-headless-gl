headless-gl
===========
This is a gutted version of [node-webgl](https://github.com/mikeseven/node-webgl) with no external dependencies, DOM emulation or window handling.  You can use it to create WebGL contexts for GPGPU programming and server-side rendering in node.  It should also work in browsers that support WebGL.


Installation
============
Just do:

    npm install headless-gl
    
Currently only works on OS X.  I think Linux should be easy, Windows may be more complicated.

Usage
=====
To get a handle on the headless OpenGL context, just do:

    var gl = require("headless-gl");

Then you can use all the ordinary WebGL methods, with the exception that there is no way to load up images.



Why use this thing instead of node-webgl?
-----------------------------------------
It depends on what you are trying to do.  [node-webgl](https://github.com/mikeseven/node-webgl) is good if you are making a graphical application like a game.  On the other hand, because headless-gl does not create any windows, it is suitable for running in a server environment.  This means that you can use it to generate figures using OpenGL or perform GPGPU computations using shaders.

Credits
=======
See LICENSES
