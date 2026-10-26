/**
 * Reads text from a prepared photo with Tesseract.js.
 *
 * `createWorker` starts OCR inside its own Web Worker, so a large photo never
 * freezes the buttons or the rest of the screen. This module only reports
 * progress and cleans the worker up when the job finishes or the patient
 * leaves the screen.
 *
 * The first scan downloads Tesseract's English data (a few MB) and the OCR
 * engine; the browser caches both for later scans.
 */

import type Tesseract from "tesseract.js";

export type OcrStage = "preparing" | "language" | "reading" | "finishing";

export interface OcrProgress {
  /** 0 – 100, never going backwards. */
  percent: number;
  stage: OcrStage;
}

export interface OcrOptions {
  onProgress?: (progress: OcrProgress) => void;
  /** Aborting terminates the worker and rejects with an AbortError. */
  signal?: AbortSignal;
}

interface TesseractLogMessage {
  status: string;
  progress: number;
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function mapLoggerMessage(message: TesseractLogMessage): OcrProgress {
  const status = message.status.toLowerCase();
  const progress = clampProgress(message.progress);

  if (status.includes("recognizing")) {
    return { percent: Math.round(55 + progress * 45), stage: "reading" };
  }
  if (status.includes("language") || status.includes("traineddata")) {
    return { percent: Math.round(25 + progress * 20), stage: "language" };
  }
  if (status.includes("initializing api")) {
    return { percent: Math.round(45 + progress * 10), stage: "preparing" };
  }
  if (status.includes("core") || status.includes("initializing")) {
    return { percent: Math.round(5 + progress * 15), stage: "preparing" };
  }
  return { percent: Math.round(progress * 5), stage: "preparing" };
}

/**
 * Runs OCR on one prepared image and returns the plain text.
 *
 * The worker is created for the job and always terminated afterwards, so a
 * cancelled or failed scan cannot leave a background worker running.
 */
export async function recognizeText(
  image: Blob,
  { onProgress, signal }: OcrOptions = {},
): Promise<string> {
  let lastPercent = 0;
  const report = (next: OcrProgress) => {
    const percent = Math.max(lastPercent, Math.min(100, next.percent));
    lastPercent = percent;
    onProgress?.({ ...next, percent });
  };

  report({ percent: 1, stage: "preparing" });

  const { createWorker } = await import("tesseract.js");
  const worker: Tesseract.Worker = await createWorker("eng", 1, {
    logger: (message: TesseractLogMessage) => report(mapLoggerMessage(message)),
  });

  let terminated = false;
  const terminate = async () => {
    if (terminated) return;
    terminated = true;
    try {
      await worker.terminate();
    } catch {
      // A worker that was already killed by an abort cannot be terminated
      // twice; nothing else needs cleaning.
    }
  };

  const onAbort = () => {
    void terminate();
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    await worker.setParameters({ preserve_interword_spaces: "1" });
    if (signal?.aborted) {
      throw new DOMException("Reading was stopped.", "AbortError");
    }

    report({ percent: 50, stage: "reading" });
    const result = await worker.recognize(image);

    if (signal?.aborted) {
      throw new DOMException("Reading was stopped.", "AbortError");
    }

    report({ percent: 100, stage: "finishing" });
    return result.data.text;
  } finally {
    signal?.removeEventListener("abort", onAbort);
    await terminate();
  }
}
