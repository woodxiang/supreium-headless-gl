#include <cstring>
#include <vector>
#include <iostream>

#include "webgl.h"
#include <node.h>
#include <node_buffer.h>

#ifdef _WIN32
  #define  strcasestr(s, t) strstr(strupr(s), strupr(t))
#endif

using namespace node;
using namespace v8;
using namespace std;

WebGLRenderingContext* WebGLRenderingContext::ACTIVE = NULL;
WebGLRenderingContext* WebGLRenderingContext::CONTEXT_LIST_HEAD = NULL;

v8::Handle<v8::Value> ThrowError(const char* msg) {
  return NanThrowError(NanNew<String>(msg));
}

#define GL_METHOD(method_name)    NAN_METHOD(WebGLRenderingContext:: method_name)

#define GL_BOILERPLATE  \
  NanScope();\
  if(args.This()->InternalFieldCount() <= 0) { \
    return ThrowError("Invalid WebGL Object"); \
  } \
  WebGLRenderingContext* inst = node::ObjectWrap::Unwrap<WebGLRenderingContext>(args.This()); \
  if(!(inst && inst->setActive())) { \
    return ThrowError("Invalid GL context"); \
  }

// A 32-bit and 64-bit compatible way of converting a pointer to a GLuint.
static GLuint ToGLuint(const void* ptr) {
  return static_cast<GLuint>(reinterpret_cast<size_t>(ptr));
}

static int SizeOfArrayElementForType(v8::ExternalArrayType type) {
  switch (type) {
  case v8::kExternalByteArray:
  case v8::kExternalUnsignedByteArray:
    return 1;
  case v8::kExternalShortArray:
  case v8::kExternalUnsignedShortArray:
    return 2;
  case v8::kExternalIntArray:
  case v8::kExternalUnsignedIntArray:
  case v8::kExternalFloatArray:
    return 4;
  default:
    return 0;
  }
}

inline void *getImageData(Local<Value> arg) {
  void *pixels = NULL;
  if (!arg->IsNull()) {
    Local<Object> obj = Local<Object>::Cast(arg);
    if (!obj->IsObject())
      NanThrowError("Bad texture argument");

    pixels = obj->GetIndexedPropertiesExternalArrayData();
  }
  return pixels;
}

template<typename Type>
inline Type* getArrayData(Local<Value> arg, int* num = NULL) {
  Type *data=NULL;
  if(num) *num=0;

  if(!arg->IsNull()) {
    if(arg->IsArray()) {
      Local<Array> arr = Local<Array>::Cast(arg);
      if(num) *num=arr->Length();
      data = reinterpret_cast<Type*>(arr->GetIndexedPropertiesExternalArrayData());
    }
    else if(arg->IsObject()) {
      if(num) *num = arg->ToObject()->GetIndexedPropertiesExternalArrayDataLength();
      data = reinterpret_cast<Type*>(arg->ToObject()->GetIndexedPropertiesExternalArrayData());
    }
    else
      NanThrowError("Bad array argument");
  }

  return data;
}

WebGLRenderingContext::WebGLRenderingContext(
  int width,
  int height,
  bool alpha,
  bool depth,
  bool stencil,
  bool antialias,
  bool premultipliedAlpha,
  bool preserveDrawingBuffer,
  bool preferLowPowerToHighPerformance,
  bool failIfMajorPerformanceCaveat) :

  state(GLCONTEXT_STATE_INIT),
  next(NULL),
  prev(NULL) {

//TODO: Add linux and windows support here

  #ifdef USE_CGL

    CGLPixelFormatAttribute attribs[256];
    int ptr = 0;

    attribs[ptr++] = kCGLPFAColorSize;
    attribs[ptr++] = (CGLPixelFormatAttribute)24;
    attribs[ptr++] = kCGLPFAAlphaSize;
    attribs[ptr++] = (CGLPixelFormatAttribute)(alpha ? 8 : 0);
    attribs[ptr++] = kCGLPFADepthSize;
    attribs[ptr++] = (CGLPixelFormatAttribute)(depth ? 16: 0);
    attribs[ptr++] = kCGLPFAStencilSize;
    attribs[ptr++] = (CGLPixelFormatAttribute)(stencil ? 8 : 0);

    if(preferLowPowerToHighPerformance) {
      attribs[ptr++] = kCGLPFAMinimumPolicy;
    } else {
      attribs[ptr++] = kCGLPFAMaximumPolicy;
    }

    //TODO: Handle antialiasing

    //TODO: preserve drawing buffer support?

    //End of attributes
    attribs[ptr++] = (CGLPixelFormatAttribute)0;

    //Create pixel format from attributes
    CGLPixelFormatObj pix;
    GLint npix = 0;
    if(CGLChoosePixelFormat( attribs, &pix, &npix ) != kCGLNoError) {
      state = GLCONTEXT_STATE_ERROR;
      return;
    }

    //Create context
    if(CGLCreateContext( pix, NULL, &context ) != kCGLNoError) {
      state = GLCONTEXT_STATE_ERROR;
      return;
    }

    //Set context as active
    if(CGLSetCurrentContext( context ) != kCGLNoError) {
      state = GLCONTEXT_STATE_ERROR;
      return;
    }

    /*
    if(glewInit() != GLEW_OK) {
      state = GLCONTEXT_STATE_ERROR;
      return;
    }
    */

    glClearColor(1, 1, 1, 1);
    glClear(GL_COLOR_BUFFER_BIT);
    char PIXELS[16];
    PIXELS[0] = PIXELS[1] = PIXELS[2] = PIXELS[3] = 0;
    glReadPixels(0, 0, 1, 1, GL_RGBA, GL_UNSIGNED_BYTE, PIXELS);
    fprintf(stderr, "%d %d %d %d\n", PIXELS[0], PIXELS[1], PIXELS[2], PIXELS[3]);

  #endif

  //Success
  state = GLCONTEXT_STATE_OK;
  registerContext();
  ACTIVE = this;
}

bool WebGLRenderingContext::setActive() {
  if(state != GLCONTEXT_STATE_OK) {
    return false;
  }
  if(this == ACTIVE) {
    return true;
  }
  bool result = false;
  #ifdef USE_CGL
    result = CGLSetCurrentContext(context) == kCGLNoError;
  #endif
  if(result) {
    ACTIVE = this;
  }
  return result;
}

void WebGLRenderingContext::dispose() {
  //Unregister context
  unregisterContext();

  if(!setActive()) {
    return;
  }

  //Update state
  state = GLCONTEXT_STATE_DESTROY;

  //Destroy all object references
  compactGLObj();
  for(size_t i=0; i<objects.size(); ++i) {
    GLuint obj = objects[i].first;
    switch(objects[i].second) {
      case GLOBJECT_TYPE_PROGRAM:
        glDeleteProgram(obj);
        break;
      case GLOBJECT_TYPE_BUFFER:
        glDeleteBuffers(1,&obj);
        break;
      case GLOBJECT_TYPE_FRAMEBUFFER:
        glDeleteFramebuffers(1,&obj);
        break;
      case GLOBJECT_TYPE_RENDERBUFFER:
        glDeleteRenderbuffers(1,&obj);
        break;
      case GLOBJECT_TYPE_SHADER:
        glDeleteShader(obj);
        break;
      case GLOBJECT_TYPE_TEXTURE:
        glDeleteTextures(1,&obj);
        break;
      default:
        break;
    }
  }
  objects.clear();

  //Destroy context
  #ifdef USE_CGL
    CGLDestroyContext(context);
  #endif
}

