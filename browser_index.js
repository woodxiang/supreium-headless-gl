'use strict'

function createContext (width, height, options) {
  var canvas = document.createElement('canvas')
  if (!canvas) {
    return null
  }
  var gl
  canvas.width = width
  canvas.height = height

  try {
    gl = canvas.getContext('experimental-webgl', options)
  } catch (e) {}
  try {
    gl = canvas.getContext('webgl', options)
  } catch (e) {}

  if (gl) {
    gl.resize = function (w, h) {
      canvas.width = w
      canvas.height = h
    }
    gl.destroy = function () {}
  }

  return gl || null
}

module.exports = createContext
