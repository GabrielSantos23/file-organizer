use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileItem {
    pub index: usize,
    pub filename: String,
    pub filepath: String,
    pub is_dir: bool,
    pub size_bytes: u64,
    pub modified: String,
    pub extension: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ListResult {
    pub path: String,
    pub files: Vec<FileItem>,
    pub total_files: usize,
    pub total_folders: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileClassification {
    pub index: usize,
    pub filename: String,
    pub filepath: String,
    pub suggested_folder: String,
    pub suggested_name: Option<String>,
    pub confidence: f64,
    pub selected: bool,
    pub is_duplicate: bool,
    pub duplicate_of: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnalyzeResult {
    pub total_files: usize,
    pub images: usize,
    pub documents: usize,
    pub other_files: usize,
    pub classifications: Vec<FileClassification>,
    pub scan_time: f64,
    pub total_duplicates: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MoveResult {
    pub successful: usize,
    pub failed: usize,
    pub skipped: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CategoryStat {
    pub category: String,
    pub count: usize,
    pub size_bytes: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StorageStats {
    pub total_size: u64,
    pub total_files: usize,
    pub categories: Vec<CategoryStat>,
    pub largest_files: Vec<FileItem>,
}

#[tauri::command]
async fn list_directory(directory: String) -> Result<ListResult, String> {
    let path = Path::new(&directory);
    
    if !path.exists() {
        return Err(format!("Directory not found: {}", directory));
    }
    
    if !path.is_dir() {
        return Err(format!("Not a directory: {}", directory));
    }
    
    let mut files = Vec::new();
    let mut total_folders = 0;
    let mut index = 0;
    
    let entries = fs::read_dir(path)
        .map_err(|e| format!("Cannot read directory: {}", e))?;
    
    for entry in entries {
        if let Ok(entry) = entry {
            let file_path = entry.path();
            let filename = file_path.file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            
            if filename.starts_with('.') {
                continue;
            }
            
            let metadata = entry.metadata().ok();
            let is_dir = file_path.is_dir();
            
            if is_dir {
                total_folders += 1;
            }
            
            let size_bytes = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
            let modified = metadata.as_ref()
                .and_then(|m| m.modified().ok())
                .map(|t| {
                    let datetime: chrono::DateTime<chrono::Local> = t.into();
                    datetime.format("%d/%m/%Y %H:%M").to_string()
                })
                .unwrap_or_else(|| "-".to_string());
            
            let extension = file_path.extension()
                .map(|e| e.to_string_lossy().to_string())
                .unwrap_or_default();
            
            files.push(FileItem {
                index,
                filename,
                filepath: file_path.to_string_lossy().to_string(),
                is_dir,
                size_bytes,
                modified,
                extension,
            });
            
            index += 1;
        }
    }
    
    files.sort_by(|a, b| {
        if a.is_dir && !b.is_dir { std::cmp::Ordering::Less }
        else if !a.is_dir && b.is_dir { std::cmp::Ordering::Greater }
        else { a.filename.to_lowercase().cmp(&b.filename.to_lowercase()) }
    });
    
    for (i, file) in files.iter_mut().enumerate() {
        file.index = i;
    }
    
    let total_files = files.iter().filter(|f| !f.is_dir).count();
    
    Ok(ListResult {
        path: directory,
        files,
        total_files,
        total_folders,
    })
}

use tauri_plugin_shell::ShellExt;

#[tauri::command]
async fn analyze_directory(app: tauri::AppHandle, directory: String) -> Result<AnalyzeResult, String> {
    let output = app.shell().sidecar("file-organizer-engine")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?
        .args(["analyze", &directory])
        .output()
        .await
        .map_err(|e| format!("Failed to execute sidecar: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("Engine Error: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    serde_json::from_str(&stdout).map_err(|e| format!("JSON Error: {}", e))
}

#[tauri::command]
async fn move_files(
    destination_directory: String,
    classifications: Vec<FileClassification>,
    apply_renaming: bool,
) -> Result<MoveResult, String> {
    let mut successful = 0;
    let mut failed = 0;
    let mut skipped = 0;
    
    for classification in classifications {
        if !classification.selected {
            skipped += 1;
            continue;
        }
        
        let source = Path::new(&classification.filepath);
        if !source.exists() {
            failed += 1;
            continue;
        }

        let dest_folder = Path::new(&destination_directory).join(&classification.suggested_folder);
        if let Err(_) = fs::create_dir_all(&dest_folder) {
            failed += 1;
            continue;
        }
        
        let target_filename = if apply_renaming && classification.suggested_name.is_some() {
            classification.suggested_name.unwrap()
        } else {
            classification.filename
        };
        
        let mut dest_file = dest_folder.join(&target_filename);
        
        if dest_file.exists() {
            let stem = dest_file.file_stem().unwrap_or_default().to_string_lossy();
            let ext = dest_file.extension().map(|e| format!(".{}", e.to_string_lossy())).unwrap_or_default();
            let mut counter = 1;
            loop {
                let new_dest = dest_folder.join(format!("{}_{}{}", stem, counter, ext));
                if !new_dest.exists() {
                    dest_file = new_dest;
                    break;
                }
                counter += 1;
            }
        }
        
        match fs::rename(source, &dest_file) {
            Ok(_) => successful += 1,
            Err(_) => {
                if let Ok(_) = fs::copy(source, &dest_file) {
                    let _ = fs::remove_file(source);
                    successful += 1;
                } else {
                    failed += 1;
                }
            }
        }
    }
    
    Ok(MoveResult { successful, failed, skipped })
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FolderNode {
    pub name: String,
    pub path: String,
    pub has_children: bool,
}

#[tauri::command]
async fn list_folders(directory: String) -> Result<Vec<FolderNode>, String> {
    let path = Path::new(&directory);
    
    if !path.exists() || !path.is_dir() {
        return Ok(vec![]);
    }
    
    let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
    let mut folders = Vec::new();
    
    for entry in entries.flatten() {
        let file_path = entry.path();
        let filename = file_path.file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        
        if filename.starts_with('.') {
            continue;
        }
        
        if file_path.is_dir() {
            let has_children = fs::read_dir(&file_path)
                .map(|entries| entries.filter_map(|e| e.ok())
                    .any(|e| e.path().is_dir() && !e.file_name().to_string_lossy().starts_with('.')))
                .unwrap_or(false);
            
            folders.push(FolderNode {
                name: filename,
                path: file_path.to_string_lossy().to_string(),
                has_children,
            });
        }
    }
    
    folders.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(folders)
}

#[tauri::command]
async fn get_home_directory() -> Result<String, String> {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Could not find home directory".to_string())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DriveInfo {
    pub name: String,
    pub path: String,
    pub drive_type: String,
    pub total_space: u64,
    pub available_space: u64,
    pub used_space: u64,
}

#[tauri::command]
async fn get_mounted_drives() -> Result<Vec<DriveInfo>, String> {
    use sysinfo::Disks;
    let mut drives = Vec::new();
    let disks = Disks::new_with_refreshed_list();

    let get_space = |p: &str| {
        disks.list().iter()
            .filter(|d| p.starts_with(&d.mount_point().to_string_lossy().to_string()))
            .max_by_key(|d| d.mount_point().to_string_lossy().len())
            .map(|d| (d.total_space(), d.available_space(), d.total_space().saturating_sub(d.available_space())))
            .unwrap_or((0, 0, 0))
    };

    // 1. Home
    if let Some(home) = dirs::home_dir() {
        let path = home.to_string_lossy().to_string();
        let (total, avail, used) = get_space(&path);
        drives.push(DriveInfo {
            name: "Início".to_string(),
            path,
            drive_type: "home".to_string(),
            total_space: total,
            available_space: avail,
            used_space: used,
        });
    }

    // 2. Root
    let (r_total, r_avail, r_used) = get_space("/");
    drives.push(DriveInfo {
        name: "Sistema".to_string(),
        path: "/".to_string(),
        drive_type: "root".to_string(),
        total_space: r_total,
        available_space: r_avail,
        used_space: r_used,
    });

    // 3. Media / Mnt
    if let Ok(user) = std::env::var("USER") {
        let paths = vec![
            format!("/media/{}", user),
            format!("/run/media/{}", user),
            "/mnt".to_string(),
        ];

        for base in paths {
            if let Ok(entries) = fs::read_dir(&base) {
                for entry in entries.flatten() {
                    if entry.path().is_dir() {
                        let path = entry.path().to_string_lossy().to_string();
                        let name = entry.file_name().to_string_lossy().to_string();
                        let (total, avail, used) = get_space(&path);
                        
                        if total > 0 && !drives.iter().any(|d| d.path == path) {
                            drives.push(DriveInfo {
                                name,
                                path,
                                drive_type: "media".to_string(),
                                total_space: total,
                                available_space: avail,
                                used_space: used,
                            });
                        }
                    }
                }
            }
        }
    }

    Ok(drives)
}

#[tauri::command]
async fn get_available_categories() -> Result<Vec<String>, String> {
    Ok(vec![
        "Fotos_Pessoais".into(), "Fotos_Viagem".into(), "Eventos".into(),
        "Animais".into(), "Paisagens".into(), "Plantas".into(),
        "Comidas".into(), "Bebidas".into(),
        "Screenshots".into(), "Tecnologia".into(), "Games".into(),
        "Wallpapers".into(), "Arte_Digital".into(), "Arte_Tradicional".into(), "Design_Grafico".into(),
        "Memes".into(), "Anime_Manga".into(),
        "Documentos_Escaneados".into(), "Diagramas".into(), "Slides".into(),
        "Veiculos".into(), "Arquitetura".into(), "Cidades".into(),
        "Esportes".into(), "Produtos".into(), "Moda".into(),
        "Medico".into(), "Ciencia".into(), "Mapas".into(), "Textos_Imagens".into(),
        "PDFs".into(), "Documentos_Word".into(), "Planilhas".into(), "Apresentacoes".into(),
        "Textos".into(), "Codigo".into(), "Web".into(), "Dados".into(),
        "Arquivos_Compactados".into(), "Executaveis_Windows".into(),
        "Pacotes_Linux".into(), "Imagens_Disco".into(), "Videos".into(),
        "Audios".into(), "Legendas".into(), "Icones_Vetores".into(),
        "Design".into(), "Fontes".into(), "Dicionarios".into(),
        "Certificados".into(), "Bancos_Dados".into(), "Torrents".into(),
        "Ebooks".into(), "Modelos_3D".into(), "Backups".into(),
        "Downloads_Incompletos".into(), "Streaming_Playlists".into(), "Outros".into(),
    ])
}

#[tauri::command]
async fn rename_file(old_path: String, new_name: String) -> Result<(), String> {
    let path = Path::new(&old_path);
    if !path.exists() {
        return Err("Arquivo não encontrado".to_string());
    }

    let parent = path.parent().ok_or("Arquivo inválido")?;
    let new_path = parent.join(&new_name);

    if new_path.exists() {
        return Err("Já existe um arquivo com este nome".to_string());
    }

    fs::rename(path, new_path).map_err(|e| format!("Erro ao renomear: {}", e))
}

#[tauri::command]
async fn delete_file(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err("Arquivo não encontrado".to_string());
    }

    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| format!("Erro ao deletar pasta: {}", e))
    } else {
        fs::remove_file(p).map_err(|e| format!("Erro ao deletar arquivo: {}", e))
    }
}

#[tauri::command]
async fn search_semantic(app: tauri::AppHandle, directory: String, query: String) -> Result<Vec<FileClassification>, String> {
    let output = app.shell().sidecar("file-organizer-engine")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?
        .args(["search", &directory, &query])
        .output()
        .await
        .map_err(|e| format!("Failed to execute sidecar: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("Engine Error: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    serde_json::from_str(&stdout).map_err(|e| format!("JSON Error: {}", e))
}

#[tauri::command]
async fn get_directory_stats(directory: String) -> Result<StorageStats, String> {
    use walkdir::WalkDir;

    let path = Path::new(&directory);
    if !path.exists() || !path.is_dir() {
        return Err("Diretório inválido".to_string());
    }

    let mut total_size = 0;
    let mut total_files = 0;
    let mut categories_map: std::collections::HashMap<String, (usize, u64)> = std::collections::HashMap::new();
    let mut all_files = Vec::new();

    fn get_category(ext: &str) -> &'static str {
        match ext.to_lowercase().as_str() {
            "jpg" | "jpeg" | "png" | "gif" | "webp" | "bmp" | "svg" | "ico" | "tiff" | "heic" | "avif" => "Imagens",
            "mp4" | "mkv" | "avi" | "mov" | "webm" | "wmv" | "flv" | "m4v" | "3gp" => "Vídeos",
            "pdf" | "doc" | "docx" | "txt" | "md" | "rtf" | "odt" | "log" | "pages" => "Documentos/Logs",
            "mp3" | "wav" | "flac" | "ogg" | "m4a" | "aac" | "wma" | "mid" => "Áudio",
            "zip" | "rar" | "7z" | "tar" | "gz" | "bz2" | "xz" | "iso" | "dmg" => "Arquivos Compactados",
            "exe" | "msi" | "app" | "deb" | "rpm" | "bin" | "sh" | "bat" => "Instaladores/Executáveis",
            "py" | "js" | "ts" | "rs" | "cpp" | "c" | "h" | "html" | "css" | "json" | "xml" | "yaml" | "yml" | "go" | "php" | "java" | "rb" | "swfit" => "Código",
            "psd" | "ai" | "eps" | "sketch" | "fig" | "xd" | "indd" | "cdr" => "Design/Vetores",
            "ttf" | "otf" | "woff" | "woff2" | "eot" => "Fontes",
            "sqlite" | "db" | "sql" | "mdb" | "accdb" | "dbf" => "Bancos de Dados",
            "epub" | "mobi" | "azw3" | "djvu" | "cbz" | "cbr" => "E-books",
            "obj" | "stl" | "fbx" | "blend" | "3ds" | "ma" | "mb" | "gltf" | "glb" => "modelos 3D",
            "cfg" | "ini" | "env" | "conf" | "toml" | "prop" => "Configurações",
            "xls" | "xlsx" | "csv" | "ods" | "numbers" => "Planilhas",
            "ppt" | "pptx" | "key" | "odp" => "Apresentações",
            _ => "Outros",
        }
    }

    // Recursive scan with WalkDir, limited to 50000 files for safety
    for entry in WalkDir::new(path)
        .max_depth(10)
        .into_iter()
        .filter_map(|e| e.ok())
        .take(50000) 
    {
        if entry.file_type().is_file() {
            let filename = entry.file_name().to_string_lossy().to_string();
            if filename.starts_with('.') { continue; }

            let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
            let ext = entry.path().extension().map(|e| e.to_string_lossy().to_string()).unwrap_or_default();
            let cat = get_category(&ext).to_string();

            total_size += size;
            total_files += 1;

            let entry_stat = categories_map.entry(cat).or_insert((0, 0));
            entry_stat.0 += 1;
            entry_stat.1 += size;

            // Only track largest files
            if all_files.len() < 100 || size > all_files.last().map(|f: &FileItem| f.size_bytes).unwrap_or(0) {
                 let modified = entry.metadata().ok()
                    .and_then(|m| m.modified().ok())
                    .map(|t| {
                        let datetime: chrono::DateTime<chrono::Local> = t.into();
                        datetime.format("%d/%m/%Y").to_string()
                    }).unwrap_or_else(|| "-".to_string());

                all_files.push(FileItem {
                    index: 0,
                    filename,
                    filepath: entry.path().to_string_lossy().to_string(),
                    is_dir: false,
                    size_bytes: size,
                    modified,
                    extension: ext,
                });
                all_files.sort_by_key(|f| std::cmp::Reverse(f.size_bytes));
                all_files.truncate(15);
            }
        }
    }

    let mut categories = categories_map.into_iter().map(|(name, (count, size))| {
        CategoryStat {
            category: name,
            count,
            size_bytes: size,
        }
    }).collect::<Vec<_>>();
    categories.sort_by_key(|c| std::cmp::Reverse(c.size_bytes));

    Ok(StorageStats {
        total_size,
        total_files,
        categories,
        largest_files: all_files,
    })
}

#[tauri::command]
async fn get_files_by_category(directory: String, category: String) -> Result<Vec<FileItem>, String> {
    use walkdir::WalkDir;

    let path = Path::new(&directory);
    if !path.exists() || !path.is_dir() {
        return Err("Diretório inválido".to_string());
    }

    let mut filtered_files = Vec::new();

    fn get_category(ext: &str) -> &'static str {
        match ext.to_lowercase().as_str() {
            "jpg" | "jpeg" | "png" | "gif" | "webp" | "bmp" | "svg" | "ico" | "tiff" | "heic" | "avif" => "Imagens",
            "mp4" | "mkv" | "avi" | "mov" | "webm" | "wmv" | "flv" | "m4v" | "3gp" => "Vídeos",
            "pdf" | "doc" | "docx" | "txt" | "md" | "rtf" | "odt" | "log" | "pages" => "Documentos/Logs",
            "mp3" | "wav" | "flac" | "ogg" | "m4a" | "aac" | "wma" | "mid" => "Áudio",
            "zip" | "rar" | "7z" | "tar" | "gz" | "bz2" | "xz" | "iso" | "dmg" => "Arquivos Compactados",
            "exe" | "msi" | "app" | "deb" | "rpm" | "bin" | "sh" | "bat" => "Instaladores/Executáveis",
            "py" | "js" | "ts" | "rs" | "cpp" | "c" | "h" | "html" | "css" | "json" | "xml" | "yaml" | "yml" | "go" | "php" | "java" | "rb" | "swfit" => "Código",
            "psd" | "ai" | "eps" | "sketch" | "fig" | "xd" | "indd" | "cdr" => "Design/Vetores",
            "ttf" | "otf" | "woff" | "woff2" | "eot" => "Fontes",
            "sqlite" | "db" | "sql" | "mdb" | "accdb" | "dbf" => "Bancos de Dados",
            "epub" | "mobi" | "azw3" | "djvu" | "cbz" | "cbr" => "E-books",
            "obj" | "stl" | "fbx" | "blend" | "3ds" | "ma" | "mb" | "gltf" | "glb" => "modelos 3D",
            "cfg" | "ini" | "env" | "conf" | "toml" | "prop" => "Configurações",
            "xls" | "xlsx" | "csv" | "ods" | "numbers" => "Planilhas",
            "ppt" | "pptx" | "key" | "odp" => "Apresentações",
            _ => "Outros",
        }
    }

    for entry in WalkDir::new(path)
        .max_depth(10)
        .into_iter()
        .filter_map(|e| e.ok())
        .take(10000) 
    {
        if entry.file_type().is_file() {
            let ext = entry.path().extension().map(|e| e.to_string_lossy().to_string()).unwrap_or_default();
            let cat = get_category(&ext);

            if cat == category {
                let filename = entry.file_name().to_string_lossy().to_string();
                let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                let modified = entry.metadata().ok()
                    .and_then(|m| m.modified().ok())
                    .map(|t| {
                        let datetime: chrono::DateTime<chrono::Local> = t.into();
                        datetime.format("%d/%m/%Y").to_string()
                    }).unwrap_or_else(|| "-".to_string());

                filtered_files.push(FileItem {
                    index: 0,
                    filename,
                    filepath: entry.path().to_string_lossy().to_string(),
                    is_dir: false,
                    size_bytes: size,
                    modified,
                    extension: ext,
                });

                if filtered_files.len() >= 500 { break; }
            }
        }
    }

    Ok(filtered_files)
}

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // FIX: Disable WebKit compositing to prevent blank screen on Linux/NVIDIA
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");

    tauri::Builder::default()
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            #[cfg(not(debug_assertions))]
            {
                 let window = app.get_webview_window("main").unwrap();
                 window.open_devtools();
            }
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            list_directory,
            list_folders,
            get_home_directory,
            get_mounted_drives,
            analyze_directory,
            move_files,
            get_available_categories,
            rename_file,
            delete_file,
            get_directory_stats,
            search_semantic,
            get_files_by_category,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
