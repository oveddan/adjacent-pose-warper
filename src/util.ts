import * as posenet from '@tensorflow-models/posenet';

const lineWidth = 30;
const blurSize = 0;

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

export function renderKeypointsOnCanvas(keypoints: posenet.Keypoint[], canvas: HTMLCanvasElement, scale: [number, number], minPartConfidence: number) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = "round";
  ctx.filter = `blur(${blurSize}px)`;

  drawKeypoints(keypoints, minPartConfidence, ctx, white, scale)
  drawSkeleton(keypoints, minPartConfidence, ctx, scale);
}

function getCenterX(keypoints: posenet.Keypoint[], minKeypointConfidence: number) {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;

  for(let keypoint of keypoints) {
    if(keypoint.score >= minKeypointConfidence) {
      minX = Math.min(keypoint.score, minX);
      maxX = Math.max(keypoint.score, maxX);
    }
  }
  return minX + (maxX - minX) / 2;
}

export function getCenterXPose(poses: posenet.Pose[], minPoseConfidence, minKeypointConfidence): posenet.Pose {
  let totalX = 0;

  let posesAndCenterXs: [[posenet.Pose, number]];

  poses.forEach(pose => {
    if (pose.score >= minPoseConfidence) {
      const centerX = getCenterX(pose.keypoints, minKeypointConfidence);
      totalX += centerX;
      if (!posesAndCenterXs)
        posesAndCenterXs = [[pose, centerX]];
      else
        posesAndCenterXs.push([pose, centerX]);
    }
  })  

  if (!posesAndCenterXs) return null;

  const meanX = totalX / posesAndCenterXs.length;

  let centerPose: posenet.Pose;

  let closestDistanceToMean = Number.POSITIVE_INFINITY;

  posesAndCenterXs.forEach(([pose, centerX])=> {
    const distFromMean = Math.abs(centerX - meanX);

    if (distFromMean < closestDistanceToMean) {
      centerPose = pose;
      closestDistanceToMean = distFromMean;
    }
  })

  return centerPose;
}

function lerp(last: number, next: number, percentage: number, maxChange: number) {
  const change = (next - last) * percentage;

  let clampedChange;

  // if negative, make sure above negative change
  if (change < 0) 
    clampedChange = Math.max(change, -maxChange);
  // else make sure below max change
  else
    clampedChange = Math.min(change, maxChange);

  return last + clampedChange;
}

function lerpPosition(last: posenet.Keypoint, next: posenet.Keypoint, percentage: number, maxChange: number, minKeypointConfidence: number): posenet.Keypoint {
  return {
    part: next.part,
    position: {
      x: lerp(last.position.x, next.position.x, percentage, maxChange),
      y: lerp(last.position.y, next.position.y, percentage, maxChange),
    },
    score: lerp(last.score, next.score, percentage, maxChange)
  }
}

export function lerpKeypoints(lastKeypoints: posenet.Keypoint[],
  currentKeypoints: posenet.Keypoint[], lerpPercentage: number, maxChange: number, minKeypointConfidence: number): posenet.Keypoint[] {
  if (!lastKeypoints || lastKeypoints.length === 0) return currentKeypoints;
  return currentKeypoints.map(((currentKeypoint, i) => (
    lerpPosition(lastKeypoints[i], currentKeypoint, lerpPercentage, maxChange, minKeypointConfidence)
  ))); 
}

export function getQueryStringValue(name: string): string {
  const url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
      results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}