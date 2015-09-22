var BLACKLIST = [
  'glsl_misc_shader-uniform-packing-restrictions',
  'glsl_misc_shader-varying-packing-restrictions'
]

require('./util/conformance')(function(str) {
  return str.indexOf('glsl') === 0 && BLACKLIST.indexOf(str) < 0
})
