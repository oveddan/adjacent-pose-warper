
precision mediump float;

attribute vec2 position;
varying vec2 vTexcoord;
varying vec2 vPosition;
varying vec2 uv;

void main () {
  vTexcoord = position;
  uv = (2. - vTexcoord) / 2.;
  vPosition = vec4(1.0 - 2.0 * position, 0, 1).xy;
  gl_Position = vec4(1.0 - 2.0 * position, 0, 1);
}