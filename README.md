headless-gl
===========
This is a gutted version of [node-webgl](https://github.com/mikeseven/node-webgl) with no external dependencies or fancy drawing stuff.  You can use it to create OpenGL contexts for GPGPU programming in node.  In the browser, it just creates an ordinary WebGL context.


Installation
============
On OS X or Linux, you should be able to just do:

    npm install headless-gl
    
I haven't tested this on Windows, but it should work.

Usage
=====
To get a handle on the headless OpenGL context, just do:

    var gl = require("headless-gl");

Then you can use all the ordinary WebGL methods, with the exception that there is no way to load up images.





