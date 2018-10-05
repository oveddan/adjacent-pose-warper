#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D uPoses;
uniform sampler2D uImage;
uniform float uTime;
varying vec2 vTexcoord;
varying vec2 vPosition;

#define PI 3.14

float getPoseStrength(vec2 position) {
  float s = texture2D(uPoses, position)[0];

  return pow(s, .1);
}

float normDist = 0.03;
vec3 getNormal(vec2 position) {
  float right = getPoseStrength(position + vec2(normDist, 0.));
  float left = getPoseStrength(position - vec2(normDist, 0.)); 
  float top = getPoseStrength(position + vec2(0., normDist)); 
  float bottom = getPoseStrength(position - vec2(0., normDist)); 

  return normalize(vec3((right-left)/(normDist*2.), (top-bottom)/(normDist*2.), 0.));
}

void main () {
  // flip position because for some reason it is flipped when comes out of frame buffer
  vec2 flippedPosition = vec2(1.-vTexcoord.x, 1.- vTexcoord.y);

  vec3 normal = getNormal(flippedPosition);

  gl_FragColor = vec4(normal, 1.);
}