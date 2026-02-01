#!/usr/bin/env python3
import sys
sys.path.insert(0, '.')

from core.inference import ClipInference
from core.scanner import FileScanner
from core.categories import CategoryManager

directory = './test_images'
scanner = FileScanner()
category_manager = CategoryManager()

scan_result = scanner.scan(directory)
print(f'Found {len(scan_result.images)} images')

categories = category_manager.get_image_categories()
print(f'Using {len(categories)} categories')

if scan_result.images:
    inference = ClipInference()
    cat_names = [c.name for c in categories]
    cat_prompts = category_manager.get_clip_prompts()
    
    print('\nCategory prompts (first 5):')
    for i, p in enumerate(cat_prompts[:5]):
        print(f'  {i+1}. {p}')
    print(f'  ... and {len(cat_prompts)-5} more')
    
    results = inference.classify_batch([f.path for f in scan_result.images], cat_names, cat_prompts)
    
    print('\n=== CLIP Classification Results ===')
    for res in results:
        folder = next((c.folder_name for c in categories if c.name == res.suggested_category), res.suggested_category)
        print(f'  {res.file_path.name} -> {folder} ({res.confidence:.2%})')
