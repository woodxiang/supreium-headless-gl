const { gl } = require('./native-gl');
const { unpackTypedArray, isTypedArray } = require('./utils');

const formatTable = new Map([
  [
    gl.RGB,
    {
      format: gl.RGB,
      types: [
        [gl.UNSIGNED_BYTE, 3],
        [gl.UNSIGNED_SHORT_5_6_5, 2],
      ],
    },
  ],
  [
    gl.RGBA,
    {
      format: gl.RGBA,
      types: [
        [gl.UNSIGNED_BYTE, 4],
        [gl.UNSIGNED_SHORT_4_4_4_4, 2],
        [gl.UNSIGNED_SHORT_5_5_5_1, 2],
      ],
    },
  ],
  [
    gl.LUMINANCE_ALPHA,
    {
      format: gl.LUMINANCE_ALPHA,
      types: [[gl.UNSIGNED_BYTE, 2]],
    },
  ],
  [
    gl.LUMINANCE,
    {
      format: gl.LUMINANCE,
      types: [[gl.UNSIGNED_BYTE, 1]],
    },
  ],
  [
    gl.ALPHA,
    {
      format: gl.ALPHA,
      types: [[gl.UNSIGNED_BYTE, 1]],
    },
  ],
  [
    gl.R8,
    {
      format: gl.RED,
      types: [[gl.UNSIGNED_BYTE, 1]],
    },
  ],
  [
    gl.R8_SNORM,
    {
      format: gl.RED,
      types: [[gl.BYTE, 1]],
    },
  ],
  [
    gl.R16F,
    {
      format: gl.RED,
      types: [
        [gl.HALF_FLOAT, 2],
        [gl.FLOAT, 2],
      ],
    },
  ],
  [
    gl.R32F,
    {
      format: gl.RED,
      types: [[gl.FLOAT, 4]],
    },
  ],
  [
    gl.R8UI,
    {
      format: gl.RED_INTEGER,
      types: [[gl.UNSIGNED_BYTE, 1]],
    },
  ],
  [
    gl.R8I,
    {
      format: gl.RED_INTEGER,
      types: [[gl.BYTE, 1]],
    },
  ],
  [
    gl.R16UI,
    {
      format: gl.RED_INTEGER,
      types: [[gl.UNSIGNED_SHORT, 2]],
    },
  ],
  [
    gl.R16I,
    {
      format: gl.RED_INTEGER,
      types: [[gl.SHORT, 2]],
    },
  ],
  [
    gl.R32UI,
    {
      format: gl.RED_INTEGER,
      types: [[gl.UNSIGNED_INT, 4]],
    },
  ],
  [
    gl.R32I,
    {
      format: gl.RED_INTEGER,
      types: [[gl.INT, 4]],
    },
  ],
  [
    gl.RG8,
    {
      format: gl.RG,
      types: [[gl.UNSIGNED_BYTE, 2]],
    },
  ],
  [
    gl.RG8_SNORM,
    {
      format: gl.RG,
      types: [[gl.BYTE, 2]],
    },
  ],
  [
    gl.RG16F,
    {
      format: gl.RG,
      types: [
        [gl.HALF_FLOAT, 4],
        [gl.FLOAT, 4],
      ],
    },
  ],
  [
    gl.RG32F,
    {
      format: gl.RG,
      types: [[gl.FLOAT, 8]],
    },
  ],
  [
    gl.RG8UI,
    {
      format: gl.RG,
      types: [[gl.UNSIGNED_BYTE, 2]],
    },
  ],
  [
    gl.RG8I,
    {
      format: gl.RG,
      types: [[gl.BYTE, 2]],
    },
  ],
  [
    gl.RG16UI,
    {
      format: gl.RG,
      types: [[gl.UNSIGNED_SHORT, 4]],
    },
  ],
  [
    gl.RG16I,
    {
      format: gl.RG,
      types: [[gl.SHORT, 4]],
    },
  ],
  [
    gl.RG32UI,
    {
      format: gl.RG,
      types: [[gl.UNSIGNED_INT, 8]],
    },
  ],
  [
    gl.RG32I,
    {
      format: gl.RG,
      types: [[gl.INT, 8]],
    },
  ],
  [
    gl.RGB8,
    {
      format: gl.RGB,
      types: [[gl.UNSIGNED_BYTE, 3]],
    },
  ],
  [
    gl.SRGB8,
    {
      format: gl.RGB,
      types: [[gl.UNSIGNED_BYTE, 3]],
    },
  ],
  [
    gl.RGB565,
    {
      format: gl.RGB,
      types: [
        [gl.UNSIGNED_BYTE, 3],
        [gl.UNSIGNED_SHORT_5_6_5, 2],
      ],
    },
  ],
  [
    gl.RGB8_SNORM,
    {
      format: gl.RGB,
      types: [[gl.BYTE, 3]],
    },
  ],
  [
    gl.R11F_G11F_B10F,
    {
      format: gl.RGB,
      types: [
        [gl.UNSIGNED_INT_10F_11F_11F_REV, 4],
        [gl.HALF_FLOAT, 4],
        [gl.FLOAT, 4],
      ],
    },
  ],
  [
    gl.RGB9_E5,
    {
      format: gl.RGB,
      types: [
        [gl.HALF_FLOAT, 4],
        [gl.FLOAT, 4],
      ],
    },
  ],
  [
    gl.RGB16F,
    {
      format: gl.RGB,
      types: [
        [gl.HALF_FLOAT, 6],
        [gl.FLOAT, 6],
      ],
    },
  ],
  [
    gl.RGB32F,
    {
      format: gl.RGB,
      types: [[gl.FLOAT, 12]],
    },
  ],
  [
    gl.RGB8UI,
    {
      format: gl.RGB_INTEGER,
      types: [[gl.UNSIGNED_BYTE, 3]],
    },
  ],
  [
    gl.RGB8I,
    {
      format: gl.RGB_INTEGER,
      types: [[gl.BYTE, 3]],
    },
  ],
  [
    gl.RGB16UI,
    {
      format: gl.RGB_INTEGER,
      types: [[gl.UNSIGNED_SHORT, 6]],
    },
  ],
  [
    gl.RGB16I,
    {
      format: gl.RGB_INTEGER,
      types: [[gl.SHORT, 6]],
    },
  ],
  [
    gl.RGB32UI,
    {
      format: gl.RGB_INTEGER,
      types: [[gl.UNSIGNED_INT, 12]],
    },
  ],
  [
    gl.RGB32I,
    {
      format: gl.RGB_INTEGER,
      types: [[gl.INT, 12]],
    },
  ],
  [
    gl.RGBA8,
    {
      format: gl.RGBA,
      types: [[gl.UNSIGNED_BYTE, 4]],
    },
  ],
  [
    gl.SRGB8_ALPHA8,
    {
      format: gl.RGBA,
      types: [[gl.UNSIGNED_BYTE, 4]],
    },
  ],
  [
    gl.RGBA8_SNORM,
    {
      format: gl.RGBA,
      types: [[gl.BYTE, 4]],
    },
  ],
  [
    gl.RGB5_A1,
    {
      format: gl.RGBA,
      types: [
        [gl.UNSIGNED_BYTE, 2],
        [gl.UNSIGNED_SHORT_5_5_5_1, 2],
      ],
    },
  ],
  [
    gl.RGBA4,
    {
      format: gl.RGBA,
      types: [
        [gl.UNSIGNED_BYTE, 2],
        [gl.UNSIGNED_SHORT_4_4_4_4, 2],
      ],
    },
  ],
  [
    gl.RGB10_A2,
    {
      format: gl.RGBA,
      types: [[gl.UNSIGNED_INT_2_10_10_10_REV, 4]],
    },
  ],
  [
    gl.RGBA16F,
    {
      format: gl.RGBA,
      types: [
        [gl.HALF_FLOAT, 8],
        [gl.FLOAT, 8],
      ],
    },
  ],
  [
    gl.RGBA32F,
    {
      format: gl.RGBA,
      types: [[gl.FLOAT, 16]],
    },
  ],
  [
    gl.RGBA8UI,
    {
      format: gl.RGBA_INTEGER,
      types: [[gl.UNSIGNED_BYTE, 4]],
    },
  ],
  [
    gl.RGBA8I,
    {
      format: gl.RGBA_INTEGER,
      types: [[gl.BYTE, 4]],
    },
  ],
  [
    gl.RGB10_A2UI,
    {
      format: gl.RGBA_INTEGER,
      types: [[gl.UNSIGNED_INT_2_10_10_10_REV, 4]],
    }
  ],
  [
    gl.RGBA16UI,
    {
      format: gl.RGBA_INTEGER,
      types: [[gl.UNSIGNED_SHORT, 8]],
    },
  ],
  [
    gl.RGBA16I,
    {
      format: gl.RGBA_INTEGER,
      types: [[gl.SHORT, 8]],
    },
  ],
  [
    gl.RGBA32I,
    {
      format: gl.RGBA_INTEGER,
      types: [[gl.INT, 16]],
    },
  ],
  [
    gl.RGBA32UI,
    {
      format: gl.RGBA_INTEGER,
      types: [[gl.UNSIGNED_INT, 16]],
    },
  ],
]);

function verifyFormat(internalFormat, format, type) {
  const f = formatTable.get(internalFormat);
  if (f) {
    if (f.format !== format) {
      return false;
    }
    if (f.types) {
      return f.types.find((v) => v[0] === type) !== undefined;
    }
  }

  return false;
}

function pixelSize(internalFormat, type) {
  const f = formatTable.get(internalFormat);
  if (f?.types) {
    const item = f.types.find((v) => v[0] === type);
    if (item) {
      return item[1];
    }
  }

  return 0;
}

function convertPixels(pixels) {
  if (typeof pixels === 'object' && pixels !== null) {
    if (pixels instanceof ArrayBuffer) {
      return new Uint8Array(pixels);
    } else if (
      ArrayBuffer.isView(pixels)
    ) {
      return unpackTypedArray(pixels);
    } else if (pixels instanceof Buffer) {
      return new Uint8Array(pixels);
    }
  }
  return null;
}

module.exports = { verifyFormat, pixelSize, convertPixels };
