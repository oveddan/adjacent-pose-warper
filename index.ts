import { isMobile, loadVideo } from './camera'
import * as posenet from '@tensorflow-models/posenet'
import fakePoses from './src/fakePoses';
import { renderPosesOnCanvas } from './src/util'
import REGL from 'regl' 

import images from './images';

interface WarpImageUniforms {
  uPoses: REGL.Texture2D;
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

function getParameterByName(name) {
  const url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
      results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function getImagePath() {
  const imageName = getParameterByName('image') || 'wood.jpg';
  return images[imageName];
}

const planeAttributes: number[] = [
  -2, 0,
  0, -2,
  2, 2
]

async function detectPoseInRealTime(video: HTMLVideoElement, net: posenet.PoseNet) {
  // const canvas = document.getElementById('output') as HTMLCanvasElement;
  // const ctx = canvas.getContext('2d');
  // since images are being fed from a webcam
  const flipHorizontal = true;

  const regl = REGL();

  const canvas = document.getElementsByTagName('canvas')[0]

  const posesCanvas = createPoseCanvas(canvas.width, canvas.height);
  const posesTexture = regl.texture(posesCanvas);

  const imageTexture = await loadImageTexture(regl, getImagePath());

  const warpImageFromPoses = regl<WarpImageUniforms, DrawAttributes>({
    frag: require('./src/drawPoses.frag'),
    vert: require('./src/fullPlane.vert'),
    attributes: {
      position: planeAttributes
    },
    uniforms: {
      uPoses: posesTexture,
      uImage: imageTexture,
      screenShape: ({viewportWidth, viewportHeight}) =>
        [viewportWidth, viewportHeight],
  
      uTime: regl.context('time')
    },
    count: 3
  })


  // in a separate loop, fetch poses and write them to a texture for use in the shader.
  async function updatePoses() {
    const poses = await net.estimateMultiplePoses(video, 0.3, false, 16, 1);

    const scale: [number, number] = [canvas.height / video.height, canvas.width / video.width ];

    renderPosesOnCanvas(poses, posesCanvas, scale);
    posesTexture(posesCanvas);
 
    requestAnimationFrame(updatePoses);
  }

  updatePoses();

  regl.frame(() => {
    warpImageFromPoses();
  });
}

async function bindPage() {
  const mobileNetArchitecture =  isMobile() ? 0.50 : 0.75;
  const net = await posenet.load(0.50);

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