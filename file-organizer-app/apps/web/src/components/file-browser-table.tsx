import {
  Folder,
  FolderOpen,
  FileImage,
  FileText,
  FileArchive,
  FileVideo,
  FileAudio,
  File,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  FolderOpen as FolderOpenIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { FileItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { readFile } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";
import { deleteFile, renameFile } from "@/lib/tauri";
import { useTranslation } from "react-i18next";
import { RenameDialog, DeleteDialog } from "@/components/file-dialogs";
interface FileBrowserTableProps {
  files: FileItem[];
  onOpenFolder: (path: string) => void;
}

const IMAGE_EXTS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "svg",
  "ico",
  "tiff",
];
const VIDEO_EXTS = ["mp4", "mkv", "avi", "mov", "webm", "flv", "wmv"];
const AUDIO_EXTS = ["mp3", "wav", "flac", "ogg", "m4a", "aac", "wma"];
const ARCHIVE_EXTS = ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"];
const DOC_EXTS = ["pdf", "doc", "docx", "txt", "md", "rtf", "odt"];

function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

function getFileType(
  filename: string,
): "image" | "video" | "audio" | "archive" | "document" | "pdf" | "other" {
  const ext = getFileExtension(filename);
  if (ext === "pdf") return "pdf";
  if (IMAGE_EXTS.includes(ext)) return "image";
  if (VIDEO_EXTS.includes(ext)) return "video";
  if (AUDIO_EXTS.includes(ext)) return "audio";
  if (ARCHIVE_EXTS.includes(ext)) return "archive";
  if (DOC_EXTS.includes(ext)) return "document";
  return "other";
}

function getFileIcon(item: FileItem) {
  if (item.is_dir) return <Folder className="h-4 w-4 text-primary" />;

  const fileType = getFileType(item.filename);

  switch (fileType) {
    case "image":
      return <FileImage className="h-4 w-4 text-blue-500" />;
    case "video":
      return <FileVideo className="h-4 w-4 text-purple-500" />;
    case "audio":
      return <FileAudio className="h-4 w-4 text-green-500" />;
    case "archive":
      return <FileArchive className="h-4 w-4 text-yellow-500" />;
    case "pdf":
    case "document":
      return <FileText className="h-4 w-4 text-orange-500" />;
    default:
      return <File className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

type SortField = "name" | "modified" | "size";
type SortDir = "asc" | "desc";

export function FileBrowserTable({
  files,
  onOpenFolder,
}: FileBrowserTableProps) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const [renamingFile, setRenamingFile] = useState<FileItem | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { t } = useTranslation();

  const handleRename = async () => {
    if (
      !renamingFile ||
      !newFileName ||
      newFileName === renamingFile.filename
    ) {
      setIsRenameDialogOpen(false);
      setRenamingFile(null);
      return;
    }

    try {
      await renameFile(renamingFile.filepath, newFileName);
      toast.success(t("toast.success.fileRenamed"));
      setIsRenameDialogOpen(false);
      setRenamingFile(null);
      window.location.reload();
    } catch (error) {
      toast.error(t("toast.error.renaming"));
    }
  };

  const handleDelete = async () => {
    if (!fileToDelete) return;

    try {
      await deleteFile(fileToDelete.filepath);
      toast.success(
        fileToDelete.is_dir
          ? t("toast.success.folderDeleted")
          : t("toast.success.fileDeleted"),
      );
      setIsDeleteDialogOpen(false);
      setFileToDelete(null);
      window.location.reload();
    } catch (error) {
      toast.error(t("toast.error.deleting"));
    }
  };

  const handleCopyPath = (filepath: string) => {
    navigator.clipboard.writeText(filepath);
    toast.success(t("toast.success.pathCopied"));
  };

  useEffect(() => {
    if (!previewFile || !isPreviewOpen) {
      setPreviewDataUrl(null);
      return;
    }

    const fileType = getFileType(previewFile.filename);
    if (fileType !== "image" && fileType !== "pdf" && fileType !== "audio") {
      return;
    }

    const loadFile = async () => {
      setIsLoadingPreview(true);
      try {
        const data = await readFile(previewFile.filepath);
        const ext = getFileExtension(previewFile.filename);

        let mimeType = "application/octet-stream";
        if (["jpg", "jpeg"].includes(ext)) mimeType = "image/jpeg";
        else if (ext === "png") mimeType = "image/png";
        else if (ext === "gif") mimeType = "image/gif";
        else if (ext === "webp") mimeType = "image/webp";
        else if (ext === "svg") mimeType = "image/svg+xml";
        else if (ext === "bmp") mimeType = "image/bmp";
        else if (ext === "ico") mimeType = "image/x-icon";
        else if (ext === "pdf") mimeType = "application/pdf";
        else if (ext === "mp4") mimeType = "video/mp4";
        else if (ext === "webm") mimeType = "video/webm";
        else if (ext === "mp3") mimeType = "audio/mpeg";
        else if (ext === "wav") mimeType = "audio/wav";
        else if (ext === "ogg") mimeType = "audio/ogg";

        const base64 = btoa(
          new Uint8Array(data).reduce(
            (acc, byte) => acc + String.fromCharCode(byte),
            "",
          ),
        );
        setPreviewDataUrl(`data:${mimeType};base64,${base64}`);
      } catch (error) {
        console.error(t("toast.error.filePreview"), error);
        toast.error(t("toast.error.filePreview"));
      } finally {
        setIsLoadingPreview(false);
      }
    };

    loadFile();
  }, [previewFile, isPreviewOpen]);

  const handleDoubleClick = (file: FileItem) => {
    setPreviewFile(file);
    setIsPreviewOpen(true);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedFiles = [...files].sort((a, b) => {
    if (a.is_dir && !b.is_dir) return -1;
    if (!a.is_dir && b.is_dir) return 1;

    let cmp = 0;
    if (sortField === "name") cmp = a.filename.localeCompare(b.filename);
    if (sortField === "modified") cmp = a.modified.localeCompare(b.modified);
    if (sortField === "size") cmp = a.size_bytes - b.size_bytes;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="h-3 w-3 text-primary" />
    );
  };

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="min-w-[800px]">
        <div className="sticky top-0 bg-card border-b border-border z-10 shadow-sm flex items-center text-sm font-medium text-muted-foreground">
          <div className="p-2 pl-4 flex-1">
            <button
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => handleSort("name")}
            >
              {t("toolbar.name")} <SortIcon field="name" />
            </button>
          </div>
          <div className="p-2 w-[160px]">
            <button
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => handleSort("modified")}
            >
              {t("toolbar.modified")} <SortIcon field="modified" />
            </button>
          </div>
          <div className="p-2 w-[100px] text-right pr-4">
            <button
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground ml-auto"
              onClick={() => handleSort("size")}
            >
              {t("toolbar.size")} <SortIcon field="size" />
            </button>
          </div>
        </div>

        <div>
          {sortedFiles.map((file) => (
            <ContextMenu key={file.filepath}>
              <ContextMenuTrigger>
                <div
                  className={`flex items-center border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer text-sm`}
                  onDoubleClick={() =>
                    file.is_dir
                      ? onOpenFolder(file.filepath)
                      : handleDoubleClick(file)
                  }
                >
                  <div className="p-2 pl-4 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getFileIcon(file)}
                      <span
                        className={`truncate max-w-[400px] ${file.is_dir ? "font-medium" : ""}`}
                      >
                        {file.filename}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 w-[160px] text-muted-foreground text-xs">
                    {file.modified}
                  </div>
                  <div className="p-2 w-[100px] text-right pr-4 text-muted-foreground text-xs">
                    {file.is_dir ? "-" : formatSize(file.size_bytes)}
                  </div>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                {file.is_dir && (
                  <>
                    <ContextMenuItem
                      onClick={() => onOpenFolder(file.filepath)}
                    >
                      <FolderOpenIcon className="mr-2 h-4 w-4" />
                      {t("toolbar.openFolder")}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                  </>
                )}
                <ContextMenuItem
                  onClick={() => {
                    setRenamingFile(file);
                    setNewFileName(file.filename);
                    setIsRenameDialogOpen(true);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  {t("toolbar.rename")}
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleCopyPath(file.filepath)}>
                  <Copy className="mr-2 h-4 w-4" />
                  {t("contextMenu.copyPath")}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    setFileToDelete(file);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {file.is_dir
                    ? t("contextMenu.deleteFolder")
                    : t("contextMenu.deleteFile")}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
      </div>

      {files.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">{t("browser.emptyFolder")}</p>
        </div>
      )}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50">
          {previewFile && (
            <>
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <div className="flex items-center gap-3 min-w-0">
                  {getFileIcon(previewFile)}
                  <div className="min-w-0">
                    <h3
                      className="font-semibold truncate"
                      title={previewFile.filename}
                    >
                      {previewFile.filename}
                    </h3>
                    <p
                      className="text-xs text-muted-foreground truncate"
                      title={previewFile.filepath}
                    >
                      {previewFile.filepath}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mr-6">
                  <Badge variant="outline" className="text-xs">
                    {formatSize(previewFile.size_bytes)}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-center p-6 min-h-[400px] max-h-[calc(90vh-120px)] overflow-auto bg-muted/20">
                {isLoadingPreview ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">
                      {t("analysis.loadingPreview")}
                    </p>
                  </div>
                ) : (
                  (() => {
                    const fileType = getFileType(previewFile.filename);

                    switch (fileType) {
                      case "image":
                        return previewDataUrl ? (
                          <img
                            src={previewDataUrl}
                            alt={previewFile.filename}
                            className="max-w-full max-h-[calc(90vh-180px)] object-contain rounded-lg shadow-2xl"
                          />
                        ) : (
                          <div className="text-muted-foreground">
                            {t("preview.errorLoadingImage")}
                          </div>
                        );

                      case "pdf":
                        return previewDataUrl ? (
                          <iframe
                            src={previewDataUrl}
                            className="w-full h-[calc(90vh-180px)] rounded-lg border-0"
                            title={previewFile.filename}
                          />
                        ) : (
                          <div className="text-muted-foreground">
                            {t("preview.errorLoadingPdf")}
                          </div>
                        );

                      case "video":
                        return (
                          <div className="flex flex-col items-center gap-4 p-8 text-center">
                            <div className="w-24 h-24 rounded-2xl bg-muted/50 flex items-center justify-center">
                              <FileVideo className="h-12 w-12 text-primary" />
                            </div>
                            <div>
                              <p className="text-lg font-medium mb-1">
                                {t("preview.videoUnavailable")}
                              </p>
                              <p className="text-sm text-muted-foreground mb-4">
                                {t("preview.videoDisabledReason")}
                              </p>
                            </div>
                          </div>
                        );

                      case "audio":
                        return previewDataUrl ? (
                          <div className="flex flex-col items-center gap-6 p-8">
                            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                              <FileAudio className="h-16 w-16 text-green-500" />
                            </div>
                            <audio
                              src={previewDataUrl}
                              controls
                              className="w-full max-w-md"
                            >
                              {t("preview.audioNotSupported")}
                            </audio>
                          </div>
                        ) : (
                          <div className="text-muted-foreground">
                            {t("preview.errorLoadingAudio")}
                          </div>
                        );

                      default:
                        return (
                          <div className="flex flex-col items-center gap-4 p-8 text-center">
                            <div className="w-24 h-24 rounded-2xl bg-muted/50 flex items-center justify-center">
                              {getFileType(previewFile.filename) ===
                              "archive" ? (
                                <FileArchive className="h-12 w-12 text-yellow-500" />
                              ) : getFileType(previewFile.filename) ===
                                "document" ? (
                                <FileText className="h-12 w-12 text-orange-500" />
                              ) : (
                                <File className="h-12 w-12 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="text-lg font-medium mb-1">
                                {t("preview.notAvailable")}
                              </p>
                              <p className="text-sm text-muted-foreground mb-4">
                                {t("preview.notAvailableReason")}
                              </p>
                            </div>
                            <div className="flex flex-col gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-4 min-w-[300px]">
                              <div className="flex justify-between">
                                <span>{t("preview.type")}:</span>
                                <span className="font-medium text-foreground">
                                  {getFileExtension(
                                    previewFile.filename,
                                  ).toUpperCase() || t("preview.unknown")}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>{t("preview.size")}:</span>
                                <span className="font-medium text-foreground">
                                  {formatSize(previewFile.size_bytes)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                    }
                  })()
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <RenameDialog
        open={isRenameDialogOpen}
        onOpenChange={(open) => {
          setIsRenameDialogOpen(open);
          if (!open) setRenamingFile(null);
        }}
        file={renamingFile}
        newFileName={newFileName}
        onNewFileNameChange={setNewFileName}
        onConfirm={handleRename}
      />

      <DeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) setFileToDelete(null);
        }}
        file={fileToDelete}
        onConfirm={handleDelete}
        fileIcon={fileToDelete ? getFileIcon(fileToDelete) : undefined}
      />
    </div>
  );
}
