import * as posenet from '@tensorflow-models/posenet';

const minPoseConfidence = 0.1;
const minPartConfidence = 0.1;


const lineWidth = 10;

function toTuple({y, x}: { x: number, y: number }): number[] {
  return [y, x];
}

function drawSegment([ay, ax]: number[], [by, bx]: number[], [sh, sw]: number[], color: string, ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(ax * sw, ay * sh);
  ctx.lineTo(bx * sw, by * sh);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.stroke();
}

const white = '#000000'

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
  poses.forEach(({score, keypoints}) => {
    if (score >= minPoseConfidence) {
      drawSkeleton(keypoints, minPartConfidence, ctx, scale);
    }
  });
}