WebGLRenderingContext::~WebGLRenderingContext() {
  dispose();
}

void WebGLRenderingContext::disposeAll() {
  while(CONTEXT_LIST_HEAD) {
    CONTEXT_LIST_HEAD->dispose();
  }
}

GL_METHOD(New) {
  NanScope();

  WebGLRenderingContext* instance = new WebGLRenderingContext(
    args[0]->Int32Value(),   //Width
    args[1]->Int32Value(),   //Height
    args[2]->BooleanValue(), //Alpha
    args[3]->BooleanValue(), //Depth
    args[4]->BooleanValue(), //Stencil
    args[5]->BooleanValue(), //antialias
    args[6]->BooleanValue(), //premultipliedAlpha
    args[7]->BooleanValue(), //preserve drawing buffer
    args[8]->BooleanValue(), //low power
    args[9]->BooleanValue()  //fail if crap
  );
  if(instance->state != GLCONTEXT_STATE_OK){
    return ThrowError("Error creating WebGLContext");
  }

  instance->Wrap(args.This());
  return args.This();
}

GL_METHOD(Destroy) {
  GL_BOILERPLATE
  inst->dispose();
  NanReturnUndefined();
}

GL_METHOD(Uniform1f) {
  GL_BOILERPLATE;

  int location = args[0]->Int32Value();
  float x = (float) args[1]->NumberValue();

  glUniform1f(location, x);
  NanReturnUndefined();
}

GL_METHOD(Uniform2f) {
  GL_BOILERPLATE;

  int location = args[0]->Int32Value();
  float x = (float) args[1]->NumberValue();
  float y = (float) args[2]->NumberValue();

  glUniform2f(location, x, y);
  NanReturnValue(NanUndefined());
}

GL_METHOD(Uniform3f) {
  GL_BOILERPLATE;

  int location = args[0]->Int32Value();
  float x = (float) args[1]->NumberValue();
  float y = (float) args[2]->NumberValue();
  float z = (float) args[3]->NumberValue();

  glUniform3f(location, x, y, z);
  NanReturnValue(NanUndefined());
}

GL_METHOD(Uniform4f) {
  GL_BOILERPLATE;

  int location = args[0]->Int32Value();
  float x = (float) args[1]->NumberValue();
  float y = (float) args[2]->NumberValue();
  float z = (float) args[3]->NumberValue();
  float w = (float) args[4]->NumberValue();

  glUniform4f(location, x, y, z, w);
  NanReturnValue(NanUndefined());
}

GL_METHOD(Uniform1i) {
  GL_BOILERPLATE;

  int location = args[0]->Int32Value();
  int x = args[1]->Int32Value();

  glUniform1i(location, x);
  NanReturnValue(NanUndefined());
}

GL_METHOD(Uniform2i) {
  GL_BOILERPLATE;

  int location = args[0]->Int32Value();
  int x = args[1]->Int32Value();
  int y = args[2]->Int32Value();

  glUniform2i(location, x, y);
  NanReturnValue(NanUndefined());
}

GL_METHOD(Uniform3i) {
  GL_BOILERPLATE;

  int location = args[0]->Int32Value();
  int x = args[1]->Int32Value();
  int y = args[2]->Int32Value();
  int z = args[3]->Int32Value();

  glUniform3i(location, x, y, z);
  NanReturnValue(NanUndefined());
}

GL_METHOD(Uniform4i) {
  GL_BOILERPLATE;

  int location = args[0]->Int32Value();
  int x = args[1]->Int32Value();
  int y = args[2]->Int32Value();
  int z = args[3]->Int32Value();
  int w = args[4]->Int32Value();

  glUniform4i(location, x, y, z, w);
  NanReturnValue(NanUndefined());
}

GL_METHOD(Uniform1fv) {
  GL_BOILERPLATE;

  int location = args[0]->Int32Value();
  int num=0;
  GLfloat *ptr=getArrayData<GLfloat>(args[1],&num);
  glUniform1fv(location, num, ptr);
  NanReturnValue(NanUndefined());
}

GL_METHOD(Uniform2fv) {
  GL_BOILERPLATE;

  int location = args[0]->Int32Value();
  int num=0;
  GLfloat *ptr=getArrayData<GLfloat>(args[1],&num);
  num /= 2;

  glUniform2fv(location, num, ptr);
  NanReturnValue(NanUndefined());
}

GL_METHOD(Uniform3fv) {
  GL_BOILERPLATE;

  int location = args[0]->Int32Value();
  int num=0;
  GLfloat *ptr=getArrayData<GLfloat>(args[1],&num);
  num /= 3;

  glUniform3fv(location, num, ptr);
  NanReturnValue(NanUndefined());
}

GL_METHOD(Uniform4fv) {
  GL_BOILERPLATE;

  int location = args[0]->Int32Value();
  int num=0;
  GLfloat *ptr=getArrayData<GLfloat>(args[1],&num);
  num /= 4;

  glUniform4fv(location, num, ptr);
  NanReturnValue(NanUndefined());
}

GL_METHOD(Uniform1iv) {
  GL_BOILERPLATE;

  int location = args[0]->Int32Value();
  int num=0;
  GLint *ptr=getArrayData<GLint>(args[1],&num);

  glUniform1iv(location, num, ptr);
  NanReturnValue(NanUndefined());
}

GL_METHOD(Uniform2iv) {
  GL_BOILERPLATE;

  int location = args[0]->Int32Value();
  int num=0;
  GLint *ptr=getArrayData<GLint>(args[1],&num);
  num /= 2;

  glUniform2iv(location, num, ptr);
  NanReturnValue(NanUndefined());
}

GL_METHOD(Uniform3iv) {
  GL_BOILERPLATE;

  int location = args[0]->Int32Value();
  int num=0;
  GLint *ptr=getArrayData<GLint>(args[1],&num);
  num /= 3;
  glUniform3iv(location, num, ptr);
  NanReturnValue(NanUndefined());
}

GL_METHOD(Uniform4iv) {
  GL_BOILERPLATE;

  int location = args[0]->Int32Value();
  int num=0;
  GLint *ptr=getArrayData<GLint>(args[1],&num);
  num /= 4;
  glUniform4iv(location, num, ptr);
  NanReturnValue(NanUndefined());
}

GL_METHOD(PixelStorei) {
  GL_BOILERPLATE;

  int pname = args[0]->Int32Value();
  int param = args[1]->Int32Value();

  glPixelStorei(pname,param);

  NanReturnValue(NanUndefined());
}

GL_METHOD(BindAttribLocation) {
  GL_BOILERPLATE;

  int program = args[0]->Int32Value();
  int index = args[1]->Int32Value();
  String::Utf8Value name(args[2]);

  glBindAttribLocation(program, index, *name);

  NanReturnValue(NanUndefined());
}


