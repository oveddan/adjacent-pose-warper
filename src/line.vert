precision mediump float;

attribute vec2 position;
attribute vec2 texcoord;
varying vec2 uv;
void main () {
  uv = texcoord;
  gl_Position = position;
}