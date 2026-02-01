import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
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
  Search,
  Filter,
  Copy,
  Wand2,
} from "lucide-react";
import type { FileClassification } from "@/lib/types";
import { useTranslation } from "react-i18next";

interface FileTableProps {
  classifications: FileClassification[];
  categories: string[];
  onUpdate: (classifications: FileClassification[]) => void;
  applyRenaming: boolean;
}

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];
  const videoExts = ["mp4", "mkv", "avi", "mov", "webm"];
  const audioExts = ["mp3", "wav", "flac", "ogg", "m4a"];
  const archiveExts = ["zip", "rar", "7z", "tar", "gz"];
  const docExts = ["pdf", "doc", "docx", "txt", "md"];

  if (imageExts.includes(ext))
    return <FileImage className="h-5 w-5 text-primary" />;
  if (videoExts.includes(ext))
    return <FileVideo className="h-5 w-5 text-purple-500" />;
  if (audioExts.includes(ext))
    return <FileAudio className="h-5 w-5 text-green-500" />;
  if (archiveExts.includes(ext))
    return <FileArchive className="h-5 w-5 text-yellow-500" />;
  if (docExts.includes(ext))
    return <FileText className="h-5 w-5 text-orange-500" />;

  return <File className="h-5 w-5 text-muted-foreground" />;
}

export function FileTable({
  classifications,
  categories,
  onUpdate,
  applyRenaming,
}: FileTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const filteredFiles = classifications.filter(
    (file) =>
      file.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.suggested_folder.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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

  const { t } = useTranslation();

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{t("badges.files")}</h2>
            <Badge variant="secondary" className="rounded-full">
              {classifications.length}
            </Badge>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("toolbar.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Button variant="outline" size="sm" className="h-9">
              <Filter className="h-4 w-4 mr-1" />
              {t("toolbar.filters")}
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left p-3 w-12">
                <Checkbox
                  checked={
                    classifications.length > 0 &&
                    classifications.every((c) => c.selected)
                  }
                  onCheckedChange={handleSelectAll}
                />
              </th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("common.filename")}
              </th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-48">
                {t("common.destination")}
              </th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-28">
                {t("common.status")}
              </th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">
                {t("common.action")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredFiles.map((file, idx) => {
              const originalIndex = classifications.findIndex(
                (c) => c.index === file.index,
              );

              return (
                <tr
                  key={file.index}
                  className={`transition-colors hover:bg-muted/30 ${
                    !file.selected ? "opacity-50" : ""
                  }`}
                >
                  <td className="p-3">
                    <Checkbox
                      checked={file.selected}
                      onCheckedChange={() => handleToggleSelect(originalIndex)}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        {getFileIcon(file.filename)}
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-sm font-medium truncate max-w-[300px]"
                          title={file.filename}
                        >
                          {file.filename}
                        </p>
                        {applyRenaming && file.suggested_name && (
                          <div className="flex items-center gap-1 text-[10px] text-primary font-medium mt-0.5 animate-in fade-in slide-in-from-left-1">
                            <Wand2 className="h-2.5 w-2.5" />
                            <span>
                              {t("common.suggestedName")} {file.suggested_name}
                            </span>
                          </div>
                        )}
                        <p
                          className="text-xs text-muted-foreground truncate max-w-[300px]"
                          title={file.filepath}
                        >
                          {file.filepath.split("/").slice(-2, -1)[0] || "~"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    {editingIndex === originalIndex ? (
                      <Select
                        value={file.suggested_folder}
                        onChange={(e) =>
                          handleCategoryChange(originalIndex, e.target.value)
                        }
                        className="h-8 text-sm"
                        autoFocus
                        onBlur={() => setEditingIndex(null)}
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <button
                        onClick={() => setEditingIndex(originalIndex)}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors group text-sm font-medium"
                      >
                        <span>{file.suggested_folder}</span>
                        <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                  </td>
                  <td className="p-3">
                    {file.is_duplicate ? (
                      <Badge
                        variant="warning"
                        className="gap-1 px-1.5 h-6 text-[10px]"
                      >
                        <Copy className="h-3 w-3" />
                        {t("common.duplicated")}
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted max-w-20 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              file.confidence >= 0.9
                                ? "bg-green-500"
                                : file.confidence >= 0.6
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${file.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {(file.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right text-muted-foreground">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:text-destructive"
                      onClick={() => handleToggleSelect(originalIndex)}
                    >
                      {file.selected ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-border bg-muted/20">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>{selectedCount} selecionados</span>
            {classifications.some((c) => c.is_duplicate) && (
              <span className="text-yellow-500 flex items-center gap-1 font-medium">
                <Copy className="h-3 w-3" />
                {classifications.filter((c) => c.is_duplicate).length}{" "}
                {t("common.ignoredDuplicate")}
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={handleSelectAll}>
            {classifications.every((c) => c.selected)
              ? t("toolbar.uncheckAll")
              : t("toolbar.checkAll")}
          </Button>
        </div>
      </div>
    </div>
  );
}