GL_METHOD(GetError) {
  GL_BOILERPLATE;

  NanReturnValue(NanNew<Number>(glGetError()));
}


GL_METHOD(DrawArrays) {
  GL_BOILERPLATE;

  int mode = args[0]->Int32Value();
  int first = args[1]->Int32Value();
  int count = args[2]->Int32Value();

  glDrawArrays(mode, first, count);

  NanReturnValue(NanUndefined());
}

GL_METHOD(UniformMatrix2fv) {
  GL_BOILERPLATE;

  GLint location = args[0]->Int32Value();
  GLboolean transpose = args[1]->BooleanValue();

  GLsizei count=0;
  GLfloat* data=getArrayData<GLfloat>(args[2],&count);

  if (count < 4) {
    NanThrowError("Not enough data for UniformMatrix2fv");
  }

  glUniformMatrix2fv(location, count / 4, transpose, data);

  NanReturnValue(NanUndefined());
}

GL_METHOD(UniformMatrix3fv) {
  GL_BOILERPLATE;

  GLint location = args[0]->Int32Value();
  GLboolean transpose = args[1]->BooleanValue();
  GLsizei count=0;
  GLfloat* data=getArrayData<GLfloat>(args[2],&count);

  if (count < 9) {
    NanThrowError("Not enough data for UniformMatrix3fv");
  }

  glUniformMatrix3fv(location, count / 9, transpose, data);

  NanReturnValue(NanUndefined());
}

GL_METHOD(UniformMatrix4fv) {
  GL_BOILERPLATE;

  GLint location = args[0]->Int32Value();
  GLboolean transpose = args[1]->BooleanValue();
  GLsizei count=0;
  GLfloat* data=getArrayData<GLfloat>(args[2],&count);

  if (count < 16) {
    NanThrowError("Not enough data for UniformMatrix4fv");
  }

  glUniformMatrix4fv(location, count / 16, transpose, data);

  NanReturnValue(NanUndefined());
}

GL_METHOD(GenerateMipmap) {
  GL_BOILERPLATE;

  GLint target = args[0]->Int32Value();
  glGenerateMipmap(target);

  NanReturnValue(NanUndefined());
}

GL_METHOD(GetAttribLocation) {
  GL_BOILERPLATE;

  int program = args[0]->Int32Value();
  String::Utf8Value name(args[1]);

  NanReturnValue(NanNew<Number>(glGetAttribLocation(program, *name)));
}


GL_METHOD(DepthFunc) {
  GL_BOILERPLATE;

  glDepthFunc(args[0]->Int32Value());

  NanReturnValue(NanUndefined());
}


GL_METHOD(Viewport) {
  GL_BOILERPLATE;

  int x = args[0]->Int32Value();
  int y = args[1]->Int32Value();
  int width = args[2]->Int32Value();
  int height = args[3]->Int32Value();

  glViewport(x, y, width, height);

  NanReturnValue(NanUndefined());
}

GL_METHOD(CreateShader) {
  GL_BOILERPLATE;

  GLuint shader=glCreateShader(args[0]->Int32Value());
  #ifdef LOGGING
  cout<<"createShader "<<shader<<endl;
  #endif
  inst->registerGLObj(GLOBJECT_TYPE_SHADER, shader);
  NanReturnValue(NanNew<Number>(shader));
}


GL_METHOD(ShaderSource) {
  GL_BOILERPLATE;

  int id = args[0]->Int32Value();
  String::Utf8Value code(args[1]);

  const char* codes[1];
  codes[0] = *code;
  GLint length=code.length();

  glShaderSource  (id, 1, codes, &length);

  NanReturnValue(NanUndefined());
}


GL_METHOD(CompileShader) {
  GL_BOILERPLATE;

  glCompileShader(args[0]->Int32Value());

  NanReturnValue(NanUndefined());
}

GL_METHOD(FrontFace) {
  GL_BOILERPLATE;

  glFrontFace(args[0]->Int32Value());

  NanReturnValue(NanUndefined());
}


GL_METHOD(GetShaderParameter) {
  GL_BOILERPLATE;

  int shader = args[0]->Int32Value();
  int pname = args[1]->Int32Value();
  int value = 0;
  switch (pname) {
  case GL_DELETE_STATUS:
  case GL_COMPILE_STATUS:
    glGetShaderiv(shader, pname, &value);
    NanReturnValue(JS_BOOL(static_cast<bool>(value!=0)));
  case GL_SHADER_TYPE:
    glGetShaderiv(shader, pname, &value);
    NanReturnValue(JS_FLOAT(static_cast<unsigned long>(value)));
  case GL_INFO_LOG_LENGTH:
  case GL_SHADER_SOURCE_LENGTH:
    glGetShaderiv(shader, pname, &value);
    NanReturnValue(JS_FLOAT(static_cast<long>(value)));
  default:
    NanThrowTypeError("GetShaderParameter: Invalid Enum");
  }
  NanReturnUndefined();
}

GL_METHOD(GetShaderInfoLog) {
  GL_BOILERPLATE;

  int id = args[0]->Int32Value();
  int Len = 1024;
  char Error[1024];
  glGetShaderInfoLog(id, 1024, &Len, Error);

  NanReturnValue(NanNew<String>(Error));
}


GL_METHOD(CreateProgram) {
  GL_BOILERPLATE;

  GLuint program=glCreateProgram();
  #ifdef LOGGING
  cout<<"createProgram "<<program<<endl;
  #endif
  inst->registerGLObj(GLOBJECT_TYPE_PROGRAM, program);
  NanReturnValue(NanNew<Number>(program));
}


GL_METHOD(AttachShader) {
  GL_BOILERPLATE;

  int program = args[0]->Int32Value();
  int shader = args[1]->Int32Value();

  glAttachShader(program, shader);

  NanReturnValue(NanUndefined());
}


GL_METHOD(LinkProgram) {
  GL_BOILERPLATE;

  glLinkProgram(args[0]->Int32Value());

  NanReturnValue(NanUndefined());
}


GL_METHOD(GetProgramParameter) {
  GL_BOILERPLATE;

  int program = args[0]->Int32Value();
  int pname = args[1]->Int32Value();

  int value = 0;
  switch (pname) {
  case GL_DELETE_STATUS:
  case GL_LINK_STATUS:
  case GL_VALIDATE_STATUS:
    glGetProgramiv(program, pname, &value);
    NanReturnValue(JS_BOOL(static_cast<bool>(value!=0)));
  case GL_ATTACHED_SHADERS:
  case GL_ACTIVE_ATTRIBUTES:
  case GL_ACTIVE_UNIFORMS:
    glGetProgramiv(program, pname, &value);
    NanReturnValue(JS_FLOAT(static_cast<long>(value)));
  default:
    NanThrowTypeError("GetProgramParameter: Invalid Enum");
  }
  NanReturnUndefined();
}


GL_METHOD(GetUniformLocation) {
  GL_BOILERPLATE;

  int program = args[0]->Int32Value();
  NanAsciiString name(args[1]);

  NanReturnValue(JS_INT(glGetUniformLocation(program, *name)));
}


