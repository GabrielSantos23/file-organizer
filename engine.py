#!/usr/bin/env python3


import logging
import sys
from pathlib import Path
from typing import Optional

import typer
from rich.logging import RichHandler

from core.inference import ClipInference, ClassificationResult
from core.scanner import FileScanner, ScanResult
from core.file_ops import FileOperations
from core.categories import CategoryManager, Category
from utils.display import DisplayManager

logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    handlers=[RichHandler(rich_tracebacks=True, show_path=False)]
)
logger = logging.getLogger(__name__)

app = typer.Typer(
    name="file-organizer",
    help="🗂️ Intelligent file organizer using AI (CLIP) for categorization",
    add_completion=False
)

display = DisplayManager()


class FileOrganizer:
    
    def __init__(
        self,
        target_dir: Path,
        recursive: bool = False,
        dry_run: bool = False,
        user_prompt: Optional[str] = None
    ):
        self.target_dir = Path(target_dir).resolve()
        self.recursive = recursive
        self.dry_run = dry_run
        self.user_prompt = user_prompt
        
        self.category_manager = CategoryManager()
        self.scanner = FileScanner(recursive=recursive)
        self.file_ops = FileOperations(base_directory=self.target_dir, dry_run=dry_run)
        self.inference: Optional[ClipInference] = None
        
        self.scan_result: Optional[ScanResult] = None
        self.classification_results: list[ClassificationResult] = []
    
    def run(self) -> bool:
        display.print_header("🗂️ File Organizer - Intelligent Categorization")
        
        if self.user_prompt:
            custom_cats = self.category_manager.apply_user_prompt(self.user_prompt)
            if custom_cats:
                display.print_custom_categories([(c.folder_name, c.description) for c in custom_cats])
            else:
                display.print_warning("Could not parse custom categories from prompt. Using defaults.")
        
        if not self._scan_directory():
            return False
        
        if not self._classify_files():
            return False
        
        return self._handle_user_action()
    
    def _scan_directory(self) -> bool:
        display.print_info(f"Scanning directory: {self.target_dir}")
        
        try:
            self.scan_result = self.scanner.scan(self.target_dir)
            
            display.print_scan_summary(
                total_files=self.scan_result.total_files,
                images=len(self.scan_result.images),
                documents=len(self.scan_result.documents),
                other=len(self.scan_result.other_files),
                errors=len(self.scan_result.errors),
                scan_time=self.scan_result.scan_time_seconds
            )
            
            if self.scan_result.errors:
                display.print_errors(self.scan_result.errors)
            
            if self.scan_result.total_files == 0:
                display.print_warning("No files found to organize.")
                return False
            
            return True
            
        except ValueError as e:
            display.print_error(f"Invalid directory: {e}")
            return False
        except PermissionError as e:
            display.print_error(f"Permission denied: {e}")
            return False
    
    def _classify_files(self) -> bool:
        if not self.scan_result:
            return False
        
        if self.scan_result.images:
            display.print_info("Loading AI model for image classification...")
            self.inference = ClipInference()
            display.print_device_info(self.inference.get_device_info())
            
            self._classify_images()
        
        self._classify_documents()
        
        self._classify_other_files()
        
        return len(self.classification_results) > 0
    
    def _classify_images(self) -> None:
        if not self.inference or not self.scan_result:
            return
        
        categories = self.category_manager.get_image_categories()
        category_names = [c.name for c in categories]
        category_prompts = self.category_manager.get_clip_prompts()
        
        image_paths = [f.path for f in self.scan_result.images]
        
        display.print_info(f"Classifying {len(image_paths)} images...")
        
        with display.create_progress() as progress:
            task = progress.add_task("Analyzing images...", total=len(image_paths))
            
            results = self.inference.classify_batch(
                image_paths=image_paths,
                categories=category_names,
                category_prompts=category_prompts,
                batch_size=8
            )
            
            progress.update(task, completed=len(image_paths))
        
        self.classification_results.extend(results)
    
    def _classify_documents(self) -> None:
        if not self.scan_result:
            return
        
        for file_info in self.scan_result.documents:
            category = self.category_manager.get_category_by_extension(file_info.extension, file_info.name)
            
            if category:
                result = ClassificationResult(
                    file_path=file_info.path,
                    suggested_category=category.name,
                    confidence=1.0,  
                    all_scores={category.name: 1.0}
                )
                self.classification_results.append(result)
    
    def _classify_other_files(self) -> None:
        if not self.scan_result:
            return
        
        for file_info in self.scan_result.other_files:
            category = self.category_manager.get_category_by_extension(file_info.extension, file_info.name)
            
            if category:
                result = ClassificationResult(
                    file_path=file_info.path,
                    suggested_category=category.name,
                    confidence=1.0,
                    all_scores={category.name: 1.0}
                )
            else:
                result = ClassificationResult(
                    file_path=file_info.path,
                    suggested_category="Outros",
                    confidence=0.5,
                    all_scores={"Outros": 0.5}
                )
            
            self.classification_results.append(result)
    
    def _handle_user_action(self) -> bool:
        if not self.classification_results:
            display.print_warning("No files were classified.")
            return False
        
        results_display = [
            (r.file_path.name, self._get_folder_name(r.suggested_category), r.confidence)
            for r in self.classification_results
        ]
        
        display.print_classification_results(results_display)
        
        for result in self.classification_results:
            folder_name = self._get_folder_name(result.suggested_category)
            self.file_ops.plan_move(
                source=result.file_path,
                category_folder=folder_name,
                category_name=result.suggested_category,
                confidence=result.confidence
            )
        
        choice = display.prompt_action()
        
        if choice == "a":
            return self._move_all_files()
        elif choice == "b":
            return self._move_selected_files()
        else:
            display.print_info("Operation cancelled.")
            return True
    
    def _get_folder_name(self, category_name: str) -> str:
        for cat in self.category_manager.custom_categories:
            if cat.name == category_name:
                return cat.folder_name
        
        for cat in self.category_manager.image_categories:
            if cat.name == category_name:
                return cat.folder_name
        
        for cat in self.category_manager.document_categories:
            if cat.name == category_name:
                return cat.folder_name
        
        return category_name.replace(" ", "_")
    
    def _move_all_files(self) -> bool:
        if self.dry_run:
            display.print_warning("DRY RUN - No files will actually be moved")
        
        result = self.file_ops.execute_all()
        display.print_move_summary(result.successful, result.failed, result.skipped)
        return result.failed == 0
    
    def _move_selected_files(self) -> bool:
        max_idx = len(self.classification_results) - 1
        selected = display.prompt_selection(max_idx)
        
        if not selected:
            display.print_info("No files selected.")
            return True
        
        if self.dry_run:
            display.print_warning("DRY RUN - No files will actually be moved")
        
        result = self.file_ops.execute_selected(selected)
        display.print_move_summary(result.successful, result.failed, result.skipped)
        return result.failed == 0


