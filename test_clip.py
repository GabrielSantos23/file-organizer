import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import torch
from PIL import Image
import open_clip

from core.categories import CategoryManager

_model = None
_preprocess = None
_tokenizer = None
_device = None

def get_model():
    global _model, _preprocess, _tokenizer, _device
    
    if _model is None:
        print("Loading CLIP model (ViT-B-32)...")
        _device = "cuda" if torch.cuda.is_available() else "cpu"
        model_name = 'ViT-B-32' 
        pretrained = 'laion2b_s34b_b79k'
        
        _model, _, _preprocess = open_clip.create_model_and_transforms(
            model_name, pretrained=pretrained, device=_device
        )
        _tokenizer = open_clip.get_tokenizer(model_name)
        _model.eval()
        print(f"Model loaded on {_device}")
    
    return _model, _preprocess, _tokenizer, _device

def test_clip(image_path):
    if not os.path.exists(image_path):
        print(f"Error: File not found at {image_path}")
        return

    model, preprocess, tokenizer, device = get_model()
    
    category_manager = CategoryManager()
    categories = category_manager.get_image_categories()
    cat_names = [c.name for c in categories]
    cat_prompts = category_manager.get_clip_prompts()
    
    print(f"Processing: {image_path}")
    print(f"Testing against {len(categories)} categories...")
    
    try:
        original_image = Image.open(image_path).convert("RGB")
        image = preprocess(original_image).unsqueeze(0).to(device)
    except Exception as e:
        print(f"Error loading image: {e}")
        return

    text = tokenizer(cat_prompts).to(device)

    with torch.no_grad():
        image_features = model.encode_image(image)
        text_features = model.encode_text(text)
        
        image_features /= image_features.norm(dim=-1, keepdim=True)
        text_features /= text_features.norm(dim=-1, keepdim=True)

        text_probs = (100.0 * image_features @ text_features.T).softmax(dim=-1)

    probs = text_probs.cpu().numpy()[0]
    
    results = sorted(zip(cat_names, probs), key=lambda x: x[1], reverse=True)
    
    print("\n--- Top 5 Results ---")
    for i, (cat_name, prob) in enumerate(results[:5]):
        category = next(c for c in categories if c.name == cat_name)
        print(f"{i+1}. {cat_name} ({category.folder_name}): {prob:.2%}")
    
    best_cat = next(c for c in categories if c.name == results[0][0])
    print(f"\n✓ Suggested folder: {best_cat.folder_name}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_clip.py <path_to_image_or_directory>")
        print("Example: python test_clip.py ./test_images")
    else:
        path = sys.argv[1]
        
        if os.path.isdir(path):
            print(f"Processing directory: {path}")
            print(f"Device: {'CUDA' if torch.cuda.is_available() else 'CPU'}")
            valid_extensions = ('.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp')
            files = [f for f in os.listdir(path) if f.lower().endswith(valid_extensions)]
            
            if not files:
                print("No image files found in directory.")
            
            for file in sorted(files):
                full_path = os.path.join(path, file)
                print(f"\n{'='*60}")
                print(f"Testing: {file}")
                test_clip(full_path)
        else:
            test_clip(path)