GL_METHOD(ClearColor) {
  GL_BOILERPLATE;

  float red   = (float) args[0]->NumberValue();
  float green = (float) args[1]->NumberValue();
  float blue  = (float) args[2]->NumberValue();
  float alpha = (float) args[3]->NumberValue();

  glClearColor(red, green, blue, alpha);

  NanReturnValue(NanUndefined());
}


GL_METHOD(ClearDepth) {
  GL_BOILERPLATE;

  float depth = (float) args[0]->NumberValue();

  glClearDepth(depth);

  NanReturnValue(NanUndefined());
}

GL_METHOD(Disable) {
  GL_BOILERPLATE;

  glDisable(args[0]->Int32Value());
  NanReturnValue(NanUndefined());
}

GL_METHOD(Enable) {
  GL_BOILERPLATE;

  glEnable(args[0]->Int32Value());
  NanReturnValue(NanUndefined());
}


GL_METHOD(CreateTexture) {
  GL_BOILERPLATE;

  GLuint texture;
  glGenTextures(1, &texture);
  inst->registerGLObj(GLOBJECT_TYPE_TEXTURE, texture);
  NanReturnValue(NanNew<Number>(texture));
}


GL_METHOD(BindTexture) {
  GL_BOILERPLATE;

  int target = args[0]->Int32Value();
  int texture = args[1]->IsNull() ? 0 : args[1]->Int32Value();

  glBindTexture(target, texture);
  NanReturnValue(NanUndefined());
}


GL_METHOD(TexImage2D) {
  GL_BOILERPLATE;

  int target         = args[0]->Int32Value();
  int level          = args[1]->Int32Value();
  int internalformat = args[2]->Int32Value();
  int width          = args[3]->Int32Value();
  int height         = args[4]->Int32Value();
  int border         = args[5]->Int32Value();
  int format         = args[6]->Int32Value();
  int type           = args[7]->Int32Value();
  void *pixels       = getImageData(args[8]);

  glTexImage2D(
    target,
    level,
    internalformat,
    width,
    height,
    border,
    format,
    type,
    pixels);

  NanReturnValue(NanUndefined());
}


GL_METHOD(TexParameteri) {
  GL_BOILERPLATE;

  int target = args[0]->Int32Value();
  int pname = args[1]->Int32Value();
  int param = args[2]->Int32Value();

  glTexParameteri(target, pname, param);

  NanReturnValue(NanUndefined());
}

GL_METHOD(TexParameterf) {
  GL_BOILERPLATE;

  int target = args[0]->Int32Value();
  int pname = args[1]->Int32Value();
  float param = (float) args[2]->NumberValue();

  glTexParameterf(target, pname, param);

  NanReturnValue(NanUndefined());
}


GL_METHOD(Clear) {
  GL_BOILERPLATE;

  glClear(args[0]->Int32Value());

  NanReturnValue(NanUndefined());
}


GL_METHOD(UseProgram) {
  GL_BOILERPLATE;

  glUseProgram(args[0]->Int32Value());

  NanReturnValue(NanUndefined());
}

GL_METHOD(CreateBuffer) {
  GL_BOILERPLATE;

  GLuint buffer;
  glGenBuffers(1, &buffer);
  #ifdef LOGGING
  cout<<"createBuffer "<<buffer<<endl;
  #endif
  inst->registerGLObj(GLOBJECT_TYPE_BUFFER, buffer);
  NanReturnValue(NanNew<Number>(buffer));
}

GL_METHOD(BindBuffer) {
  GL_BOILERPLATE;

  int target = args[0]->Int32Value();
  int buffer = args[1]->Uint32Value();
  glBindBuffer(target,buffer);

  NanReturnValue(NanUndefined());
}


GL_METHOD(CreateFramebuffer) {
  GL_BOILERPLATE;

  GLuint buffer;
  glGenFramebuffers(1, &buffer);
  inst->registerGLObj(GLOBJECT_TYPE_FRAMEBUFFER, buffer);
  NanReturnValue(NanNew<Number>(0));
}


GL_METHOD(BindFramebuffer) {
  GL_BOILERPLATE;

  int target = args[0]->Int32Value();
  int buffer = args[1]->IsNull() ? 0 : args[1]->Int32Value();

  glBindFramebuffer(target, buffer);

  NanReturnValue(NanUndefined());
}


GL_METHOD(FramebufferTexture2D) {
  GL_BOILERPLATE;

  int target = args[0]->Int32Value();
  int attachment = args[1]->Int32Value();
  int textarget = args[2]->Int32Value();
  int texture = args[3]->Int32Value();
  int level = args[4]->Int32Value();

  glFramebufferTexture2D(target, attachment, textarget, texture, level);

  NanReturnValue(NanUndefined());
}


GL_METHOD(BufferData) {
  GL_BOILERPLATE;

  int target = args[0]->Int32Value();
  if(args[1]->IsObject()) {
    Local<Object> obj = Local<Object>::Cast(args[1]);
    GLenum usage = args[2]->Int32Value();

    int element_size = SizeOfArrayElementForType(obj->GetIndexedPropertiesExternalArrayDataType());
    GLsizeiptr size = obj->GetIndexedPropertiesExternalArrayDataLength() * element_size;
    void* data = obj->GetIndexedPropertiesExternalArrayData();
    glBufferData(target, size, data, usage);
  }
  else if(args[1]->IsNumber()) {
    GLsizeiptr size = args[1]->Uint32Value();
    GLenum usage = args[2]->Int32Value();
    glBufferData(target, size, NULL, usage);
  }
  NanReturnValue(NanUndefined());
}


GL_METHOD(BufferSubData) {
  GL_BOILERPLATE;

  int target = args[0]->Int32Value();
  int offset = args[1]->Int32Value();
  Local<Object> obj = Local<Object>::Cast(args[2]);

  int element_size = SizeOfArrayElementForType( obj->GetIndexedPropertiesExternalArrayDataType());
  int size = obj->GetIndexedPropertiesExternalArrayDataLength() * element_size;
  void* data = obj->GetIndexedPropertiesExternalArrayData();

  glBufferSubData(target, offset, size, data);

  NanReturnValue(NanUndefined());
}


GL_METHOD(BlendEquation) {
  GL_BOILERPLATE;

  int mode=args[0]->Int32Value();;

  glBlendEquation(mode);

  NanReturnValue(NanUndefined());
}


GL_METHOD(BlendFunc) {
  GL_BOILERPLATE;

  int sfactor=args[0]->Int32Value();;
  int dfactor=args[1]->Int32Value();;

  glBlendFunc(sfactor,dfactor);

  NanReturnValue(NanUndefined());
}


GL_METHOD(EnableVertexAttribArray) {
  GL_BOILERPLATE;

  glEnableVertexAttribArray(args[0]->Int32Value());

  NanReturnValue(NanUndefined());
}


GL_METHOD(VertexAttribPointer) {
  GL_BOILERPLATE;

  int indx = args[0]->Int32Value();
  int size = args[1]->Int32Value();
  int type = args[2]->Int32Value();
  int normalized = args[3]->BooleanValue();
  int stride = args[4]->Int32Value();
  long offset = args[5]->Int32Value();

  //    printf("VertexAttribPointer %d %d %d %d %d %d\n", indx, size, type, normalized, stride, offset);
  glVertexAttribPointer(indx, size, type, normalized, stride, (const GLvoid *)offset);

  NanReturnValue(NanUndefined());
}


