import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type {
  FileClassification,
  FileItem,
  ListResult,
  AnalyzeResult,
  MoveResult,
  FolderNode,
  DriveInfo,
  StorageStats,
} from "@/lib/types";

export async function selectDirectory(title: string): Promise<string | null> {
  try {
    const result = await open({
      directory: true,
      multiple: false,
      title,
    });
    return result as string | null;
  } catch (error) {
    console.error("Failed to open directory picker:", error);
    return null;
  }
}

/** Get user's home directory */
export async function getHomeDirectory(): Promise<string> {
  return await invoke<string>("get_home_directory");
}

/** Get mounted drives and common locations */
export async function getMountedDrives(): Promise<DriveInfo[]> {
  return await invoke<DriveInfo[]>("get_mounted_drives");
}

/** List folders in a directory (for tree view) */
export async function listFolders(directory: string): Promise<FolderNode[]> {
  return await invoke<FolderNode[]>("list_folders", { directory });
}

/** List directory contents without AI analysis (fast) */
export async function listDirectory(directory: string): Promise<ListResult> {
  return await invoke<ListResult>("list_directory", { directory });
}

/** Analyze directory with AI classification (slower) */
export async function analyzeDirectory(
  directory: string,
): Promise<AnalyzeResult> {
  return await invoke<AnalyzeResult>("analyze_directory", { directory });
}

export async function moveFiles(
  destinationDirectory: string,
  classifications: FileClassification[],
  applyRenaming: boolean,
): Promise<MoveResult> {
  return await invoke<MoveResult>("move_files", {
    destinationDirectory,
    classifications,
    applyRenaming,
  });
}

export async function getAvailableCategories(): Promise<string[]> {
  return await invoke<string[]>("get_available_categories");
}

export async function renameFile(
  oldPath: string,
  newName: string,
): Promise<void> {
  return await invoke("rename_file", { oldPath, newName });
}

export async function getDirectoryStats(
  directory: string,
): Promise<StorageStats> {
  return await invoke<StorageStats>("get_directory_stats", { directory });
}

export async function searchSemantic(
  directory: string,
  query: string,
): Promise<FileClassification[]> {
  return await invoke<FileClassification[]>("search_semantic", {
    directory,
    query,
  });
}

export async function getFilesByCategory(
  directory: string,
  category: string,
): Promise<FileItem[]> {
  return await invoke<FileItem[]>("get_files_by_category", {
    directory,
    category,
  });
}

export async function deleteFile(path: string): Promise<void> {
  return await invoke("delete_file", { path });
}
