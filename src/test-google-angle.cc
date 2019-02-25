#include <algorithm>
#include <vector>
#include <map>
#include <utility>

#include <node.h>
#include "nan.h"
#include <v8.h>

#include <EGL/egl.h>
#include <GLES2/gl2.h>
#include <GLES2/gl2ext.h>

#include <iostream>
#include <fstream>

struct TestGoogleAngle {
  static GLenum* writeTextures() {
    GLchar* vs[] = {
      "void main() {\n\
        gl_PointSize = 300.0;\n\
        gl_Position = vec4(0, 0, 0, 1);\n\
      }"
    };

    GLchar* fs[] = {
      "#extension GL_EXT_draw_buffers : require\n\
      precision mediump float;\n\
      void main() {\n\
        gl_FragData[0] = vec4(1, .5, .3, .7);\n\
        gl_FragData[1] = vec4(.6, .5, .4, .3);\n\
        gl_FragData[2] = vec4(.2, .8, .0,  1);\n\
        gl_FragData[3] = vec4(.3, .4, .9, .6);\n\
      }"
    };

    GLuint vertShader = (reinterpret_cast<PFNGLCREATESHADERPROC>(eglGetProcAddress("glCreateShader")))(GL_VERTEX_SHADER);
    (reinterpret_cast<PFNGLSHADERSOURCEPROC>(eglGetProcAddress("glShaderSource")))(vertShader, 1, vs, nullptr);
    (reinterpret_cast<PFNGLCOMPILESHADERPROC>(eglGetProcAddress("glCompileShader")))(vertShader);

    GLuint fragShader = (reinterpret_cast<PFNGLCREATESHADERPROC>(eglGetProcAddress("glCreateShader")))(GL_FRAGMENT_SHADER);
    (reinterpret_cast<PFNGLSHADERSOURCEPROC>(eglGetProcAddress("glShaderSource")))(fragShader, 1, fs, nullptr);
    (reinterpret_cast<PFNGLCOMPILESHADERPROC>(eglGetProcAddress("glCompileShader")))(fragShader);

    GLint vertCompileResult;
    (reinterpret_cast<PFNGLGETSHADERIVPROC>(eglGetProcAddress("glGetShaderiv")))(vertShader, GL_COMPILE_STATUS, &vertCompileResult);
    if (vertCompileResult == GL_FALSE) {
      char *infolog = new char[vertCompileResult];
      (reinterpret_cast<PFNGLGETSHADERINFOLOGPROC>(eglGetProcAddress("glGetShaderInfoLog")))(vertShader, vertCompileResult, nullptr, infolog);
      throw strcat("Error compiling vertex shader: ", infolog);
    }

    GLint fragCompileResult;
    (reinterpret_cast<PFNGLGETSHADERIVPROC>(eglGetProcAddress("glGetShaderiv")))(fragShader, GL_COMPILE_STATUS, &fragCompileResult);
    if (fragCompileResult == GL_FALSE) {
      char *infolog = new char[fragCompileResult];
      (reinterpret_cast<PFNGLGETSHADERINFOLOGPROC>(eglGetProcAddress("glGetShaderInfoLog")))(fragShader, fragCompileResult, nullptr, infolog);
      throw strcat("Error compiling fragment shader: ", infolog);
    }

    GLuint program = (reinterpret_cast<PFNGLCREATEPROGRAMPROC>(eglGetProcAddress("glCreateProgram")))();
    (reinterpret_cast<PFNGLATTACHSHADERPROC>(eglGetProcAddress("glAttachShader")))(program, vertShader);
    (reinterpret_cast<PFNGLATTACHSHADERPROC>(eglGetProcAddress("glAttachShader")))(program, fragShader);
    (reinterpret_cast<PFNGLLINKPROGRAMPROC>(eglGetProcAddress("glLinkProgram")))(program);

    GLenum textures[] = {};
    GLuint fb;
    (reinterpret_cast<PFNGLGENFRAMEBUFFERSPROC>(eglGetProcAddress("glGenFramebuffers")))(1, &fb);
    (reinterpret_cast<PFNGLBINDFRAMEBUFFERPROC>(eglGetProcAddress("glBindFramebuffer")))(GL_FRAMEBUFFER, fb);
    for (int i = 0; i < 4; ++i) {
      GLuint texture;
      (reinterpret_cast<PFNGLGENTEXTURESPROC>(eglGetProcAddress("glGenTextures")))(1, &texture);
      textures[i] = texture;
      (reinterpret_cast<PFNGLBINDTEXTUREPROC>(eglGetProcAddress("glBindTexture")))(GL_TEXTURE_2D, texture);
      int width = 1;
      int height = 1;
      int level = 0;
      (reinterpret_cast<PFNGLTEXIMAGE2DPROC>(eglGetProcAddress("glTexImage2D")))(GL_TEXTURE_2D, level, GL_RGBA, width, height, 0,
        GL_RGBA, GL_UNSIGNED_BYTE, nullptr);
      // attach texture to framebuffer
      (reinterpret_cast<PFNGLFRAMEBUFFERTEXTURE2DPROC>(eglGetProcAddress("glFramebufferTexture2D")))(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0_EXT + i,
        GL_TEXTURE_2D, texture, level);
    }

    // // our framebuffer textures are only 1x1 pixels
    (reinterpret_cast<PFNGLVIEWPORTPROC>(eglGetProcAddress("glViewport")))(0, 0, 1, 1);

    // tell it we want to draw to all 4 attachments
    GLenum drawBuffers[] = {
      GL_COLOR_ATTACHMENT0_EXT,
      GL_COLOR_ATTACHMENT1_EXT,
      GL_COLOR_ATTACHMENT2_EXT,
      GL_COLOR_ATTACHMENT3_EXT
    };
    (reinterpret_cast<PFNGLDRAWBUFFERSEXTPROC>(eglGetProcAddress("glDrawBuffersEXT")))(4, drawBuffers);

    // draw a single point
    (reinterpret_cast<PFNGLUSEPROGRAMPROC>(eglGetProcAddress("glUseProgram")))(program);
    (reinterpret_cast<PFNGLDRAWARRAYSPROC>(eglGetProcAddress("glDrawArrays")))(GL_POINTS, 0, 1);
    
    return textures;
  }

