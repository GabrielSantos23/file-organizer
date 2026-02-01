import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Trash2,
  AlertTriangle,
  Wand2,
  Sparkles,
  ArrowDown,
  Check,
  X,
  Folder,
  FileImage,
  FileText,
  FileArchive,
  FileVideo,
  FileAudio,
  File,
} from "lucide-react";
import type { FileItem } from "@/lib/types";
import type { FileClassification } from "@/lib/types";

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

function getFileIconByName(filename: string) {
  const ext = getFileExtension(filename);
  if (IMAGE_EXTS.includes(ext))
    return <FileImage className="h-4 w-4 text-blue-500" />;
  if (VIDEO_EXTS.includes(ext))
    return <FileVideo className="h-4 w-4 text-purple-500" />;
  if (AUDIO_EXTS.includes(ext))
    return <FileAudio className="h-4 w-4 text-green-500" />;
  if (ARCHIVE_EXTS.includes(ext))
    return <FileArchive className="h-4 w-4 text-yellow-500" />;
  if (DOC_EXTS.includes(ext))
    return <FileText className="h-4 w-4 text-orange-500" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

function getFileIconForItem(item: FileItem) {
  if (item.is_dir) return <Folder className="h-4 w-4 text-primary" />;
  return getFileIconByName(item.filename);
}

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileItem | FileClassification | null;
  newFileName: string;
  onNewFileNameChange: (value: string) => void;
  onConfirm: () => void;
  isDir?: boolean;
}

export function RenameDialog({
  open,
  onOpenChange,
  file,
  newFileName,
  onNewFileNameChange,
  onConfirm,
  isDir,
}: RenameDialogProps) {
  const { t } = useTranslation();
  const isDirectory = isDir ?? (file && "is_dir" in file ? file.is_dir : false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("dialogs.rename.title")}</DialogTitle>
          <DialogDescription>
            {t("dialogs.rename.description", {
              type: isDirectory
                ? t("dialogs.rename.folder")
                : t("dialogs.rename.file"),
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="newName" className="text-right">
              {t("dialogs.rename.nameLabel")}
            </Label>
            <Input
              id="newName"
              value={newFileName}
              onChange={(e) => onNewFileNameChange(e.target.value)}
              className="col-span-3"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && onConfirm()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("dialogs.rename.cancel")}
          </Button>
          <Button onClick={onConfirm}>{t("dialogs.rename.confirm")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileItem | null;
  onConfirm: () => void;
  fileIcon?: React.ReactNode;
}

export function DeleteDialog({
  open,
  onOpenChange,
  file,
  onConfirm,
  fileIcon,
}: DeleteDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {file?.is_dir
              ? t("dialogs.delete.titleFolder")
              : t("dialogs.delete.titleFile")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("dialogs.delete.description", {
              filename: file?.filename,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {file && (
          <div className="my-2 p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              {fileIcon || getFileIconForItem(file)}
              <span className="font-medium text-sm truncate">
                {file.filename}
              </span>
            </div>
            <p
              className="text-xs text-muted-foreground mt-1 truncate"
              title={file.filepath}
            >
              {file.filepath}
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            {t("dialogs.delete.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            <Trash2 className="h-4 w-4 mr-2" />
            {t("dialogs.delete.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface DeleteClassificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileClassification | null;
  onConfirm: () => void;
}

export function DeleteClassificationDialog({
  open,
  onOpenChange,
  file,
  onConfirm,
}: DeleteClassificationDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>{t("dialogs.delete.titleFile")}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {t("dialogs.delete.confirmDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {file && (
          <div className="my-4 p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2">
              {getFileIconByName(file.filename)}
              <span className="font-medium text-sm truncate">
                {file.filename}
              </span>
            </div>
            <p
              className="text-xs text-muted-foreground truncate"
              title={file.filepath}
            >
              <span className="font-medium">
                {t("dialogs.delete.location")}:
              </span>{" "}
              {file.filepath}
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            {t("dialogs.delete.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            <Trash2 className="h-4 w-4 mr-2" />
            {t("dialogs.delete.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface DuplicateDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileClassification | null;
  onConfirm: () => void;
}

export function DuplicateDeleteDialog({
  open,
  onOpenChange,
  file,
  onConfirm,
}: DuplicateDeleteDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-yellow-500/10">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            </div>
            <AlertDialogTitle>
              {t("dialogs.duplicateDelete.title")}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {t("dialogs.duplicateDelete.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {file && (
          <div className="my-4 p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2">
              {getFileIconByName(file.filename)}
              <span className="font-medium text-sm truncate">
                {file.filename}
              </span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="truncate" title={file.filepath}>
                <span className="font-medium">
                  {t("dialogs.duplicateDelete.location")}:
                </span>{" "}
                {file.filepath}
              </p>
              {file.duplicate_of && (
                <p className="truncate" title={file.duplicate_of}>
                  <span className="font-medium">
                    {t("dialogs.duplicateDelete.duplicateOf")}:
                  </span>{" "}
                  {file.duplicate_of}
                </p>
              )}
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            {t("dialogs.duplicateDelete.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            <Trash2 className="h-4 w-4 mr-2" />
            {t("dialogs.duplicateDelete.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface AIRenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileClassification | null;
  onConfirm: () => void;
}

export function AIRenameDialog({
  open,
  onOpenChange,
  file,
  onConfirm,
}: AIRenameDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 bg-transparent border-none shadow-none">
        <Card className="border-primary/20 shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-primary/10">
                <Wand2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">
                  {t("dialogs.renameWithAI.title")}
                </CardTitle>
                <CardDescription>
                  {t("dialogs.renameWithAI.description")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          {file && (
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-3">
                  {getFileIconByName(file.filename)}
                  <span className="font-medium text-sm">
                    {t("dialogs.renameWithAI.currentFile")}
                  </span>
                </div>
                <p
                  className="text-sm font-mono bg-background px-2 py-1 rounded truncate"
                  title={file.filename}
                >
                  {file.filename}
                </p>
              </div>

              <div className="flex items-center justify-center text-muted-foreground">
                <ArrowDown className="h-4 w-4" />
              </div>

              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm text-primary">
                    {t("dialogs.renameWithAI.suggestedName")}
                  </span>
                </div>
                <p
                  className="text-sm font-mono bg-background px-2 py-1 rounded truncate"
                  title={file.suggested_name}
                >
                  {file.suggested_name}
                </p>
              </div>
            </CardContent>
          )}

          <CardFooter className="flex justify-end gap-2 pt-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              {t("dialogs.renameWithAI.cancel")}
            </Button>
            <Button onClick={onConfirm}>
              <Check className="h-4 w-4 mr-2" />
              {t("dialogs.renameWithAI.confirm")}
            </Button>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderName: string;
  onFolderNameChange: (value: string) => void;
  onConfirm: () => void;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  folderName,
  onFolderNameChange,
  onConfirm,
}: CreateFolderDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("dialogs.createFolder.title")}</DialogTitle>
          <DialogDescription>
            {t("dialogs.createFolder.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="folderName" className="text-right">
              {t("dialogs.createFolder.nameLabel")}
            </Label>
            <Input
              id="folderName"
              value={folderName}
              onChange={(e) => onFolderNameChange(e.target.value)}
              className="col-span-3"
              placeholder={t("dialogs.createFolder.placeholder")}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && onConfirm()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("dialogs.createFolder.cancel")}
          </Button>
          <Button onClick={onConfirm}>
            {t("dialogs.createFolder.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
