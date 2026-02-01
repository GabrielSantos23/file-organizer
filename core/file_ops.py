
import logging
import shutil
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class MoveOperation:
    source: Path
    destination: Path
    category: str
    confidence: float
    status: str = "pending"  
    error_message: Optional[str] = None


@dataclass
class MoveResult:
    total_operations: int
    successful: int
    failed: int
    skipped: int
    operations: list[MoveOperation]
    
    @property
    def success_rate(self) -> float:
        if self.total_operations == 0:
            return 0.0
        return self.successful / self.total_operations


class FileOperations:

    
    def __init__(self, base_directory: Path, dry_run: bool = False):
        self.base_directory = Path(base_directory).resolve()
        self.dry_run = dry_run
        self._planned_operations: list[MoveOperation] = []
        
        logger.info(f"FileOperations initialized (base: {self.base_directory}, dry_run: {dry_run})")
    
    def plan_move(
        self,
        source: Path,
        category_folder: str,
        category_name: str,
        confidence: float
    ) -> MoveOperation:
   
        source = Path(source).resolve()
        destination = self.base_directory / category_folder / source.name
        
        operation = MoveOperation(
            source=source,
            destination=destination,
            category=category_name,
            confidence=confidence
        )
        
        self._planned_operations.append(operation)
        return operation
    
    def get_planned_operations(self) -> list[MoveOperation]:
        return self._planned_operations.copy()
    
    def clear_planned_operations(self) -> None:
        self._planned_operations.clear()
    
    def validate_operations(self) -> list[tuple[MoveOperation, str]]:
   
        issues = []
        
        for op in self._planned_operations:
            if not op.source.exists():
                issues.append((op, f"Source file does not exist: {op.source}"))
                continue
            
            if not op.source.is_file():
                issues.append((op, f"Source is not a file: {op.source}"))
                continue
            
            if op.destination.exists():
                issues.append((op, f"Destination already exists: {op.destination}"))
                continue
            
            dest_parent = op.destination.parent
            if dest_parent.exists() and not dest_parent.is_dir():
                issues.append((op, f"Destination parent is not a directory: {dest_parent}"))
        
        return issues
    
    def execute_operation(self, operation: MoveOperation) -> bool:
        try:
            if self.dry_run:
                logger.info(f"[DRY RUN] Would move: {operation.source} -> {operation.destination}")
                operation.status = "completed"
                return True
            
            operation.destination.parent.mkdir(parents=True, exist_ok=True)
            
            final_destination = self._get_unique_destination(operation.destination)
            
            shutil.move(str(operation.source), str(final_destination))
            
            operation.destination = final_destination
            operation.status = "completed"
            
            logger.info(f"Moved: {operation.source.name} -> {final_destination}")
            return True
            
        except PermissionError as e:
            operation.status = "failed"
            operation.error_message = f"Permission denied: {e}"
            logger.error(f"Permission denied moving {operation.source}: {e}")
            return False
            
        except Exception as e:
            operation.status = "failed"
            operation.error_message = str(e)
            logger.error(f"Error moving {operation.source}: {e}")
            return False
    
    def execute_all(self, operations: Optional[list[MoveOperation]] = None) -> MoveResult:
        if operations is None:
            operations = self._planned_operations
        
        successful = 0
        failed = 0
        skipped = 0
        
        for op in operations:
            if op.status == "skipped":
                skipped += 1
                continue
            
            if self.execute_operation(op):
                successful += 1
            else:
                failed += 1
        
        result = MoveResult(
            total_operations=len(operations),
            successful=successful,
            failed=failed,
            skipped=skipped,
            operations=operations
        )
        
        logger.info(
            f"Execution complete: {successful} successful, {failed} failed, {skipped} skipped"
        )
        
        return result
    
    def execute_selected(self, indices: list[int]) -> MoveResult:
  
        selected_ops = []
        
        for i, op in enumerate(self._planned_operations):
            if i in indices:
                selected_ops.append(op)
            else:
                op.status = "skipped"
        
        return self.execute_all(selected_ops)
    
    def _get_unique_destination(self, destination: Path) -> Path:
    
        if not destination.exists():
            return destination
        
        stem = destination.stem
        suffix = destination.suffix
        parent = destination.parent
        
        counter = 1
        while True:
            new_name = f"{stem}_{counter}{suffix}"
            new_dest = parent / new_name
            if not new_dest.exists():
                return new_dest
            counter += 1
            
            if counter > 1000:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                return parent / f"{stem}_{timestamp}{suffix}"
    
    def create_organization_structure(self, categories: list[str]) -> dict[str, Path]:
   
        created_folders = {}
        
        for category in categories:
            folder_path = self.base_directory / category
            
            if not self.dry_run:
                folder_path.mkdir(parents=True, exist_ok=True)
            
            created_folders[category] = folder_path
            logger.debug(f"Created folder: {folder_path}")
        
        return created_folders
    
    def undo_last_move(self, operation: MoveOperation) -> bool:
      
        if operation.status != "completed":
            logger.warning(f"Cannot undo operation with status: {operation.status}")
            return False
        
        try:
            if self.dry_run:
                logger.info(f"[DRY RUN] Would undo: {operation.destination} -> {operation.source}")
                return True
            
            # Move back to original location
            shutil.move(str(operation.destination), str(operation.source))
            operation.status = "pending"
            
            logger.info(f"Undone: {operation.destination.name} -> {operation.source}")
            return True
            
        except Exception as e:
            logger.error(f"Error undoing move: {e}")
            return False
    
    def get_summary(self) -> dict:
        categories = {}
        total_size = 0
        
        for op in self._planned_operations:
            cat = op.category
            if cat not in categories:
                categories[cat] = {"count": 0, "size": 0}
            
            categories[cat]["count"] += 1
            
            if op.source.exists():
                size = op.source.stat().st_size
                categories[cat]["size"] += size
                total_size += size
        
        return {
            "total_files": len(self._planned_operations),
            "total_size_bytes": total_size,
            "categories": categories
        }
