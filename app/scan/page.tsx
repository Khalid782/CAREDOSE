"use client";

/**
 * Scan — take or choose a prescription photo, read it on the device, and hand
 * the result to the Review screen.
 *
 * OCR runs in Tesseract's Web Worker; the photo is resized, grayscaled and
 * contrast-boosted first. Nothing reaches the data layer here: the patient has
 * to confirm the editable cards on the Review screen and press Save.
 */

import {
  Camera,
  ImageUp,
  Lightbulb,
  LoaderCircle,
  Pill,
  ScanLine,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Button, LinkButton } from "@/components/Button";
import { Card, CardTitle } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { PrescriptionReview } from "@/components/PrescriptionReview";
import { WarningBanner } from "@/components/WarningBanner";
import { useCareData } from "@/lib/context/CareDataProvider";
import { useSettings } from "@/lib/context/SettingsProvider";
import { DEFAULT_MEAL_TIMES, type MedicineDraft } from "@/lib/data/types";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { useTranslator } from "@/lib/i18n/useTranslator";
import { preprocessImage } from "@/lib/ocr/preprocess";
import { recognizeText, type OcrProgress, type OcrStage } from "@/lib/ocr/recognize";
import { parsePrescription, type ParseResult } from "@/lib/parser";

type ScanStage = "idle" | "reading" | "review" | "saved";

interface PhotoSelection {
  file: File;
  url: string;
  name: string;
}

const STAGE_KEYS: Record<OcrStage, TranslationKey> = {
  preparing: "scan.stagePreparing",
  language: "scan.stageLanguage",
  reading: "scan.stageReading",
  finishing: "scan.stageFinishing",
};

const INITIAL_PROGRESS: OcrProgress = { percent: 0, stage: "preparing" };

