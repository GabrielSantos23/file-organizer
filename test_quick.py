#!/usr/bin/env python3
import sys
sys.path.insert(0, '.')

from core.scanner import FileScanner
from core.categories import CategoryManager

scanner = FileScanner()
result = scanner.scan('./test_images')
print(f'Total files: {result.total_files}')
print(f'Images: {len(result.images)}')
for img in result.images:
    print(f'  - {img.name} (is_image={img.is_image})')

print()
cm = CategoryManager()
cats = cm.get_image_categories()
print(f'Total categories: {len(cats)}')
prompts = cm.get_clip_prompts()
print(f'Total prompts: {len(prompts)}')
print('First 3 prompts:')
for p in prompts[:3]:
    print(f'  {p}')
