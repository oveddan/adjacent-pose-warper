import { isMobile, loadVideo } from './src/camera'
import * as posenet from '@tensorflow-models/posenet'
import fakePoses from './src/fakePoses';
import { getCenterXPose, renderKeypointsOnCanvas, lerpKeypoints, getQueryStringValue } from './src/util'
import REGL from 'regl' 

import images from './images';

interface NormalUniforms {
  uPoses: REGL.Texture2D;
  screenShape: REGL.Vec2;
}

interface WarpImageUniforms {
  uPoses: REGL.Texture2D;
  uLastFrame: REGL.Texture2D;
  uCenterPose: REGL.Vec2;
  uTime: number;
  screenShape: REGL.Vec2;
}

interface DrawAttributes {
  position: number[];
}

function createOffScreenPoseCanvas(width: number, height: number): HTMLCanvasElement {
  const posesCanvas = document.createElement('canvas');
  posesCanvas.setAttribute('style', 'display: none');
  posesCanvas.width = width;
  posesCanvas.height = height;

  document.body.appendChild(posesCanvas);

  return posesCanvas;
}

const planeAttributes: number[] = [
  -2, 0,
  0, -2,
  2, 2
]

const lerpSpeed = 0.2;
const maxChange = 20;
const minKeypointConfidence = 0.2;

function setStatusText(text) {
  const status = document.getElementById('info');
  status.innerHTML = text;
  status.style.display = 'block';
}

function hideStatusText() {
  document.getElementById('info').style.display = 'none';
}

function getStartButton() {
  return document.getElementById('start');
}

function getStopButton() {
  return document.getElementById('stop');
}

function hide(element: HTMLElement) {
  element.style.display = 'none';
}

function show(element: HTMLElement) {
  element.style.display = 'block';
}

let video: HTMLVideoElement;

async function ensureVideoLoaded() {
  if (!video) {
    try {
      setStatusText('opening the webcam...');
      video = await loadVideo();
    } catch (e) {
      let info = document.getElementById('info');
      setStatusText('this browser does not support video capture,' +
          'or this device does not have a camera');
      throw e;
    }
  }

  return video;
}

const regl = REGL();

const posesCanvasSize = 512;
const offScreenPosesCanvas = createOffScreenPoseCanvas(posesCanvasSize, posesCanvasSize);
const posesTexture = regl.texture(offScreenPosesCanvas);

const feedbackTexture = regl.texture(offScreenPosesCanvas);

const renderShader = regl<WarpImageUniforms, DrawAttributes>({
  frag: require('./src/posesFeedback.frag'),
  vert: require('./src/fullPlane.vert'),
  attributes: {
    position: planeAttributes
  },
  uniforms: {
    uPoses: posesTexture,
    uCenterPose: regl.prop<WarpImageUniforms, "uCenterPose">("uCenterPose"),
    uLastFrame: feedbackTexture,
    screenShape: ({viewportWidth, viewportHeight}) =>
      [viewportWidth, viewportHeight],

    uTime: regl.context('time')
  },
  count: 3
});

const mobileNetArchitecture = 0.50;
const minPoseConfidence = 0.2;
const minPartConfidence = 0.1;

function renderKeypointsToTexture(keypoints: posenet.Keypoint[], texture: REGL.Texture2D) {
  const scale: [number, number] = [offScreenPosesCanvas.width / video.width, offScreenPosesCanvas.width / video.width ];
  renderKeypointsOnCanvas(keypoints, offScreenPosesCanvas, scale, minPartConfidence);
  texture({
    min: 'linear mipmap linear',
    mag: 'linear',
    data: offScreenPosesCanvas
  });

}

async function bindPage() {
  const startButton = getStartButton();
  const stopButton = getStopButton();
  setStatusText('loading PoseNet...');
  const net = await posenet.load(mobileNetArchitecture);

  show(document.getElementById('main'));

  let lerpedKeypoints: posenet.Keypoint[];
  let currentKeypoints: posenet.Keypoint[];

  let active = false;
  let animation: REGL.Cancellable;

  // have separate loop for pose estimation, so that we can maintain high fps
  async function estimatePosesInLoop() {
    const poses = await net.estimateMultiplePoses(video, 0.5, false, 16, 1);

    const centerPose = getCenterXPose(poses, minPoseConfidence, minKeypointConfidence);

    if (centerPose) {
      // lastKeypoints = storeLastKeypoints(lerpedKeypoints, currentKeypoints, minKeypointConfidence);
      // lastKeypointTime = new Date().getTime();
      currentKeypoints = centerPose.keypoints;
    }

    if (active)
      requestAnimationFrame(estimatePosesInLoop);
  }

  function animate() {
    animation = regl.frame(() => {
      if (currentKeypoints) {
        lerpedKeypoints = lerpKeypoints(lerpedKeypoints, currentKeypoints, lerpSpeed, maxChange, minKeypointConfidence);

        renderKeypointsToTexture(lerpedKeypoints, posesTexture);
      }
      renderShader();

      feedbackTexture({
        copy: true
      })
    });
  }

  async function start() {
    await ensureVideoLoaded();

    active = true;

    hideStatusText();
    estimatePosesInLoop();

    animate();

    show(stopButton);
  }

  function stop() {
    active = false;
    if (animation) {
      animation.cancel();
    }
  }

  startButton.addEventListener('click', e => {
    e.preventDefault();
    hide(startButton);
    start();
  });

  stopButton.addEventListener('click', e => {
    e.preventDefault();
    hide(stopButton);
    show(startButton);
    stop();
  })

  start();
}

// kick off the demo
bindPage();