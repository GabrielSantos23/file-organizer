import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileImage, FileText, File, Clock, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AnalyzeResult } from "@/lib/types";

interface ScanSummaryProps {
  result: AnalyzeResult;
}

export function ScanSummary({ result }: ScanSummaryProps) {
  const { t } = useTranslation();
  const imagePercent = (result.images / result.total_files) * 100;
  const docPercent = (result.documents / result.total_files) * 100;
  const otherPercent = (result.other_files / result.total_files) * 100;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <CardTitle className="text-lg">{t("scanSummary.title")}</CardTitle>
        </div>
        <CardDescription className="flex items-center gap-2">
          <Clock className="h-3 w-3" />
          {result.scan_time.toFixed(2)}s
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <FileImage className="h-6 w-6 mx-auto mb-1 text-blue-400" />
            <p className="text-2xl font-bold text-blue-400">{result.images}</p>
            <p className="text-xs text-muted-foreground">
              {t("scanSummary.images")}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <FileText className="h-6 w-6 mx-auto mb-1 text-orange-400" />
            <p className="text-2xl font-bold text-orange-400">
              {result.documents}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("scanSummary.documents")}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <File className="h-6 w-6 mx-auto mb-1 text-purple-400" />
            <p className="text-2xl font-bold text-purple-400">
              {result.other_files}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("scanSummary.others")}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t("scanSummary.distribution")}
            </span>
            <span className="font-medium">
              {result.total_files} {t("scanSummary.files")}
            </span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-secondary">
            <div
              className="bg-blue-500 transition-all"
              style={{ width: `${imagePercent}%` }}
              title={`${t("scanSummary.images")}: ${result.images}`}
            />
            <div
              className="bg-orange-500 transition-all"
              style={{ width: `${docPercent}%` }}
              title={`${t("scanSummary.documents")}: ${result.documents}`}
            />
            <div
              className="bg-purple-500 transition-all"
              style={{ width: `${otherPercent}%` }}
              title={`${t("scanSummary.others")}: ${result.other_files}`}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              {imagePercent.toFixed(0)}%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              {docPercent.toFixed(0)}%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              {otherPercent.toFixed(0)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
