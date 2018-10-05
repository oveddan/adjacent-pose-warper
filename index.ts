import { isMobile, loadVideo } from './src/camera'
import * as posenet from '@tensorflow-models/posenet'
import fakePoses from './src/fakePoses';
import { renderPosesOnCanvas, getCenterXPose, renderKeypointsOnCanvas, lerpKeypoints } from './src/util'
import REGL from 'regl' 

import images from './images';

interface NormalUniforms {
  uPoses: REGL.Texture2D;
  screenShape: REGL.Vec2;
}

interface WarpImageUniforms {
  uPoses: REGL.Texture2D;
  uNormals: REGL.Texture2D;
  uImage: REGL.Texture2D;
  uTime: number;
  screenShape: REGL.Vec2;
}

interface DrawAttributes {
  position: number[];
}

function createPoseCanvas(width: number, height: number): HTMLCanvasElement {
  const posesCanvas = document.createElement('canvas');
  posesCanvas.setAttribute('style', 'display: none');
  posesCanvas.width = width;
  posesCanvas.height = height;

  document.body.appendChild(posesCanvas);

  return posesCanvas;
}

function loadImageTexture(reglInstance: REGL.Regl, src: string): Promise<REGL.Texture2D> {
  return new Promise<REGL.Texture2D>((resolve, reject) => {
    const image = new Image();
    image.src = src
    image.onload = function () {
      const imageTexture = reglInstance.texture({
        wrap: "mirror",
        min: 'linear mipmap linear',
        mag: 'nearest',
        data: image 
      });
      // imageTexture(image);
      resolve(imageTexture);
    }
    image.onerror = function(e: ErrorEvent) { 
      reject(e);
    }
  })
}

function getQueryStringValue(name) {
  const url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
      results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function getImagePath() {
  const imageName = getQueryStringValue('image') || 'wood.jpg';
  return images[imageName];
}

const planeAttributes: number[] = [
  -2, 0,
  0, -2,
  2, 2
]

const minKeypointConfidence = 0.2;

function getKeypointToUse(lastKeypoint: posenet.Keypoint, currentKeypoint: posenet.Keypoint, minKeypointConfidence: number): posenet.Keypoint {
  if (!lastKeypoint) return currentKeypoint;

  if (currentKeypoint.score >= minKeypointConfidence)
    return currentKeypoint;

  return lastKeypoint;
}

const RADIUS = 512;
const INITIAL_CONDITIONS = (Array(RADIUS * RADIUS * 4)).fill(0).map(
  () => Math.random() > 0.9 ? 255 : 0)


const posesCanvasWidth = 300;
const posesCanvasHeight = posesCanvasWidth;

async function detectPoseInRealTime(video: HTMLVideoElement, net: posenet.PoseNet) {
  const regl = REGL();

  const canvas = document.getElementsByTagName('canvas')[0]

  const offScreenPosesCanvas = createPoseCanvas(RADIUS, RADIUS);
  const posesTexture = regl.texture(offScreenPosesCanvas);

  const normalFrameBuffer = regl.framebuffer({
    color: regl.texture({
      radius: RADIUS,
      data: INITIAL_CONDITIONS
    }),
    depthStencil: false
  });

  const normalTexture = regl.texture(offScreenPosesCanvas);

  setStatusText('loading the image...');
  const imageTexture = await loadImageTexture(regl, getImagePath());

  const normalShader = regl<NormalUniforms, DrawAttributes>({
    frag: require('./src/drawNormals.frag'),
    vert: require('./src/fullPlane.vert'),
    attributes: {
      position: planeAttributes
    },
    uniforms: {
      uPoses: posesTexture,
      screenShape: ({viewportWidth, viewportHeight}) =>
        [viewportWidth, viewportHeight]
    },
    framebuffer: normalFrameBuffer,
    count: 3
  });

  const renderShader = regl<WarpImageUniforms, DrawAttributes>({
    frag: require('./src/drawPoses.frag'),
    vert: require('./src/fullPlane.vert'),
    attributes: {
      position: planeAttributes
    },
    uniforms: {
      uPoses: posesTexture,
      uImage: imageTexture,
      uNormals: normalTexture,
      screenShape: ({viewportWidth, viewportHeight}) =>
        [viewportWidth, viewportHeight],
  
      uTime: regl.context('time')
    },
    count: 3
  });

  let lerpedKeypoints: posenet.Keypoint[];
  let currentKeypoints: posenet.Keypoint[];
  const lerpSpeed = 0.2;
  const maxChange = 20;

  // do in loop
  async function estimatePosesAndWriteToTexture() {
    const poses = await net.estimateMultiplePoses(video, 0.3, false, 16, 1);

    const centerPose = getCenterXPose(poses);

    if (centerPose) {
      // lastKeypoints = storeLastKeypoints(lerpedKeypoints, currentKeypoints, minKeypointConfidence);
      // lastKeypointTime = new Date().getTime();
      currentKeypoints = centerPose.keypoints;
    }

    // start over
    requestAnimationFrame(estimatePosesAndWriteToTexture);
  }

  hideStatusText();
  estimatePosesAndWriteToTexture();

  regl.frame(() => {
    if (currentKeypoints) {
      lerpedKeypoints = lerpKeypoints(lerpedKeypoints, currentKeypoints, lerpSpeed, maxChange);

      const scale: [number, number] = [offScreenPosesCanvas.height / video.height, offScreenPosesCanvas.width / video.width ];
      renderKeypointsOnCanvas(lerpedKeypoints, offScreenPosesCanvas, scale);
      posesTexture({
        min: 'linear mipmap nearest',
        mag: 'linear',
        data: offScreenPosesCanvas
      });

      normalShader(() => {
        regl.draw();
        normalTexture({
          copy: true,
          min: 'mipmap',
          mag: 'linear',
        });
      });
    }
 
    renderShader();
  });
}

function setStatusText(text) {
  const status = document.getElementById('info');
  status.innerHTML = text;
  status.style.display = 'block';
}

function hideStatusText() {
  document.getElementById('info').style.display = 'none';
}

async function bindPage() {
  const mobileNetArchitecture = 0.50;
  setStatusText('loading PoseNet...');
  const net = await posenet.load(mobileNetArchitecture);

  document.getElementById('main').style.display = 'block';

  let video: HTMLVideoElement;

  try {
    setStatusText('opening the webcam...');
    video = await loadVideo();
  } catch (e) {
    let info = document.getElementById('info');
    setStatusText('this browser does not support video capture,' +
        'or this device does not have a camera');
    throw e;
  }

  detectPoseInRealTime(video, net);
}

// kick off the demo
bindPage();