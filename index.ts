import { isMobile, loadVideo } from './camera'
import * as posenet from '@tensorflow-models/posenet'
import REGL from 'regl' 

interface Props {
  video: REGL.Texture2D;
}

interface Uniforms {
  texture: REGL.Texture2D;
  screenShape: REGL.Vec2;
  time: number;
}

interface Attributes {
  position: number[];
}

function detectPoseInRealTime(video: HTMLVideoElement, net: posenet.PoseNet) {
  // const canvas = document.getElementById('output') as HTMLCanvasElement;
  // const ctx = canvas.getContext('2d');
  // since images are being fed from a webcam
  const flipHorizontal = true;

  // canvas.width = videoWidth;
  // canvas.height = videoHeight;

  const regl = REGL();

  const drawPoses = regl<Uniforms, Attributes, Props>({
    frag: require('./src/poses.frag'),
    vert: require('./src/poses.vert'),
    attributes: {
      position: [
        -2, 0,
        0, -2,
        2, 2]
    },
    uniforms: {
      texture: regl.prop<Props, 'video'>('video'),
  
      screenShape: ({viewportWidth, viewportHeight}) =>
        [viewportWidth, viewportHeight],
  
      time: regl.context('time')
    },
    count: 3

  });

  const videoTexture = regl.texture(video);

  regl.frame(() => {
    regl.clear({
      color: [0, 0, 0, 1]
    })

    drawPoses({ video: videoTexture.subimage(video) })
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