@app.command()
def organize(
    directory: str = typer.Argument(..., help="Directory to scan and organize"),
    prompt: Optional[str] = typer.Option(
        None, "--prompt", "-p",
        help="Custom organization prompt (e.g., 'create folder images for photos')"
    ),
    recursive: bool = typer.Option(
        False, "--recursive", "-r",
        help="Scan subdirectories recursively"
    ),
    dry_run: bool = typer.Option(
        False, "--dry-run", "-n",
        help="Show what would be done without moving files"
    ),
    verbose: bool = typer.Option(
        False, "--verbose", "-v",
        help="Enable verbose logging"
    )
):

    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    target_dir = Path(directory).expanduser().resolve()
    
    if not target_dir.exists():
        display.print_error(f"Directory not found: {target_dir}")
        raise typer.Exit(1)
    
    if not target_dir.is_dir():
        display.print_error(f"Not a directory: {target_dir}")
        raise typer.Exit(1)
    
    organizer = FileOrganizer(
        target_dir=target_dir,
        recursive=recursive,
        dry_run=dry_run,
        user_prompt=prompt
    )
    
    success = organizer.run()
    raise typer.Exit(0 if success else 1)


@app.command()
def info():
    display.print_header("🖥️ System Information")
    
    try:
        inference = ClipInference()
        info = inference.get_device_info()
        display.print_device_info(info)
        
        if info["cuda_available"]:
            display.print_success(f"CUDA is available - GPU acceleration enabled!")
        else:
            display.print_warning("CUDA not available - will use CPU")
            
    except Exception as e:
        display.print_error(f"Error checking system: {e}")