GL_METHOD(ActiveTexture) {
  GL_BOILERPLATE;

  glActiveTexture(args[0]->Int32Value());
  NanReturnValue(NanUndefined());
}


GL_METHOD(DrawElements) {
  GL_BOILERPLATE;

  int mode = args[0]->Int32Value();
  int count = args[1]->Int32Value();
  int type = args[2]->Int32Value();
  GLvoid *offset = reinterpret_cast<GLvoid*>(args[3]->Uint32Value());
  glDrawElements(mode, count, type, offset);
  NanReturnValue(NanUndefined());
}


GL_METHOD(Flush) {
  GL_BOILERPLATE;
  glFlush();
  NanReturnValue(NanUndefined());
}

GL_METHOD(Finish) {
  GL_BOILERPLATE;
  glFinish();
  NanReturnValue(NanUndefined());
}

GL_METHOD(VertexAttrib1f) {
  GL_BOILERPLATE;

  GLuint indx = args[0]->Int32Value();
  float x = (float) args[1]->NumberValue();

  glVertexAttrib1f(indx, x);
  NanReturnValue(NanUndefined());
}

GL_METHOD(VertexAttrib2f) {
  GL_BOILERPLATE;

  GLuint indx = args[0]->Int32Value();
  float x = (float) args[1]->NumberValue();
  float y = (float) args[2]->NumberValue();

  glVertexAttrib2f(indx, x, y);
  NanReturnValue(NanUndefined());
}

GL_METHOD(VertexAttrib3f) {
  GL_BOILERPLATE;

  GLuint indx = args[0]->Int32Value();
  float x = (float) args[1]->NumberValue();
  float y = (float) args[2]->NumberValue();
  float z = (float) args[3]->NumberValue();

  glVertexAttrib3f(indx, x, y, z);
  NanReturnValue(NanUndefined());
}

GL_METHOD(VertexAttrib4f) {
  GL_BOILERPLATE;

  GLuint indx = args[0]->Int32Value();
  float x = (float) args[1]->NumberValue();
  float y = (float) args[2]->NumberValue();
  float z = (float) args[3]->NumberValue();
  float w = (float) args[4]->NumberValue();

  glVertexAttrib4f(indx, x, y, z, w);
  NanReturnValue(NanUndefined());
}

GL_METHOD(VertexAttrib1fv) {
  GL_BOILERPLATE;

  int indx = args[0]->Int32Value();
  GLfloat *data = getArrayData<GLfloat>(args[1]);
  glVertexAttrib1fv(indx, data);

  NanReturnValue(NanUndefined());
}

GL_METHOD(VertexAttrib2fv) {
  GL_BOILERPLATE;

  int indx = args[0]->Int32Value();
  GLfloat *data = getArrayData<GLfloat>(args[1]);
  glVertexAttrib2fv(indx, data);

  NanReturnValue(NanUndefined());
}

GL_METHOD(VertexAttrib3fv) {
  GL_BOILERPLATE;

  int indx = args[0]->Int32Value();
  GLfloat *data = getArrayData<GLfloat>(args[1]);
  glVertexAttrib3fv(indx, data);

  NanReturnValue(NanUndefined());
}

GL_METHOD(VertexAttrib4fv) {
  GL_BOILERPLATE;

  int indx = args[0]->Int32Value();
  GLfloat *data = getArrayData<GLfloat>(args[1]);
  glVertexAttrib4fv(indx, data);

  NanReturnValue(NanUndefined());
}

GL_METHOD(BlendColor) {
  GL_BOILERPLATE;

  GLclampf r= (float) args[0]->NumberValue();
  GLclampf g= (float) args[1]->NumberValue();
  GLclampf b= (float) args[2]->NumberValue();
  GLclampf a= (float) args[3]->NumberValue();

  glBlendColor(r,g,b,a);
  NanReturnValue(NanUndefined());
}

GL_METHOD(BlendEquationSeparate) {
  GL_BOILERPLATE;

  GLenum modeRGB= args[0]->Int32Value();
  GLenum modeAlpha= args[1]->Int32Value();

  glBlendEquationSeparate(modeRGB,modeAlpha);
  NanReturnValue(NanUndefined());
}

GL_METHOD(BlendFuncSeparate) {
  GL_BOILERPLATE;

  GLenum srcRGB= args[0]->Int32Value();
  GLenum dstRGB= args[1]->Int32Value();
  GLenum srcAlpha= args[2]->Int32Value();
  GLenum dstAlpha= args[3]->Int32Value();

  glBlendFuncSeparate(srcRGB,dstRGB,srcAlpha,dstAlpha);
  NanReturnValue(NanUndefined());
}

GL_METHOD(ClearStencil) {
  GL_BOILERPLATE;

  GLint s = args[0]->Int32Value();

  glClearStencil(s);
  NanReturnValue(NanUndefined());
}

GL_METHOD(ColorMask) {
  GL_BOILERPLATE;

  GLboolean r = args[0]->BooleanValue();
  GLboolean g = args[1]->BooleanValue();
  GLboolean b = args[2]->BooleanValue();
  GLboolean a = args[3]->BooleanValue();

  glColorMask(r,g,b,a);
  NanReturnValue(NanUndefined());
}

GL_METHOD(CopyTexImage2D) {
  GL_BOILERPLATE;

  GLenum target = args[0]->Int32Value();
  GLint level = args[1]->Int32Value();
  GLenum internalformat = args[2]->Int32Value();
  GLint x = args[3]->Int32Value();
  GLint y = args[4]->Int32Value();
  GLsizei width = args[5]->Int32Value();
  GLsizei height = args[6]->Int32Value();
  GLint border = args[7]->Int32Value();

  glCopyTexImage2D( target, level, internalformat, x, y, width, height, border);
  NanReturnValue(NanUndefined());
}

GL_METHOD(CopyTexSubImage2D) {
  GL_BOILERPLATE;

  GLenum target = args[0]->Int32Value();
  GLint level = args[1]->Int32Value();
  GLint xoffset = args[2]->Int32Value();
  GLint yoffset = args[3]->Int32Value();
  GLint x = args[4]->Int32Value();
  GLint y = args[5]->Int32Value();
  GLsizei width = args[6]->Int32Value();
  GLsizei height = args[7]->Int32Value();

  glCopyTexSubImage2D( target, level, xoffset, yoffset, x, y, width, height);
  NanReturnValue(NanUndefined());
}

GL_METHOD(CullFace) {
  GL_BOILERPLATE;

  GLenum mode = args[0]->Int32Value();

  glCullFace(mode);
  NanReturnValue(NanUndefined());
}

GL_METHOD(DepthMask) {
  GL_BOILERPLATE;

  GLboolean flag = args[0]->BooleanValue();

  glDepthMask(flag);
  NanReturnValue(NanUndefined());
}

GL_METHOD(DepthRange) {
  GL_BOILERPLATE;

  GLclampf zNear = (float) args[0]->NumberValue();
  GLclampf zFar = (float) args[1]->NumberValue();

  glDepthRange(zNear, zFar);
  NanReturnValue(NanUndefined());
}

