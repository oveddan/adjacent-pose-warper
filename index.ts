import { isMobile, loadVideo } from './camera'
import * as posenet from '@tensorflow-models/posenet'
import { renderPosesOnCanvas } from './src/util'
import REGL from 'regl' 

interface DrawPosesProps {
  video: REGL.Texture2D;
  posesFeedback: REGL.Framebuffer;
  buffer: REGL.Framebuffer;
}

interface DrawPosesUniforms {
  uVideo: REGL.Texture2D;
  uPoses: REGL.Texture2D;
  screenShape: REGL.Vec2;
  time: number;
}

interface DrawBufferProps {
  buffer: REGL.Framebuffer,
  outputBuffer: REGL.Framebuffer
}

interface DrawBufferUniforms {
  uBuffer: REGL.Framebuffer
}

interface DrawAttributes {
  position: number[];
}

interface FeedbackProps {
  frame: REGL.Framebuffer;
  previousFrame: REGL.Framebuffer;
  outputBuffer: REGL.Framebuffer;
  firstDraw: boolean;
}

interface FeedbackUniforms {
  uFrame: REGL.Texture2D,
  uPreviousFrame: REGL.Texture2D,
  uResolution: [number, number],
  uFirstDraw: boolean,
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


const planeAttributes: number[] = [
  -2, 0,
  0, -2,
  2, 2
]

function detectPoseInRealTime(video: HTMLVideoElement, net: posenet.PoseNet) {
  // const canvas = document.getElementById('output') as HTMLCanvasElement;
  // const ctx = canvas.getContext('2d');
  // since images are being fed from a webcam
  const flipHorizontal = true;

  const regl = REGL();

  const drawBuffer = regl<DrawBufferUniforms, DrawAttributes, DrawBufferProps>({
    frag: require('./src/drawBuffer.frag'),
    vert: require('./src/fullPlane.vert'),
    attributes: {
      position: planeAttributes
    },
    uniforms: {
      uBuffer: regl.prop<DrawBufferProps, 'buffer'>('buffer')
    },
    framebuffer: regl.prop<DrawBufferProps, 'outputBuffer'>('outputBuffer'),
    count: 3
  })

  const capturePosesFromVideo = regl<DrawPosesUniforms, DrawAttributes, DrawPosesProps>({
    frag: require('./src/posesOnVideo.frag'),
    vert: require('./src/fullPlane.vert'),
    attributes: {
      position: planeAttributes
    },
    uniforms: {
      uVideo: regl.prop<DrawPosesProps, 'video'>('video'),
      uPoses: regl.prop<DrawPosesProps,  'posesFeedback'>('posesFeedback'),

      screenShape: ({viewportWidth, viewportHeight}) =>
        [viewportWidth, viewportHeight],
  
      time: regl.context('time')
    },
    count: 3,
    framebuffer: regl.prop<DrawPosesProps, 'buffer'>('buffer')
  });

  const drawFeedback = regl<FeedbackUniforms, DrawAttributes, FeedbackProps>({
    frag: require('./src/feedback.frag'),
    vert: require('./src/fullPlane.vert'),
    attributes: {
      position: planeAttributes
    },
    uniforms: {
      uFrame: regl.prop<FeedbackProps, 'frame'>('frame'),
      uPreviousFrame: regl.prop<FeedbackProps, 'previousFrame'>('previousFrame'),
      time: regl.context('time'),
      uResolution: ({ drawingBufferWidth, drawingBufferHeight }) => [
        drawingBufferWidth,
        drawingBufferHeight
      ],
      uFirstDraw: regl.prop<FeedbackProps, 'firstDraw'>('firstDraw')
    },
    framebuffer: regl.prop<FeedbackProps, 'outputBuffer'>('outputBuffer'),
    count: 3
  })

  const videoTexture = regl.texture(video);

  const canvas = document.getElementsByTagName('canvas')[0]

  const posesCanvas = createPoseCanvas(canvas.width, canvas.height);

  const posesTexture = regl.texture(posesCanvas);

  let feedbackFBO = regl.framebuffer({
    width: canvas.width,
    height: canvas.height,
    colorFormat: 'rgba',
  })

  const lastFrameFBO = regl.framebuffer({
    width: canvas.width,
    height: canvas.height,
    colorFormat: 'rgba',
  })
  const lastFrameTexture = regl.texture()

  let initialized = false;

  window.addEventListener('resize', () => {
    const updatedCanvas = document.getElementsByTagName('canvas')[0]
    posesCanvas.width = updatedCanvas.width
    posesCanvas.height = updatedCanvas.height
  })

  let posesRendered = true;

  let poses: posenet.Pose[] = [];

  async function updatePoses() {
    poses = await net.estimateMultiplePoses(video);

    // if (!initialized) {
    //   lastFrameTexture(posesCanvas)
    //   initialized = true;
    // }

    posesRendered = false;

    requestAnimationFrame(updatePoses);
  }

  updatePoses();

  const poseVideoFBO = regl.framebuffer({
    width: canvas.width,
    height: canvas.height
  })

  let firstDraw = true;

  regl.frame(() => {
    if (!posesRendered) {
      const scale: [number, number] = [canvas.height / video.height, canvas.width / video.width ];

      renderPosesOnCanvas(poses, posesCanvas, scale);
      posesTexture(posesCanvas);
 
      drawFeedback({ 
        frame: posesTexture, 
        previousFrame: lastFrameFBO, 
        firstDraw, 
        outputBuffer: feedbackFBO 
      });

      drawBuffer({
        buffer: feedbackFBO,
        outputBuffer: lastFrameFBO
      });
        
      posesRendered = true;
    }

    drawBuffer({ buffer: feedbackFBO });

    // capturePosesFromVideo({ video: videoTexture.subimage(video), posesFeedback: feedbackFBO })
    firstDraw = false;
  });
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