precision mediump float;

uniform sampler2D uVideo;
uniform sampler2D uPoses;
uniform vec2 screenShape;
uniform float time;
varying vec2 vTexcoord;
varying vec2 uv;

void main () {
  vec4 color = texture2D(uVideo, vTexcoord);
  vec4 posesStrength = texture2D(uPoses, vTexcoord);

  color *= step(0.5, posesStrength.a);


// color = vec4(posesStrength.a);
  // // color = vec4(poseStrength);
  // color = posesStrength;

  // color = vec4(0.,uv.y, 0., 1.);

  gl_FragColor = color;
}