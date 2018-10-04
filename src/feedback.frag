precision mediump float;

uniform sampler2D uFrame;
uniform sampler2D uPreviousFrame;
uniform vec2 uResolution;
uniform bool uFirstDraw;
uniform float time;
varying vec2 vTexcoord;

void main () {
  vec2 st = gl_FragCoord.xy / uResolution.xy;
  st = 1.0 - st;
  vec4 previousFrame = texture2D(uPreviousFrame, st);
  vec4 frame = texture2D(uFrame, st);

  float r = frame.r + previousFrame.r;
  // float g = previousFrame.r;
    // r = previousFrame.r;
  // if (uFirstDraw) {
  //   r = frame.r;
  // } else {
  //   r = previousFrame.r;
  //   r = frame.r;
  // }
 
  // r = frame.r;

  gl_FragColor = previousFrame;
  // gl_FragColor = vec4(r, 0., 0., 1.); 
}