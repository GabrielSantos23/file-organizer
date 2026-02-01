import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toolbar } from "@/components/toolbar";
import { FolderTree } from "@/components/folder-tree";
import { FileBrowserTable } from "@/components/file-browser-table";
import { FileExplorerTable } from "@/components/file-explorer-table";
import { ScanningOverlay } from "@/components/analysis-progress";
import {
  selectDirectory,
  listDirectory,
  analyzeDirectory,
  moveFiles,
  getAvailableCategories,
  searchSemantic,
  getFilesByCategory,
} from "@/lib/tauri";
import type {
  FileItem,
  FileClassification,
  ListResult,
  AnalyzeResult,
  MoveResult,
  AppState,
} from "@/lib/types";
import {
  CheckCircle,
  RefreshCw,
  Sparkles,
  Copy,
  Wand2,
  AlertTriangle,
  Play,
  FolderOutput,
  Loader2,
} from "lucide-react";

import { z } from "zod";

export const Route = createFileRoute("/")({
  validateSearch: z.object({
    path: z.string().optional(),
    category: z.string().optional(),
  }),
  component: HomeComponent,
});

function HomeComponent() {
  const { t } = useTranslation();
  const [appState, setAppState] = useState<AppState>("idle");
  const [currentPath, setCurrentPath] = useState<string>("");
  const [destDir, setDestDir] = useState<string>("");

  const [listResult, setListResult] = useState<ListResult | null>(null);

  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(
    null,
  );
  const [classifications, setClassifications] = useState<FileClassification[]>(
    [],
  );
  const [categories, setCategories] = useState<string[]>([]);

  const [moveResult, setMoveResult] = useState<MoveResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [applyRenaming, setApplyRenaming] = useState(false);
  const [showRenamingPrompt, setShowRenamingPrompt] = useState(false);
  const [isSemanticSearch, setIsSemanticSearch] = useState(false);

  useEffect(() => {
    getAvailableCategories().then(setCategories).catch(console.error);
  }, []);

  const [history, setHistory] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);

  const { path, category } = Route.useSearch();
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (path) {
      if (category) {
        _loadCategory(path, category);
      } else {
        handleBrowse(path);
      }
    } else {
      // Initialize with home directory if no path is provided
      invoke<string>("get_home_directory")
        .then(handleBrowse)
        .catch(console.error);
    }
  }, [path, category]);

  const _loadCategory = async (path: string, category: string) => {
    setCurrentPath(path);
    setDestDir(path);
    setAppState("browsing");
    setAnalyzeResult(null);
    setClassifications([]);

    try {
      const files = await getFilesByCategory(path, category);
      setListResult({
        path,
        files: files,
        total_files: files.length,
        total_folders: 0,
      });
      setAppState("browsing");
    } catch (error) {
      toast.error(t("toast.error.openingFolder"), {
        description: String(error),
      });
      setAppState("idle");
    }
  };

  const _loadDirectory = async (path: string) => {
    setCurrentPath(path);
    setDestDir(path);
    setAppState("browsing");

    setAnalyzeResult(null);
    setClassifications([]);

    try {
      const result = await listDirectory(path);
      setListResult(result);
      setAppState("browsing");
    } catch (error) {
      toast.error(t("toast.error.openingFolder"), {
        description: String(error),
      });
      setAppState("idle");
    }
  };

  const handleBrowse = async (path: string) => {
    if (currentPath && currentPath !== path) {
      setHistory((prev) => [...prev, currentPath]);
      setFuture([]);
    }
    await _loadDirectory(path);
  };

  const handleBack = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    setFuture((prev) => [currentPath, ...prev]);
    setHistory(newHistory);
    _loadDirectory(previous);
  };

  const handleForward = () => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);

    setHistory((prev) => [...prev, currentPath]);
    setFuture(newFuture);
    _loadDirectory(next);
  };

  useEffect(() => {
    const handleMouseNav = (e: MouseEvent) => {
      if (e.button === 3) {
        e.preventDefault();
        handleBack();
      } else if (e.button === 4) {
        e.preventDefault();
        handleForward();
      }
    };

    window.addEventListener("mousedown", handleMouseNav);
    return () => window.removeEventListener("mousedown", handleMouseNav);
  }, [history, future, currentPath]);

  const handleSelectFolder = async () => {
    const dir = await selectDirectory(
      t("dialogs.selectFolderTitle") || "Select Folder",
    );
    if (dir) {
      handleBrowse(dir);
    }
  };

  const handleOpenFolder = (path: string) => {
    handleBrowse(path);
  };

  const handleAnalyze = async () => {
    if (!currentPath) return;

    setAppState("analyzing");
    setProgress(0);
    const interval = setInterval(
      () => setProgress((p) => Math.min(p + 2, 90)),
      200,
    );

    try {
      const result = await analyzeDirectory(currentPath);
      setAnalyzeResult(result);
      setClassifications(result.classifications);
      setProgress(100);
      setAppState("reviewing");

      toast.success(`${result.total_files} ${t("toasts.analyzedFiles")}`, {
        description:
          result.total_duplicates > 0
            ? `${result.total_duplicates} ${t("toasts.duplicatesFound")}`
            : `${result.images} ${t("toasts.imagesClassified")}`,
      });
    } catch (error) {
      toast.error(t("toasts.analysisError"), { description: String(error) });
      setAppState("browsing");
    } finally {
      clearInterval(interval);
    }
  };

  const handleMove = async () => {
    const selected = classifications.filter((c) => c.selected);
    if (selected.length === 0) return toast.error(t("toasts.selectOneFile"));

    setAppState("moving");
    setProgress(0);
    const interval = setInterval(
      () => setProgress((p) => Math.min(p + 2, 95)),
      100,
    );

    try {
      const result = await moveFiles(destDir, classifications, applyRenaming);
      setMoveResult(result);
      setProgress(100);
      setAppState("complete");
    } catch (error) {
      toast.error(t("toasts.moveError"), { description: String(error) });
      setAppState("reviewing");
    } finally {
      clearInterval(interval);
    }
  };

  const handleBackToBrowsing = () => {
    setAppState("browsing");
    setAnalyzeResult(null);
    setClassifications([]);
    setApplyRenaming(false);
    if (currentPath) _loadDirectory(currentPath);
  };

  const handleSemanticSearch = async (query: string) => {
    if (!query || !currentPath) return;

    setAppState("analyzing");
    setProgress(0);
    const interval = setInterval(
      () => setProgress((p) => Math.min(p + 5, 95)),
      300,
    );

    try {
      const results = await searchSemantic(currentPath, query);
      setAnalyzeResult({
        total_files: results.length,
        images: results.length,
        documents: 0,
        other_files: 0,
        classifications: results,
        scan_time: 0,
        total_duplicates: 0,
      });
      setClassifications(results);
      setProgress(100);
      setAppState("reviewing");

      if (results.length === 0) {
        toast.info("Nenhuma imagem similar encontrada.");
      } else {
        toast.success(`${results.length} imagens similares encontradas.`);
      }
    } catch (error) {
      toast.error("Erro na busca semântica", { description: String(error) });
      setAppState("browsing");
    } finally {
      clearInterval(interval);
    }
  };

  const handleReset = () => {
    setAppState("idle");
    setCurrentPath("");
    setListResult(null);
    setAnalyzeResult(null);
    setClassifications([]);
    setMoveResult(null);
    setApplyRenaming(false);
  };

  const selectedCount = classifications.filter((c) => c.selected).length;
  const hasRenamingSuggestions = classifications.some((c) => c.suggested_name);

  const filteredFiles = useMemo(() => {
    if (!listResult?.files || !searchQuery.trim()) {
      return listResult?.files ?? [];
    }
    const query = searchQuery.toLowerCase();
    return listResult.files.filter((file) =>
      file.filename.toLowerCase().includes(query),
    );
  }, [listResult?.files, searchQuery]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <Toolbar
        currentPath={currentPath}
        onScan={handleSelectFolder}
        onOrganize={appState === "reviewing" ? handleMove : handleAnalyze}
        onRefresh={() => currentPath && _loadDirectory(currentPath)}
        onBack={handleBack}
        onForward={handleForward}
        canGoBack={history.length > 0}
        canGoForward={future.length > 0}
        hasFiles={
          (listResult?.files.length ?? 0) > 0 || classifications.length > 0
        }
        isScanning={appState === "analyzing"}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isSemanticSearch={isSemanticSearch}
        onSemanticSearchToggle={setIsSemanticSearch}
        onSemanticSearch={handleSemanticSearch}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Folder Tree Sidebar */}
        <FolderTree currentPath={currentPath} onSelectFolder={handleBrowse} />

        {/* File List Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Browsing State - Show files normally */}
          {appState === "browsing" && listResult && (
            <>
              {/* Stats Bar */}
              <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="h-6">
                    {listResult.total_files} {t("home.files")}
                  </Badge>
                  <Badge variant="secondary" className="h-6">
                    {listResult.total_folders} {t("home.folders")}
                  </Badge>
                </div>

                <div className="flex-1" />

                {listResult.total_files > 0 && (
                  <Button
                    size="sm"
                    className="h-7 gap-1.5 text-xs rounded-md bg-primary hover:bg-primary/90"
                    onClick={handleAnalyze}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {t("home.analyzeWithAI")}
                  </Button>
                )}
              </div>

              {/* Simple File Browser */}
              <FileBrowserTable
                files={filteredFiles}
                onOpenFolder={handleOpenFolder}
              />
            </>
          )}

          {/* Analyzing State */}
          {appState === "analyzing" && (
            <div className="p-4">
              <ScanningOverlay progress={progress} />
            </div>
          )}

          {/* Reviewing State - After AI analysis */}
          {appState === "reviewing" && analyzeResult && (
            <>
              {/* Stats Bar with AI info */}
              <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-muted/30">
                <button
                  onClick={handleBackToBrowsing}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ← {t("home.back")}
                </button>

                <div className="flex items-center gap-2">
                  <Badge
                    variant="default"
                    className="h-6 gap-1 bg-primary/20 text-primary border-primary/30"
                  >
                    <Sparkles className="h-3 w-3" />
                    {analyzeResult.total_files} {t("home.analyzed")}
                  </Badge>
                  {analyzeResult.total_duplicates > 0 && (
                    <Badge variant="warning" className="h-6 gap-1">
                      <Copy className="h-3 w-3" />
                      {analyzeResult.total_duplicates} {t("home.duplicates")}
                    </Badge>
                  )}
                  {hasRenamingSuggestions && (
                    <Badge
                      variant={applyRenaming ? "default" : "secondary"}
                      className={`h-6 gap-1 cursor-pointer ${applyRenaming ? "bg-primary text-primary-foreground" : ""}`}
                      onClick={() => setShowRenamingPrompt(true)}
                    >
                      <Wand2 className="h-3 w-3" />
                      {
                        classifications.filter((c) => c.suggested_name).length
                      }{" "}
                      {t("home.renames")}
                    </Badge>
                  )}
                </div>

                <div className="flex-1" />

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={async () => {
                      const dir = await selectDirectory(
                        t("dialogs.destinationFolderTitle") ||
                          "Select Destination",
                      );
                      if (dir) setDestDir(dir);
                    }}
                  >
                    <FolderOutput className="h-3.5 w-3.5" />
                    {destDir.split("/").pop()}
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 gap-1.5 text-xs bg-primary hover:bg-primary/90"
                    disabled={selectedCount === 0}
                    onClick={handleMove}
                  >
                    <Play className="h-3.5 w-3.5" />
                    {t("home.organizeWithCount", { count: selectedCount })}
                  </Button>
                </div>
              </div>

              {/* Renaming Prompt */}
              {showRenamingPrompt && (
                <div className="mx-4 mt-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center justify-between animate-in fade-in zoom-in-95">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">
                      {t("home.smartRenamePrompt")}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7"
                      onClick={() => setShowRenamingPrompt(false)}
                    >
                      {t("home.no")}
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 bg-yellow-500 hover:bg-yellow-600"
                      onClick={() => {
                        setApplyRenaming(true);
                        setShowRenamingPrompt(false);
                        toast.success(t("toasts.renamingEnabled"));
                      }}
                    >
                      {t("home.yes")}
                    </Button>
                  </div>
                </div>
              )}

              {/* AI Classification Table */}
              <FileExplorerTable
                classifications={classifications}
                categories={categories}
                onUpdate={setClassifications}
                applyRenaming={applyRenaming}
              />
            </>
          )}

          {/* Moving State */}
          {appState === "moving" && (
            <div className="p-4">
              <ScanningOverlay
                progress={progress}
                currentFile={t("home.movingFiles") || "Moving files..."}
              />
            </div>
          )}

          {/* Complete State */}
          {appState === "complete" && moveResult && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">
                  {t("home.organizationComplete")}
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  {moveResult.successful} {t("home.filesOrganized")}
                </p>
                <div className="flex justify-center gap-3 mb-6">
                  <div className="px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-lg font-bold text-green-500">
                      {moveResult.successful}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("home.moved")}
                    </p>
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-lg font-bold text-yellow-500">
                      {moveResult.skipped}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("home.skipped")}
                    </p>
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-lg font-bold text-red-500">
                      {moveResult.failed}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("home.failed")}
                    </p>
                  </div>
                </div>
                <Button onClick={handleReset} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  {t("home.continue")}
                </Button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {appState === "idle" && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">File Organizer</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  {t("home.welcome")}
                </p>
                <Button onClick={handleSelectFolder} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  {t("home.selectFolder")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
