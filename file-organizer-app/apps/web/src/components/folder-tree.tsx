import { useState, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Home,
  HardDrive,
  Usb,
  Server,
  Loader2,
  LayoutDashboard,
} from "lucide-react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getMountedDrives, listFolders } from "@/lib/tauri";
import type { FolderNode, DriveInfo } from "@/lib/types";

interface FolderTreeProps {
  currentPath: string;
  onSelectFolder: (path: string) => void;
}

interface TreeNode extends FolderNode {
  children?: TreeNode[];
  isLoading?: boolean;
  isExpanded?: boolean;
}

function getDriveIcon(driveType: string) {
  switch (driveType) {
    case "home":
      return <Home className="h-4 w-4" />;
    case "media":
      return <Usb className="h-4 w-4" />;
    case "mnt":
      return <HardDrive className="h-4 w-4" />;
    case "root":
      return <Server className="h-4 w-4" />;
    case "drive":
      return <HardDrive className="h-4 w-4" />;
    default:
      return <HardDrive className="h-4 w-4" />;
  }
}

export function FolderTree({ currentPath, onSelectFolder }: FolderTreeProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [selectedDrive, setSelectedDrive] = useState<string>("");
  const [rootFolders, setRootFolders] = useState<TreeNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const [childrenCache, setChildrenCache] = useState<
    Record<string, TreeNode[]>
  >({});

  const isAtDashboard = location.pathname === "/dashboard";

  useEffect(() => {
    getMountedDrives()
      .then((drives) => {
        setDrives(drives);
        const homeDrive = drives.find((d) => d.drive_type === "home");
        if (homeDrive) {
          selectDrive(homeDrive.path, false);
        }
      })
      .catch(console.error);
  }, []);

  const selectDrive = async (path: string, shouldNavigate = true) => {
    setSelectedDrive(path);
    setExpandedPaths(new Set());
    setChildrenCache({});
    await loadFolders(path, true);
    if (shouldNavigate) {
      onSelectFolder(path);
    }
  };

  const loadFolders = async (path: string, isRoot = false) => {
    try {
      const folders = await listFolders(path);
      const nodes: TreeNode[] = folders.map((f) => ({
        ...f,
        children: undefined,
        isLoading: false,
        isExpanded: false,
      }));

      if (isRoot) {
        setRootFolders(nodes);
      } else {
        setChildrenCache((prev) => ({ ...prev, [path]: nodes }));
      }
    } catch (error) {
      console.error("Failed to load folders:", error);
    }
  };

  const toggleExpand = async (node: TreeNode) => {
    const newExpanded = new Set(expandedPaths);

    if (newExpanded.has(node.path)) {
      newExpanded.delete(node.path);
      setExpandedPaths(newExpanded);
    } else {
      newExpanded.add(node.path);
      setExpandedPaths(newExpanded);

      if (!childrenCache[node.path] && node.has_children) {
        setLoadingPaths((prev) => new Set(prev).add(node.path));
        await loadFolders(node.path);
        setLoadingPaths((prev) => {
          const next = new Set(prev);
          next.delete(node.path);
          return next;
        });
      }
    }
  };

  const FolderItem = ({
    node,
    depth = 0,
  }: {
    node: TreeNode;
    depth?: number;
  }) => {
    // Só mostramos a pasta selecionada se NÃO estivermos no dashboard
    const isSelected = !isAtDashboard && currentPath === node.path;
    const isExpanded = expandedPaths.has(node.path);
    const isLoading = loadingPaths.has(node.path);
    const children = childrenCache[node.path] || [];

    return (
      <div>
        <div
          className={`flex items-center gap-1 px-2 py-1 text-sm rounded-md cursor-pointer transition-colors ${
            isSelected
              ? "bg-primary/10 text-primary font-medium"
              : "hover:bg-muted text-foreground"
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => onSelectFolder(node.path)}
        >
          {node.has_children ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node);
              }}
              className="p-0.5 hover:bg-muted rounded shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              ) : isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}

          {isExpanded || isSelected ? (
            <FolderOpen className="h-4 w-4 text-primary shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
          )}

          <span className="truncate">{node.name}</span>
        </div>

        {isExpanded && children.length > 0 && (
          <div>
            {children.map((child) => (
              <FolderItem key={child.path} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col h-full shadow-sm">
      <div className="p-3 border-b border-border">
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer justify-start mb-1 ${
            isAtDashboard
              ? "bg-muted text-foreground shadow-md"
              : "bg-transparent text-foreground hover:bg-muted"
          }`}
        >
          <LayoutDashboard className="h-4.5 w-4.5" />
          <span>{t("dashboard.title")}</span>
        </button>
      </div>

      <div className="p-2 border-b border-border">
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-2 flex items-center gap-1.5">
          <HardDrive className="h-3 w-3" />
          {t("folderTree.drives")}
        </div>
        <div className="space-y-0.5">
          {drives.map((drive) => (
            <button
              key={drive.path}
              onClick={() => selectDrive(drive.path, true)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors ${
                !isAtDashboard && selectedDrive === drive.path
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted text-foreground"
              }`}
            >
              {getDriveIcon(drive.drive_type)}
              <span className="truncate">{drive.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1">
          {t("folderTree.folders")}
        </div>
        <div className="space-y-0.5">
          {rootFolders.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            rootFolders.map((folder) => (
              <FolderItem key={folder.path} node={folder} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