GL_METHOD(DisableVertexAttribArray) {
  GL_BOILERPLATE;

  GLuint index = args[0]->Int32Value();

  glDisableVertexAttribArray(index);
  NanReturnValue(NanUndefined());
}

GL_METHOD(Hint) {
  GL_BOILERPLATE;

  GLenum target = args[0]->Int32Value();
  GLenum mode = args[1]->Int32Value();

  glHint(target, mode);
  NanReturnValue(NanUndefined());
}

GL_METHOD(IsEnabled) {
  GL_BOILERPLATE;

  GLenum cap = args[0]->Int32Value();

  bool ret=glIsEnabled(cap)!=0;
  NanReturnValue(JS_BOOL(ret));
}

GL_METHOD(LineWidth) {
  GL_BOILERPLATE;

  GLfloat width = (float) args[0]->NumberValue();

  glLineWidth(width);
  NanReturnValue(NanUndefined());
}

GL_METHOD(PolygonOffset) {
  GL_BOILERPLATE;

  GLfloat factor = (float) args[0]->NumberValue();
  GLfloat units = (float) args[1]->NumberValue();

  glPolygonOffset(factor, units);
  NanReturnValue(NanUndefined());
}

GL_METHOD(SampleCoverage) {
  GL_BOILERPLATE;

  GLclampf value = (float) args[0]->NumberValue();
  GLboolean invert = args[1]->BooleanValue();

  glSampleCoverage(value, invert);
  NanReturnValue(NanUndefined());
}

GL_METHOD(Scissor) {
  GL_BOILERPLATE;

  GLint x = args[0]->Int32Value();
  GLint y = args[1]->Int32Value();
  GLsizei width = args[2]->Int32Value();
  GLsizei height = args[3]->Int32Value();

  glScissor(x, y, width, height);
  NanReturnValue(NanUndefined());
}

GL_METHOD(StencilFunc) {
  GL_BOILERPLATE;

  GLenum func = args[0]->Int32Value();
  GLint ref = args[1]->Int32Value();
  GLuint mask = args[2]->Int32Value();

  glStencilFunc(func, ref, mask);
  NanReturnValue(NanUndefined());
}

GL_METHOD(StencilFuncSeparate) {
  GL_BOILERPLATE;

  GLenum face = args[0]->Int32Value();
  GLenum func = args[1]->Int32Value();
  GLint ref = args[2]->Int32Value();
  GLuint mask = args[3]->Int32Value();

  glStencilFuncSeparate(face, func, ref, mask);
  NanReturnValue(NanUndefined());
}

GL_METHOD(StencilMask) {
  GL_BOILERPLATE;

  GLuint mask = args[0]->Uint32Value();

  glStencilMask(mask);
  NanReturnValue(NanUndefined());
}

GL_METHOD(StencilMaskSeparate) {
  GL_BOILERPLATE;

  GLenum face = args[0]->Int32Value();
  GLuint mask = args[1]->Uint32Value();

  glStencilMaskSeparate(face, mask);
  NanReturnValue(NanUndefined());
}

GL_METHOD(StencilOp) {
  GL_BOILERPLATE;

  GLenum fail = args[0]->Int32Value();
  GLenum zfail = args[1]->Int32Value();
  GLenum zpass = args[2]->Int32Value();

  glStencilOp(fail, zfail, zpass);
  NanReturnValue(NanUndefined());
}

GL_METHOD(StencilOpSeparate) {
  GL_BOILERPLATE;

  GLenum face = args[0]->Int32Value();
  GLenum fail = args[1]->Int32Value();
  GLenum zfail = args[2]->Int32Value();
  GLenum zpass = args[3]->Int32Value();

  glStencilOpSeparate(face, fail, zfail, zpass);
  NanReturnValue(NanUndefined());
}

GL_METHOD(BindRenderbuffer) {
  GL_BOILERPLATE;

  GLenum target = args[0]->Int32Value();
  GLuint buffer = args[1]->IsNull() ? 0 : args[1]->Int32Value();

  glBindRenderbuffer(target, buffer);

  NanReturnValue(NanUndefined());
}

GL_METHOD(CreateRenderbuffer) {
  GL_BOILERPLATE;

  GLuint renderbuffers;
  glGenRenderbuffers(1,&renderbuffers);
  #ifdef LOGGING
  cout<<"createRenderBuffer "<<renderbuffers<<endl;
  #endif
  inst->registerGLObj(GLOBJECT_TYPE_RENDERBUFFER, renderbuffers);
  NanReturnValue(NanNew<Number>(renderbuffers));
}

GL_METHOD(DeleteBuffer) {
  GL_BOILERPLATE;

  GLuint buffer = args[0]->Uint32Value();

  glDeleteBuffers(1,&buffer);
  NanReturnValue(NanUndefined());
}

GL_METHOD(DeleteFramebuffer) {
  GL_BOILERPLATE;

  GLuint buffer = args[0]->Uint32Value();

  glDeleteFramebuffers(1,&buffer);
  NanReturnValue(NanUndefined());
}

GL_METHOD(DeleteProgram) {
  GL_BOILERPLATE;

  GLuint program = args[0]->Uint32Value();

  glDeleteProgram(program);
  NanReturnValue(NanUndefined());
}

GL_METHOD(DeleteRenderbuffer) {
  GL_BOILERPLATE;

  GLuint renderbuffer = args[0]->Uint32Value();

  glDeleteRenderbuffers(1, &renderbuffer);
  NanReturnValue(NanUndefined());
}

GL_METHOD(DeleteShader) {
  GL_BOILERPLATE;

  GLuint shader = args[0]->Uint32Value();

  glDeleteShader(shader);
  NanReturnValue(NanUndefined());
}

GL_METHOD(DeleteTexture) {
  GL_BOILERPLATE;

  GLuint texture = args[0]->Uint32Value();

  glDeleteTextures(1,&texture);
  NanReturnValue(NanUndefined());
}

GL_METHOD(DetachShader) {
  GL_BOILERPLATE;

  GLuint program = args[0]->Uint32Value();
  GLuint shader = args[1]->Uint32Value();

  glDetachShader(program, shader);
  NanReturnValue(NanUndefined());
}

GL_METHOD(FramebufferRenderbuffer) {
  GL_BOILERPLATE;

  GLenum target = args[0]->Int32Value();
  GLenum attachment = args[1]->Int32Value();
  GLenum renderbuffertarget = args[2]->Int32Value();
  GLuint renderbuffer = args[3]->Uint32Value();

  glFramebufferRenderbuffer(target, attachment, renderbuffertarget, renderbuffer);
  NanReturnValue(NanUndefined());
}

GL_METHOD(GetVertexAttribOffset) {
  GL_BOILERPLATE;

  GLuint index = args[0]->Uint32Value();
  GLenum pname = args[1]->Int32Value();
  void *ret=NULL;

  glGetVertexAttribPointerv(index, pname, &ret);
  NanReturnValue(JS_INT(ToGLuint(ret)));
}

GL_METHOD(IsBuffer) {
  GL_BOILERPLATE;
  NanReturnValue(JS_BOOL(glIsBuffer(args[0]->Uint32Value())!=0));
}

