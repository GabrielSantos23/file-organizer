import { useState, useEffect } from "react";
import { toast } from "sonner";
import { deleteFile, renameFile } from "@/lib/tauri";
import { readFile } from "@tauri-apps/plugin-fs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Folder,
  FileImage,
  FileText,
  FileArchive,
  FileVideo,
  FileAudio,
  File,
  Copy,
  Wand2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit,
  Sparkles,
  AlertTriangle,
  Check,
  X,
} from "lucide-react";
import type { FileClassification } from "@/lib/types";
import { useTranslation } from "react-i18next";
import {
  CreateFolderDialog,
  DuplicateDeleteDialog,
  AIRenameDialog,
  DeleteClassificationDialog,
} from "@/components/file-dialogs";

interface FileExplorerTableProps {
  classifications: FileClassification[];
  categories: string[];
  onUpdate: (classifications: FileClassification[]) => void;
  applyRenaming: boolean;
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

function getFileIcon(filename: string, isFolder = false) {
  if (isFolder) return <Folder className="h-4 w-4 text-primary" />;

  const fileType = getFileType(filename);

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

function formatSize(filename: string): string {
  const sizes = ["KB", "MB"];
  return `${Math.floor(Math.random() * 999) + 1} ${sizes[Math.floor(Math.random() * 2)]}`;
}

type SortField = "name" | "folder" | "confidence";
type SortDir = "asc" | "desc";

export function FileExplorerTable({
  classifications,
  categories,
  onUpdate,
  applyRenaming,
}: FileExplorerTableProps) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { t } = useTranslation();

  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [targetFileIndex, setTargetFileIndex] = useState<number | null>(null);

  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [newName, setNewName] = useState("");

  const [previewFile, setPreviewFile] = useState<FileClassification | null>(
    null,
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const [duplicateToDelete, setDuplicateToDelete] =
    useState<FileClassification | null>(null);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);

  const [renameTarget, setRenameTarget] = useState<FileClassification | null>(
    null,
  );
  const [isRenameCardOpen, setIsRenameCardOpen] = useState(false);

  const [fileToDelete, setFileToDelete] = useState<FileClassification | null>(
    null,
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
        console.error("Error loading file:", error);
        toast.error("Erro ao carregar preview do arquivo");
      } finally {
        setIsLoadingPreview(false);
      }
    };

