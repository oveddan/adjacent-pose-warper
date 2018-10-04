import * as posenet from '@tensorflow-models/posenet';

const minPoseConfidence = 0.1;
const minPartConfidence = 0.1;


const lineWidth = 20;

function toTuple({y, x}: { x: number, y: number }): number[] {
  return [y, x];
}

function drawPoint(
  ctx: CanvasRenderingContext2D, y: number, x: number, r: number,
  color: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawKeypoints(
  keypoints: posenet.Keypoint[], minConfidence: number,
  ctx: CanvasRenderingContext2D, color: string, [sh, sw] = [1, 1]) {
  for (const keypoint of keypoints) {
    if (keypoint.score < minConfidence) {
      continue;
    }

    const {y, x} = keypoint.position;
    drawPoint(ctx, y * sh, x * sw, lineWidth/2, color);
  }
}

function drawSegment([ay, ax]: number[], [by, bx]: number[], [sh, sw]: number[], color: string, ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(ax * sw, ay * sh);
  ctx.lineTo(bx * sw, by * sh);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.stroke();
}

const white = '#ffffff'

function drawSkeleton(keypoints: posenet.Keypoint[], minConfidence: number, ctx: CanvasRenderingContext2D, scale: [number, number]) {
  const adjacentKeyPoints = posenet.getAdjacentKeyPoints(
    keypoints, minConfidence);

  adjacentKeyPoints.forEach((keypoints) => {
    drawSegment(toTuple(keypoints[0].position),
      toTuple(keypoints[1].position), scale, white, ctx);
  });
}

export function renderPosesOnCanvas(poses: posenet.Pose[], canvas: HTMLCanvasElement, scale: [number, number]) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = "round";
  ctx.filter = 'blur(10px)';
  poses.forEach(({score, keypoints}) => {
    if (score >= minPoseConfidence) {
      drawKeypoints(keypoints, minPartConfidence, ctx, white, scale)
      drawSkeleton(keypoints, minPartConfidence, ctx, scale);
    }
  });
}