export default function ScanPage() {
  const { t } = useTranslator();
  const { saveMedicines } = useCareData();
  const { settings } = useSettings();
  const mealTimes = settings?.mealTimes ?? DEFAULT_MEAL_TIMES;

  const [stage, setStage] = useState<ScanStage>("idle");
  const [photo, setPhoto] = useState<PhotoSelection | null>(null);
  const [preparedUrl, setPreparedUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<OcrProgress>(INITIAL_PROGRESS);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const cameraInput = useRef<HTMLInputElement>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const photoUrlRef = useRef<string | null>(null);
  const preparedUrlRef = useRef<string | null>(null);

  const clearPrepared = () => {
    if (preparedUrlRef.current) URL.revokeObjectURL(preparedUrlRef.current);
    preparedUrlRef.current = null;
    setPreparedUrl(null);
  };

  const clearPhoto = () => {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    photoUrlRef.current = null;
    setPhoto(null);
  };

  // Blob URLs and any in-flight worker must be released when leaving the page.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
      if (preparedUrlRef.current) URL.revokeObjectURL(preparedUrlRef.current);
    };
  }, []);

  const accept = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    if (file.type && !file.type.startsWith("image/")) {
      setOcrError(t("scan.errorBody"));
      return;
    }

    abortRef.current?.abort();
    abortRef.current = null;
    clearPrepared();
    clearPhoto();

    const url = URL.createObjectURL(file);
    photoUrlRef.current = url;
    setPhoto({ file, url, name: file.name });
    setResult(null);
    setOcrError(null);
    setProgress(INITIAL_PROGRESS);
    setStage("idle");
  };

  const removePhoto = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    clearPrepared();
    clearPhoto();
    setResult(null);
    setOcrError(null);
    setProgress(INITIAL_PROGRESS);
    setStage("idle");
  };

  const readPhoto = async () => {
    if (!photo || stage === "reading") return;

    const controller = new AbortController();
    abortRef.current = controller;
    setStage("reading");
    setOcrError(null);
    setProgress(INITIAL_PROGRESS);
    clearPrepared();

    try {
      const prepared = await preprocessImage(photo.file);
      if (controller.signal.aborted) {
        throw new DOMException("Reading was stopped.", "AbortError");
      }

      const previewUrl = URL.createObjectURL(prepared.blob);
      preparedUrlRef.current = previewUrl;
      setPreparedUrl(previewUrl);

      const text = await recognizeText(prepared.blob, {
        signal: controller.signal,
        onProgress: setProgress,
      });
      if (controller.signal.aborted) return;

      setResult(parsePrescription(text));
      setStage("review");
    } catch (error) {
      // Terminating a worker can reject with a normal Error, so the abort
      // signal is the reliable way to know the patient stopped the scan.
      if (
        controller.signal.aborted ||
        (error instanceof DOMException && error.name === "AbortError")
      ) {
        setStage("idle");
        return;
      }
      console.error("CareDose could not read the photo:", error);
      setOcrError(t("scan.errorBody"));
      setStage("idle");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const cancelReading = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStage("idle");
  };

  const saveReviewed = async (drafts: MedicineDraft[]) => {
    await saveMedicines(drafts);
    clearPrepared();
    clearPhoto();
    setResult(null);
    setOcrError(null);
    setProgress(INITIAL_PROGRESS);
    setSavedCount(drafts.length);
    setStage("saved");
  };

  const startAnother = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    clearPrepared();
    clearPhoto();
    setResult(null);
    setOcrError(null);
    setSavedCount(0);
    setProgress(INITIAL_PROGRESS);
    setStage("idle");
  };

  const pickPhoto = (input: RefObject<HTMLInputElement | null>) => {
    input.current?.click();
  };

  return (
    <>
      <PageHeader
        title={
          stage === "review"
            ? t("review.title")
            : stage === "saved"
              ? t("review.savedTitle")
              : t("scan.title")
        }
        subtitle={
          stage === "review"
            ? t("review.subtitle")
            : stage === "saved"
              ? undefined
              : t("scan.subtitle")
        }
      />

      {stage === "review" && result ? (
        <PrescriptionReview
          result={result}
          mealTimes={mealTimes}
          onCancel={() => {
            clearPrepared();
            setResult(null);
            setStage("idle");
          }}
          onSave={saveReviewed}
        />
      ) : stage === "saved" ? (
        <Card className="flex flex-col gap-4">
          <CardTitle icon={<ShieldCheck size={26} strokeWidth={2.5} />}>
            {t("review.savedTitle")}
          </CardTitle>
          <p className="text-base font-semibold text-fg">
            {savedCount === 1
              ? t("review.savedOne")
              : t("review.savedBody", { count: savedCount })}
          </p>
          <LinkButton
            href="/"
            size="lg"
            fullWidth
            icon={<Pill size={26} strokeWidth={2.5} />}
          >
            {t("review.goToday")}
          </LinkButton>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            icon={<Camera size={26} strokeWidth={2.5} />}
            onClick={startAnother}
          >
            {t("review.scanAnother")}
          </Button>
        </Card>
      ) : (
        <>
          <WarningBanner tone="info">
            <p>{t("scan.notice")}</p>
            <p className="mt-2">{t("scan.privacyNote")}</p>
          </WarningBanner>

          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              accept(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
          />
          <input
            ref={uploadInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              accept(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
          />

          {stage === "reading" ? (
            <Card className="flex flex-col gap-4">
              <CardTitle icon={<ScanLine size={26} strokeWidth={2.5} />}>
                {t("scan.readingTitle")}
              </CardTitle>
              <p className="text-[0.95rem] text-fg">{t("scan.readingBody")}</p>

              {preparedUrl ? (
                <Image
                  src={preparedUrl}
                  alt={t("scan.preparedTitle")}
                  width={640}
                  height={480}
                  unoptimized
                  className="h-auto w-full rounded-xl border-2 border-line"
                />
              ) : (
                <div className="flex items-center gap-3 rounded-xl border-2 border-line bg-surface-2 p-4">
                  <LoaderCircle
                    size={28}
                    strokeWidth={2.5}
                    aria-hidden="true"
                    className="animate-spin text-accent"
                  />
                  <p className="text-[0.95rem] font-semibold text-fg">
                    {t(STAGE_KEYS[progress.stage])}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[0.95rem] font-semibold text-fg">
                    {t(STAGE_KEYS[progress.stage])}
                  </span>
                  <span className="text-[0.95rem] font-bold text-fg tabular-nums">
                    {t("scan.progressLabel", { percent: progress.percent })}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress.percent}
                  aria-label={t("scan.progressLabel", { percent: progress.percent })}
                  className="h-4 w-full overflow-hidden rounded-full border-2 border-line bg-surface-3"
                >
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-300"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </div>

              <Button
                variant="warn"
                size="md"
                fullWidth
                icon={<Trash2 size={22} strokeWidth={2.5} />}
                onClick={cancelReading}
              >
                {t("scan.cancelRead")}
              </Button>
            </Card>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon={<Camera size={28} strokeWidth={2.5} />}
                  onClick={() => pickPhoto(cameraInput)}
                >
                  {t("scan.camera")}
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  icon={<ImageUp size={28} strokeWidth={2.5} />}
                  onClick={() => pickPhoto(uploadInput)}
                >
                  {t("scan.upload")}
                </Button>
              </div>

              {photo ? (
                <Card className="flex flex-col gap-4">
                  <CardTitle icon={<ScanLine size={26} strokeWidth={2.5} />}>
                    {t("scan.selectedTitle")}
                  </CardTitle>
                  <Image
                    src={photo.url}
                    alt={t("scan.selectedTitle")}
                    width={640}
                    height={480}
                    unoptimized
                    className="h-auto w-full rounded-xl border-2 border-line"
                  />
                  <p className="text-[0.9rem] text-fg-muted">
                    {t("scan.fileLabel")}: {photo.name}
                  </p>
                  <p className="text-[0.9rem] text-fg">{t("scan.selectedHint")}</p>

                  {ocrError ? (
                    <WarningBanner title={t("scan.errorTitle")}>
                      <p>{ocrError}</p>
                    </WarningBanner>
                  ) : null}

                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    icon={<ScanLine size={26} strokeWidth={2.5} />}
                    onClick={() => void readPhoto()}
                  >
                    {ocrError ? t("scan.readAgain") : t("scan.readPhoto")}
                  </Button>
                  <Button
                    variant="warn"
                    size="md"
                    fullWidth
                    icon={<Trash2 size={24} strokeWidth={2.5} />}
                    onClick={removePhoto}
                  >
                    {t("scan.remove")}
                  </Button>
                </Card>
              ) : (
                <EmptyState
                  icon={<Camera size={36} strokeWidth={2.5} />}
                  title={t("scan.emptyTitle")}
                  message={t("scan.emptyBody")}
                />
              )}
            </>
          )}

          <Card className="flex flex-col gap-3">
            <CardTitle icon={<Lightbulb size={26} strokeWidth={2.5} />}>
              {t("scan.tipsTitle")}
            </CardTitle>
            <ul className="flex flex-col gap-2">
              {[t("scan.tip1"), t("scan.tip2"), t("scan.tip3")].map((tip) => (
                <li key={tip} className="flex gap-3 text-[0.95rem] text-fg">
                  <span aria-hidden="true" className="text-accent">
                    •
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}
