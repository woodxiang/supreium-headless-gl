'use strict'

function createContext(width, height, options) {
    var canvas = document.createElement("canvas")
    if (!canvas) {
        return null
    }
    canvas.width  = width
    canvas.height = height
    try {
        var gl = canvas.getContext("experimental-webgl", options)
        if (gl) {
            return gl
        }
    } catch (e) {}
    try {
        var gl = canvas.getContext("webgl", options)
        if (gl) {
            return gl
        }
    } catch (e) {}
    return null
}

module.exports.createContext = createContext