GL_METHOD(IsFramebuffer) {
  GL_BOILERPLATE;
  NanReturnValue(JS_BOOL(glIsFramebuffer(args[0]->Uint32Value())!=0));
}

GL_METHOD(IsProgram) {
  GL_BOILERPLATE;

  NanReturnValue(JS_BOOL(glIsProgram(args[0]->Uint32Value())!=0));
}

GL_METHOD(IsRenderbuffer) {
  GL_BOILERPLATE;

  NanReturnValue(JS_BOOL(glIsRenderbuffer( args[0]->Uint32Value())!=0));
}

GL_METHOD(IsShader) {
  GL_BOILERPLATE;

  NanReturnValue(JS_BOOL(glIsShader(args[0]->Uint32Value())!=0));
}

GL_METHOD(IsTexture) {
  GL_BOILERPLATE;

  NanReturnValue(JS_BOOL(glIsTexture(args[0]->Uint32Value())!=0));
}

GL_METHOD(RenderbufferStorage) {
  GL_BOILERPLATE;

  GLenum target = args[0]->Int32Value();
  GLenum internalformat = args[1]->Int32Value();
  GLsizei width = args[2]->Uint32Value();
  GLsizei height = args[3]->Uint32Value();

  glRenderbufferStorage(target, internalformat, width, height);
  NanReturnValue(NanUndefined());
}

GL_METHOD(GetShaderSource) {
  GL_BOILERPLATE;

  int shader = args[0]->Int32Value();

  GLint len;
  glGetShaderiv(shader, GL_SHADER_SOURCE_LENGTH, &len);
  GLchar *source=new GLchar[len];
  glGetShaderSource(shader, len, NULL, source);

  Local<String> str = NanNew<String>(source);
  delete source;

  NanReturnValue(str);
}

GL_METHOD(ValidateProgram) {
  GL_BOILERPLATE;

  glValidateProgram(args[0]->Int32Value());

  NanReturnValue(NanUndefined());
}

GL_METHOD(TexSubImage2D) {
  GL_BOILERPLATE;

  GLenum target = args[0]->Int32Value();
  GLint level = args[1]->Int32Value();
  GLint xoffset = args[2]->Int32Value();
  GLint yoffset = args[3]->Int32Value();
  GLsizei width = args[4]->Int32Value();
  GLsizei height = args[5]->Int32Value();
  GLenum format = args[6]->Int32Value();
  GLenum type = args[7]->Int32Value();
  void *pixels=getImageData(args[8]);

  glTexSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixels);

  NanReturnValue(NanUndefined());
}

GL_METHOD(ReadPixels) {
  GL_BOILERPLATE;

  GLint x        = args[0]->Int32Value();
  GLint y        = args[1]->Int32Value();
  GLsizei width  = args[2]->Int32Value();
  GLsizei height = args[3]->Int32Value();
  GLenum format  = args[4]->Int32Value();
  GLenum type    = args[5]->Int32Value();
  void *pixels   = getImageData(args[6]);

  glReadPixels(x, y, width, height, format, type, pixels);

  NanReturnValue(NanUndefined());
}

GL_METHOD(GetTexParameter) {
  GL_BOILERPLATE;

  GLenum target = args[0]->Int32Value();
  GLenum pname = args[1]->Int32Value();

  GLint param_value=0;
  glGetTexParameteriv(target, pname, &param_value);

  NanReturnValue(NanNew<Number>(param_value));
}

GL_METHOD(GetActiveAttrib) {
  GL_BOILERPLATE;

  GLuint program = args[0]->Int32Value();
  GLuint index = args[1]->Int32Value();

  char name[1024];
  GLsizei length=0;
  GLenum type;
  GLsizei size;
  glGetActiveAttrib(program, index, 1024, &length, &size, &type, name);

  Local<Array> activeInfo = NanNew<Array>(3);
  activeInfo->Set(JS_STR("size"), JS_INT(size));
  activeInfo->Set(JS_STR("type"), JS_INT((int)type));
  activeInfo->Set(JS_STR("name"), JS_STR(name));

  NanReturnValue(activeInfo);
}

GL_METHOD(GetActiveUniform) {
  GL_BOILERPLATE;

  GLuint program = args[0]->Int32Value();
  GLuint index = args[1]->Int32Value();

  char name[1024];
  GLsizei length=0;
  GLenum type;
  GLsizei size;
  glGetActiveUniform(program, index, 1024, &length, &size, &type, name);

  Local<Array> activeInfo = NanNew<Array>(3);
  activeInfo->Set(JS_STR("size"), JS_INT(size));
  activeInfo->Set(JS_STR("type"), JS_INT((int)type));
  activeInfo->Set(JS_STR("name"), JS_STR(name));

  NanReturnValue(activeInfo);
}

GL_METHOD(GetAttachedShaders) {
  GL_BOILERPLATE;

  GLuint program = args[0]->Int32Value();

  GLuint shaders[1024];
  GLsizei count;
  glGetAttachedShaders(program, 1024, &count, shaders);

  Local<Array> shadersArr = NanNew<Array>(count);
  for(int i=0;i<count;i++)
    shadersArr->Set(i, JS_INT((int)shaders[i]));

  NanReturnValue(shadersArr);
}

