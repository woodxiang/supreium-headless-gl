{
  'variables': {
    'platform': '<(OS)',
  },
  'conditions': [
    ['platform == "mac"', {'variables': {'platform': 'darwin'}}],
    ['platform == "win"', {'variables': {'platform': 'win32'}}]
  ],
  'includes': [
    'angle/build/common.gypi',
    'angle/build/common_defines.gypi',
  ],
  'targets': [
    {
      'target_name': 'webgl',
      'defines': [
        'VERSION=1.0.0'
      ],
      'dependencies':
      [
        'angle/src/angle.gyp:libEGL',
        'angle/src/angle.gyp:libGLESv2'
      ],
      'sources': [
          'src/bindings.cc',
          'src/webgl.cc'
      ],
      'include_dirs': [
        "<!(node -e \"require('nan')\")",
        '<(module_root_dir)/deps/include',
        "angle/include"
      ],
      'library_dirs': [
        '<(module_root_dir)/deps/<(platform)'
      ],
      'conditions': [
        ['OS=="mac"', {
            'libraries': ['-lGLEW', '-framework OpenGL'],
            'include_dirs': ['/usr/local/include'],
            'library_dirs': ['/usr/local/lib']
        }],
        ['OS=="linux"', {
            'libraries': ['-lGLEW', '-lGL']
        }],
        ['OS=="win"',
          {
            'include_dirs': [
              './deps/glew/include'
              ],
            'library_dirs': [
              './deps/glew/windows/lib/<(target_arch)'
              ],
            'libraries': [
              ],
            'defines' : [
              'WIN32_LEAN_AND_MEAN',
              'VC_EXTRALEAN'
            ],
            'cflags' : [
              '/O2','/Oy','/GL','/GF','/Gm-','/EHsc','/MT','/GS','/Gy','/GR-','/Gd','/wd"4530"','/wd"4251"'
            ],
            'ldflags' : [
              '/OPT:REF','/OPT:ICF','/LTCG'
            ]
          }
        ]
      ]
    }
  ]
}
