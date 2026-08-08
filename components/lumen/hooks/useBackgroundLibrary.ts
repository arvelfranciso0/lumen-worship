"use client";

import { useCallback } from "react";
import { getRepository } from "@/lib/repository";
import { LOOKS } from "../data";
import { downscaleImage, generateVideoPoster, MAX_BACKGROUND_IMAGE_DIMENSION } from "../media/backgroundMedia";
import type { LumenState } from "../lumenState";
import type { PatchFn } from "./useUndoRedoHistory";

// Uploading and deleting custom image/video backgrounds.
export function useBackgroundLibrary(patch: PatchFn<LumenState>) {
  const addBackground = useCallback(async (file: File) => {
    const backgroundId = "bg-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const mediaType: "image" | "video" = file.type.startsWith("video/") ? "video" : "image";

    if (mediaType === "image") {
      const { blob: downscaledBlob, mimeType } = await downscaleImage(file, MAX_BACKGROUND_IMAGE_DIMENSION);
      const objectUrl = URL.createObjectURL(downscaledBlob);
      const fileData = await downscaledBlob.arrayBuffer();
      getRepository().addBackground({ id: backgroundId, name: file.name, mediaType, mimeType, data: fileData });
      patch((previousState) => ({
        customBackgrounds: [{ id: backgroundId, name: file.name, mediaType, url: objectUrl }, ...previousState.customBackgrounds],
        look: backgroundId,
      }));
      return;
    }

    // Video is left untouched, but a poster frame is captured so previews can skip decoding it.
    const objectUrl = URL.createObjectURL(file);
    const fileData = await file.arrayBuffer();
    getRepository().addBackground({ id: backgroundId, name: file.name, mediaType, mimeType: file.type, data: fileData });
    patch((previousState) => ({
      customBackgrounds: [{ id: backgroundId, name: file.name, mediaType, url: objectUrl }, ...previousState.customBackgrounds],
      look: backgroundId,
    }));
    // Not awaited, so a large upload isn't stalled by seeking the clip.
    generateVideoPoster(objectUrl).then((posterUrl) => {
      patch((previousState) => ({
        customBackgrounds: previousState.customBackgrounds.map((entry) =>
          entry.id === backgroundId ? { ...entry, posterUrl } : entry
        ),
      }));
    }).catch((error) => {
      console.error("Failed to generate poster for background " + backgroundId + ":", error);
    });
  }, [patch]);

  const deleteBackground = useCallback((backgroundId: string) => {
    getRepository().deleteBackground(backgroundId);
    patch((previousState) => ({
      customBackgrounds: previousState.customBackgrounds.filter((background) => background.id !== backgroundId),
      look: previousState.look === backgroundId ? LOOKS[0].id : previousState.look,
    }));
  }, [patch]);

  return { addBackground, deleteBackground };
}
