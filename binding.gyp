{
  'variables': {
    'platform': '<(OS)',
  },
  'conditions': [
    ['platform == "mac"', {'variables': {'platform': 'darwin'}}],
    ['platform == "win"', {'variables': {'platform': 'win32'}}]
  ],
  'targets': [
    {
      'target_name': 'webgl',
      'defines': [
        'VERSION=1.0.0'
      ],
      'sources': [
          'src/bindings.cc',
          'src/webgl.cc',
          'src/procs.cc'
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
            'dependencies':
            [
              'angle/src/angle.gyp:libEGL',
              'angle/src/angle.gyp:libGLESv2'
            ],
            'libraries': [
                '-framework QuartzCore',
                '-framework Quartz'
            ],
        }],
        ['OS=="linux"', {
            'dependencies':
            [
              'angle/src/angle.gyp:libEGL',
              'angle/src/angle.gyp:libGLESv2'
            ]
        }],
        ['OS=="win"', {
            'library_dirs': [
              '<(module_root_dir)/deps/windows/lib/<(target_arch)',
            ],
            'libraries': [
              'libEGL.lib',
              'libGLESv2.lib'
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
            ],
            'msvs_configuration_attributes':
            {
                'OutputDirectory': '$(SolutionDir)$(ConfigurationName)',
                'IntermediateDirectory': '$(OutDir)\\obj\\$(ProjectName)'
            },
            "copies": [
              {
                'destination': '$(SolutionDir)$(ConfigurationName)',
                'files': [
                  '<(module_root_dir)/deps/windows/dll/<(target_arch)/libEGL.dll',
                  '<(module_root_dir)/deps/windows/dll/<(target_arch)/libGLESv2.dll'
                ]
              }
           ]
          }
        ]
      ]
    }
  ]
}
