import { useState, useEffect, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { PieChart } from "@mui/x-charts/PieChart";

import {
  HardDrive,
  FileText,
  Files,
  FolderOpen,
  MoreVertical,
  ChevronRight,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Code,
  FileBox,
  Box,
  Library,
  Database,
  Book,
  Settings,
  Table,
  Presentation,
} from "lucide-react";
import { motion } from "framer-motion";
import { z } from "zod";

import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FolderTree } from "@/components/folder-tree";
import { Toolbar } from "@/components/toolbar";
import { FileBrowserTable } from "@/components/file-browser-table";
import { getMountedDrives, selectDirectory } from "@/lib/tauri";
import type { FileItem, StorageStats, DriveInfo } from "@/lib/types";

export const Route = createFileRoute("/dashboard")({
  validateSearch: z.object({
    path: z.string().optional(),
  }),
  component: DashboardComponent,
});

const CATEGORY_COLORS: Record<string, string> = {
  Images: "bg-pink-500",
  Videos: "bg-emerald-500",
  Audio: "bg-purple-500",
  Software: "bg-blue-500",
  Code: "bg-orange-500",
  "Documents/Logs": "bg-indigo-500",
  Others: "bg-slate-500",
  "Compressed Files": "bg-yellow-500",
  "Design/Vectors": "bg-fuchsia-500",
  Fonts: "bg-lime-500",
  Databases: "bg-cyan-500",
  "E-books": "bg-amber-700",
  "3D Models": "bg-rose-600",
  Configurações: "bg-zinc-500",
  Spreadsheets: "bg-green-600",
  Presentations: "bg-red-500",
  Web: "bg-sky-500",
  Data: "bg-violet-500",
  "Disk Images": "bg-stone-600",
  Subtitles: "bg-teal-500",
  Certificates: "bg-emerald-600",
  Dictionaries: "bg-lime-600",
  Torrents: "bg-orange-600",
  Backups: "bg-gray-600",
  "Incomplete Downloads": "bg-amber-500",
  "Streaming/Playlists": "bg-pink-600",
};