GL_METHOD(GetParameter) {
  GL_BOILERPLATE;

  GLenum name = args[0]->Int32Value();

  switch(name) {
  case GL_BLEND:
  case GL_CULL_FACE:
  case GL_DEPTH_TEST:
  case GL_DEPTH_WRITEMASK:
  case GL_DITHER:
  case GL_POLYGON_OFFSET_FILL:
  case GL_SAMPLE_COVERAGE_INVERT:
  case GL_SCISSOR_TEST:
  case GL_STENCIL_TEST:
  case 0x9240 /* UNPACK_FLIP_Y_WEBGL */:
  case 0x9241 /* UNPACK_PREMULTIPLY_ALPHA_WEBGL*/:
  {
    // return a boolean
    GLboolean params;
    ::glGetBooleanv(name, &params);
    NanReturnValue(JS_BOOL(params!=0));
  }
  case GL_DEPTH_CLEAR_VALUE:
  case GL_LINE_WIDTH:
  case GL_POLYGON_OFFSET_FACTOR:
  case GL_POLYGON_OFFSET_UNITS:
  case GL_SAMPLE_COVERAGE_VALUE:
  {
    // return a float
    GLfloat params;
    ::glGetFloatv(name, &params);
    NanReturnValue(JS_FLOAT(params));
  }
  case GL_RENDERER:
  case GL_SHADING_LANGUAGE_VERSION:
  case GL_VENDOR:
  case GL_VERSION:
  case GL_EXTENSIONS:
  {
    // return a string
    char *params=(char*) ::glGetString(name);
    if(params)
      NanReturnValue(JS_STR(params));
    NanReturnUndefined();
  }
  case GL_MAX_VIEWPORT_DIMS:
  {
    // return a int32[2]
    GLint params[2];
    ::glGetIntegerv(name, params);

    Local<Array> arr=NanNew<Array>(2);
    arr->Set(0,JS_INT(params[0]));
    arr->Set(1,JS_INT(params[1]));
    NanReturnValue(arr);
  }
  case GL_SCISSOR_BOX:
  case GL_VIEWPORT:
  {
    // return a int32[4]
    GLint params[4];
    ::glGetIntegerv(name, params);

    Local<Array> arr=NanNew<Array>(4);
    arr->Set(0,JS_INT(params[0]));
    arr->Set(1,JS_INT(params[1]));
    arr->Set(2,JS_INT(params[2]));
    arr->Set(3,JS_INT(params[3]));
    NanReturnValue(arr);
  }
  case GL_ALIASED_LINE_WIDTH_RANGE:
  case GL_ALIASED_POINT_SIZE_RANGE:
  case GL_DEPTH_RANGE:
  {
    // return a float[2]
    GLfloat params[2];
    ::glGetFloatv(name, params);
    Local<Array> arr=NanNew<Array>(2);
    arr->Set(0,JS_FLOAT(params[0]));
    arr->Set(1,JS_FLOAT(params[1]));
    NanReturnValue(arr);
  }
  case GL_BLEND_COLOR:
  case GL_COLOR_CLEAR_VALUE:
  {
    // return a float[4]
    GLfloat params[4];
    ::glGetFloatv(name, params);
    Local<Array> arr=NanNew<Array>(4);
    arr->Set(0,JS_FLOAT(params[0]));
    arr->Set(1,JS_FLOAT(params[1]));
    arr->Set(2,JS_FLOAT(params[2]));
    arr->Set(3,JS_FLOAT(params[3]));
    NanReturnValue(arr);
  }
  case GL_COLOR_WRITEMASK:
  {
    // return a boolean[4]
    GLboolean params[4];
    ::glGetBooleanv(name, params);
    Local<Array> arr=NanNew<Array>(4);
    arr->Set(0,JS_BOOL(params[0]==1));
    arr->Set(1,JS_BOOL(params[1]==1));
    arr->Set(2,JS_BOOL(params[2]==1));
    arr->Set(3,JS_BOOL(params[3]==1));
    NanReturnValue(arr);
  }
  case GL_ARRAY_BUFFER_BINDING:
  case GL_CURRENT_PROGRAM:
  case GL_ELEMENT_ARRAY_BUFFER_BINDING:
  case GL_FRAMEBUFFER_BINDING:
  case GL_RENDERBUFFER_BINDING:
  case GL_TEXTURE_BINDING_2D:
  case GL_TEXTURE_BINDING_CUBE_MAP:
  {
    GLint params;
    ::glGetIntegerv(name, &params);
    NanReturnValue(JS_INT(params));
  }
  default: {
    // return a long
    GLint params;
    ::glGetIntegerv(name, &params);
    NanReturnValue(JS_INT(params));
  }
  }

  NanReturnValue(NanUndefined());
}

GL_METHOD(GetBufferParameter) {
  GL_BOILERPLATE;

  GLenum target = args[0]->Int32Value();
  GLenum pname = args[1]->Int32Value();

  GLint params;
  glGetBufferParameteriv(target,pname,&params);
  NanReturnValue(JS_INT(params));
}

GL_METHOD(GetFramebufferAttachmentParameter) {
  GL_BOILERPLATE;

  GLenum target = args[0]->Int32Value();
  GLenum attachment = args[1]->Int32Value();
  GLenum pname = args[2]->Int32Value();

  GLint params;
  glGetFramebufferAttachmentParameteriv(target,attachment, pname,&params);
  NanReturnValue(JS_INT(params));
}

GL_METHOD(GetProgramInfoLog) {
  GL_BOILERPLATE;

  GLuint program = args[0]->Int32Value();
  int Len = 1024;
  char Error[1024];
  glGetProgramInfoLog(program, 1024, &Len, Error);

  NanReturnValue(NanNew<String>(Error));
}

GL_METHOD(GetRenderbufferParameter) {
  GL_BOILERPLATE;

  int target = args[0]->Int32Value();
  int pname = args[1]->Int32Value();
  int value = 0;
  glGetRenderbufferParameteriv(target,pname,&value);

  NanReturnValue(JS_INT(value));
}

GL_METHOD(GetUniform) {
  GL_BOILERPLATE;

  GLuint program = args[0]->Int32Value();
  GLint location = args[1]->Int32Value();
  if(location < 0 ) NanReturnValue(NanUndefined());

  float data[16]; // worst case scenario is 16 floats

  glGetUniformfv(program, location, data);

  Local<Array> arr=NanNew<Array>(16);
  for(int i=0;i<16;i++)
    arr->Set(i,JS_FLOAT(data[i]));

  NanReturnValue(arr);
}

GL_METHOD(GetVertexAttrib) {
  GL_BOILERPLATE;

  GLuint index = args[0]->Int32Value();
  GLuint pname = args[1]->Int32Value();

  GLint value=0;

  switch (pname) {
  case GL_VERTEX_ATTRIB_ARRAY_ENABLED:
  case GL_VERTEX_ATTRIB_ARRAY_NORMALIZED:
    glGetVertexAttribiv(index,pname,&value);
    NanReturnValue(JS_BOOL(value!=0));
  case GL_VERTEX_ATTRIB_ARRAY_SIZE:
  case GL_VERTEX_ATTRIB_ARRAY_STRIDE:
  case GL_VERTEX_ATTRIB_ARRAY_TYPE:
    glGetVertexAttribiv(index,pname,&value);
    NanReturnValue(JS_INT(value));
  case GL_VERTEX_ATTRIB_ARRAY_BUFFER_BINDING:
    glGetVertexAttribiv(index,pname,&value);
    NanReturnValue(JS_INT(value));
  case GL_CURRENT_VERTEX_ATTRIB: {
    float vextex_attribs[4];
    glGetVertexAttribfv(index,pname,vextex_attribs);
    Local<Array> arr=NanNew<Array>(4);
    arr->Set(0,JS_FLOAT(vextex_attribs[0]));
    arr->Set(1,JS_FLOAT(vextex_attribs[1]));
    arr->Set(2,JS_FLOAT(vextex_attribs[2]));
    arr->Set(3,JS_FLOAT(vextex_attribs[3]));
    NanReturnValue(arr);
  }
  default:
    NanThrowError("GetVertexAttrib: Invalid Enum");
  }

  NanReturnValue(NanUndefined());
}

GL_METHOD(GetSupportedExtensions) {
  GL_BOILERPLATE;

  char *extensions=(char*) glGetString(GL_EXTENSIONS);

  NanReturnValue(JS_STR(extensions));
}

// TODO GetExtension(name) return the extension name if found, should be an object...
GL_METHOD(GetExtension) {
  GL_BOILERPLATE;

  NanAsciiString name(args[0]);
  char *sname=*name;
  char *extensions=(char*) glGetString(GL_EXTENSIONS);

  char *ext=strcasestr(extensions, sname);

  if(!ext) NanReturnValue(NanUndefined());
  NanReturnValue(JS_STR(ext, (int)::strlen(sname)));
}

GL_METHOD(CheckFramebufferStatus) {
  GL_BOILERPLATE;

  GLenum target=args[0]->Int32Value();

  NanReturnValue(JS_INT((int)glCheckFramebufferStatus(target)));
}
