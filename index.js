"use strict"

var WebGLContext = require("./webgl.js");

//Interoperate with node-canvas when available
(function() {
    var pGetContext;

    function getContextGLShim(contextid) {
        if (contextid === "webgl" ||
            contextid === "experimental-webgl") {
            if (this._gl_context) {
                return this._gl_context;
            }
            this._gl_context = new WebGLContext();
            return this._gl_context;
        }
        return pgetContext.call(this, contextid);
    }
    try {
        var Canvas = require("canvas");
        if (Canvas) {
            pGetContext = Canvas.prototype.getContext;
            Canvas.prototype.getContext = getContextGLShim;
        }
    } catch (e) {}
})();


module.exports.createContext = function(width, height) {
    return new WebGLContext(width, height);
}
