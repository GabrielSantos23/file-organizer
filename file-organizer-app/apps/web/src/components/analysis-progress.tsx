import { FileText, CheckCircle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AnalysisProgressProps {
  files: { name: string; progress: number; complete: boolean }[];
}

export function AnalysisProgress({ files }: AnalysisProgressProps) {
  return (
    <div className="space-y-3">
      {files.map((file, idx) => (
        <div key={idx} className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium truncate">{file.name}</p>
                {file.complete ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {file.progress}%
                  </span>
                )}
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    file.complete ? "bg-green-500" : "bg-primary"
                  }`}
                  style={{ width: `${file.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface ScanningOverlayProps {
  progress: number;
  currentFile?: string;
}

export function ScanningOverlay({
  progress,
  currentFile,
}: ScanningOverlayProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{t("analysis.analyzeWithAI")}</h3>
          <p className="text-sm text-muted-foreground">
            {currentFile
              ? `${t("analysis.processing")} ${currentFile}`
              : t("analysis.classifyingImages")}
          </p>
        </div>
        <span className="text-2xl font-bold text-primary">{progress}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
