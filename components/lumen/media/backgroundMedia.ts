// Max dimension for a generated video poster thumbnail.
const POSTER_MAX_DIMENSION = 640;

// Fractions of the clip's duration to sample for a poster frame, tried in order.
const POSTER_SAMPLE_POSITIONS = [0.1, 0.35, 0.6, 0];

// Mean luminance (0-255) below which a captured frame is treated as black.
const POSTER_MIN_MEAN_LUMINANCE = 8;

const POSTER_EVENT_TIMEOUT_MS = 15_000;

// Max dimension for an uploaded background image before it's downscaled.
export const MAX_BACKGROUND_IMAGE_DIMENSION = 1920;

// Resolves on `eventName`, rejects on the video erroring or timing out.
function waitForVideoEvent(video: HTMLVideoElement, eventName: "loadeddata" | "seeked"): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanUp = () => {
      video.removeEventListener(eventName, onSuccess);
      video.removeEventListener("error", onError);
      clearTimeout(timeoutId);
    };
    const onSuccess = () => { cleanUp(); resolve(); };
    const onError = () => { cleanUp(); reject(new Error("Video errored while waiting for " + eventName)); };
    const timeoutId = setTimeout(() => { cleanUp(); reject(new Error("Timed out waiting for " + eventName)); }, POSTER_EVENT_TIMEOUT_MS);
    video.addEventListener(eventName, onSuccess, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

// Average brightness of the canvas, sampling every 16th pixel.
function meanCanvasLuminance(context: CanvasRenderingContext2D, width: number, height: number): number {
  const { data } = context.getImageData(0, 0, width, height);
  let total = 0;
  let sampleCount = 0;
  for (let offset = 0; offset < data.length; offset += 4 * 16) {
    total += 0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2];
    sampleCount++;
  }
  return sampleCount ? total / sampleCount : 0;
}

// Captures a representative still frame from a video as a data URL.
export async function generateVideoPoster(videoUrl: string): Promise<string> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  // Set for non-blob URLs so reading the frame back via toDataURL doesn't taint the canvas.
  if (!videoUrl.startsWith("blob:")) {
    video.crossOrigin = "anonymous";
  }
  video.src = videoUrl;

  try {
    await waitForVideoEvent(video, "loadeddata");

    const sourceWidth = video.videoWidth || POSTER_MAX_DIMENSION;
    const sourceHeight = video.videoHeight || POSTER_MAX_DIMENSION;
    const scale = Math.min(1, POSTER_MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));
    const posterCanvas = document.createElement("canvas");
    posterCanvas.width = Math.max(1, Math.round(sourceWidth * scale));
    posterCanvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const context = posterCanvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("2d context unavailable");

    // A live stream or unsettled clip reports a non-finite duration and can't be seeked.
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    let firstCapturedPoster = "";

    for (const position of POSTER_SAMPLE_POSITIONS) {
      if (duration > 0) {
        const targetTime = Math.min(duration * position, Math.max(0, duration - 0.05));
        if (Math.abs(video.currentTime - targetTime) > 0.01) {
          video.currentTime = targetTime;
          await waitForVideoEvent(video, "seeked");
        }
      } else if (position !== 0) {
        continue;
      }
      context.drawImage(video, 0, 0, posterCanvas.width, posterCanvas.height);
      const poster = posterCanvas.toDataURL("image/jpeg", 0.8);
      if (!firstCapturedPoster) firstCapturedPoster = poster;
      if (meanCanvasLuminance(context, posterCanvas.width, posterCanvas.height) >= POSTER_MIN_MEAN_LUMINANCE) {
        return poster;
      }
    }

    // Every sampled frame was near-black; fall back to the first capture.
    if (!firstCapturedPoster) throw new Error("Could not capture any frame");
    return firstCapturedPoster;
  } finally {
    // Releases the decoder and buffered data.
    video.removeAttribute("src");
    video.load();
  }
}

// Downscales an image to a max dimension and re-encodes it as JPEG.
export function downscaleImage(file: File, maxDimension: number): Promise<{ blob: Blob; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const targetWidth = Math.round(image.width * scale);
      const targetHeight = Math.round(image.height * scale);
      const resizeCanvas = document.createElement("canvas");
      resizeCanvas.width = targetWidth;
      resizeCanvas.height = targetHeight;
      const context = resizeCanvas.getContext("2d");
      URL.revokeObjectURL(objectUrl);
      if (!context) { reject(new Error("2d context unavailable")); return; }
      context.drawImage(image, 0, 0, targetWidth, targetHeight);
      resizeCanvas.toBlob((blob) => {
        if (!blob) { reject(new Error("Failed to encode downscaled image")); return; }
        resolve({ blob, mimeType: "image/jpeg" });
      }, "image/jpeg", 0.85);
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Failed to load image for downscaling")); };
    image.src = objectUrl;
  });
}
