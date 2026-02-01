import logging
from pathlib import Path
from typing import Optional
import fitz  # PyMuPDF
import pytesseract
from PIL import Image

logger = logging.getLogger(__name__)

class OCRManager:
    
    def __init__(self, tesseract_cmd: Optional[str] = None):
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
            
    def extract_text_from_pdf(self, pdf_path: Path, max_pages: int = 5) -> str:
        text = ""
        try:
            doc = fitz.open(str(pdf_path))
            for i in range(min(len(doc), max_pages)):
                text += doc[i].get_text()
            doc.close()
        except Exception as e:
            logger.error(f"Error extracting text from PDF {pdf_path}: {e}")
        return text.strip()

    def extract_text_from_image(self, image_path: Path) -> str:
        try:
            image = Image.open(image_path)
            text = pytesseract.image_to_string(image)
            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting text from image {image_path}: {e}")
            return ""

    def get_document_content(self, file_path: Path) -> str:
        ext = file_path.suffix.lower()
        if ext == ".pdf":
            return self.extract_text_from_pdf(file_path)
        elif ext in [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"]:
            return self.extract_text_from_image(file_path)
        elif ext in [".txt", ".md", ".csv"]:
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    return f.read(5000)
            except:
                return ""
        return ""
