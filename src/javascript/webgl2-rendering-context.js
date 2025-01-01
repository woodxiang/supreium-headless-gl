const tokenize = require('glsl-tokenizer/string');
const { WebGLRenderingContext } = require('./webgl-rendering-context');
const { WebGLVertexArrayObject } = require('./webgl-vertex-array-object.js');
const { getOESTextureFloatLinear } = require('./extensions/oes-texture-float-linear');
const { getSTACKGLDestroyContext } = require('./extensions/stackgl-destroy-context');
const { getSTACKGLResizeDrawingBuffer } = require('./extensions/stackgl-resize-drawing-buffer');
const { getEXTTextureFilterAnisotropic } = require('./extensions/ext-texture-filter-anisotropic');
const { getEXTColorBufferFloat } = require('./extensions/ext-color-buffer-float.js');
const { gl, NativeWebGLRenderingContext } = require('./native-gl');
const { checkObject, validCubeTarget, unpackTypedArray, extractImageData, vertexCount, typeSize } = require('./utils');
const { WebGL2DrawBuffers } = require('./webgl2-draw-buffers.js');
const { WebGLFramebuffer } = require('./webgl-framebuffer.js');
const { WebGLRenderbuffer } = require('./webgl-renderbuffer.js');
const { WebGLTexture } = require('./webgl-texture.js');
const { verifyFormat, convertPixels, pixelSize } = require('./utils2.js');

const availableExtensions = {
  oes_texture_float_linear: getOESTextureFloatLinear,
  stackgl_destroy_context: getSTACKGLDestroyContext,
  stackgl_resize_drawingbuffer: getSTACKGLResizeDrawingBuffer,
  ext_texture_filter_anisotropic: getEXTTextureFilterAnisotropic,
  ext_color_buffer_float: getEXTColorBufferFloat,
};

class WebGL2RenderingContext extends WebGLRenderingContext {
  constructor() {
    super();
    this.isWebGL2 = true;

    this._drawBuffers = new WebGL2DrawBuffers(this);
  }

  // 72
  _checkDimensions(target, width, height, depth, level) {
    if (level < 0 || width < 0 || height < 0 || depth < 0) {
      this.setError(gl.INVALID_VALUE);
      return false;
    }
    if (target === gl.TEXTURE_2D) {
      if (width > this._maxTextureSize || height > this._maxTextureSize || level > this._maxTextureLevel) {
        this.setError(gl.INVALID_VALUE);
        return false;
      }
    } else if (target === gl.TEXTURE_3D || target === gl.TEXTURE_2D_ARRAY) {
      if (
        width > this._max3DTextureSize ||
        height > this._max3DTextureSize ||
        depth > this._max3DTextureSize ||
        level > this._maxTextureLevel
      ) {
        this.setError(gl.INVALID_VALUE);
        return false;
      }
    } else if (this._validCubeTarget(target)) {
      if (width > this._maxCubeMapSize || height > this._maxCubeMapSize || level > this._maxCubeMapLevel) {
        this.setError(gl.INVALID_VALUE);
        return false;
      }
    } else {
      this.setError(gl.INVALID_ENUM);
      return false;
    }
    return true;
  }

