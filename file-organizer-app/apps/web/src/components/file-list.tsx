import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FolderOpen,
  ArrowRight,
  Check,
  X,
  Edit2,
  FileImage,
  FileText,
  FileArchive,
  FileVideo,
  FileAudio,
  File,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { FileClassification } from "@/lib/types";

interface FileListProps {
  classifications: FileClassification[];
  categories: string[];
  onUpdate: (classifications: FileClassification[]) => void;
}

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];
  const videoExts = ["mp4", "mkv", "avi", "mov", "webm"];
  const audioExts = ["mp3", "wav", "flac", "ogg", "m4a"];
  const archiveExts = ["zip", "rar", "7z", "tar", "gz"];
  const docExts = ["pdf", "doc", "docx", "txt", "md"];

  if (imageExts.includes(ext))
    return <FileImage className="h-4 w-4 text-blue-400" />;
  if (videoExts.includes(ext))
    return <FileVideo className="h-4 w-4 text-purple-400" />;
  if (audioExts.includes(ext))
    return <FileAudio className="h-4 w-4 text-green-400" />;
  if (archiveExts.includes(ext))
    return <FileArchive className="h-4 w-4 text-yellow-400" />;
  if (docExts.includes(ext))
    return <FileText className="h-4 w-4 text-orange-400" />;

  return <File className="h-4 w-4 text-gray-400" />;
}

function getConfidenceBadge(confidence: number) {
  if (confidence >= 0.9) {
    return <Badge variant="success">{(confidence * 100).toFixed(0)}%</Badge>;
  } else if (confidence >= 0.6) {
    return <Badge variant="warning">{(confidence * 100).toFixed(0)}%</Badge>;
  } else {
    return (
      <Badge variant="destructive">{(confidence * 100).toFixed(0)}%</Badge>
    );
  }
}

export function FileList({
  classifications,
  categories,
  onUpdate,
}: FileListProps) {
  const { t } = useTranslation();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleToggleSelect = (index: number) => {
    const updated = classifications.map((c, i) =>
      i === index ? { ...c, selected: !c.selected } : c,
    );
    onUpdate(updated);
  };

  const handleCategoryChange = (index: number, newCategory: string) => {
    const updated = classifications.map((c, i) =>
      i === index ? { ...c, suggested_folder: newCategory } : c,
    );
    onUpdate(updated);
    setEditingIndex(null);
  };

  const handleSelectAll = () => {
    const allSelected = classifications.every((c) => c.selected);
    const updated = classifications.map((c) => ({
      ...c,
      selected: !allSelected,
    }));
    onUpdate(updated);
  };

  const selectedCount = classifications.filter((c) => c.selected).length;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t("fileList.title")}</CardTitle>
            <CardDescription>
              {t("fileList.selectedCount", {
                selected: selectedCount,
                total: classifications.length,
              })}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            {classifications.every((c) => c.selected) ? (
              <>
                <X className="h-4 w-4 mr-1" />
                {t("actions.deselectAll")}
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                {t("actions.selectAll")}
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {classifications.map((file, idx) => (
              <div
                key={file.index}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  file.selected
                    ? "bg-primary/5 border-primary/30"
                    : "bg-muted/30 border-border/30 opacity-60"
                }`}
              >
                <Checkbox
                  id={`file-${file.index}`}
                  checked={file.selected}
                  onCheckedChange={() => handleToggleSelect(idx)}
                />

                <div className="flex-shrink-0">
                  {getFileIcon(file.filename)}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    title={file.filename}
                  >
                    {file.filename}
                  </p>
                  <p
                    className="text-xs text-muted-foreground truncate"
                    title={file.filepath}
                  >
                    {file.filepath}
                  </p>
                </div>

                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                {editingIndex === idx ? (
                  <Select
                    value={file.suggested_folder}
                    onValueChange={(value) => handleCategoryChange(idx, value)}
                    onOpenChange={(open) => {
                      if (!open) setEditingIndex(null);
                    }}
                  >
                    <SelectTrigger className="w-48 h-8">
                      <SelectValue placeholder={file.suggested_folder} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <button
                    onClick={() => setEditingIndex(idx)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/50 hover:bg-secondary transition-colors group"
                  >
                    <FolderOpen className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      {file.suggested_folder}
                    </span>
                    <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                  </button>
                )}

                <div className="flex-shrink-0 w-14 text-right">
                  {getConfidenceBadge(file.confidence)}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
