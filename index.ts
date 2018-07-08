import { videoWidth, videoHeight, isMobile, loadVideo } from './camera'
import * as posenet from '@tensorflow-models/posenet'
import { request } from 'http';

function detectPoseInRealTime(video: HTMLVideoElement, net: posenet.PoseNet) {
  const canvas = document.getElementById('output') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  // since images are being fed from a webcam
  const flipHorizontal = true;

  canvas.width = videoWidth;
  canvas.height = videoHeight;

  async function poseDetectionFrame() {
    ctx.clearRect(0, 0, videoWidth, videoHeight);

    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-videoWidth, 0);
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    ctx.restore();

    requestAnimationFrame(poseDetectionFrame);
  }

  poseDetectionFrame();
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