  // 121
  _checkShaderSource(shader) {
    const source = shader._source;
    const tokens = tokenize(source);

    let errorStatus = false;
    const errorLog = [];

    for (let i = 0; i < tokens.length; ++i) {
      const tok = tokens[i];
      switch (tok.type) {
        case 'ident':
          if (!this._validGLSLIdentifier(tok.data)) {
            errorStatus = true;
            errorLog.push(tok.line + ':' + tok.column + ' invalid identifier - ' + tok.data);
          }
          break;
        case 'preprocessor': {
          const bodyToks = tokenize(tok.data.match(/^\s*#\s*(.*)$/)[1]);
          for (let j = 0; j < bodyToks.length; ++j) {
            const btok = bodyToks[j];
            if (btok.type === 'ident' || btok.type === undefined) {
              if (!this._validGLSLIdentifier(btok.data)) {
                errorStatus = true;
                errorLog.push(tok.line + ':' + btok.column + ' invalid identifier - ' + btok.data);
              }
            }
          }
          break;
        }
        case 'keyword':
          switch (tok.data) {
            case 'do':
              errorStatus = true;
              errorLog.push(tok.line + ':' + tok.column + ' do not supported');
              break;
          }
          break;
      }
    }

    if (errorStatus) {
      shader._compileInfo = errorLog.join('\n');
    }
    return !errorStatus;
  }

  // 195
  _checkTextureTarget(target) {
    const unit = this._getActiveTextureUnit();
    let tex = null;
    switch (target) {
      case gl.TEXTURE_1D:
        tex = unit._bind1D;
        break;
      case gl.TEXTURE_2D:
        tex = unit._bind2D;
        break;
      case gl.TEXTURE_3D:
        tex = unit._bind3D;
        break;
      case gl.TEXTURE_2D_ARRAY:
        tex = unit._bind2DArray;
        break;
      case gl.TEXTURE_CUBE_MAP:
        tex = unit._bindCube;
        break;
      default:
        this.setError(gl.INVALID_ENUM);
        return false;
    }

    return true;
  }

  // 352
  _framebufferOk() {
    {
      const framebuffer = this._activeDrawFramebuffer;
      if (framebuffer && this._preCheckFramebufferStatus(framebuffer) !== gl.FRAMEBUFFER_COMPLETE) {
        this.setError(gl.INVALID_FRAMEBUFFER_OPERATION);
        return false;
      }
    }

    {
      const framebuffer = this._activeReadFramebuffer;
      if (framebuffer && this._preCheckFramebufferStatus(framebuffer) !== gl.FRAMEBUFFER_COMPLETE) {
        this.setError(gl.INVALID_FRAMEBUFFER_OPERATION);
        return false;
      }
    }

    return true;
  }

  // 374
  _getActiveTexture(target) {
    const activeUnit = this._getActiveTextureUnit();
    switch (target) {
      case gl.TEXTURE_2D:
        return activeUnit._bind2D;
      case gl.TEXTURE_3D:
        return activeUnit._bind3D;
      case gl.TEXTURE_2D_ARRAY:
        return activeUnit._bind2DArray;
      case gl.TEXTURE_CUBE_MAP:
        return activeUnit._bindCube;
      default:
        break;
    }
    return null;
  }

  // 384
  _getAttachments() {
    return this._drawBuffers._ALL_ATTACHMENTS;
  }

  // 390
  _getColorAttachments() {
    return this._drawBuffers._ALL_COLOR_ATTACHMENTS;
  }

  // 400
  _getTexImage(target) {
    const unit = this._getActiveTextureUnit();
    if (target === gl.TEXTURE_2D) {
      return unit._bind2D;
    } else if (target === gl.TEXTURE_3D) {
      return unit._bind3D;
    } else if (target === gl.TEXTURE_2D_ARRAY) {
      return unit._bind2DArray;
    } else if (validCubeTarget(target)) {
      return unit._bindCube;
    }
    this.setError(gl.INVALID_ENUM);
    return null;
  }

  // 411
  _preCheckFramebufferStatus(framebuffer) {
    const attachments = framebuffer._attachments;
    const width = [];
    const height = [];
    const depthAttachment = attachments[gl.DEPTH_ATTACHMENT];
    const depthStencilAttachment = attachments[gl.DEPTH_STENCIL_ATTACHMENT];
    const stencilAttachment = attachments[gl.STENCIL_ATTACHMENT];

    if ((depthStencilAttachment && (stencilAttachment || depthAttachment)) || (stencilAttachment && depthAttachment)) {
      return gl.FRAMEBUFFER_UNSUPPORTED;
    }

    const colorAttachments = this._getColorAttachments();
    let colorAttachmentCount = 0;
    for (const attachmentEnum in attachments) {
      if (attachments[attachmentEnum] && colorAttachments.indexOf(attachmentEnum * 1) !== -1) {
        colorAttachmentCount++;
      }
    }
    if (colorAttachmentCount === 0) {
      return gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT;
    }

    if (depthStencilAttachment instanceof WebGLTexture) {
      return gl.FRAMEBUFFER_UNSUPPORTED;
    } else if (depthStencilAttachment instanceof WebGLRenderbuffer) {
      if (
        depthStencilAttachment._format !== gl.DEPTH_STENCIL &&
        depthStencilAttachment._format !== gl.DEPTH24_STENCIL8 &&
        depthStencilAttachment._format !== gl.DEPTH32F_STENCIL8
      ) {
        return gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT;
      }
      width.push(depthStencilAttachment._width);
      height.push(depthStencilAttachment._height);
    }

    if (depthAttachment instanceof WebGLTexture) {
      return gl.FRAMEBUFFER_UNSUPPORTED;
    } else if (depthAttachment instanceof WebGLRenderbuffer) {
      if (
        depthAttachment._format !== gl.DEPTH_COMPONENT16 &&
        depthAttachment._format !== gl.DEPTH_COMPONENT24 &&
        depthAttachment._format !== gl.DEPTH_COMPONENT32F
      ) {
        return gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT;
      }
      width.push(depthAttachment._width);
      height.push(depthAttachment._height);
    }

    if (stencilAttachment instanceof WebGLTexture) {
      return gl.FRAMEBUFFER_UNSUPPORTED;
    } else if (stencilAttachment instanceof WebGLRenderbuffer) {
      if (stencilAttachment._format !== gl.STENCIL_INDEX8) {
        return gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT;
      }
      width.push(stencilAttachment._width);
      height.push(stencilAttachment._height);
    }

    let colorAttached = false;
    for (let i = 0; i < colorAttachments.length; ++i) {
      const colorAttachment = attachments[colorAttachments[i]];
      if (colorAttachment instanceof WebGLTexture) {
        const internalFormat = colorAttachment._internalFormat;
        if (
          !(internalFormat === gl.RGBA ||
            internalFormat === gl.RGB ||
            internalFormat === gl.LUMINANCE_ALPHA ||
            internalFormat === gl.LUMINANCE ||
            internalFormat === gl.ALPHA ||
            internalFormat === gl.R8 ||
            internalFormat === gl.RG8 ||
            internalFormat === gl.RGB8 ||
            internalFormat === gl.RGB565 ||
            internalFormat === gl.RGBA4 ||
            internalFormat === gl.RGB5_A1 ||
            internalFormat === gl.RGBA8 ||
            internalFormat === gl.RGB10_A2 ||
            internalFormat === gl.RGB10_A2UI ||
            internalFormat === gl.SRGB8_ALPHA8 ||
            internalFormat === gl.R8I ||
            internalFormat === gl.R8UI ||
            internalFormat === gl.R16I ||
            internalFormat === gl.R16UI ||
            internalFormat === gl.R32I ||
            internalFormat === gl.R32UI ||
            internalFormat === gl.RG8I ||
            internalFormat === gl.RG8UI ||
            internalFormat === gl.RG16I ||
            internalFormat === gl.RG16UI ||
            internalFormat === gl.RG32I ||
            internalFormat === gl.RG32UI ||
            internalFormat === gl.RGBA8I ||
            internalFormat === gl.RGBA8UI ||
            internalFormat === gl.RGBA16I ||
            internalFormat === gl.RGBA16UI ||
            internalFormat === gl.RGBA32I ||
            internalFormat === gl.RGBA32UI ||
            (
              this._extensions.ext_color_buffer_float && (
                internalFormat === gl.R16F ||
                internalFormat === gl.RG16F ||
                internalFormat === gl.RGBA16F ||
                internalFormat === gl.R32F ||
                internalFormat === gl.RG32F ||
                internalFormat === gl.RGBA32F ||
                internalFormat === gl.R11F_G11F_B10F
              )
            ))
        ) {
          return gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT;
        }
        colorAttached = true;
        const level = framebuffer._attachmentLevel[gl.COLOR_ATTACHMENT0];
        width.push(colorAttachment._levelWidth[level]);
        height.push(colorAttachment._levelHeight[level]);
      } else if (colorAttachment instanceof WebGLRenderbuffer) {
        const format = colorAttachment._format;
        if (!this._verifyRenderableInternalColorFormat(format)) {
          return gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT;
        }
        colorAttached = true;
        width.push(colorAttachment._width);
        height.push(colorAttachment._height);
      }
    }

    if (!colorAttached && !stencilAttachment && !depthAttachment && !depthStencilAttachment) {
      return gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT;
    }

    if (width.length <= 0 || height.length <= 0) {
      return gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT;
    }

    for (let i = 1; i < width.length; ++i) {
      if (width[i - 1] !== width[i] || height[i - 1] !== height[i]) {
        return gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS;
      }
    }

    if (width[0] === 0 || height[0] === 0) {
      return gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT;
    }

    framebuffer._width = width[0];
    framebuffer._height = height[0];

    return gl.FRAMEBUFFER_COMPLETE;
  }

  // 532
  _resizeDrawingBuffer(width, height) {
    const prevDrawFramebuffer = this._activeDrawFramebuffer;
    const prevTexture = this._getActiveTexture(gl.TEXTURE_2D);
    const prevRenderbuffer = this._activeRenderbuffer;

    const contextAttributes = this._contextAttributes;

    const drawingBuffer = this._drawingBuffer;
    NativeWebGLRenderingContext.prototype.bindFramebuffer.call(this, gl.DRAW_FRAMEBUFFER, drawingBuffer._framebuffer);
    const attachments = this._getAttachments();
    // Clear all attachments
    for (let i = 0; i < attachments.length; ++i) {
      NativeWebGLRenderingContext.prototype.framebufferTexture2D.call(
        this,
        gl.DRAW_FRAMEBUFFER,
        attachments[i],
        gl.TEXTURE_2D,
        0,
        0
      );
    }

    // Update color attachment
    NativeWebGLRenderingContext.prototype.bindTexture.call(this, gl.TEXTURE_2D, drawingBuffer._color);
    const colorFormat = contextAttributes.alpha ? gl.RGBA : gl.RGB;
    NativeWebGLRenderingContext.prototype.texImage2D.call(
      this,
      gl.TEXTURE_2D,
      0,
      colorFormat,
      width,
      height,
      0,
      colorFormat,
      gl.UNSIGNED_BYTE,
      null
    );
    NativeWebGLRenderingContext.prototype.texParameteri.call(this, gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    NativeWebGLRenderingContext.prototype.texParameteri.call(this, gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    NativeWebGLRenderingContext.prototype.framebufferTexture2D.call(
      this,
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      drawingBuffer._color,
      0
    );

    // Update depth-stencil attachments if needed
    let storage = 0;
    let attachment = 0;
    if (contextAttributes.depth && contextAttributes.stencil) {
      storage = gl.DEPTH_STENCIL;
      attachment = gl.DEPTH_STENCIL_ATTACHMENT;
    } else if (contextAttributes.depth) {
      storage = 0x81a7;
      attachment = gl.DEPTH_ATTACHMENT;
    } else if (contextAttributes.stencil) {
      storage = gl.STENCIL_INDEX8;
      attachment = gl.STENCIL_ATTACHMENT;
    }

    if (storage) {
      NativeWebGLRenderingContext.prototype.bindRenderbuffer.call(this, gl.RENDERBUFFER, drawingBuffer._depthStencil);
      NativeWebGLRenderingContext.prototype.renderbufferStorage.call(this, gl.RENDERBUFFER, storage, width, height);
      NativeWebGLRenderingContext.prototype.framebufferRenderbuffer.call(
        this,
        gl.FRAMEBUFFER,
        attachment,
        gl.RENDERBUFFER,
        drawingBuffer._depthStencil
      );
    }

    // Restore previous binding state
    this.bindFramebuffer(gl.DRAW_FRAMEBUFFER, prevDrawFramebuffer);
    this.bindTexture(gl.TEXTURE_2D, prevTexture);
    this.bindRenderbuffer(gl.RENDERBUFFER, prevRenderbuffer);
  }

  // 615
  _updateFramebufferAttachments(framebuffer, target = gl.FRAME_BUFFER) {
    const prevStatus = framebuffer._status;
    const attachments = this._getAttachments();
    framebuffer._status = this._preCheckFramebufferStatus(framebuffer);
    if (framebuffer._status !== gl.FRAMEBUFFER_COMPLETE) {
      if (prevStatus === gl.FRAMEBUFFER_COMPLETE) {
        this._resetAttachments(target, attachments, framebuffer);
      }
      return;
    }

    this._resetAttachments(target, attachments, framebuffer);

    for (let i = 0; i < attachments.length; ++i) {
      const attachmentEnum = attachments[i];
      const attachment = framebuffer._attachments[attachmentEnum];
      if (attachment instanceof WebGLTexture) {
        NativeWebGLRenderingContext.prototype.framebufferTexture2D.call(
          this,
          target,
          attachmentEnum,
          framebuffer._attachmentFace[attachmentEnum],
          attachment._ | 0,
          framebuffer._attachmentLevel[attachmentEnum]
        );
      } else if (attachment instanceof WebGLRenderbuffer) {
        NativeWebGLRenderingContext.prototype.framebufferRenderbuffer.call(
          this,
          target,
          attachmentEnum,
          gl.RENDERBUFFER,
          attachment._ | 0
        );
      }
    }
  }

  _resetAttachments(target, attachments, framebuffer) {
    for (let i = 0; i < attachments.length; ++i) {
      const attachmentEnum = attachments[i];
      if (framebuffer._attachmentFace[attachmentEnum] === gl.RENDERBUFFER) {
        NativeWebGLRenderingContext.prototype.framebufferRenderbuffer.call(
          this,
          target,
          attachmentEnum,
          framebuffer._attachmentFace[attachmentEnum],
          0
        );
      } else if (
        framebuffer._attachmentFace[attachmentEnum] === gl.TEXTURE_2D ||
        framebuffer._attachmentFace[attachmentEnum] === gl.TEXTURE_CUBE_MAP_POSITIVE_X ||
        framebuffer._attachmentFace[attachmentEnum] === gl.TEXTURE_CUBE_MAP_NEGATIVE_X ||
        framebuffer._attachmentFace[attachmentEnum] === gl.TEXTURE_CUBE_MAP_POSITIVE_Y ||
        framebuffer._attachmentFace[attachmentEnum] === gl.TEXTURE_CUBE_MAP_NEGATIVE_Y ||
        framebuffer._attachmentFace[attachmentEnum] === gl.TEXTURE_CUBE_MAP_POSITIVE_Z ||
        framebuffer._attachmentFace[attachmentEnum] === gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
      ) {
        NativeWebGLRenderingContext.prototype.framebufferTexture2D.call(
          this,
          target,
          attachmentEnum,
          framebuffer._attachmentFace[attachmentEnum],
          0,
          framebuffer._attachmentLevel[attachmentEnum]
        );
      }
    }
  }

  // 704
  _validFramebufferAttachment(attachment) {
    switch (attachment) {
      case gl.DEPTH_ATTACHMENT:
      case gl.STENCIL_ATTACHMENT:
      case gl.DEPTH_STENCIL_ATTACHMENT:
      case gl.COLOR_ATTACHMENT0:
        return true;
    }

    return attachment < gl.COLOR_ATTACHMENT0 + this._drawBuffers._maxDrawBuffers; // eslint-disable-line
  }

  // 726
  _validTextureTarget(target) {
    return (
      target === gl.TEXTURE_2D ||
      target === gl.TEXTURE_CUBE_MAP ||
      target === gl.TEXTURE_3D ||
      target === gl.TEXTURE_2D_ARRAY
    );
  }

  // 730
  _verifyTextureCompleteness(target, pname, param) {
    const unit = this._getActiveTextureUnit();
    let texture = null;
    if (target === gl.TEXTURE_2D) {
      texture = unit._bind2D;
    } else if (target === gl.TEXTURE_3D) {
      texture = unit._bind3D;
    } else if (target === gl.TEXTURE_2D_ARRAY) {
      texture = unit._bind2DArray;
    } else if (this._validCubeTarget(target)) {
      texture = unit._bindCube;
    }

    // oes_texture_float but not oes_texture_float_linear
    if (
      !this._extensions.oes_texture_float_linear &&
      texture &&
      texture._type === gl.FLOAT &&
      (pname === gl.TEXTURE_MAG_FILTER || pname === gl.TEXTURE_MIN_FILTER) &&
      (param === gl.LINEAR ||
        param === gl.LINEAR_MIPMAP_NEAREST ||
        param === gl.NEAREST_MIPMAP_LINEAR ||
        param === gl.LINEAR_MIPMAP_LINEAR)
    ) {
      texture._complete = false;
      this.bindTexture(target, texture);
      return;
    }

    if (texture && texture._complete === false) {
      texture._complete = true;
      this.bindTexture(target, texture);
    }
  }

  // 762
  _wrapShader(type, source) {
    return source;
  }

  // 858
  bindFramebuffer(target, framebuffer) {
    if (!checkObject(framebuffer)) {
      throw new TypeError('bindFramebuffer(GLenum, WebGLFramebuffer)');
    }
    if (target !== gl.FRAMEBUFFER && target !== gl.DRAW_FRAMEBUFFER && target !== gl.READ_FRAMEBUFFER) {
      this.setError(gl.INVALID_ENUM);
      return;
    }
    if (!framebuffer) {
      NativeWebGLRenderingContext.prototype.bindFramebuffer.call(this, target, this._drawingBuffer._framebuffer);
    } else if (framebuffer._pendingDelete) {
      return;
    } else if (this._checkWrapper(framebuffer, WebGLFramebuffer)) {
      NativeWebGLRenderingContext.prototype.bindFramebuffer.call(this, target, framebuffer._ | 0);
    } else {
      return;
    }

    if (target === gl.FRAMEBUFFER || target === gl.DRAW_FRAMEBUFFER) {
      const activeFramebuffer = this._activeDrawFramebuffer;
      if (activeFramebuffer !== framebuffer) {
        if (activeFramebuffer) {
          activeFramebuffer._refCount -= 1;
          activeFramebuffer._checkDelete();
        }
        if (framebuffer) {
          framebuffer._refCount += 1;
        }
      }

      this._activeDrawFramebuffer = framebuffer;
    }

    if (target === gl.FRAMEBUFFER || target === gl.READ_FRAMEBUFFER) {
      const activeFramebuffer = this._activeReadFramebuffer;
      if (activeFramebuffer !== framebuffer) {
        if (activeFramebuffer) {
          activeFramebuffer._refCount -= 1;
          activeFramebuffer._checkDelete();
        }
        if (framebuffer) {
          framebuffer._refCount += 1;
        }
      }

      this._activeReadFramebuffer = framebuffer;
    }
    if (framebuffer) {
      this._updateFramebufferAttachments(framebuffer, target);
    }
  }

  //959
  bindTexture(target, texture) {
    target |= 0;

    if (!checkObject(texture)) {
      throw new TypeError('bindTexture(GLenum, WebGLTexture)');
    }

    if (!this._validTextureTarget(target)) {
      this.setError(gl.INVALID_ENUM);
      return;
    }

    // Get texture id
    let textureId = 0;
    if (!texture) {
      texture = null;
    } else if (texture instanceof WebGLTexture && texture._pendingDelete) {
      // Special case: error codes for deleted textures don't get set for some dumb reason
      return;
    } else if (this._checkWrapper(texture, WebGLTexture)) {
      // Check binding mode of texture
      if (texture._binding && texture._binding !== target) {
        this.setError(gl.INVALID_OPERATION);
        return;
      }
      texture._binding = target;

      if (texture._complete) {
        textureId = texture._ | 0;
      }
    } else {
      return;
    }

    this._saveError();
    NativeWebGLRenderingContext.prototype.bindTexture.call(this, target, textureId);
    const error = this.getError();
    this._restoreError(error);

    if (error !== gl.NO_ERROR) {
      return;
    }

    const activeUnit = this._getActiveTextureUnit();
    const activeTex = this._getActiveTexture(target);

    // Update references
    if (activeTex !== texture) {
      if (activeTex) {
        activeTex._refCount -= 1;
        activeTex._checkDelete();
      }
      if (texture) {
        texture._refCount += 1;
      }
    }

    if (target === gl.TEXTURE_2D) {
      activeUnit._bind2D = texture;
    } else if (target === gl.TEXTURE_3D) {
      activeUnit._bind3D = texture;
    } else if (target === gl.TEXTURE_2D_ARRAY) {
      activeUnit._bind2DArray = texture;
    } else if (target === gl.TEXTURE_CUBE_MAP) {
      activeUnit._bindCube = texture;
    }
  }

  // 1088
  getExtension(name) {
    const str = name.toLowerCase();
    if (str in this._extensions) {
      return this._extensions[str];
    }
    const ext = availableExtensions[str] ? availableExtensions[str](this) : null;
    if (ext) {
      this._extensions[str] = ext;
    }
    return ext;
  }

  // 1100
  getSupportedExtensions() {
    const exts = ['STACKGL_resize_drawingbuffer', 'STACKGL_destroy_context'];

    const supportedExts = NativeWebGLRenderingContext.prototype.getSupportedExtensions.call(this);

    if (supportedExts.indexOf('GL_OES_texture_float_linear') >= 0) {
      exts.push('OES_texture_float_linear');
    }

    if (supportedExts.indexOf('EXT_texture_filter_anisotropic') >= 0) {
      exts.push('EXT_texture_filter_anisotropic');
    }

    if (supportedExts.indexOf('EXT_color_buffer_float') >= 0) {
      exts.push('EXT_color_buffer_float');
    }
    return exts;
  }

  // 1304
  checkFramebufferStatus(target) {
    if (target !== gl.FRAMEBUFFER && target !== gl.DRAW_FRAMEBUFFER && target !== gl.READ_FRAMEBUFFER) {
      this.setError(gl.INVALID_ENUM);
      return 0;
    }

    const framebuffer =
      target === gl.FRAMEBUFFER || target === gl.DRAW_FRAMEBUFFER
        ? this._activeDrawFramebuffer
        : this._activeReadFramebuffer;
    if (!framebuffer) {
      return gl.FRAMEBUFFER_COMPLETE;
    }

    return this._preCheckFramebufferStatus(framebuffer);
  }

  // 1497
  deleteFramebuffer(framebuffer) {
    if (!checkObject(framebuffer)) {
      throw new TypeError('deleteFramebuffer(WebGLFramebuffer)');
    }

    if (!(framebuffer instanceof WebGLFramebuffer && this._checkOwns(framebuffer))) {
      this.setError(gl.INVALID_OPERATION);
      return;
    }

    if (this._activeDrawFramebuffer === framebuffer && this._activeReadFramebuffer === framebuffer) {
      this.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else if (this._activeDrawFramebuffer === framebuffer) {
      this.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    } else if (this._activeReadFramebuffer === framebuffer) {
      this.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    }
    framebuffer._pendingDelete = true;
    framebuffer._checkDelete();
  }

  // 1526
  deleteRenderbuffer(renderbuffer) {
    if (!checkObject(renderbuffer)) {
      throw new TypeError('deleteRenderbuffer(WebGLRenderbuffer)');
    }

    if (!(renderbuffer instanceof WebGLRenderbuffer && this._checkOwns(renderbuffer))) {
      this.setError(gl.INVALID_OPERATION);
      return;
    }

    if (this._activeRenderbuffer === renderbuffer) {
      this.bindRenderbuffer(gl.RENDERBUFFER, null);
    }

    const activeFramebuffer = this._activeDrawFramebuffer;

    this._tryDetachFramebuffer(activeFramebuffer, renderbuffer);

    if (this._activeReadFramebuffer !== activeFramebuffer) {
      this._tryDetachFramebuffer(this._activeReadFramebuffer, renderbuffer);
    }

    renderbuffer._pendingDelete = true;
    renderbuffer._checkDelete();
  }

  //  1548
  deleteTexture(texture) {
    if (!checkObject(texture)) {
      throw new TypeError('deleteTexture(WebGLTexture)');
    }

    if (texture instanceof WebGLTexture) {
      if (!this._checkOwns(texture)) {
        this.setError(gl.INVALID_OPERATION);
        return;
      }
    } else {
      return;
    }

    // Unbind from all texture units
    const curActive = this._activeTextureUnit;

    for (let i = 0; i < this._textureUnits.length; ++i) {
      const unit = this._textureUnits[i];
      if (unit._bind2D === texture) {
        this.activeTexture(gl.TEXTURE0 + i);
        this.bindTexture(gl.TEXTURE_2D, null);
      } else if (unit._bind2DArray === texture) {
        this.activeTexture(gl.TEXTURE0 + i);
        this.bindTexture(gl.TEXTURE_2D_ARRAY, null);
      } else if (unit._bind3D === texture) {
        this.activeTexture(gl.TEXTURE0 + i);
        this.bindTexture(gl.TEXTURE_3D, null);
      } else if (unit._bindCube === texture) {
        this.activeTexture(gl.TEXTURE0 + i);
        this.bindTexture(gl.TEXTURE_CUBE_MAP, null);
      }
    }
    this.activeTexture(gl.TEXTURE0 + curActive);

    // FIXME: Does the texture get unbound from *all* framebuffers, or just the
    // active FBO?
    function tryDetach(framebuffer) {
      if (framebuffer && framebuffer._linked(texture)) {
        const attachments = this._getAttachments();
        for (let i = 0; i < attachments.length; ++i) {
          const attachment = attachments[i];
          if (framebuffer._attachments[attachment] === texture) {
            this.framebufferTexture2D(gl.FRAMEBUFFER, attachment, gl.TEXTURE_2D, null);
          }
        }
      }
    }

    const activeFramebuffer = this._activeDrawFramebuffer;
    tryDetach(activeFramebuffer);

    if (this._activeReadFramebuffer !== activeFramebuffer) {
      tryDetach(this._activeReadFramebuffer);
    }

    // Mark texture for deletion
    texture._pendingDelete = true;
    texture._checkDelete();
  }

  // 1669
  drawArrays(mode, first, count) {
    mode |= 0;
    first |= 0;
    count |= 0;

    if (first < 0 || count < 0) {
      this.setError(gl.INVALID_VALUE);
      return;
    }

    if (!this._checkStencilState()) {
      return;
    }

    const reducedCount = vertexCount(mode, count);
    if (reducedCount < 0) {
      this.setError(gl.INVALID_ENUM);
      return;
    }

    if (!this._framebufferOk()) {
      return;
    }

    if (count === 0) {
      return;
    }

    return NativeWebGLRenderingContext.prototype.drawArrays.call(this, mode, first, reducedCount);
  }

  // 1717
  drawElements(mode, count, type, ioffset) {
    if (!this._activeVertexArray) {
      super.drawElements(mode, count, type, ioffset);
      return;
    }
    mode |= 0;
    count |= 0;
    type |= 0;
    ioffset |= 0;

    if (count < 0 || ioffset < 0) {
      this.setError(gl.INVALID_VALUE);
      return;
    }

    if (!this._checkStencilState()) {
      return;
    }

    let reducedCount = count;
    switch (mode) {
      case gl.TRIANGLES:
        if (count % 3) {
          reducedCount -= count % 3;
        }
        break;
      case gl.LINES:
        if (count % 2) {
          reducedCount -= count % 2;
        }
        break;
      case gl.POINTS:
        break;
      case gl.LINE_LOOP:
      case gl.LINE_STRIP:
        if (count < 2) {
          this.setError(gl.INVALID_OPERATION);
          return;
        }
        break;
      case gl.TRIANGLE_FAN:
      case gl.TRIANGLE_STRIP:
        if (count < 3) {
          this.setError(gl.INVALID_OPERATION);
          return;
        }
        break;
      default:
        this.setError(gl.INVALID_ENUM);
        return;
    }

    if (!this._framebufferOk()) {
      return;
    }

    if (count === 0) {
      this._checkVertexAttribState(0);
      return;
    }

    if (reducedCount > 0) {
      return NativeWebGLRenderingContext.prototype.drawElements.call(this, mode, reducedCount, type, ioffset);
    }
  }

  // 1863
  framebufferRenderbuffer(target, attachment, renderbufferTarget, renderbuffer) {
    target = target | 0;
    attachment = attachment | 0;
    renderbufferTarget = renderbufferTarget | 0;

    if (!checkObject(renderbuffer)) {
      throw new TypeError('framebufferRenderbuffer(GLenum, GLenum, GLenum, WebGLRenderbuffer)');
    }

    if (
      (target !== gl.FRAMEBUFFER && target !== gl.DRAW_FRAMEBUFFER && target !== gl.READ_FRAMEBUFFER) ||
      !this._validFramebufferAttachment(attachment) ||
      renderbufferTarget !== gl.RENDERBUFFER
    ) {
      this.setError(gl.INVALID_ENUM);
      return;
    }

    if (target === gl.FRAMEBUFFER || target === gl.DRAW_FRAMEBUFFER) {
      const framebuffer = this._activeDrawFramebuffer;
      if (!framebuffer) {
        this.setError(gl.INVALID_OPERATION);
        return;
      }

      if (renderbuffer && !this._checkWrapper(renderbuffer, WebGLRenderbuffer)) {
        return;
      }

      framebuffer._attachmentFace[attachment] = renderbufferTarget;
      framebuffer._setAttachment(renderbuffer, attachment);
      this._updateFramebufferAttachments(framebuffer, target);
    }
    if (
      (target === gl.FRAMEBUFFER || target === gl.READ_FRAMEBUFFER) &&
      this._activeDrawFramebuffer !== this._activeReadFramebuffer
    ) {
      const framebuffer = this._activeReadFramebuffer;
      if (!framebuffer) {
        this.setError(gl.INVALID_OPERATION);
        return;
      }

      if (renderbuffer && !this._checkWrapper(renderbuffer, WebGLRenderbuffer)) {
        return;
      }

      framebuffer._attachmentFace[attachment] = renderbufferTarget;
      framebuffer._setAttachment(renderbuffer, attachment);
      this._updateFramebufferAttachments(framebuffer, target);
    }
  }

  // 1895
  framebufferTexture2D(target, attachment, textarget, texture, level) {
    target |= 0;
    attachment |= 0;
    textarget |= 0;
    level |= 0;
    if (!checkObject(texture)) {
      throw new TypeError('framebufferTexture2D(GLenum, GLenum, GLenum, WebGLTexture, GLint)');
    }

    // Check parameters are ok
    if (
      (target !== gl.FRAMEBUFFER && target !== gl.DRAW_FRAMEBUFFER && target !== gl.READ_FRAMEBUFFER) ||
      !this._validFramebufferAttachment(attachment)
    ) {
      this.setError(gl.INVALID_ENUM);
      return;
    }

    if (level !== 0) {
      this.setError(gl.INVALID_VALUE);
      return;
    }

    // Check object ownership
    if (texture && !this._checkWrapper(texture, WebGLTexture)) {
      return;
    }

    // Check texture target is ok
    if (textarget === gl.TEXTURE_2D) {
      if (texture && texture._binding !== gl.TEXTURE_2D) {
        this.setError(gl.INVALID_OPERATION);
        return;
      }
    } else if (this._validCubeTarget(textarget)) {
      if (texture && texture._binding !== gl.TEXTURE_CUBE_MAP) {
        this.setError(gl.INVALID_OPERATION);
        return;
      }
    } else {
      this.setError(gl.INVALID_ENUM);
      return;
    }

    // Check a framebuffer is actually bound
    if (target === gl.FRAMEBUFFER || target === gl.DRAW_FRAMEBUFFER) {
      const framebuffer = this._activeDrawFramebuffer;
      if (!framebuffer) {
        this.setError(gl.INVALID_OPERATION);
        return;
      }

      framebuffer._attachmentLevel[attachment] = level;
      framebuffer._attachmentFace[attachment] = textarget;
      framebuffer._setAttachment(texture, attachment);
      this._updateFramebufferAttachments(framebuffer, target);
    }

    if (
      (target === gl.FRAMEBUFFER || target === gl.READ_FRAMEBUFFER) &&
      this._activeDrawFramebuffer !== this._activeReadFramebuffer
    ) {
      const framebuffer = this._activeReadFramebuffer;
      if (!framebuffer) {
        this.setError(gl.INVALID_OPERATION);
        return;
      }

      framebuffer._attachmentLevel[attachment] = level;
      framebuffer._attachmentFace[attachment] = textarget;
      framebuffer._setAttachment(texture, attachment);
      this._updateFramebufferAttachments(framebuffer, target);
    }
  }

  // 2021
  getParameter(pname) {
    pname |= 0;
    switch (pname) {
      case gl.FRAMEBUFFER_BINDING:
      case gl.DRAW_FRAMEBUFFER_BINDING:
        return this._activeDrawFramebuffer;
      case gl.READ_FRAMEBUFFER_BINDING:
        return this._activeReadFramebuffer;
      case gl.MAX_SAMPLES:
      case gl.MAX_UNIFORM_BUFFER_BINDINGS:
        return NativeWebGLRenderingContext.prototype.getParameter.call(this, pname);
      default:
        return super.getParameter(pname);
    }
  }

  //2251
  getFramebufferAttachmentParameter(target, attachment, pname) {
    target |= 0;
    attachment |= 0;
    pname |= 0;

    if (
      (target !== gl.FRAMEBUFFER && target !== gl.DRAW_FRAMEBUFFER && target !== gl.READ_FRAMEBUFFER) ||
      !this._validFramebufferAttachment(attachment)
    ) {
      this.setError(gl.INVALID_ENUM);
      return null;
    }

    const framebuffer =
      target === gl.FRAMEBUFFER || gl.DRAW_FRAMEBUFFER ? this._activeDrawFramebuffer : this._activeReadFramebuffer;
    if (!framebuffer) {
      this.setError(gl.INVALID_OPERATION);
      return null;
    }

    const object = framebuffer._attachments[attachment];
    if (object === null) {
      if (pname === gl.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE) {
        return gl.NONE;
      }
    } else if (object instanceof WebGLTexture) {
      switch (pname) {
        case gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME:
          return object;
        case gl.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE:
          return gl.TEXTURE;
        case gl.FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL:
          return framebuffer._attachmentLevel[attachment];
        case gl.FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE: {
          const face = framebuffer._attachmentFace[attachment];
          if (face === gl.TEXTURE_2D) {
            return 0;
          }
          return face;
        }
      }
    } else if (object instanceof WebGLRenderbuffer) {
      switch (pname) {
        case gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME:
          return object;
        case gl.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE:
          return gl.RENDERBUFFER;
      }
    }

    this.setError(gl.INVALID_ENUM);
    return null;
  }

  // 2718
  readPixels(x, y, width, height, format, type, pixels) {
    x |= 0;
    y |= 0;
    width |= 0;
    height |= 0;

    if (!(type === gl.FLOAT && format === gl.RGBA)) {
      if (format === gl.RGB || format === gl.ALPHA || type !== gl.UNSIGNED_BYTE) {
        this.setError(gl.INVALID_OPERATION);
        return;
      } else if (format !== gl.RGBA) {
        this.setError(gl.INVALID_ENUM);
        return;
      } else if (width < 0 || height < 0 || !(pixels instanceof Uint8Array)) {
        this.setError(gl.INVALID_VALUE);
        return;
      }
    }

    if (!this._framebufferOk()) {
      return;
    }

    let rowStride = width * 4;
    if (rowStride % this._packAlignment !== 0) {
      rowStride += this._packAlignment - (rowStride % this._packAlignment);
    }

    const imageSize = rowStride * (height - 1) + width * 4;
    if (imageSize <= 0) {
      return;
    }
    if (pixels.length < imageSize) {
      this.setError(gl.INVALID_VALUE);
      return;
    }

    // Handle reading outside the window
    let viewWidth = this.drawingBufferWidth;
    let viewHeight = this.drawingBufferHeight;

    if (this._activeReadFramebuffer) {
      viewWidth = this._activeReadFramebuffer._width;
      viewHeight = this._activeReadFramebuffer._height;
    }

    const pixelData = unpackTypedArray(pixels);

    if (x >= viewWidth || x + width <= 0 || y >= viewHeight || y + height <= 0) {
      for (let i = 0; i < pixelData.length; ++i) {
        pixelData[i] = 0;
      }
    } else if (x < 0 || x + width > viewWidth || y < 0 || y + height > viewHeight) {
      for (let i = 0; i < pixelData.length; ++i) {
        pixelData[i] = 0;
      }

      let nx = x;
      let nWidth = width;
      if (x < 0) {
        nWidth += x;
        nx = 0;
      }
      if (nx + width > viewWidth) {
        nWidth = viewWidth - nx;
      }
      let ny = y;
      let nHeight = height;
      if (y < 0) {
        nHeight += y;
        ny = 0;
      }
      if (ny + height > viewHeight) {
        nHeight = viewHeight - ny;
      }

      let nRowStride = nWidth * 4;
      if (nRowStride % this._packAlignment !== 0) {
        nRowStride += this._packAlignment - (nRowStride % this._packAlignment);
      }

      if (nWidth > 0 && nHeight > 0) {
        const subPixels = new Uint8Array(nRowStride * nHeight);
        NativeWebGLRenderingContext.prototype.readPixels.call(this, nx, ny, nWidth, nHeight, format, type, subPixels);

        const offset = 4 * (nx - x) + (ny - y) * rowStride;
        for (let j = 0; j < nHeight; ++j) {
          for (let i = 0; i < nWidth; ++i) {
            for (let k = 0; k < 4; ++k) {
              pixelData[offset + j * rowStride + 4 * i + k] = subPixels[j * nRowStride + 4 * i + k];
            }
          }
        }
      }
    } else {
      NativeWebGLRenderingContext.prototype.readPixels.call(this, x, y, width, height, format, type, pixelData);
    }
  }

  _verifyRenderbufferStorageInternalFormat(format) {
    return (
      this._verifyRenderableInternalColorFormat(format) || this._verifyRenderableInternalDepthStencilFormat(format)
    );
  }

  _verifyRenderableInternalColorFormat(format) {
    return (
      format === gl.RGBA4 ||
      format === gl.RGB565 ||
      format === gl.RGB5_A1 ||
      format === gl.R8 ||
      format === gl.R8UI ||
      format === gl.R8I ||
      format === gl.R16UI ||
      format === gl.R16I ||
      format === gl.R32UI ||
      format === gl.R32I ||
      format === gl.RG8 ||
      format === gl.RG8UI ||
      format === gl.RG8I ||
      format === gl.RG16UI ||
      format === gl.RG16I ||
      format === gl.RG32UI ||
      format === gl.RG32I ||
      format === gl.RGB8 ||
      format === gl.RGBA8 ||
      format === gl.SRGB8_ALPHA8 ||
      format === gl.RGB10_A2 ||
      format === gl.RGBA8UI ||
      format === gl.RGBA8I ||
      format === gl.RGB10_A2UI ||
      format === gl.RGBA16UI ||
      format === gl.RGBA16I ||
      format === gl.RGBA32I ||
      format === gl.RGBA32UI ||
      (
        this._extensions.ext_color_buffer_float && (
          format === gl.R16F ||
          format === gl.RG16F ||
          format === gl.RGBA16F ||
          format === gl.R32F ||
          format === gl.RG32F ||
          format === gl.RGBA32F ||
          format === gl.R11F_G11F_B10F
        )
      )
    );
  }

  _verifyRenderableInternalDepthStencilFormat(format) {
    return (
      format === gl.DEPTH_COMPONENT16 ||
      format === gl.DEPTH_COMPONENT24 ||
      format === gl.DEPTH_COMPONENT32F ||
      format === gl.DEPTH_STENCIL ||
      format === gl.DEPTH24_STENCIL8 ||
      format === gl.DEPTH32F_STENCIL8 ||
      format === gl.STENCIL_INDEX ||
      format === gl.STENCIL_INDEX8
    );
  }

  // 2846
  renderbufferStorage(target, internalFormat, width, height) {
    target |= 0;
    internalFormat |= 0;
    width |= 0;
    height |= 0;

    if (target !== gl.RENDERBUFFER) {
      this.setError(gl.INVALID_ENUM);
      return;
    }

    const renderbuffer = this._activeRenderbuffer;
    if (!renderbuffer) {
      this.setError(gl.INVALID_OPERATION);
      return;
    }

    if (!this._verifyRenderbufferStorageInternalFormat(internalFormat)) {
      this.setError(gl.INVALID_ENUM);
      return;
    }

    this._saveError();
    NativeWebGLRenderingContext.prototype.renderbufferStorage.call(this, target, internalFormat, width, height);
    const error = this.getError();
    this._restoreError(error);
    if (error !== gl.NO_ERROR) {
      return;
    }

    renderbuffer._width = width;
    renderbuffer._height = height;
    renderbuffer._format = internalFormat;

    const activeFramebuffer =
      target === gl.FRAMEBUFFER || target === gl.DRAW_FRAMEBUFFER
        ? this._activeDrawFramebuffer
        : this._activeReadFramebuffer;
    if (activeFramebuffer) {
      let needsUpdate = false;
      const attachments = this._getAttachments();
      for (let i = 0; i < attachments.length; ++i) {
        if (activeFramebuffer._attachments[attachments[i]] === renderbuffer) {
          needsUpdate = true;
          break;
        }
      }
      if (needsUpdate) {
        this._updateFramebufferAttachments(activeFramebuffer, target);
      }
    }
  }

  _updateActiveFramebuffer(texture) {
    let activeFramebuffer = this._activeDrawFramebuffer;
    if (activeFramebuffer) {
      let needsUpdate = false;
      const attachments = this._getAttachments();
      for (let i = 0; i < attachments.length; ++i) {
        if (activeFramebuffer._attachments[attachments[i]] === texture) {
          needsUpdate = true;
          break;
        }
      }
      if (needsUpdate) {
        this._updateFramebufferAttachments(this._activeDrawFramebuffer, gl.DRAW_FRAMEBUFFER);
      }
    }

    if (activeFramebuffer !== this._activeReadFramebuffer) {
      activeFramebuffer = this._activeReadFramebuffer;
      if (activeFramebuffer) {
        let needsUpdate = false;
        const attachments = this._getAttachments();
        for (let i = 0; i < attachments.length; ++i) {
          if (activeFramebuffer._attachments[attachments[i]] === texture) {
            needsUpdate = true;
            break;
          }
        }
        if (needsUpdate) {
          this._updateFramebufferAttachments(this._activeReadFramebuffer, gl.DRAW_FRAMEBUFFER);
        }
      }
    }
  }

  // 2963
  // WebGL1
  // texImage2D(target, level, internalFormat, width, height, border, format, type, pixels)
  // texImage2D(target, level, internalFormat, format, type, pixels)

  // WebGL2
  // texImage2D(target, level, internalFormat, width, height, border, format, type, offset)
  // texImage2D(target, level, internalFormat, width, height, border, format, type, source)
  // texImage2D(target, level, internalFormat, width, height, border, format, type, srcData, srcOffset)

  texImage2D(target, level, internalFormat, width, height, border, format, type, pixels, offset) {
    if (arguments.length === 6) {
      pixels = border;
      type = height;
      format = width;

      pixels = extractImageData(pixels);

      if (pixels == null) {
        throw new TypeError(
          'texImage2D(GLenum, GLint, GLenum, GLint, GLenum, GLenum, ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement)'
        );
      }

      width = pixels.width;
      height = pixels.height;
      pixels = pixels.data;
    }

    target |= 0;
    level |= 0;
    internalFormat |= 0;
    width |= 0;
    height |= 0;
    border |= 0;
    format |= 0;
    type |= 0;
    offset |= 0;

    if (typeof pixels !== 'object' && typeof pixels !== 'number' && pixels !== undefined) {
      throw new TypeError('texImage2D(GLenum, GLint, GLenum, GLint, GLint, GLint, GLenum, GLenum, Uint8Array)');
    }

    if (typeof pixels === 'number') {
      offset = pixels;
      pixels = undefined;
    }

    if (!verifyFormat(internalFormat, format, type)) {
      this.setError(gl.INVALID_ENUM);
      return;
    }

    const texture = this._getTexImage(target);
    if (!texture) {
      this.setError(gl.INVALID_OPERATION);
      return;
    }

    texture._internalFormat = internalFormat;

    const ps = pixelSize(internalFormat, type);
    if (ps === 0) {
      return;
    }

    if (!this._checkDimensions(target, width, height, level)) {
      return;
    }

    const data = convertPixels(pixels);
    const rowStride = this._computeRowStride(width, ps);
    const imageSize = rowStride * height;

    if (data && data.length < imageSize) {
      this.setError(gl.INVALID_OPERATION);
      return;
    }

    if (border !== 0 || (validCubeTarget(target) && width !== height)) {
      this.setError(gl.INVALID_VALUE);
      return;
    }
    // Need to check for out of memory error
    this._saveError();
    NativeWebGLRenderingContext.prototype.texImage2D.call(
      this,
      target,
      level,
      internalFormat,
      width,
      height,
      border,
      format,
      type,
      data
    );
    const error = this.getError();
    this._restoreError(error);
    if (error !== gl.NO_ERROR) {
      return;
    }

    // Save width and height at level
    texture._levelWidth[level] = width;
    texture._levelHeight[level] = height;
    texture._format = format;
    texture._type = type;

    this._updateActiveFramebuffer(texture);
  }

  /**
   * webgl2
   */

  // void gl.texImage3D(target, level, internalFormat, width, height, depth, border, format, type, GLintptr offset);
  // void gl.texImage3D(target, level, internalFormat, width, height, depth, border, format, type, HTMLCanvasElement source);
  // void gl.texImage3D(target, level, internalFormat, width, height, depth, border, format, type, HTMLImageElement source);
  // void gl.texImage3D(target, level, internalFormat, width, height, depth, border, format, type, HTMLVideoElement source);
  // void gl.texImage3D(target, level, internalFormat, width, height, depth, border, format, type, ImageBitmap source);
  // void gl.texImage3D(target, level, internalFormat, width, height, depth, border, format, type, ImageData source);
  // void gl.texImage3D(target, level, internalFormat, width, height, depth, border, format, type, ArrayBufferView? srcData);
  // void gl.texImage3D(target, level, internalFormat, width, height, depth, border, format, type, ArrayBufferView srcData, srcOffset);
  texImage3D(target, level, internalFormat, width, height, depth, border, format, type, pixels, srcOffset) {
    target |= 0;
    level |= 0;
    internalFormat |= 0;
    width |= 0;
    height |= 0;
    depth |= 0;
    border |= 0;
    format |= 0;
    type |= 0;
    srcOffset |= 0;

    if (typeof pixels !== 'object' && pixels !== undefined) {
      throw new TypeError('texImage3D(GLenum, GLint, GLenum, GLint, GLint, GLint, GLint, GLenum, GLenum, Uint8Array)');
    }

    if (!verifyFormat(internalFormat, format, type)) {
      this.setError(gl.INVALID_ENUM);
      return;
    }

    const texture = this._getTexImage(target);
    if (!texture) {
      this.setError(gl.INVALID_OPERATION);
      return;
    }

    texture._internalFormat = internalFormat;

    const ps = pixelSize(internalFormat, type);
    if (ps === 0) {
      return;
    }

    if (!this._checkDimensions(target, width, height, level)) {
      return;
    }

    const data = convertPixels(pixels);
    const rowStride = this._computeRowStride(width, ps);
    const imageSize = rowStride * height;

    if (data && data.length < imageSize) {
      this.setError(gl.INVALID_OPERATION);
      return;
    }

    if (border !== 0 || (validCubeTarget(target) && width !== height)) {
      this.setError(gl.INVALID_VALUE);
      return;
    }
    // Need to check for out of memory error
    this._saveError();
    NativeWebGLRenderingContext.prototype.texImage3D.call(
      this,
      target,
      level,
      internalFormat,
      width,
      height,
      depth,
      border,
      format,
      type,
      data
    );
    const error = this.getError();
    this._restoreError(error);
    if (error !== gl.NO_ERROR) {
      return;
    }

    // Save width and height at level
    texture._levelWidth[level] = width;
    texture._levelHeight[level] = height;
    texture._format = format;
    texture._type = type;

    this._updateActiveFramebuffer(texture);
  }

  createVertexArray() {
    const id = NativeWebGLRenderingContext.prototype.createVertexArray.call(this);
    if (id <= 0) return null;
    const webGLVertexArrayObject = new WebGLVertexArrayObject(id, this);
    return webGLVertexArrayObject;
  }

  bindVertexArray(object) {
    if (!checkObject(object)) {
      throw new TypeError('bindVertexArray(WebGLVertexArrayObject');
    }

    if (!object) {
      NativeWebGLRenderingContext.prototype.bindVertexArray.call(this, 0);
    } else if (object._pendingDelete) {
      return;
    } else if (this._checkWrapper(object, WebGLVertexArrayObject)) {
      NativeWebGLRenderingContext.prototype.bindVertexArray.call(this, object._ | 0);
    } else {
      return;
    }

    const active = this._activeVertexArray;
    if (active !== object) {
      if (active) {
        active._refCount -= 1;
        active._checkDelete();
      }
      if (object) {
        object._refCount += 1;
      }
    }

    this._activeVertexArray = object;
  }

  deleteVertexArray(object) {
    if (!checkObject(object)) {
      throw new TypeError('deleteVertexArray(WebGLVertexArrayObject)');
    }

    if (!(object instanceof WebGLVertexArrayObject && this._checkOwns(object))) {
      this.setError(gl.INVALID_OPERATION);
      return;
    }
  }

  isVertexArray(object) {
    if (!this._isObject(object, 'isVertexArray', WebGLVertexArrayObject)) return false;

    return NativeWebGLRenderingContext.prototype.isVertexArray.call(this, object._ | 0);
  }

  texStorage2D(target, levels, internalFormat, width, height) {
    target |= 0;
    levels |= 0;
    internalFormat |= 0;
    width |= 0;
    height |= 0;

    if (target !== gl.TEXTURE_2D && target !== gl.TEXTURE_CUBE_MAP) {
      this.setError(gl.INVALID_ENUM);
      return;
    }

    const texture = this._getTexImage(target);
    if (!texture) {
      this.setError(gl.INVALID_OPERATION);
      return;
    }

    texture._internalFormat = internalFormat;

    NativeWebGLRenderingContext.prototype.texStorage2D.call(this, target, levels, internalFormat, width, height);
  }

  texStorage3D(target, levels, internalFormat, width, height, depth) {
    target |= 0;
    levels |= 0;
    internalFormat |= 0;
    width |= 0;
    height |= 0;
    depth |= 0;

    if (target !== gl.TEXTURE_3D && target !== gl.TEXTURE_2D_ARRAY) {
      this.setError(gl.INVALID_ENUM);
      return;
    }

    const texture = this._getTexImage(target);
    if (!texture) {
      this.setError(gl.INVALID_OPERATION);
      return;
    }

    texture._internalFormat = internalFormat;

    NativeWebGLRenderingContext.prototype.texStorage3D.call(this, target, levels, internalFormat, width, height, depth);
  }

  texSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, pixels) {
    if (typeof pixels !== 'object') {
      throw new TypeError('texSubImage3D(GLenum, GLint, GLint, GLint, GLint, GLint, GLenum, GLenum, Uint8Array)');
    }

    target |= 0;
    level |= 0;
    xoffset |= 0;
    yoffset |= 0;
    zoffset |= 0;
    width |= 0;
    height |= 0;
    depth |= 0;
    format |= 0;
    type |= 0;

    const texture = this._getTexImage(target);
    if (!texture) {
      this.setError(gl.INVALID_OPERATION);
      return;
    }

    if (!texture._internalFormat) {
      this.setError(gl.INVALID_OPERATION);
      return;
    }

    const ps = pixelSize(texture._internalFormat, type);
    if (ps === 0) {
      return;
    }

    if (!this._checkDimensions(target, width, height, level)) {
      return;
    }

    if (xoffset < 0 || yoffset < 0 || zoffset < 0) {
      this.setError(gl.INVALID_VALUE);
      return;
    }

    const data = convertPixels(pixels);
    const rowStride = this._computeRowStride(width, ps);
    const imageSize = rowStride * height * depth;

    if (!data || data.length < imageSize) {
      this.setError(gl.INVALID_OPERATION);
      return;
    }

    super.texSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, data);
  }

  renderbufferStorageMultisample(target, samples, internalFormat, width, height) {
    target |= 0;
    samples |= 0;
    internalFormat |= 0;
    width |= 0;
    height |= 0;

    if (target !== gl.RENDERBUFFER) {
      this.setError(gl.INVALID_ENUM);
      return;
    }

    const renderbuffer = this._activeRenderbuffer;
    if (!renderbuffer) {
      this.setError(gl.INVALID_OPERATION);
      return;
    }

    if (!(
      internalFormat === gl.R8UI ||
      internalFormat === gl.R8I ||
      internalFormat === gl.R16UI ||
      internalFormat === gl.R16I ||
      internalFormat === gl.R32UI ||
      internalFormat === gl.R32I ||
      internalFormat === gl.RG8 ||
      internalFormat === gl.RG8UI ||
      internalFormat === gl.RG8I ||
      internalFormat === gl.RG16UI ||
      internalFormat === gl.RG16I ||
      internalFormat === gl.RG32UI ||
      internalFormat === gl.RG32I ||
      internalFormat === gl.RGB8 ||
      internalFormat === gl.RGBA8 ||
      internalFormat === gl.SRGB8_ALPHA8 ||
      internalFormat === gl.RGBA4 ||
      internalFormat === gl.RGB565 ||
      internalFormat === gl.RGB5_A1 ||
      internalFormat === gl.RGB10_A2 ||
      internalFormat === gl.RGBA8UI ||
      internalFormat === gl.RGBA8I ||
      internalFormat === gl.RGB10_A2UI ||
      internalFormat === gl.RGBA16UI ||
      internalFormat === gl.RGBA16I ||
      internalFormat === gl.RGBA32I ||
      internalFormat === gl.RGBA32UI ||
      internalFormat === gl.DEPTH_COMPONENT16 ||
      internalFormat === gl.DEPTH_COMPONENT24 ||
      internalFormat === gl.DEPTH_COMPONENT32F ||
      internalFormat === gl.DEPTH_STENCIL ||
      internalFormat === gl.DEPTH24_STENCIL8 ||
      internalFormat === gl.DEPTH32F_STENCIL8 ||
      internalFormat === gl.STENCIL_INDEX8 ||
      (
        this._extensions.ext_color_buffer_float && (
          internalFormat === gl.R16F ||
          internalFormat === gl.RG16F ||
          internalFormat === gl.RGBA16F ||
          internalFormat === gl.R32F ||
          internalFormat === gl.RG32F ||
          internalFormat === gl.RGBA32F ||
          internalFormat === gl.R11F_G11F_B10F
        )
      )
    )) {
      this.setError(gl.INVALID_ENUM);
      return;
    }

    this._saveError();
    NativeWebGLRenderingContext.prototype.renderbufferStorageMultisample.call(
      this,
      target,
      samples,
      internalFormat,
      width,
      height
    );
    const error = this.getError();
    this._restoreError(error);
    if (error !== gl.NO_ERROR) {
      return;
    }

    renderbuffer._width = width;
    renderbuffer._height = height;
    renderbuffer._format = internalFormat;

    this._updateActiveFramebuffer(renderbuffer);
  }

  drawBuffers(buffers) {
    if (!Array.isArray(buffers)) {
      this.setError(gl.INVALID_VALUE);
      return;
    }

    if (buffers.length === 0) {
      this.setError(gl.INVALID_ENUM);
      return;
    }

    if (!this._checkStencilState()) {
      return;
    }

    const backIndex = buffers.indexOf(gl.BACK);
    if (backIndex >= 0) {
      buffers.splice(backIndex, 1);
      if (buffers.length === 0) {
        buffers.push(gl.NONE);
      }
    }

    NativeWebGLRenderingContext.prototype.drawBuffers.call(this, buffers);
  }

  blitFramebuffer(srcX0, srcY0, srcX1, srcY1, dstX0, dstY0, dstX1, dstY1, mask, filter) {
    if (!this._checkStencilState()) {
      return;
    }
    NativeWebGLRenderingContext.prototype.blitFramebuffer.call(
      this,
      srcX0,
      srcY0,
      srcX1,
      srcY1,
      dstX0,
      dstY0,
      dstX1,
      dstY1,
      mask,
      filter
    );
  }

  vertexAttribDivisor(index, divisor) {
    index |= 0;
    divisor |= 0;
    if (divisor < 0 || index < 0 || index >= this._vertexObjectState._attribs.length) {
      this.setError(gl.INVALID_VALUE);
      return;
    }
    const attrib = this._vertexObjectState._attribs[index];
    attrib._divisor = divisor;
    super._vertexAttribDivisor(index, divisor);
  }

  drawArraysInstanced(mode, first, count, primCount) {
    mode |= 0;
    first |= 0;
    count |= 0;
    primCount |= 0;
    if (first < 0 || count < 0 || primCount < 0) {
      this.setError(gl.INVALID_VALUE);
      return;
    }
    if (!this._checkStencilState()) {
      return;
    }
    const reducedCount = vertexCount(mode, count);
    if (reducedCount < 0) {
      this.setError(gl.INVALID_ENUM);
      return;
    }
    if (!this._framebufferOk()) {
      return;
    }
    if (count === 0 || primCount === 0) {
      return;
    }

    return super._drawArraysInstanced(mode, first, reducedCount, primCount);
  }

  drawElementsInstanced(mode, count, type, ioffset, primCount) {
    mode |= 0;
    count |= 0;
    type |= 0;
    ioffset |= 0;
    primCount |= 0;

    if (count < 0 || ioffset < 0 || primCount < 0) {
      this.setError(gl.INVALID_VALUE);
      return;
    }

    if (!this._checkStencilState()) {
      return;
    }

    const elementBuffer = this._vertexObjectState._elementArrayBufferBinding;
    if (!elementBuffer) {
      this.setError(gl.INVALID_OPERATION);
      return;
    }

    let reducedCount = count;
    switch (mode) {
      case gl.TRIANGLES:
        if (count % 3) {
          reducedCount -= count % 3;
        }
        break;
      case gl.LINES:
        if (count % 2) {
          reducedCount -= count % 2;
        }
        break;
      case gl.POINTS:
        break;
      case gl.LINE_LOOP:
      case gl.LINE_STRIP:
        if (count < 2) {
          this.setError(gl.INVALID_OPERATION);
          return;
        }
        break;
      case gl.TRIANGLE_FAN:
      case gl.TRIANGLE_STRIP:
        if (count < 3) {
          this.setError(gl.INVALID_OPERATION);
          return;
        }
        break;
      default:
        this.setError(gl.INVALID_ENUM);
        return;
    }

    if (!this._framebufferOk()) {
      return;
    }

    if (count === 0 || primCount === 0) {
      return;
    }

    if (reducedCount > 0) {
      super._drawElementsInstanced(mode, reducedCount, type, ioffset, primCount);
    }
  }

  vertexAttribIPointer(index, size, type, stride, offset) {
    if (stride < 0 || offset < 0) {
      this.setError(gl.INVALID_VALUE);
      return;
    }

    index |= 0;
    size |= 0;
    type |= 0;
    stride |= 0;
    offset |= 0;

    if (
      stride < 0 ||
      offset < 0 ||
      index < 0 ||
      index >= this._vertexObjectState._attribs.length ||
      !(size === 1 || size === 2 || size === 3 || size === 4)
    ) {
      this.setError(gl.INVALID_VALUE);
      return;
    }

    if (this._vertexGlobalState._arrayBufferBinding === null) {
      this.setError(gl.INVALID_OPERATION);
      return;
    }

    // fixed, int and unsigned int aren't allowed in WebGL
    const byteSize = typeSize(type);
    if (
      byteSize === 0 ||
      (type !== gl.INT &&
        type !== gl.UNSIGNED_INT &&
        type !== gl.UNSIGNED_BYTE &&
        type !== gl.SHORT &&
        type !== gl.UNSIGNED_SHORT)
    ) {
      this.setError(gl.INVALID_ENUM);
      return;
    }

    if (stride > 255 || stride < 0) {
      this.setError(gl.INVALID_VALUE);
      return;
    }

    // stride and offset must be multiples of size
    if (stride % byteSize !== 0 || offset % byteSize !== 0) {
      this.setError(gl.INVALID_OPERATION);
      return;
    }

    // Call vertex attrib pointer
    super.vertexAttribIPointer(index, size, type, stride, offset);

    // Update the vertex state object and references.
    this._vertexObjectState.setVertexAttribIPointer(
      /* buffer */ this._vertexGlobalState._arrayBufferBinding,
      /* index */ index,
      /* pointerSize */ size * byteSize,
      /* pointerOffset */ offset,
      /* pointerStride */ stride || size * byteSize,
      /* pointerType */ type,
      /* inputStride */ stride,
      /* inputSize */ size
    );
  }

  readBuffer(source) {
    super.readBuffer(source);
  }
}

global.WebGL2RenderingContext = WebGL2RenderingContext;

module.exports = { WebGL2RenderingContext };