    loadFile();
  }, [previewFile, isPreviewOpen]);

  const handleDoubleClick = (file: FileClassification) => {
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

  const sortedFiles = [...classifications].sort((a, b) => {
    let cmp = 0;
    if (sortField === "name") cmp = a.filename.localeCompare(b.filename);
    if (sortField === "folder")
      cmp = a.suggested_folder.localeCompare(b.suggested_folder);
    if (sortField === "confidence") cmp = a.confidence - b.confidence;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const handleToggleSelect = (index: number) => {
    const updated = classifications.map((c, i) =>
      i === index ? { ...c, selected: !c.selected } : c,
    );
    onUpdate(updated);
  };

  const handleCategoryChange = (index: number, newCategory: string) => {
    if (newCategory === "__NEW_FOLDER__") {
      setTargetFileIndex(index);
      setNewFolderName("");
      setIsNewFolderDialogOpen(true);
      return;
    }

    const updated = classifications.map((c) => {
      if (c.index === index) {
        return {
          ...c,
          suggested_folder: newCategory,
          confidence: 1.0,
        };
      }
      return c;
    });

    onUpdate(updated);
  };

  const handleCreateCustomFolder = () => {
    if (!newFolderName.trim() || targetFileIndex === null) return;

    const updated = classifications.map((c) => {
      if (c.index === targetFileIndex) {
        return {
          ...c,
          suggested_folder: newFolderName.trim(),
          confidence: 1.0,
        };
      }
      return c;
    });

    onUpdate(updated);
    setIsNewFolderDialogOpen(false);
    setNewFolderName("");
    setTargetFileIndex(null);
  };

  const handleSelectAll = () => {
    const allSelected = classifications.every((c) => c.selected);
    onUpdate(classifications.map((c) => ({ ...c, selected: !allSelected })));
  };

  const handleDuplicate = (file: FileClassification) => {
    const newFile = {
      ...file,
      index: Math.max(...classifications.map((c) => c.index)) + 1,
      filename: `Copy of ${file.filename}`,
      is_duplicate: true,
    };
    onUpdate([...classifications, newFile]);
    toast.info("Duplicata criada na lista (visual apenas)");
  };

  const handleDelete = async (index: number, filepath: string) => {
    try {
      await deleteFile(filepath);
      const updated = classifications.filter((c) => c.index !== index);
      onUpdate(updated);
      toast.success("Arquivo deletado com sucesso");
    } catch (error) {
      toast.error(`Erro ao deletar arquivo: ${error}`);
    } finally {
      setFileToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const openDeleteDialog = (file: FileClassification) => {
    setFileToDelete(file);
    setIsDeleteDialogOpen(true);
  };

  const handleRename = async (
    index: number,
    oldName: string,
    newName: string,
    filepath: string,
  ) => {
    if (!newName || newName === oldName) {
      setRenamingId(null);
      return;
    }

    try {
      await renameFile(filepath, newName);

      const separator = filepath.includes("\\") ? "\\" : "/";
      const pathParts = filepath.split(separator);
      pathParts.pop();
      const newPath = [...pathParts, newName].join(separator);

      const updated = classifications.map((c) =>
        c.index === index ? { ...c, filename: newName, filepath: newPath } : c,
      );
      onUpdate(updated);
      toast.success("Arquivo renomeado com sucesso");
    } catch (error) {
      toast.error(`Erro ao renomear arquivo: ${error}`);
    } finally {
      setRenamingId(null);
    }
  };

  const handleAIRename = (index: number, currentName: string) => {
    const file = classifications.find((c) => c.index === index);
    if (!file) return;

    const suggestion =
      file.suggested_name || `${file.suggested_folder}_${currentName}`;

    setRenamingId(index);
    setNewName(suggestion);
    toast.info("Sugestão de nome aplicada. Pressione Enter para confirmar.");
  };

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
    <div className="flex-1 overflow-auto bg-background pb-32">
      <div className="min-w-[800px]">
        <div className="sticky top-0 bg-card border-b border-border z-10 shadow-sm flex items-center text-sm font-medium text-muted-foreground">
          <div className="p-2 w-[40px] flex justify-center">
            <Checkbox
              checked={
                classifications.length > 0 &&
                classifications.every((c) => c.selected)
              }
              onCheckedChange={handleSelectAll}
            />
          </div>
          <div className="p-2 flex-1">
            <button
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => handleSort("name")}
            >
              Nome <SortIcon field="name" />
            </button>
          </div>
          <div className="p-2 w-[220px]">
            <button
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => handleSort("folder")}
            >
              Destino (IA) <SortIcon field="folder" />
            </button>
          </div>
          <div className="p-2 w-[120px]">
            <button
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => handleSort("confidence")}
            >
              Confiança <SortIcon field="confidence" />
            </button>
          </div>
          <div className="p-2 w-[100px] text-xs font-medium text-muted-foreground">
            Tamanho
          </div>
          <div className="p-2 w-[50px]"></div>
        </div>

        <div>
          {sortedFiles.map((file) => {
            const originalIndex = classifications.findIndex(
              (c) => c.index === file.index,
            );

            return (
              <ContextMenu key={file.index}>
                <ContextMenuTrigger>
                  <div
                    className={`flex items-center border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer text-sm ${
                      !file.selected ? "opacity-40 grayscale" : ""
                    } ${file.is_duplicate ? "bg-yellow-500/5" : ""}`}
                    onDoubleClick={() => handleDoubleClick(file)}
                  >
                    <div
                      className="p-2 w-[40px] flex justify-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={file.selected}
                        onCheckedChange={() =>
                          handleToggleSelect(originalIndex)
                        }
                      />
                    </div>
                    <div className="p-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {getFileIcon(file.filename)}
                        <div className="min-w-0 flex-1">
                          {renamingId === file.index ? (
                            <Input
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              onBlur={() =>
                                handleRename(
                                  file.index,
                                  file.filename,
                                  newName,
                                  file.filepath,
                                )
                              }
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleRename(
                                    file.index,
                                    file.filename,
                                    newName,
                                    file.filepath,
                                  );
                                if (e.key === "Escape") setRenamingId(null);
                              }}
                              autoFocus
                              className="h-6 text-xs"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span
                                className="truncate max-w-[300px] font-medium"
                                title={file.filename}
                              >
                                {file.filename}
                              </span>
                              {file.is_duplicate && (
                                <Badge
                                  variant="warning"
                                  className="h-5 text-[10px] gap-0.5 px-1 cursor-pointer hover:bg-yellow-500/30 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDuplicateToDelete(file);
                                    setIsDuplicateDialogOpen(true);
                                  }}
                                >
                                  <Copy className="h-2.5 w-2.5" /> Duplicado
                                </Badge>
                              )}
                              {applyRenaming && file.suggested_name && (
                                <Badge
                                  variant="default"
                                  className="h-5 text-[10px] gap-0.5 px-1 bg-primary/20 text-primary border-primary/30 cursor-pointer hover:bg-primary/30 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRenameTarget(file);
                                    setIsRenameCardOpen(true);
                                  }}
                                >
                                  <Wand2 className="h-2.5 w-2.5" /> →{" "}
                                  {file.suggested_name}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="p-2 w-[220px]">
                      <DropdownMenu>
                        <DropdownMenuTrigger disabled={!file.selected}>
                          <button
                            className="flex items-center justify-between w-full p-1.5 text-xs text-left rounded-md hover:bg-background border border-transparent hover:border-border transition-all group disabled:opacity-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <Folder className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                              <span className="truncate text-primary font-medium">
                                {file.suggested_folder}
                              </span>
                            </div>
                            <ChevronDown className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          className="h-64 min-w-[200px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>
                              Selecione o destino
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() =>
                                handleCategoryChange(
                                  file.index,
                                  "__NEW_FOLDER__",
                                )
                              }
                              className="gap-2 text-primary font-medium !bg-primary/5 focus:!bg-primary/10"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Nova Pasta Personalizada...
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {categories.map((cat) => (
                              <DropdownMenuItem
                                key={cat}
                                onClick={() =>
                                  handleCategoryChange(file.index, cat)
                                }
                                className="gap-2"
                              >
                                <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                                {cat}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="p-2 w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              file.confidence >= 0.9
                                ? "bg-green-500"
                                : file.confidence >= 0.6
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${file.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8">
                          {(file.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="p-2 w-[100px] text-xs text-muted-foreground">
                      {formatSize(file.filename)}
                    </div>
                    <div
                      className="p-2 w-[50px] flex justify-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-6 w-6"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setRenamingId(file.index);
                              setNewName(file.filename);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Renomear
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleAIRename(file.index, file.filename)
                            }
                          >
                            <Sparkles className="mr-2 h-4 w-4" />
                            Renomear com IA
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(file)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => openDeleteDialog(file)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Deletar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    onClick={() => {
                      setRenamingId(file.index);
                      setNewName(file.filename);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Renomear
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => handleAIRename(file.index, file.filename)}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Renomear com IA
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleDuplicate(file)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicar
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => openDeleteDialog(file)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Deletar
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>
      </div>

      {classifications.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Folder className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">Nenhum arquivo encontrado</p>
          <p className="text-xs">Selecione uma pasta para começar</p>
        </div>
      )}

      {/* New Folder Dialog */}
      <CreateFolderDialog
        open={isNewFolderDialogOpen}
        onOpenChange={setIsNewFolderDialogOpen}
        folderName={newFolderName}
        onFolderNameChange={setNewFolderName}
        onConfirm={handleCreateCustomFolder}
      />

      <DuplicateDeleteDialog
        open={isDuplicateDialogOpen}
        onOpenChange={setIsDuplicateDialogOpen}
        file={duplicateToDelete}
        onConfirm={async () => {
          if (duplicateToDelete) {
            try {
              await deleteFile(duplicateToDelete.filepath);
              const updated = classifications.filter(
                (c) => c.index !== duplicateToDelete.index,
              );
              onUpdate(updated);
              toast.success("Arquivo duplicado excluído com sucesso");
            } catch (error) {
              toast.error(`Erro ao excluir: ${error}`);
            }
          }
          setDuplicateToDelete(null);
          setIsDuplicateDialogOpen(false);
        }}
      />

      <AIRenameDialog
        open={isRenameCardOpen}
        onOpenChange={setIsRenameCardOpen}
        file={renameTarget}
        onConfirm={async () => {
          if (renameTarget && renameTarget.suggested_name) {
            try {
              await renameFile(
                renameTarget.filepath,
                renameTarget.suggested_name,
              );

              const separator = renameTarget.filepath.includes("\\")
                ? "\\"
                : "/";
              const pathParts = renameTarget.filepath.split(separator);
              pathParts.pop();
              const newPath = [...pathParts, renameTarget.suggested_name].join(
                separator,
              );

              const updated = classifications.map((c) =>
                c.index === renameTarget.index
                  ? {
                      ...c,
                      filename: renameTarget.suggested_name!,
                      filepath: newPath,
                      suggested_name: undefined,
                    }
                  : c,
              );
              onUpdate(updated);
              toast.success("Arquivo renomeado com sucesso");
            } catch (error) {
              toast.error(`Erro ao renomear: ${error}`);
            }
          }
          setRenameTarget(null);
          setIsRenameCardOpen(false);
        }}
      />

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50">
          {previewFile && (
            <>
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <div className="flex items-center gap-3 min-w-0">
                  {getFileIcon(previewFile.filename)}
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
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {previewFile.suggested_folder}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-center p-6 min-h-[400px] max-h-[calc(90vh-120px)] overflow-auto bg-muted/20">
                {isLoadingPreview ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">
                      Carregando preview...
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
                            Erro ao carregar imagem
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
                            Erro ao carregar PDF
                          </div>
                        );

                      case "video":
                        return (
                          <div className="flex flex-col items-center gap-4 p-8 text-center">
                            <div className="w-24 h-24 rounded-2xl bg-muted/50 flex items-center justify-center">
                              <FileVideo className="h-12 w-12 text-purple-500" />
                            </div>
                            <div>
                              <p className="text-lg font-medium mb-1">
                                Preview de Vídeo Indisponível
                              </p>
                              <p className="text-sm text-muted-foreground mb-4">
                                A visualização foi desativada para garantir a
                                estabilidade do app.
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
                              Seu navegador não suporta a reprodução de áudio.
                            </audio>
                          </div>
                        ) : (
                          <div className="text-muted-foreground">
                            Erro ao carregar áudio
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
                                Preview não disponível
                              </p>
                              <p className="text-sm text-muted-foreground mb-4">
                                Este tipo de arquivo não pode ser visualizado
                                diretamente.
                              </p>
                            </div>
                            <div className="flex flex-col gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-4 min-w-[300px]">
                              <div className="flex justify-between">
                                <span>Tipo:</span>
                                <span className="font-medium text-foreground">
                                  {getFileExtension(
                                    previewFile.filename,
                                  ).toUpperCase() || "Desconhecido"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Destino IA:</span>
                                <span className="font-medium text-foreground">
                                  {previewFile.suggested_folder}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Confiança:</span>
                                <span className="font-medium text-foreground">
                                  {(previewFile.confidence * 100).toFixed(0)}%
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

      <DeleteClassificationDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) setFileToDelete(null);
        }}
        file={fileToDelete}
        onConfirm={() => {
          if (fileToDelete) {
            handleDelete(fileToDelete.index, fileToDelete.filepath);
          }
        }}
      />
    </div>
  );
}
