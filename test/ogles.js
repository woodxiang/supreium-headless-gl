var BLACKLIST = [
  'ogles_GL_array_array_001_to_006'
]

require('./util/conformance')(function (str) {
  return str.indexOf('ogles') === 0 && BLACKLIST.indexOf(str) < 0
})