  static void renderTextures(GLenum* textures, int width, int height) {
    GLchar const* vs[] = {
      "void main() {\n\
        gl_PointSize = 300.0;\n\
        gl_Position = vec4(0, 0, 0, 1);\n\
      }"
    };

    // render the 4 textures
    GLchar const* fs[] = {
      "precision mediump float;\n\
      uniform sampler2D tex[4];\n\
      void main() {\n\
        vec4 color = vec4(0);\n\
        for (int i = 0; i < 4; ++i) {\n\
          float x = gl_PointCoord.x * 4.0;\n\
          float amount = step(float(i), x) * step(x, float(i + 1));\n\
          color = mix(color, texture2D(tex[i], vec2(0)), amount);\n\
        }\n\
        gl_FragColor = vec4(color.rgb, 1.0);\n\
      }"
    };

    GLuint vertShader = (reinterpret_cast<PFNGLCREATESHADERPROC>(eglGetProcAddress("glCreateShader")))(GL_VERTEX_SHADER);
    (reinterpret_cast<PFNGLSHADERSOURCEPROC>(eglGetProcAddress("glShaderSource")))(vertShader, 1, vs, nullptr);
    (reinterpret_cast<PFNGLCOMPILESHADERPROC>(eglGetProcAddress("glCompileShader")))(vertShader);

    GLuint fragShader = (reinterpret_cast<PFNGLCREATESHADERPROC>(eglGetProcAddress("glCreateShader")))(GL_FRAGMENT_SHADER);
    (reinterpret_cast<PFNGLSHADERSOURCEPROC>(eglGetProcAddress("glShaderSource")))(fragShader, 1, fs, nullptr);
    (reinterpret_cast<PFNGLCOMPILESHADERPROC>(eglGetProcAddress("glCompileShader")))(fragShader);

    GLint vertCompileResult;
    (reinterpret_cast<PFNGLGETSHADERIVPROC>(eglGetProcAddress("glGetShaderiv")))(vertShader, GL_COMPILE_STATUS, &vertCompileResult);
    if (vertCompileResult == GL_FALSE) {
      char *infolog = new char[vertCompileResult];
      (reinterpret_cast<PFNGLGETSHADERINFOLOGPROC>(eglGetProcAddress("glGetShaderInfoLog")))(vertShader, vertCompileResult, nullptr, infolog);
      throw strcat("Error compiling vertex shader: ", infolog);
    }

    GLint fragCompileResult;
    (reinterpret_cast<PFNGLGETSHADERIVPROC>(eglGetProcAddress("glGetShaderiv")))(fragShader, GL_COMPILE_STATUS, &fragCompileResult);
    if (fragCompileResult == GL_FALSE) {
      char *infolog = new char[fragCompileResult];
      (reinterpret_cast<PFNGLGETSHADERINFOLOGPROC>(eglGetProcAddress("glGetShaderInfoLog")))(fragShader, fragCompileResult, nullptr, infolog);
      throw strcat("Error compiling fragment shader: ", infolog);
    }

    GLuint program = (reinterpret_cast<PFNGLCREATEPROGRAMPROC>(eglGetProcAddress("glCreateProgram")))();
    (reinterpret_cast<PFNGLATTACHSHADERPROC>(eglGetProcAddress("glAttachShader")))(program, vertShader);
    (reinterpret_cast<PFNGLATTACHSHADERPROC>(eglGetProcAddress("glAttachShader")))(program, fragShader);
    (reinterpret_cast<PFNGLLINKPROGRAMPROC>(eglGetProcAddress("glLinkProgram")))(program);

    (reinterpret_cast<PFNGLBINDFRAMEBUFFERPROC>(eglGetProcAddress("glBindFramebuffer")))(GL_FRAMEBUFFER, 0);
    (reinterpret_cast<PFNGLVIEWPORTPROC>(eglGetProcAddress("glViewport")))(0, 0, width, height);
    (reinterpret_cast<PFNGLUSEPROGRAMPROC>(eglGetProcAddress("glUseProgram")))(program);

    // binds all the textures and set the uniforms
    for (int i = 0; i < 4; i++) {
      GLenum texture = textures[i];
      (reinterpret_cast<PFNGLACTIVETEXTUREPROC>(eglGetProcAddress("glActiveTexture")))(GL_TEXTURE0 + i);
      (reinterpret_cast<PFNGLBINDTEXTUREPROC>(eglGetProcAddress("glBindTexture")))(GL_TEXTURE_2D, texture);
    }
    GLint values[4] = {0, 1, 2, 3};
    (reinterpret_cast<PFNGLUNIFORM1IVPROC>(eglGetProcAddress("glUniform1iv")))(reinterpret_cast<PFNGLGETUNIFORMLOCATIONPROC>(eglGetProcAddress("glGetUniformLocation"))(program, "tex[0]"), 4, values);
    (reinterpret_cast<PFNGLDRAWARRAYSPROC>(eglGetProcAddress("glDrawArrays")))(GL_POINTS, 0, 1);
  }

