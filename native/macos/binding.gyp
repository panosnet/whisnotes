{
  "targets": [
    {
      "target_name": "screencapturekit",
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "sources": [
        "screen_capture_kit.mm"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
      "conditions": [
        [
          "OS=='mac'",
          {
            "xcode_settings": {
              "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
              "CLANG_CXX_LIBRARY": "libc++",
              "MACOSX_DEPLOYMENT_TARGET": "13.0",
              "OTHER_CFLAGS": [
                "-ObjC++",
                "-std=c++17"
              ]
            },
            "link_settings": {
              "libraries": [
                "-framework AVFoundation",
                "-framework CoreMedia",
                "-framework CoreAudio",
                "-framework ScreenCaptureKit"
              ]
            }
          }
        ]
      ]
    }
  ]
}
