export interface FileItem {
  index: number;
  filename: string;
  filepath: string;
  is_dir: boolean;
  size_bytes: number;
  modified: string;
  extension: string;
}

export interface FolderNode {
  name: string;
  path: string;
  has_children: boolean;
}

export interface DriveInfo {
  name: string;
  path: string;
  drive_type: "home" | "media" | "mnt" | "root" | "drive";
  total_space: number;
  available_space: number;
  used_space: number;
}

export interface ListResult {
  path: string;
  files: FileItem[];
  total_files: number;
  total_folders: number;
}

export interface FileClassification {
  index: number;
  filename: string;
  filepath: string;
  suggested_folder: string;
  suggested_name?: string;
  confidence: number;
  selected: boolean;
  is_duplicate: boolean;
  duplicate_of?: string;
}

export interface AnalyzeResult {
  total_files: number;
  images: number;
  documents: number;
  other_files: number;
  classifications: FileClassification[];
  scan_time: number;
  total_duplicates: number;
}

export interface MoveResult {
  successful: number;
  failed: number;
  skipped: number;
}

export type AppState =
  | "idle"
  | "browsing"
  | "analyzing"
  | "reviewing"
  | "moving"
  | "complete";

export interface CategoryStat {
  category: string;
  count: number;
  size_bytes: number;
}

export interface StorageStats {
  total_size: number;
  total_files: number;
  categories: CategoryStat[];
  largest_files: FileItem[];
}
