import { isMobile, loadVideo } from './camera'
import * as posenet from '@tensorflow-models/posenet'
import { renderPosesOnCanvas } from './src/util'
import REGL from 'regl' 

interface DrawProps {
  video: REGL.Texture2D;
  posesTexture: REGL.Texture2D;
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

interface DrawLineProps {
  texture: REGL.Texture2D,
}

interface DrawLineUniforms {
  uStart: REGL.Vec2,
  uEnd: REGL.Vec2,
  uColor: REGL.Vec3
}

interface DrawLineAttributes {
  position: number[];
  texcoord: number[];
}

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

  const drawPosesOnVideo = regl<DrawUniforms, DrawAttributes, DrawProps>({
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
    count: 3
  });

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

  regl.frame(() => {
    regl.clear({
      color: [0, 0, 0, 1]
    })

    drawPosesOnVideo({ video: videoTexture.subimage(video), posesTexture })
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