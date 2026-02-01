"""
Display utilities using Rich for beautiful console output.
"""

from pathlib import Path
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.prompt import Prompt, Confirm
from rich.text import Text
from rich import box

console = Console()


class DisplayManager:
    """Manages console display using Rich library."""
    
    def __init__(self):
        self.console = console
    
    def print_header(self, text: str) -> None:
        self.console.print()
        self.console.print(Panel(Text(text, style="bold cyan", justify="center"), box=box.DOUBLE, border_style="cyan"))
        self.console.print()
    
    def print_info(self, message: str) -> None:
        self.console.print(f"[blue]ℹ[/blue] {message}")
    
    def print_success(self, message: str) -> None:
        self.console.print(f"[green]✓[/green] {message}")
    
    def print_warning(self, message: str) -> None:
        self.console.print(f"[yellow]⚠[/yellow] {message}")
    
    def print_error(self, message: str) -> None:
        self.console.print(f"[red]✗[/red] {message}")
    
    def print_device_info(self, device_info: dict) -> None:
        self.console.print()
        if device_info.get("cuda_available"):
            self.console.print(f"[bold green]🚀 GPU:[/bold green] {device_info.get('gpu_name', 'Unknown')} ({device_info.get('gpu_memory_total', 0):.1f} GB)")
        else:
            self.console.print("[yellow]💻 Running on CPU (CUDA not available)[/yellow]")
        self.console.print()
    
    def print_scan_summary(self, total_files: int, images: int, documents: int, other: int, errors: int, scan_time: float) -> None:
        table = Table(title="📂 Scan Summary", box=box.ROUNDED, header_style="bold magenta")
        table.add_column("Metric", style="cyan")
        table.add_column("Count", justify="right", style="green")
        table.add_row("Total Files", str(total_files))
        table.add_row("🖼️  Images", str(images))
        table.add_row("📄 Documents", str(documents))
        table.add_row("📁 Other Files", str(other))
        if errors > 0:
            table.add_row("❌ Errors", f"[red]{errors}[/red]")
        table.add_row("⏱️  Scan Time", f"{scan_time:.2f}s")
        self.console.print()
        self.console.print(table)
        self.console.print()
    
    def print_classification_results(self, results: list[tuple[str, str, float]], show_index: bool = True) -> None:
        table = Table(title="🔍 Classification Results", box=box.ROUNDED, header_style="bold blue")
        if show_index:
            table.add_column("#", style="dim", justify="right", width=4)
        table.add_column("File Name", style="white", max_width=40)
        table.add_column("→", justify="center", width=3)
        table.add_column("Suggested Folder", style="cyan")
        table.add_column("Confidence", justify="right")
        
        for i, (filename, category, confidence) in enumerate(results):
            conf_style = "green" if confidence >= 0.7 else "yellow" if confidence >= 0.4 else "red"
            conf_text = f"[{conf_style}]{confidence:.1%}[/{conf_style}]"
            display_name = filename if len(filename) <= 40 else filename[:37] + "..."
            if show_index:
                table.add_row(str(i), display_name, "→", category, conf_text)
            else:
                table.add_row(display_name, "→", category, conf_text)
        self.console.print()
        self.console.print(table)
        self.console.print()
    
    def print_custom_categories(self, categories: list[tuple[str, str]]) -> None:
        self.console.print()
        self.console.print("[bold yellow]📌 Custom Categories Detected:[/bold yellow]")
        for folder, desc in categories:
            self.console.print(f"  • [cyan]{folder}[/cyan]: {desc}")
        self.console.print()
    
    def print_move_summary(self, successful: int, failed: int, skipped: int) -> None:
        self.console.print()
        content = f"[bold]Move Operations Complete[/bold]\n\n[green]✓ Successful: {successful}[/green]"
        if failed > 0:
            content += f"\n[red]✗ Failed: {failed}[/red]"
        if skipped > 0:
            content += f"\n[yellow]○ Skipped: {skipped}[/yellow]"
        self.console.print(Panel(content, box=box.ROUNDED, border_style="green" if failed == 0 else "yellow"))
    
    def prompt_action(self) -> str:
        self.console.print()
        self.console.print("[bold]What would you like to do?[/bold]\n")
        self.console.print("  [green](a)[/green] Move all files to suggested folders")
        self.console.print("  [yellow](b)[/yellow] Select manually which files to move")
        self.console.print("  [red](c)[/red] Cancel operation\n")
        return Prompt.ask("Enter your choice", choices=["a", "b", "c"], default="c").lower()
    
    def prompt_selection(self, max_index: int) -> list[int]:
        self.console.print("\n[bold]Enter file numbers to move (comma-separated, e.g., 0,2,5-10):[/bold]")
        while True:
            selection = Prompt.ask("Selection")
            try:
                indices = self._parse_selection(selection, max_index)
                if not indices:
                    self.print_warning("No valid indices selected. Try again.")
                    continue
                self.console.print(f"\nSelected {len(indices)} files: {sorted(indices)}")
                if Confirm.ask("Proceed with these files?"):
                    return indices
            except ValueError as e:
                self.print_error(f"Invalid selection: {e}")
    
    def _parse_selection(self, selection: str, max_index: int) -> list[int]:
        indices = set()
        for part in selection.replace(" ", "").split(","):
            if not part:
                continue
            if "-" in part:
                start, end = part.split("-", 1)
                start_idx, end_idx = int(start), int(end)
                if start_idx < 0 or end_idx > max_index:
                    raise ValueError(f"Range {part} out of bounds (0-{max_index})")
                indices.update(range(start_idx, end_idx + 1))
            else:
                idx = int(part)
                if 0 <= idx <= max_index:
                    indices.add(idx)
                else:
                    raise ValueError(f"Index {idx} out of bounds (0-{max_index})")
        return sorted(indices)
    
    def confirm(self, message: str, default: bool = False) -> bool:
        return Confirm.ask(message, default=default)
    
    def create_progress(self) -> Progress:
        return Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), BarColumn(), TaskProgressColumn(), console=self.console)
    
    def print_errors(self, errors: list[tuple[Path, str]]) -> None:
        if not errors:
            return
        self.console.print("\n[bold red]Errors encountered:[/bold red]")
        for path, error in errors[:10]:
            self.console.print(f"  • [dim]{path.name}[/dim]: {error}")
        if len(errors) > 10:
            self.console.print(f"  ... and {len(errors) - 10} more errors")
        self.console.print()
