import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsDialog } from "@/components/settings-dialog";
import {
  FolderOpen,
  Sparkles,
  Copy,
  FileText,
  Wand2,
  Settings,
  Search,
  ChevronRight,
  Home,
  RefreshCw,
  ArrowLeft,
  ArrowUpCircle,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

interface ToolbarProps {
  currentPath: string;
  onScan: () => void;
  onOrganize: () => void;
  onRefresh: () => void;
  onBack: () => void;
  onForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  hasFiles: boolean;
  isScanning: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isSemanticSearch: boolean;
  onSemanticSearchToggle: (active: boolean) => void;
  onSemanticSearch: (query: string) => void;
}

const GITHUB_REPO = "GabrielSantos23/file-organizer";

export function Toolbar({
  currentPath,
  onScan,
  onOrganize,
  onRefresh,
  onBack,
  onForward,
  canGoBack,
  canGoForward,
  hasFiles,
  isScanning,
  searchQuery,
  onSearchChange,
  isSemanticSearch,
  onSemanticSearchToggle,
  onSemanticSearch,
}: ToolbarProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const pathParts = currentPath ? currentPath.split("/").filter(Boolean) : [];

  const [updateInfo, setUpdateInfo] = useState<{
    version: string;
    notes: string;
  } | null>(null);

  const [update, setUpdate] = useState<any | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();

        if (update?.available) {
          setUpdate(update);
          setUpdateInfo({
            version: update.version,
            notes: update.body || "Release notes not available.",
          });
        }
      } catch (error) {
        console.debug("Update check skipped or failed:", error);
      }
    };

    checkUpdate();
  }, []);

  const handleUpdate = async () => {
    if (!update) return;

    setIsUpdating(true);
    try {
      await update.downloadAndInstall();
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (error) {
      console.error("Failed to install update:", error);
      setIsUpdating(false);
    }
  };

  const { t } = useTranslation();

  return (
    <div className="border-b border-border bg-card">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={onScan}
        >
          <FolderOpen className="h-4 w-4" />
          <span>{t("toolbar.openFolder")}</span>
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={!hasFiles || isScanning}
          onClick={onOrganize}
        >
          <Sparkles className="h-4 w-4" />
          <span>{t("toolbar.organizeWithAI")}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={!hasFiles}
        >
          <Copy className="h-4 w-4" />
          <span>{t("toolbar.duplicates")}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={!hasFiles}
        >
          <Wand2 className="h-4 w-4" />
          <span>{t("toolbar.rename")}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={!hasFiles}
        >
          <FileText className="h-4 w-4" />
          <span>{t("toolbar.analyzeDocs")}</span>
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        {updateInfo && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
            onClick={() => setShowUpdate(true)}
          >
            <ArrowUpCircle className="h-4 w-4" />
            <span>Update Available</span>
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setShowSettings(true)}
        >
          <Settings className="h-4 w-4" />
          <span>{t("toolbar.settings")}</span>
        </Button>
      </div>

      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onBack}
            disabled={!canGoBack}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onForward}
            disabled={!canGoForward}
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onRefresh}
            disabled={!currentPath}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isScanning ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        <div className="flex-1 flex items-center gap-1 px-3 py-1.5 bg-muted/50 rounded-md border border-border text-sm">
          <Home className="h-3.5 w-3.5 text-muted-foreground" />
          {pathParts.length > 0 ? (
            <>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              {pathParts.slice(-3).map((part, i, arr) => (
                <span key={i} className="flex items-center gap-1">
                  <span
                    className={
                      i === arr.length - 1
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    {part}
                  </span>
                  {i < arr.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </span>
              ))}
            </>
          ) : (
            <span className="text-muted-foreground">
              {t("breadcrumb.selectFolderToStart")}
            </span>
          )}
        </div>

        <div className="relative w-72 flex gap-1">
          <div className="relative flex-1">
            <Search
              className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors ${isSemanticSearch ? "text-primary animate-pulse" : "text-muted-foreground"}`}
            />
            <Input
              placeholder={
                isSemanticSearch
                  ? t("toolbar.semanticPlaceholder")
                  : t("toolbar.searchPlaceholder")
              }
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isSemanticSearch) {
                  onSemanticSearch(searchQuery);
                }
              }}
              className={`h-8 pl-8 text-sm ${isSemanticSearch ? "ring-1 ring-primary/30 bg-primary/5" : "bg-muted/50"}`}
            />
          </div>
          <Button
            variant={isSemanticSearch ? "default" : "outline"}
            size="sm"
            className={`h-8 px-2 gap-1.5 ${isSemanticSearch ? "bg-primary" : "text-muted-foreground"}`}
            onClick={() => onSemanticSearchToggle(!isSemanticSearch)}
            title="Busca Semântica (CLIP)"
          >
            <Sparkles
              className={`h-3.5 w-3.5 ${isSemanticSearch ? "animate-spin-slow" : ""}`}
            />
            <span className="text-[10px] uppercase font-bold tracking-tight">
              IA
            </span>
          </Button>
        </div>
      </div>

      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />

      <Dialog open={showUpdate} onOpenChange={setShowUpdate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Available</DialogTitle>
            <DialogDescription>
              Version {updateInfo?.version} is available for download.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[300px] overflow-y-auto">
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
              {updateInfo?.notes}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpdate(false)}
              disabled={isUpdating}
            >
              Later
            </Button>
            <Button onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Installing...
                </>
              ) : (
                "Download & Install"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
