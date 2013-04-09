var jsdom   = require("jsdom")
  , Canvas  = require("canvas")
  , gl      = require("../index.js")
  , tap     = require("tap")
  , fs      = require("fs")

function runConformanceTest(path) {
  tap.test("conformance test: " + path, function(t) {
    var markup = fs.readFileSync(path)
    var document = jsdom.jsdom(markup, null, {
      url: path,
      features: {
        FetchExternalResources: ["script", "img", "css", "frame", "iframe", "link"],
        SkipExternalResources: false,
        ProcessExternalResources: ["script"]
      }
    })
    var window = document.createWindow()
    
    
    window.__TEST_OVER
    
  })
}

module.exports = runConformanceTest