precision mediump float;

uniform sampler2D uBuffer;
varying vec2 vTexcoord;

void main () {
  vec4 color = texture2D(uBuffer, vTexcoord);

  gl_FragColor = color;
}