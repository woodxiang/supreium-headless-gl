var BLACKLIST = {
  'more_functions_isTests': true
}

require('./util/conformance')(function(str) {
  return str.indexOf('more_functions') === 0 &&
         !BLACKLIST[str]
})
