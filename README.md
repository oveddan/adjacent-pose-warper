# Pose Animations for Adjacent Issue 4

This repository contains an interactive animation for the Adjacent Issue #4.
It detects poses using [PoseNet](https://medium.com/tensorflow/real-time-human-pose-estimation-in-the-browser-with-tensorflow-js-7dd0bc881cd5), and renders a shader with feedback using the 
pose closest to the center of the screen.  It lerps the position of the pose keypoints
between each pose estimation pass.

A standalone demo can be accessed at:
[https://adjacent-warped-images.netlify.com](https://adjacent-warped-images.netlify.com)

The code shows how poses can be used in a shader, and feedback can be rendered based on those poses.
To access the rendered poses in a shader, they are first rendered to a canvas, the same way
it's done in the PoseNet camera demo.  The difference is that the canvas is off screen (not visible).
This canvas is then uploaded to a texture, which is then sampled in a shader.

The results of the rendering are copied into a texture, so that it can be accessed as feedback in the next render pass. 

[regl](http://regl.party/) is used as the webgl framework.  It is a minimal, functional wrapper for webgl.

## To run locally:

    yarn
    yarn watch

Open https://localhost:1234

