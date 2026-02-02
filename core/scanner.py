
import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class FileInfo:
    path: Path
    name: str
    extension: str
    size_bytes: int
    created_at: Optional[datetime] = None
    modified_at: Optional[datetime] = None
    is_image: bool = False
    is_document: bool = False
    metadata: dict = field(default_factory=dict)
    
    @property
    def size_human(self) -> str:
        size = self.size_bytes
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"


@dataclass
class ScanResult:
    directory: Path
    total_files: int
    images: list[FileInfo]
    documents: list[FileInfo]
    other_files: list[FileInfo]
    errors: list[tuple[Path, str]]
    scan_time_seconds: float
    
    @property
    def all_files(self) -> list[FileInfo]:
        return self.images + self.documents + self.other_files


class FileScanner:

    
    # Image extensions supported by CLIP
    IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tiff", ".tif"}
    
    # Document extensions
    DOCUMENT_EXTENSIONS = {
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
        ".txt", ".md", ".rst", ".csv", ".odt", ".ods", ".odp",
        ".rtf", ".tex"
    }
    
    # Archive extensions
    ARCHIVE_EXTENSIONS = {".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz"}
    
    # Media extensions
    VIDEO_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov", ".webm", ".flv", ".wmv"}
    AUDIO_EXTENSIONS = {".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac", ".wma"}
    
    EXCLUDE_DIRS = {
        "node_modules", ".git", ".venv", "venv", "__pycache__", 
        ".next", ".nuxt", "dist", "build", ".cache", "AppData",
        "Local Settings", "Application Data"
    }
    
    def __init__(self, recursive: bool = False, include_hidden: bool = False, use_ocr: bool = True, calculate_hash: bool = True, fast_mode: bool = False):
    
        self.recursive = recursive
        self.include_hidden = include_hidden
        self.use_ocr = use_ocr
        self.calculate_hash = calculate_hash
        self.fast_mode = fast_mode
        self.ocr = None
        if use_ocr:
            try:
                from core.ocr import OCRManager
                self.ocr = OCRManager()
            except ImportError:
                logger.warning("OCRManager dependencies not met, disabling OCR")
                self.use_ocr = False
    
    def scan(self, directory: Path) -> ScanResult:
      
        import time
        start_time = time.time()
        
        directory = Path(directory).resolve()
        
        if not directory.exists():
            raise ValueError(f"Directory does not exist: {directory}")
        
        if not directory.is_dir():
            raise ValueError(f"Path is not a directory: {directory}")
        
        if not os.access(directory, os.R_OK):
            raise PermissionError(f"Cannot read directory: {directory}")
        
        logger.info(f"Scanning directory: {directory}")
        
        images: list[FileInfo] = []
        documents: list[FileInfo] = []
        other_files: list[FileInfo] = []
        errors: list[tuple[Path, str]] = []
        
        files_to_scan = []
        if self.recursive:
            for root, dirs, files in os.walk(directory):
                # Filter excluded directories in-place to prevent os.walk from entering them
                dirs[:] = [d for d in dirs if d not in self.EXCLUDE_DIRS and (self.include_hidden or not d.startswith("."))]
                for file in files:
                    if not self.include_hidden and file.startswith("."):
                        continue
                    files_to_scan.append(Path(root) / file)
        else:
            for item in directory.iterdir():
                if item.is_file():
                    if not self.include_hidden and item.name.startswith("."):
                        continue
                    files_to_scan.append(item)

        for file_path in files_to_scan:
            try:
                file_info = self._get_file_info(file_path)
                
                if file_info.is_image:
                    images.append(file_info)
                elif file_info.is_document:
                    documents.append(file_info)
                else:
                    other_files.append(file_info)
                    
            except PermissionError as e:
                logger.warning(f"Permission denied: {file_path}")
                errors.append((file_path, f"Permission denied: {e}"))
            except Exception as e:
                logger.warning(f"Error scanning {file_path}: {e}")
                errors.append((file_path, str(e)))
        
        scan_time = time.time() - start_time
        
        result = ScanResult(
            directory=directory,
            total_files=len(images) + len(documents) + len(other_files),
            images=images,
            documents=documents,
            other_files=other_files,
            errors=errors,
            scan_time_seconds=scan_time
        )
        
        logger.info(
            f"Scan complete: {result.total_files} files "
            f"({len(images)} images, {len(documents)} documents, {len(other_files)} other) "
            f"in {scan_time:.2f}s"
        )
        
        if errors:
            logger.warning(f"{len(errors)} files could not be scanned")
        
        return result
    
    def _calculate_hash(self, file_path: Path, block_size: int = 65536) -> str:
        import hashlib
        sha256 = hashlib.sha256()
        try:
            with open(file_path, 'rb') as f:
                for block in iter(lambda: f.read(block_size), b''):
                    sha256.update(block)
            return sha256.hexdigest()
        except Exception as e:
            logger.debug(f"Could not calculate hash for {file_path}: {e}")
            return ""

    def _get_file_info(self, file_path: Path) -> FileInfo:
    
        stat = file_path.stat()
        extension = file_path.suffix.lower()
        
        is_image = extension in self.IMAGE_EXTENSIONS
        is_document = extension in self.DOCUMENT_EXTENSIONS
        
        try:
            created_at = datetime.fromtimestamp(stat.st_ctime)
            modified_at = datetime.fromtimestamp(stat.st_mtime)
        except (OSError, OverflowError):
            created_at = None
            modified_at = None
        
        metadata = {
            "extension": extension,
            "size_bytes": stat.st_size,
            "hash": self._calculate_hash(file_path) if self.calculate_hash and stat.st_size < 100 * 1024 * 1024 else "" # Hash only files < 100MB for speed
        }
        
        if extension in self.VIDEO_EXTENSIONS:
            metadata["type"] = "video"
        elif extension in self.AUDIO_EXTENSIONS:
            metadata["type"] = "audio"
        elif extension in self.ARCHIVE_EXTENSIONS:
            metadata["type"] = "archive"
        
        if is_document and not self.fast_mode:
            doc_meta = self.get_document_metadata(file_path)
            metadata.update(doc_meta)
            
        return FileInfo(
            path=file_path,
            name=file_path.name,
            extension=extension,
            size_bytes=stat.st_size,
            created_at=created_at,
            modified_at=modified_at,
            is_image=is_image,
            is_document=is_document,
            metadata=metadata
        )
    
    def get_document_metadata(self, file_path: Path) -> dict:
 
        metadata = {}
        extension = file_path.suffix.lower()
        
        try:
            if extension == ".pdf":
                metadata = self._get_pdf_metadata(file_path)
            elif extension in {".doc", ".docx"}:
                metadata = self._get_docx_metadata(file_path)
        except Exception as e:
            logger.debug(f"Could not extract metadata from {file_path}: {e}")
        
        if self.use_ocr and not metadata.get("title") and self.ocr:
            content = self.ocr.get_document_content(file_path)
            if content:
                metadata["ocr_content"] = content[:1000] 
                if not metadata.get("title"):
                    first_line = content.split('\n')[0].strip()
                    if 3 < len(first_line) < 50:
                        metadata["title"] = first_line

        return metadata
    
    def _get_pdf_metadata(self, file_path: Path) -> dict:
        try:
            from pypdf import PdfReader
            
            reader = PdfReader(file_path)
            meta = reader.metadata or {}
            
            return {
                "title": meta.get("/Title", ""),
                "author": meta.get("/Author", ""),
                "subject": meta.get("/Subject", ""),
                "pages": len(reader.pages),
                "creator": meta.get("/Creator", ""),
            }
        except ImportError:
            logger.debug("pypdf not installed, skipping PDF metadata extraction")
            return {}
        except Exception as e:
            logger.debug(f"PDF metadata extraction failed: {e}")
            return {}
    
    def _get_docx_metadata(self, file_path: Path) -> dict:
        try:
            from docx import Document
            
            doc = Document(file_path)
            props = doc.core_properties
            
            return {
                "title": props.title or "",
                "author": props.author or "",
                "subject": props.subject or "",
                "keywords": props.keywords or "",
                "created": str(props.created) if props.created else "",
            }
        except ImportError:
            logger.debug("python-docx not installed, skipping DOCX metadata extraction")
            return {}
        except Exception as e:
            logger.debug(f"DOCX metadata extraction failed: {e}")
            return {}