  static GLubyte* toPixels(int width, int height) {
    int max = width * height * 4 * sizeof(GLubyte);
    GLubyte bytes[max];
    (reinterpret_cast<PFNGLREADPIXELSPROC>(eglGetProcAddress("glReadPixels")))(0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, bytes);

    std::ofstream file;
    file.open("test-google-angle.ppm");
    file << "P3\n";
    file << "# gl.ppm\n";
    file << width;
    file << " ";
    file << height;
    file << "\n255\n";
    
    for (int i = 0; i < max; i += 4) {
      file << static_cast<unsigned int>(bytes[i]);
      file << " ";
      file << static_cast<unsigned int>(bytes[i + 1]);
      file << " ";
      file << static_cast<unsigned int>(bytes[i + 2]);
      file << " ";
    }
    file.close();
    return bytes;
  }

  static void checkPixels(GLubyte* bytes, int width, int height) {
    int notZero = 0;
    int count = width * height * 4;
    for (int i = 0; i < count; i++) {
      if (bytes[i] > 0) {
        notZero++;
      }
    }
    if (notZero != 144000) {
      throw strcat(strcat("Only ", std::to_string(notZero).c_str()), " are not 0, expected 144000");
    }
    throw "SUCCESS!";
  }

  static EGLContext createContext() {
    EGLint num_config;
    EGLDisplay DISPLAY = eglGetDisplay(EGL_DEFAULT_DISPLAY);
    EGLConfig config;
    EGLSurface surface;

    //Get display
    if (DISPLAY == EGL_NO_DISPLAY) {
      throw "No display";
    }

    //Initialize EGL
    if (!eglInitialize(DISPLAY, NULL, NULL)) {
      throw "No egl";
    }

    EGLint attrib_list[] = {
        EGL_SURFACE_TYPE, EGL_PBUFFER_BIT
      , EGL_RED_SIZE,     8
      , EGL_GREEN_SIZE,   8
      , EGL_BLUE_SIZE,    8
      , EGL_ALPHA_SIZE,   8
      , EGL_DEPTH_SIZE,   24
      , EGL_STENCIL_SIZE, 8
      , EGL_NONE
    };

    if (!eglChooseConfig(
        DISPLAY,
        attrib_list,
        &config,
        1,
        &num_config) ||
        num_config != 1) {
      throw "Bad config";
    }

    //Create context
    EGLint contextAttribs[] = {
      EGL_CONTEXT_CLIENT_VERSION, 2,
      EGL_NONE
    };
    EGLContext context = eglCreateContext(DISPLAY, config, EGL_NO_CONTEXT, contextAttribs);
    if (context == EGL_NO_CONTEXT) {
      throw "No context";
    }

    EGLint surfaceAttribs[] = {
        EGL_WIDTH,  (EGLint)300
      , EGL_HEIGHT, (EGLint)150
      , EGL_NONE
    };
    surface = eglCreatePbufferSurface(DISPLAY, config, surfaceAttribs);
    if (surface == EGL_NO_SURFACE) {
      throw "No surface";
    }

    //Set active
    if (!eglMakeCurrent(DISPLAY, surface, surface, context)) {
      throw "Bad state";
    }

    return context;
  }

  static void main() {
    int width = 300;
    int height = 150;
    EGLContext gl = createContext();
    GLenum* textures = writeTextures();
    renderTextures(textures, width, height);
    GLubyte* pixels = toPixels(width, height);
    checkPixels(pixels, width, height);
  }
};