#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D uPoses;
uniform sampler2D uImage;
uniform sampler2D uNormals;
uniform float uTime;
varying vec2 vTexcoord;
varying vec2 vPosition;

#define PI 3.14

vec4 mod289(vec4 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x)
{
  return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec2 fade(vec2 t) {
  return t*t*t*(t*(t*6.0-15.0)+10.0);
}

// Classic Perlin noise
float cnoise(vec2 P)
{
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod289(Pi); // To avoid truncation effects in permutation
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;

  vec4 i = permute(permute(ix) + iy);

  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0 ;
  vec4 gy = abs(gx) - 0.5 ;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;

  vec2 g00 = vec2(gx.x,gy.x);
  vec2 g10 = vec2(gx.y,gy.y);
  vec2 g01 = vec2(gx.z,gy.z);
  vec2 g11 = vec2(gx.w,gy.w);

  vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x;
  g01 *= norm.y;
  g10 *= norm.z;
  g11 *= norm.w;

  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));

  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
  return 2.3 * n_xy;
}

// float specularStrength = 0.5;
// vec3 viewPos = vec3(0., 0., 10.);
// vec3 lightDir = vec3(0., 0., -1.);

// float getSpecular(vec3 norm) {
//   vec3 viewDir = normalize(viewPos - vec3(vPosition.x, vPosition.y, 0.));
//   vec3 reflectDir = reflect(-lightDir, norm); 
//   float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.);
//   return specularStrength * spec;
// }

float getPoseStrength(vec2 position) {
  float s = texture2D(uPoses, position)[0];

  return pow(s, .3);
}

vec3 si = vec3(1.);
vec3 lightPosition = vec3(0., -2., 10.);

float p = 2.;

vec3 specularShading(vec3 color, vec3 position, vec3 normal) {
  vec3 lightDirection = normalize(lightPosition - position);
  vec3 viewDirection = normalize(vec3(0.) - position);
  vec3 h = normalize(viewDirection + lightDirection);

  return si * color * pow(max(0., dot(normal, h)), p);
}

vec3 getNormal(vec2 position) {
  return texture2D(uNormals, position).xyz;
}

void main () {
  float n = abs(cnoise(vTexcoord + sin(uTime / 10.)));
  float pose = getPoseStrength(vTexcoord);

  float cursorStrength = pose;
  vec2 warpedPosition = vTexcoord + n * cursorStrength;
  vec4 imagePixels = texture2D(uImage, vTexcoord);
  // imagePixels *= step(pose, .7);

  // vec4 color = vec4(pose, 0., 0., 1.);
  // vec4 color = texture2D(uImage, warpedPosition);
  vec3 color = texture2D(uImage, warpedPosition).xyz;

  vec3 normal = getNormal(vTexcoord);

  vec3 position = vec3((vTexcoord.x - .5) * 2., (vTexcoord.y - .5) * 2., pose * 2.);

  vec3 specular = specularShading(color, position, normal);
  vec3 lightDirection = normalize(lightPosition - position);
  vec3 viewDirection = normalize(vec3(0., 0., 10.) - position);

  color = (specular + color * .8) * pose; 

  // color = texture2D(uNormals, vTexcoord).xyz;
  // color = viewDirection;

  // color *= specular;
  // color = vec4(normal.x, normal.y, normal.z, 1.);
  // color = vec4(specular, 0., 0., 1.);

  // color = imagePixels;
  // color = vec4(n, 0., 0., 1.);
  // color = vec3(pose, 0., 0.);
  // color = vec3(vPosition.x, vPosition.y, 0.);
  gl_FragColor = vec4(color, 1.);
}