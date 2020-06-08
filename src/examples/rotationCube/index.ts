
import {
  createShader, createProgram, resize, loadTexture,
} from '@/utils/';
import { mat4 } from 'gl-matrix';
import huaji from '@/assets/huaji.png';
import { vetexShaderSource, fragmentShaderSource } from './source';
// import { GUI } from 'dat.gui'

type ProgramInfo = {
  program: WebGLProgram;
  attribLocations: {
    vertexPosition: number;
    textureCoord: number;
  };
  uniformLocations: {
    projectionMatrix: WebGLUniformLocation;
    modelViewMatrix: WebGLUniformLocation;
    uSampler: WebGLUniformLocation;
  };
}

type buffersInfo = {
  position: WebGLBuffer;
  color: WebGLBuffer;
  textureCoord: WebGLBuffer;
  indices: WebGLBuffer;
}


const initBuffer = (gl: WebGLRenderingContext) => {
  const pList = [
    [-1.0, -1.0, 1.0],
    [1.0, -1.0, 1.0],
    [1.0, 1.0, 1.0],
    [-1.0, 1.0, 1.0],
    [-1.0, -1.0, -1.0],
    [-1.0, 1.0, -1.0],
    [1.0, 1.0, -1.0],
    [1.0, -1.0, -1.0],
  ];
  const position = [
    // frontFace
    ...pList[0],
    ...pList[1],
    ...pList[2],
    ...pList[3],

    // backFace
    ...pList[5],
    ...pList[6],
    ...pList[7],
    ...pList[4],

    // topFace
    ...pList[3],
    ...pList[2],
    ...pList[6],
    ...pList[5],

    // bottomFace
    ...pList[4],
    ...pList[7],
    ...pList[1],
    ...pList[0],

    // rightFace
    ...pList[1],
    ...pList[7],
    ...pList[6],
    ...pList[2],

    // leftFace
    ...pList[4],
    ...pList[0],
    ...pList[3],
    ...pList[5],
  ];

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(position), gl.STATIC_DRAW);

  const faceColors = [
    [1.0, 1.0, 1.0, 1.0], // Front face: white
    [1.0, 0.0, 0.0, 1.0], // Back face: red
    [0.0, 1.0, 0.0, 1.0], // Top face: green
    [0.0, 0.0, 1.0, 1.0], // Bottom face: blue
    [1.0, 1.0, 0.0, 1.0], // Right face: yellow
    [1.0, 0.0, 1.0, 1.0], // Left face: purple
  ];

  // Convert the array of colors into a table for all the vertices.

  let colors: Array<number> = [];

  for (let j = 0; j < faceColors.length; ++j) {
    const c = faceColors[j];

    // Repeat each color four times for the four vertices of the face
    colors = colors.concat(c, c, c, c);
  }

  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  // This array defines each face as two triangles, using the
  // indices into the vertex array to specify each triangle's
  // position.

  const indices = [
    ...[0, 1, 2],
    ...[0, 2, 3], // front
    ...[5, 6, 7],
    ...[5, 7, 4], // back
    ...[8, 9, 10],
    ...[8, 10, 11], // top
    ...[13, 14, 15],
    ...[13, 15, 12], // bottom
    ...[16, 17, 18],
    ...[16, 18, 19], // right
    ...[23, 20, 21],
    ...[23, 21, 22], // left
  ];

  // Now send the element array to GL

  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW,
  );

  const textureCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
  const textureCoordinates = [
    // Front
    ...[0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0],
    // Back
    ...[0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0],
    // Top
    ...[0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0],
    // Bottom
    ...[0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0],
    // Right
    ...[0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0],
    // Left
    ...[0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0],
  ];
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(textureCoordinates),
    gl.STATIC_DRAW,
  );

  return {
    position: positionBuffer,
    color: colorBuffer,
    textureCoord: textureCoordBuffer,
    indices: indexBuffer,
  };
};


