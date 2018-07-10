precision mediump float;

uniform sampler2D uFrame;
uniform sampler2D uPreviousFrame;
uniform vec2 screenShape;
uniform float time;
varying vec2 vTexcoord;

void main () {
  vec4 frame = texture2D(uFrame, vTexcoord);
  vec4 previousFrame = texture2D(uPreviousFrame, vTexcoord);

  color = mix(frame, previousFrame, 0.3);

  gl_FragColor = color;
}