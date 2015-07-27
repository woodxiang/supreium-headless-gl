#ifndef _INCLUDE_ARCH_WRAPPER_
#define _INCLUDE_ARCH_WRAPPER_

#ifdef __IPHONE_OS_VERSION_MIN_REQUIRED
    #include <OpenGLES/ES2/gl.h>
    #include <OpenGLES/ES2/glext.h>
    typedef double GLclampd;
#else

    #if defined (__APPLE__) || defined(MACOSX)

        #include <OpenGL/OpenGL.h>
        #include <OpenGL/gl.h>

        #define USE_CGL                           1
        #define GL_CONTEXT_TYPE                   CGLContextObj

    #elif defined(WIN32)

        //Not implemented

    #elif defined(WIN64)

        //Not implemented

    #else

        //X11 system
        #include <GL/gl.h>
        #include <GL/glx.h>
        #define USE_GLX                           1
        #define GL_CONTEXT_TYPE                   GLXContext

    #endif

#endif

#endif
