
import logging
from pathlib import Path
from typing import Optional
from dataclasses import dataclass

import torch
from PIL import Image

_clip_model = None
_clip_preprocess = None
_clip_tokenizer = None

logger = logging.getLogger(__name__)


@dataclass
class ClassificationResult:
    file_path: Path
    suggested_category: str
    confidence: float
    all_scores: dict[str, float]
    
    def __repr__(self):
        return f"ClassificationResult({self.file_path.name} -> {self.suggested_category} [{self.confidence:.1%}])"


class ClipInference:

    
    # Supported image extensions
    IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tiff"}
    
    def __init__(
        self,
        model_name: str = "ViT-B-32",
        pretrained: str = "laion2b_s34b_b79k",
        device: Optional[str] = None
    ):

        self.model_name = model_name
        self.pretrained = pretrained
        self._model = None
        self._preprocess = None
        self._tokenizer = None
        
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device
        
        logger.info(f"CLIP Inference initialized (device: {self.device})")
    
    def _ensure_model_loaded(self) -> None:
        if self._model is not None:
            return
        
        try:
            import open_clip
            
            logger.info(f"Loading CLIP model: {self.model_name} ({self.pretrained})...")
            
            self._model, _, self._preprocess = open_clip.create_model_and_transforms(
                self.model_name,
                pretrained=self.pretrained,
                device=self.device
            )
            self._tokenizer = open_clip.get_tokenizer(self.model_name)
            
            self._model.eval()
            
            logger.info(f"CLIP model loaded successfully on {self.device}")
            
            if self.device == "cuda":
                gpu_name = torch.cuda.get_device_name(0)
                gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
                logger.info(f"GPU: {gpu_name} ({gpu_memory:.1f} GB)")
                
        except Exception as e:
            logger.error(f"Failed to load CLIP model: {e}")
            raise RuntimeError(f"Could not load CLIP model: {e}")
    
    def is_image_file(self, file_path: Path) -> bool:
        return file_path.suffix.lower() in self.IMAGE_EXTENSIONS
    
    def classify_image(
        self,
        image_path: Path,
        categories: list[str],
        category_prompts: Optional[list[str]] = None
    ) -> ClassificationResult:
   
        self._ensure_model_loaded()
        
        if category_prompts is None:
            category_prompts = [f"a photo of {cat}" for cat in categories]
        
        try:
            image = Image.open(image_path).convert("RGB")
            image_tensor = self._preprocess(image).unsqueeze(0).to(self.device)
            
            text_tokens = self._tokenizer(category_prompts).to(self.device)
            
            with torch.no_grad():
                image_features = self._model.encode_image(image_tensor)
                text_features = self._model.encode_text(text_tokens)
                
                image_features = image_features / image_features.norm(dim=-1, keepdim=True)
                text_features = text_features / text_features.norm(dim=-1, keepdim=True)
                
                similarity = (image_features @ text_features.T).squeeze(0)
                
                probs = torch.softmax(similarity * 100, dim=0)
            
            scores_dict = {cat: prob.item() for cat, prob in zip(categories, probs)}
            best_idx = probs.argmax().item()
            best_category = categories[best_idx]
            best_confidence = probs[best_idx].item()
            
            return ClassificationResult(
                file_path=image_path,
                suggested_category=best_category,
                confidence=best_confidence,
                all_scores=scores_dict
            )
            
        except Exception as e:
            logger.error(f"Error classifying {image_path}: {e}")
            raise
    
    def classify_batch(
        self,
        image_paths: list[Path],
        categories: list[str],
        category_prompts: Optional[list[str]] = None,
        batch_size: int = 16
    ) -> list[ClassificationResult]:
     
        self._ensure_model_loaded()
        
        if category_prompts is None:
            category_prompts = [f"a photo of {cat}" for cat in categories]
        
        results = []
        
        text_tokens = self._tokenizer(category_prompts).to(self.device)
        with torch.no_grad():
            text_features = self._model.encode_text(text_tokens)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)
        
        for i in range(0, len(image_paths), batch_size):
            batch_paths = image_paths[i:i + batch_size]
            batch_tensors = []
            valid_indices = []
            
            for idx, img_path in enumerate(batch_paths):
                try:
                    image = Image.open(img_path).convert("RGB")
                    tensor = self._preprocess(image)
                    batch_tensors.append(tensor)
                    valid_indices.append(idx)
                except Exception as e:
                    logger.warning(f"Could not load {img_path}: {e}")
                    results.append(ClassificationResult(
                        file_path=img_path,
                        suggested_category="Erro",
                        confidence=0.0,
                        all_scores={}
                    ))
            
            if not batch_tensors:
                continue
            
            batch = torch.stack(batch_tensors).to(self.device)
            
            with torch.no_grad():
                image_features = self._model.encode_image(batch)
                image_features = image_features / image_features.norm(dim=-1, keepdim=True)
                
                similarity = image_features @ text_features.T
                probs = torch.softmax(similarity * 100, dim=1)
            
            for batch_idx, file_idx in enumerate(valid_indices):
                img_path = batch_paths[file_idx]
                img_probs = probs[batch_idx]
                
                scores_dict = {cat: prob.item() for cat, prob in zip(categories, img_probs)}
                best_idx = img_probs.argmax().item()
                
                results.append(ClassificationResult(
                    file_path=img_path,
                    suggested_category=categories[best_idx],
                    confidence=img_probs[best_idx].item(),
                    all_scores=scores_dict
                ))
        
        return results

    def encode_text(self, text: str) -> list[float]:
        self._ensure_model_loaded()
        text_tokens = self._tokenizer([text]).to(self.device)
        with torch.no_grad():
            text_features = self._model.encode_text(text_tokens)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)
            return text_features.cpu().numpy()[0].tolist()

    def get_image_embedding(self, image_path: Path) -> list[float]:
        self._ensure_model_loaded()
        try:
            image = Image.open(image_path).convert("RGB")
            image_tensor = self._preprocess(image).unsqueeze(0).to(self.device)
            with torch.no_grad():
                image_features = self._model.encode_image(image_tensor)
                image_features = image_features / image_features.norm(dim=-1, keepdim=True)
                return image_features.cpu().numpy()[0].tolist()
        except Exception as e:
            logger.error(f"Error encoding image {image_path}: {e}")
            return []
    
    def get_device_info(self) -> dict:
        info = {
            "device": self.device,
            "cuda_available": torch.cuda.is_available(),
        }
        
        if torch.cuda.is_available():
            info["gpu_name"] = torch.cuda.get_device_name(0)
            info["gpu_memory_total"] = torch.cuda.get_device_properties(0).total_memory / 1024**3
            info["gpu_memory_allocated"] = torch.cuda.memory_allocated(0) / 1024**3
        
        return info
    
    def unload_model(self) -> None:
        if self._model is not None:
            del self._model
            del self._preprocess
            del self._tokenizer
            self._model = None
            self._preprocess = None
            self._tokenizer = None
            
            if self.device == "cuda":
                torch.cuda.empty_cache()
            
            logger.info("CLIP model unloaded")