@app.command()
def analyze(
    directory: str = typer.Argument(..., help="Directory to analyze"),
):

    import json
    import sys
    import traceback
    
    # Save original stdout to ensure only JSON goes there
    original_stdout = sys.stdout
    try:
        original_stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass
        
    # Redirect all standard output to stderr to prevent pollution of the JSON pipe
    # This catches progress bars (tqdm), warnings, and utility prints
    sys.stdout = sys.stderr
    
    try:
        target_dir = Path(directory).resolve()
        
        category_manager = CategoryManager()
        scanner = FileScanner()
        
        scan_result = scanner.scan(target_dir)
        
        classifications = []
        idx = 0
        hashes = {}
        duplicates_count = 0
        
        all_files = scan_result.all_files
        
        for file_info in all_files:
            h = file_info.metadata.get("hash", "")
            is_duplicate = False
            duplicate_of = None
            
            if h:
                if h in hashes:
                    is_duplicate = True
                    duplicate_of = hashes[h]
                    duplicates_count += 1
                else:
                    hashes[h] = str(file_info.path)

            category = None
            confidence = 0.5
            
            if not file_info.is_image:
                cat_obj = category_manager.get_category_by_extension(file_info.extension, file_info.name)
                if cat_obj:
                    category = cat_obj.folder_name
                    confidence = 1.0
                else:
                    category = "Outros"
                    confidence = 0.5

            classifications.append({
                "index": idx,
                "filename": file_info.name,
                "filepath": str(file_info.path),
                "suggested_folder": category or "Outros",
                "suggested_name": None, # Logic simplified for now
                "confidence": confidence,
                "selected": not is_duplicate,
                "is_duplicate": is_duplicate,
                "duplicate_of": duplicate_of
            })
            idx += 1
            
        image_indices = [i for i, f in enumerate(all_files) if f.is_image]
        
        if image_indices:
            try:
                inference = ClipInference()
                categories = category_manager.get_image_categories()
                cat_names = [c.name for c in categories]
                cat_prompts = category_manager.get_clip_prompts()
                
                img_path_objs = [all_files[i].path for i in image_indices]
                
                results = inference.classify_batch(img_path_objs, cat_names, cat_prompts)
                
                for i, res in enumerate(results):
                    real_idx = image_indices[i]
                    folder = next((c.folder_name for c in categories if c.name == res.suggested_category), res.suggested_category)
                    
                    classifications[real_idx]["suggested_folder"] = folder
                    classifications[real_idx]["confidence"] = res.confidence
                    
            except Exception as e:
                # Use sys.stderr explicitly or print, which now goes to stderr
                print(f"CLIP Error: {e}")
 
        output = {
            "total_files": scan_result.total_files,
            "images": len(scan_result.images),
            "documents": len(scan_result.documents),
            "other_files": len(scan_result.other_files),
            "classifications": classifications,
            "scan_time": scan_result.scan_time_seconds,
            "total_duplicates": duplicates_count
        }
        
        # Print FINAL JSON to the REAL stdout
        print(json.dumps(output), file=original_stdout)
        
    except Exception as e:
        error_out = {"error": str(e), "trace": traceback.format_exc()}
        # Print ERROR JSON to the REAL stdout
        print(json.dumps(error_out), file=original_stdout)
        sys.exit(1)


@app.command()
def search(
    directory: str = typer.Argument(..., help="Directory to search"),
    query: str = typer.Argument(..., help="Search query"),
):
  
    import json
    import sys
    import numpy as np
    
    # Save original stdout
    original_stdout = sys.stdout
    try:
        original_stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass
        
    # Redirect all other stdout prints to stderr
    sys.stdout = sys.stderr
    
    try:
        target_dir = Path(directory).resolve()
        
        scanner = FileScanner(use_ocr=False)
        scan_result = scanner.scan(target_dir)
        images = scan_result.images
        
        if not images:
            print(json.dumps([]), file=original_stdout)
            sys.exit(0)
            
        inference = ClipInference()
        query_embedding = inference.encode_text(query)
        q_vec = np.array(query_embedding)
        
        results = []
        
        for idx, img in enumerate(images):
            img_emb = inference.get_image_embedding(img.path)
            if not img_emb: continue
            
            i_vec = np.array(img_emb)
            # Cosine similarity
            similarity = np.dot(q_vec, i_vec) / (np.linalg.norm(q_vec) * np.linalg.norm(i_vec))
            
            if similarity > 0.15:
                results.append({
                    "index": idx,
                    "filename": img.name,
                    "filepath": str(img.path),
                    "suggested_folder": "Busca",
                    "suggested_name": None,
                    "confidence": float(similarity),
                    "selected": True,
                    "is_duplicate": False,
                    "duplicate_of": None
                })
        
        results.sort(key=lambda x: x["confidence"], reverse=True)
        print(json.dumps(results[:50]), file=original_stdout)
        
    except Exception as e:
        import traceback
        # Print error to stderr for logs
        print(f"Search Error: {e}")
        # Return empty list or error JSON to stdout so UI doesn't crash
        print(json.dumps([]), file=original_stdout) 
        sys.exit(1)


if __name__ == "__main__":
    app()