let cubeRotation = 0.0;
const drawScene = (
  gl: WebGLRenderingContext,
  programInfo: ProgramInfo,
  buffers: buffersInfo,
  deltaTime: number,
  texture: WebGLTexture,
) => {
  resize(gl);

  const canvas = <HTMLCanvasElement>gl.canvas;

  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
  gl.clearDepth(1.0); // Clear everything
  gl.enable(gl.DEPTH_TEST); // Enable depth testing
  gl.depthFunc(gl.LEQUAL); // Near things obscure far things

  // gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  // gl.enable(gl.BLEND);

  // Clear the canvas before we start drawing on it.

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const fieldOfView = (45 * Math.PI) / 180; // in radians
  const aspect = canvas.clientWidth / canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();

  mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  const modelViewMatrix = mat4.create();

  cubeRotation += deltaTime;
  mat4.translate(
    modelViewMatrix, // destination matrix
    modelViewMatrix, // matrix to translate
    [-0.0, 0.0, -6.0],
  ); // amount to translate
  mat4.rotate(
    modelViewMatrix, // destination matrix
    modelViewMatrix, // matrix to rotate
    cubeRotation, // amount to rotate in radians
    [0, 0, 1],
  ); // axis to rotate around (Z)
  mat4.rotate(
    modelViewMatrix, // destination matrix
    modelViewMatrix, // matrix to rotate
    cubeRotation, // amount to rotate in radians
    [0, 1, 0],
  ); // axis to rotate around (X)

  {
    const numComponents = 3; // pull out 2 values per iteration
    const type = gl.FLOAT; // the data in the buffer is 32bit floats
    const normalize = false; // don't normalize
    const stride = 0; // how many bytes to get from one set of values to the next
    // 0 = use type and numComponents above
    const offset = 0; // how many bytes inside the buffer to start from
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      numComponents,
      type,
      normalize,
      stride,
      offset,
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  }

  // tell webgl how to pull out the texture coordinates from buffer
  {
    const num = 2; // every coordinate composed of 2 values
    const type = gl.FLOAT; // the data in the buffer is 32 bit float
    const normalize = false; // don't normalize
    const stride = 0; // how many bytes to get from one set to the next
    const offset = 0; // how many bytes inside the buffer to start from
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
    gl.vertexAttribPointer(
      programInfo.attribLocations.textureCoord,
      num,
      type,
      normalize,
      stride,
      offset,
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
  }

  gl.useProgram(programInfo.program);

  // Set the shader uniforms
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.projectionMatrix,
    false,
    projectionMatrix,
  );
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.modelViewMatrix,
    false,
    modelViewMatrix,
  );

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

  // Tell WebGL we want to affect texture unit 0
  gl.activeTexture(gl.TEXTURE0);

  // Bind the texture to texture unit 0
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Tell the shader we bound the texture to texture unit 0
  gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

  {
    const vertexCount = 6 * 6;
    const type = gl.UNSIGNED_SHORT;
    const offset = 0;
    gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
  }
};

const render = async (canvas: HTMLCanvasElement, autoRotate: boolean = true) => {
  const gl = canvas.getContext('webgl');

  const vetexShader = createShader(gl, gl.VERTEX_SHADER, vetexShaderSource);
  const fragmentShader = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource,
  );

  const program = createProgram(gl, vetexShader, fragmentShader);

  const programInfo: ProgramInfo = {
    program,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(program, 'aVertexPosition'),
      // vertexColor: gl.getAttribLocation(program, "aVertexColor")
      textureCoord: gl.getAttribLocation(program, 'aTextureCoord'),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(program, 'uProjectionMatrix'),
      modelViewMatrix: gl.getUniformLocation(program, 'uModelViewMatrix'),
      uSampler: gl.getUniformLocation(program, 'uSampler'),
    },
  };

  const buffers = initBuffer(gl);

  // const url = 'https://cn.bing.com/th?id=OHR.LionSurfing_ZH-CN7369892268_UHD.jpg&pid=hp&w=3840&h=2160&rs=1&c=4&r=0';
  // const url = 'https://www.baidu.com/img/flexible/logo/pc/result@2.png';
  const texture = await loadTexture(gl, huaji);

  drawScene(gl, programInfo, buffers, 0, texture);

  if (autoRotate) {
    let prev: number | null = null;
    const doRotate = (timestamp: number) => {
      if (!prev) prev = timestamp;
      const progress = (timestamp - prev) / 1000;
      prev = timestamp;
      drawScene(gl, programInfo, buffers, progress, texture);
      requestAnimationFrame(doRotate);
    };
    requestAnimationFrame(doRotate);
  }
};

const dispose = () => {
  console.log('dispose!');
};

export default { render, dispose };