const CATEGORY_ICONS: Record<string, any> = {
  Images: ImageIcon,
  Videos: Video,
  Audio: Music,
  Software: FileBox,
  Code: Code,
  "Documents/Logs": FileText,
  Others: Files,
  "Compressed Files": Archive,
  "Design/Vectors": Box,
  Fonts: Library,
  Databases: Database,
  "E-books": Book,
  "3D Models": Box,
  Configurações: Settings,
  Spreadsheets: Table,
  Presentations: Presentation,
  Web: HardDrive,
  Data: FileText,
  "Disk Images": Archive,
  Subtitles: FileText,
  Certificates: FileText,
  Dictionaries: Book,
  Torrents: FileText,
  Backups: Archive,
  "Incomplete Downloads": Files,
  "Streaming/Playlists": Music,
};

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function DashboardComponent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { path } = Route.useSearch();
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAnalyzingPath, setCurrentAnalyzingPath] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSemanticSearch, setIsSemanticSearch] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const targetPath = path || (await invoke<string>("get_home_directory"));
        setCurrentAnalyzingPath(targetPath);

        const [statsData, drivesData] = await Promise.all([
          invoke<StorageStats>("get_directory_stats", {
            directory: targetPath,
          }),
          getMountedDrives(),
        ]);

        setStats(statsData);
        setDrives(drivesData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [path]);

  const handleSelectFolder = (newPath: string) => {
    navigate({ to: "/", search: { path: newPath } });
  };

  const handleScan = async () => {
    const dir = await selectDirectory(t("dialogs.selectFolderTitle"));
    if (dir) handleSelectFolder(dir);
  };

  const handleRefresh = () => {
    navigate({ to: "/dashboard", search: { path: currentAnalyzingPath } });
  };

  const handleViewCategory = (category: string) => {
    navigate({ to: "/", search: { path: currentAnalyzingPath, category } });
  };

  const chartData = useMemo(() => {
    if (!stats) return [];
    return stats.categories.map((c) => ({
      name: c.category,
      value: c.size_bytes,
      color: CATEGORY_COLORS[c.category] || "bg-slate-500",
    }));
  }, [stats]);

  const totalUsedOnAllDrives = useMemo(() => {
    return drives.reduce((acc, d) => acc + d.used_space, 0);
  }, [drives]);

  const totalCapacityOnAllDrives = useMemo(() => {
    return drives.reduce((acc, d) => acc + d.total_space, 0);
  }, [drives]);

  const driveChartSeries = useMemo(() => {
    if (!drives.length) return [];
    const colors = ["#3b82f6", "#10b981", "#a855f7", "#f59e0b"];
    const freeSpace = Math.max(
      0,
      totalCapacityOnAllDrives - totalUsedOnAllDrives,
    );

    return [
      {
        innerRadius: "60%",
        outerRadius: "90%",
        paddingAngle: 2,
        cornerRadius: 4,
        data: [
          ...drives.map((drive, index) => ({
            label: drive.name,
            value: drive.used_space,
            color: colors[index % colors.length],
          })),
          {
            label: t("common.freeSpace"),
            value: freeSpace,
            color: "transparent",
          },
        ],
        valueFormatter: (
          item: { value: number },
          { dataIndex }: { dataIndex: number },
        ) => {
          if (dataIndex >= drives.length) return formatBytes(item.value);
          const drive = drives[dataIndex];
          return t("dashboard.driveUsageDetail", {
            used: formatBytes(item.value),
            total: formatBytes(drive.total_space),
          });
        },
      },
    ];
  }, [drives, totalCapacityOnAllDrives, totalUsedOnAllDrives, t]);

  if (loading && !stats) {
    return (
      <div className="flex h-full items-center justify-center p-8 bg-[#0f1115]">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent shadow-lg"
          />
          <p className="text-muted-foreground animate-pulse font-medium">
            {t("common.loading")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <Toolbar
        currentPath={currentAnalyzingPath}
        onScan={handleScan}
        onOrganize={() => {}}
        onRefresh={handleRefresh}
        onBack={() => {}}
        onForward={() => {}}
        canGoBack={false}
        canGoForward={false}
        hasFiles={true}
        isScanning={loading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isSemanticSearch={isSemanticSearch}
        onSemanticSearchToggle={setIsSemanticSearch}
        onSemanticSearch={() => {}}
      />

      <div className="flex-1 flex overflow-hidden">
        <FolderTree
          currentPath={currentAnalyzingPath}
          onSelectFolder={handleSelectFolder}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 flex overflow-hidden gap-6">
            <ScrollArea className="flex-1 ">
              <div className="pb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ">
                  {drives.map((drive, idx) => (
                    <motion.div
                      key={drive.path}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <div
                        onClick={() => handleSelectFolder(drive.path)}
                        className="border border-border p-6 group cursor-pointer transition-all relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <div
                            className={`p-3 rounded ${idx === 0 ? "border" : "bg-background"} group-hover:scale-110 transition-transform`}
                          >
                            <HardDrive className="h-6 w-6 " />
                          </div>
                          <MoreVertical className="h-5 w-5 text-muted-foreground cursor-pointer " />
                        </div>
                        <div className="space-y-1 mb-6">
                          <h3 className="text-lg font-black tracking-tight">
                            {drive.name}
                          </h3>
                          <p className="text-xs text-muted-foreground font-medium">
                            {formatBytes(drive.used_space)} /{" "}
                            {formatBytes(drive.total_space)}
                          </p>
                        </div>
                        <Progress
                          value={(drive.used_space / drive.total_space) * 100}
                          className="h-1.5 bg-[#252a33]"
                          indicatorClassName={
                            idx === 0
                              ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                              : "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                          }
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>

                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black p-2">
                      {t("dashboard.folders")}
                    </h2>
                    <button className="text-xs font-bold text-muted-foreground hover:text-primary flex items-center gap-1">
                      {t("common.viewAll")} <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 rounded-md">
                    {stats?.categories.map((cat) => {
                      const Icon = CATEGORY_ICONS[cat.category] || FolderOpen;
                      const color =
                        CATEGORY_COLORS[cat.category] || "text-blue-400";
                      return (
                        <div
                          key={cat.category}
                          onClick={() => handleViewCategory(cat.category)}
                          className="p-4 flex items-center gap-4 cursor-pointer border"
                        >
                          <div
                            className={`p-3 rounded-xl bg-primary/10 ${color.replace("bg-", "text-")}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold truncate">
                              {t(`categories.${cat.category}`, {
                                defaultValue: cat.category,
                              })}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-medium">
                              {t("common.files_count", { count: cat.count })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="mt-8">
                  <div className="flex items-center justify-between mb-6 p-2">
                    <h2 className="text-xl font-black">
                      {t("dashboard.lastFiles")}
                    </h2>
                    <button className="text-xs font-bold text-muted-foreground hover:text-primary flex items-center gap-1">
                      {t("common.viewAll")} <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="rounded-md border shadow-xl overflow-hidden">
                    <FileBrowserTable
                      files={stats?.recent_files || []}
                      onOpenFolder={handleSelectFolder}
                    />
                  </div>
                </section>
              </div>
            </ScrollArea>

            <div className="w-80 h-full flex flex-col border-l shrink-0">
              <div className="p-8 flex flex-col items-center relative overflow-hidden">
                <h1 className="text-lg font-black mb-8 self-start">
                  {t("common.storage")}
                </h1>
                <div className="relative w-full h-[300px] flex items-center justify-center">
                  <PieChart
                    series={driveChartSeries}
                    height={300}
                    slotProps={{ legend: { hidden: true } as any }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black">
                      {formatBytes(totalUsedOnAllDrives)}
                    </span>
                    <span className="text-xs text-muted-foreground font-bold">
                      {t("common.usedTotal")}
                    </span>
                  </div>
                </div>

                <div className="w-full space-y-5 mt-10">
                  {chartData
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 5)
                    .map((entry, idx) => (
                      <div key={idx} className="space-y-2 group">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${entry.color}`}
                            />
                            <span className="font-bold text-muted-foreground group-hover:text-white transition-colors">
                              {t(`categories.${entry.name}`, {
                                defaultValue: entry.name,
                              })}
                            </span>
                          </div>
                          <span className="font-black">
                            {formatBytes(entry.value)}
                          </span>
                        </div>
                        <Progress
                          value={(entry.value / (stats?.total_size || 1)) * 100}
                          className="h-1 bg-[#252a33]"
                          indicatorClassName={entry.color}
                        />
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
