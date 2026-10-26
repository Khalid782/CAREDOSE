"use client";

/**
 * Scan — placeholder for reading a prescription.
 *
 * The camera and upload buttons already work (they open the phone's own camera
 * or photo picker through a normal file input, which is what the Capacitor
 * build uses too). Reading the text is the next step, so the screen says so
 * instead of pretending to be clever.
 */

import { Camera, ImageUp, Lightbulb, ScanLine, Sparkles, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Card, CardTitle } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { WarningBanner } from "@/components/WarningBanner";
import { useTranslator } from "@/lib/i18n/useTranslator";

export default function ScanPage() {
  const { t } = useTranslator();
  const [photo, setPhoto] = useState<{ url: string; name: string } | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const uploadInput = useRef<HTMLInputElement>(null);

  // Blob URLs must be released, otherwise a long session leaks memory.
  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.url);
    };
  }, [photo]);

  const accept = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setPhoto((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return { url: URL.createObjectURL(file), name: file.name };
    });
  };

  return (
    <>
      <PageHeader title={t("scan.title")} subtitle={t("scan.subtitle")} />

      <WarningBanner tone="info" title={t("scan.nextTitle")}>
        <p>{t("scan.notice")}</p>
      </WarningBanner>

      <div className="flex flex-col gap-3">
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => accept(event.target.files)}
        />
        <input
          ref={uploadInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => accept(event.target.files)}
        />

        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={<Camera size={28} strokeWidth={2.5} />}
          onClick={() => cameraInput.current?.click()}
        >
          {t("scan.camera")}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          icon={<ImageUp size={28} strokeWidth={2.5} />}
          onClick={() => uploadInput.current?.click()}
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
          <Button
            variant="warn"
            size="md"
            fullWidth
            icon={<Trash2 size={24} strokeWidth={2.5} />}
            onClick={() => {
              setPhoto((previous) => {
                if (previous) URL.revokeObjectURL(previous.url);
                return null;
              });
            }}
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

      <Card className="flex flex-col gap-3">
        <CardTitle icon={<Sparkles size={26} strokeWidth={2.5} />}>
          {t("scan.nextTitle")}
        </CardTitle>
        <p className="text-[0.95rem] text-fg">{t("scan.nextBody")}</p>
      </Card>
    </>
  );
}
