import { isMobile, loadVideo } from './camera'
import * as posenet from '@tensorflow-models/posenet'
import { renderPosesOnCanvas } from './src/util'
import REGL from 'regl' 

interface DrawProps {
  video: REGL.Texture2D;
  posesTexture: REGL.Texture2D;
  buffer: REGL.Framebuffer;
}

interface DrawUniforms {
  uVideo: REGL.Texture2D;
  uPoses: REGL.Texture2D;
  screenShape: REGL.Vec2;
  time: number;
}

interface DrawAttributes {
  position: number[];
}

interface FeedbackProps {
  frame: REGL.Texture2D;
  previousFrame: REGL.Texture2D;
  buffer: REGL.Framebuffer;
}

interface FeedbackUniforms {
  uFrame: REGL.Texture2D,
  uPreviousFrame: REGL.Texture2D,
  time: number;
};


function createPoseCanvas(width: number, height: number): HTMLCanvasElement {
  const posesCanvas = document.createElement('canvas');
  posesCanvas.setAttribute('style', 'display: none');
  posesCanvas.width = width;
  posesCanvas.height = height;

  document.body.appendChild(posesCanvas);

  return posesCanvas;
}



function detectPoseInRealTime(video: HTMLVideoElement, net: posenet.PoseNet) {
  // const canvas = document.getElementById('output') as HTMLCanvasElement;
  // const ctx = canvas.getContext('2d');
  // since images are being fed from a webcam
  const flipHorizontal = true;

  const regl = REGL();

  const capturePosesFromVideo = regl<DrawUniforms, DrawAttributes, DrawProps>({
    frag: require('./src/posesOnVideo.frag'),
    vert: require('./src/posesOnVideo.vert'),
    attributes: {
      position: [
        -2, 0,
        0, -2,
        2, 2]
    },
    uniforms: {
      uVideo: regl.prop<DrawProps, 'video'>('video'),
      uPoses: regl.prop<DrawProps,  'posesTexture'>('posesTexture'),

      screenShape: ({viewportWidth, viewportHeight}) =>
        [viewportWidth, viewportHeight],
  
      time: regl.context('time')
    },
    count: 3,
    framebuffer: regl.prop<DrawProps, 'buffer'>('buffer')
  });

  const drawFeeedback = regl<FeedbackUniforms, DrawAttributes, FeedbackProps>({
    frag: require('./src/feedback.frag'),
    vert: require('./src/posesOnVideo.vert'),
    attributes: {
      position: [
        -2, 0,
        0, -2,
        2, 2]
    },
    uniforms: {
      uFrame: regl.prop<FeedbackProps, 'frame'>('frame'),
      uPreviousFrame: regl.prop<FeedbackProps, 'previousFrame'>('previousFrame'),
      time: regl.context('time')
    },
    framebuffer: regl.prop<FeedbackProps, 'buffer'>('buffer'),
    count: 3
  })

  const videoTexture = regl.texture(video);

  const canvas = document.getElementsByTagName('canvas')[0]

  const posesCanvas = createPoseCanvas(canvas.width, canvas.height);

  const posesTexture = regl.texture(posesCanvas);

  window.addEventListener('resize', () => {
    const updatedCanvas = document.getElementsByTagName('canvas')[0]
    posesCanvas.width = updatedCanvas.width
    posesCanvas.height = updatedCanvas.height
  })

  async function poseEstimationFrame() {
    const poses = await net.estimateMultiplePoses(video);

    const scale: [number, number] = [canvas.height / video.height, canvas.width / video.width ];

    renderPosesOnCanvas(poses, posesCanvas, scale);

    // update texture with contents from canvas
    posesTexture(posesCanvas);

    requestAnimationFrame(poseEstimationFrame);
  }

  poseEstimationFrame();

  const poseVideoFBO = regl.framebuffer({
    width: canvas.width,
    height: canvas.height
  })

  const feedbackFBO = regl.framebuffer({
    width: canvas.width,
    height: canvas.height
  })

  regl.frame(() => {
    regl.clear({
      color: [0, 0, 0, 1]
    })

    capturePosesFromVideo({ video: videoTexture.subimage(video), posesTexture, buffer: poseVideoFBO })

  })
}

async function bindPage() {
  const mobileNetArchitecture =  isMobile() ? 0.50 : 0.75;
  const net = await posenet.load(mobileNetArchitecture);

  document.getElementById('main').style.display = 'block';

  let video: HTMLVideoElement;

  try {
    video = await loadVideo();
  } catch (e) {
    let info = document.getElementById('info');
    info.textContent = 'this browser does not support video capture,' +
        'or this device does not have a camera';
    info.style.display = 'block';
    throw e;
  }

  detectPoseInRealTime(video, net);
}

// kick off the demo
bindPage();