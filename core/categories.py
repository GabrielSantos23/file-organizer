

from dataclasses import dataclass, field
from typing import Optional
import re


@dataclass
class Category:
    name: str
    folder_name: str
    description: str
    keywords: list[str] = field(default_factory=list)
    extensions: list[str] = field(default_factory=list)
    
    def __hash__(self):
        return hash(self.name)
    
    def __eq__(self, other):
        if isinstance(other, Category):
            return self.name == other.name
        return False


DEFAULT_IMAGE_CATEGORIES = [
    Category(
        name="Foto Pessoal",
        folder_name="Fotos_Pessoais",
        description="Personal photo, selfie, portrait, family photo, friends photo, group photo",
        keywords=["selfie", "portrait", "personal", "family"]
    ),
    Category(
        name="Foto de Viagem",
        folder_name="Fotos_Viagem",
        description="Travel photo, vacation picture, tourist attraction, landmark, city view, tourism",
        keywords=["travel photo", "vacation", "tourism", "landmark"]
    ),
    Category(
        name="Evento",
        folder_name="Eventos",
        description="Event photo, party, celebration, wedding, birthday, concert, festival, gathering",
        keywords=["event", "party", "celebration", "wedding", "concert"]
    ),
    
    Category(
        name="Animal",
        folder_name="Animais",
        description="Animal, pet, dog, cat, bird, wildlife, nature photography, cute animal, zoo",
        keywords=["animal", "pet", "dog", "cat", "wildlife"]
    ),
    Category(
        name="Paisagem Natural",
        folder_name="Paisagens",
        description="Nature landscape, mountain, forest, beach, ocean, sunset, sky, natural scenery",
        keywords=["landscape", "nature", "mountain", "beach", "sunset"]
    ),
    Category(
        name="Planta",
        folder_name="Plantas",
        description="Plant, flower, garden, tree, botanical, vegetation, floral, nature",
        keywords=["plant", "flower", "garden", "botanical"]
    ),
    
    Category(
        name="Comida",
        folder_name="Comidas",
        description="Food, meal, dish, cooking, gastronomy, restaurant plate, fruits, vegetables, dessert, recipe",
        keywords=["food", "meal", "dish", "cooking", "gastronomy"]
    ),
    Category(
        name="Bebida",
        folder_name="Bebidas",
        description="Drink, beverage, coffee, cocktail, wine, beer, juice, smoothie, tea",
        keywords=["drink", "beverage", "coffee", "cocktail"]
    ),
    
    Category(
        name="Screenshot",
        folder_name="Screenshots",
        description="Computer screenshot, phone screenshot, screen capture with UI elements, software interface",
        keywords=["screenshot", "screen capture", "print screen"]
    ),
    Category(
        name="Tecnologia",
        folder_name="Tecnologia",
        description="Technology, gadget, electronics, computer, phone, hardware, device, tech product",
        keywords=["technology", "gadget", "electronics", "computer"]
    ),
    Category(
        name="Videogame",
        folder_name="Games",
        description="Video game screenshot, gaming, game character, game scene, esports, gaming setup",
        keywords=["videogame", "gaming", "game", "esports"]
    ),
    
    Category(
        name="Wallpaper",
        folder_name="Wallpapers",
        description="Desktop or phone wallpaper, beautiful background, abstract art background, aesthetic",
        keywords=["wallpaper", "desktop background", "4k background", "aesthetic background"]
    ),
    Category(
        name="Arte Digital",
        folder_name="Arte_Digital",
        description="Digital art, illustration, drawing, painting, concept art, anime art, fanart",
        keywords=["digital art", "illustration", "drawing", "artwork"]
    ),
    Category(
        name="Arte Tradicional",
        folder_name="Arte_Tradicional",
        description="Traditional art, painting, sculpture, museum art, fine art, classical art, oil painting",
        keywords=["painting", "sculpture", "museum", "fine art"]
    ),
    Category(
        name="Design Gráfico",
        folder_name="Design_Grafico",
        description="Graphic design, logo, banner, poster, flyer, infographic, visual design, branding",
        keywords=["graphic design", "logo", "banner", "poster"]
    ),
    
    Category(
        name="Meme",
        folder_name="Memes",
        description="Internet meme, funny image, reaction image, comic, humorous picture, viral content",
        keywords=["meme", "funny", "reaction", "comic"]
    ),
    Category(
        name="Anime/Manga",
        folder_name="Anime_Manga",
        description="Anime, manga, japanese animation, anime character, anime scene, japanese cartoon",
        keywords=["anime", "manga", "japanese animation"]
    ),
    
    Category(
        name="Documento Escaneado",
        folder_name="Documentos_Escaneados",
        description="Scanned document, paper document photo, receipt, invoice, form, contract, ID",
        keywords=["scanned document", "paper", "receipt", "invoice"]
    ),
    Category(
        name="Diagrama",
        folder_name="Diagramas",
        description="Diagram, chart, graph, flowchart, infographic, data visualization, schematic",
        keywords=["diagram", "chart", "graph", "flowchart"]
    ),
    Category(
        name="Apresentação",
        folder_name="Slides",
        description="Presentation slide, powerpoint, keynote, business presentation, lecture slide",
        keywords=["presentation", "slide", "powerpoint"]
    ),
    
    Category(
        name="Veículo",
        folder_name="Veiculos",
        description="Vehicle, car, motorcycle, bicycle, truck, airplane, boat, transportation",
        keywords=["vehicle", "car", "motorcycle", "airplane"]
    ),
    
    Category(
        name="Arquitetura",
        folder_name="Arquitetura",
        description="Architecture, building, house, interior design, exterior, construction, urban",
        keywords=["architecture", "building", "house", "interior"]
    ),
    Category(
        name="Cidade",
        folder_name="Cidades",
        description="City, urban landscape, street photography, downtown, skyline, urban life",
        keywords=["city", "urban", "street", "skyline"]
    ),
    
    Category(
        name="Esporte",
        folder_name="Esportes",
        description="Sports, fitness, exercise, athlete, game, competition, workout, gym",
        keywords=["sports", "fitness", "exercise", "athlete"]
    ),
    
    Category(
        name="Produto",
        folder_name="Produtos",
        description="Product photo, e-commerce image, item for sale, merchandise, advertising",
        keywords=["product", "merchandise", "item", "shopping"]
    ),
    Category(
        name="Moda",
        folder_name="Moda",
        description="Fashion, clothing, outfit, style, model, runway, accessories, beauty",
        keywords=["fashion", "clothing", "outfit", "style"]
    ),
    
    Category(
        name="Médico",
        folder_name="Medico",
        description="Medical image, health, anatomy, x-ray, medical scan, healthcare, medicine",
        keywords=["medical", "health", "anatomy", "x-ray"]
    ),
    Category(
        name="Ciência",
        folder_name="Ciencia",
        description="Science, scientific image, microscope, space, astronomy, laboratory, research",
        keywords=["science", "microscope", "space", "laboratory"]
    ),
    
    Category(
        name="Mapa",
        folder_name="Mapas",
        description="Map, geographical map, GPS, navigation, satellite image, location, cartography",
        keywords=["map", "geographical", "GPS", "navigation"]
    ),
    
    Category(
        name="Texto/Citação",
        folder_name="Textos_Imagens",
        description="Text image, quote, typography, motivational text, inspirational quote, text art",
        keywords=["text", "quote", "typography", "motivational"]
    ),
]

DEFAULT_DOCUMENT_CATEGORIES = [
    Category(
        name="PDF",
        folder_name="PDFs",
        description="PDF documents",
        extensions=[".pdf"]
    ),
    Category(
        name="Documento Word",
        folder_name="Documentos_Word",
        description="Microsoft Word documents",
        extensions=[".doc", ".docx", ".odt", ".rtf"]
    ),
    Category(
        name="Planilha",
        folder_name="Planilhas",
        description="Spreadsheet files",
        extensions=[".xls", ".xlsx", ".csv", ".ods"]
    ),
    Category(
        name="Apresentação",
        folder_name="Apresentacoes",
        description="Presentation files",
        extensions=[".ppt", ".pptx", ".odp"]
    ),
    Category(
        name="Texto",
        folder_name="Textos",
        description="Plain text files",
        extensions=[".txt", ".md", ".rst", ".log", ".nfo"]
    ),
    
    Category(
        name="Código",
        folder_name="Codigo",
        description="Source code files",
        extensions=[".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".cpp", ".c", ".h", 
                   ".hpp", ".rs", ".go", ".rb", ".php", ".swift", ".kt", ".scala",
                   ".lua", ".pl", ".sh", ".bash", ".zsh", ".fish", ".ps1"]
    ),
    Category(
        name="Web",
        folder_name="Web",
        description="Web development files",
        extensions=[".html", ".htm", ".css", ".scss", ".sass", ".less"]
    ),
    Category(
        name="Dados",
        folder_name="Dados",
        description="Data and configuration files",
        extensions=[".json", ".yaml", ".yml", ".xml", ".toml", ".ini", ".conf", ".cfg", ".env"]
    ),
    
    Category(
        name="Arquivo Compactado",
        folder_name="Arquivos_Compactados",
        description="Compressed archive files",
        extensions=[".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz", ".tar.gz", 
                   ".tar.xz", ".tar.bz2", ".tgz", ".tbz2"]
    ),
    Category(
        name="Executável Windows",
        folder_name="Executaveis_Windows",
        description="Windows executable and installer files",
        extensions=[".exe", ".msi", ".bat", ".cmd"]
    ),
    Category(
        name="Pacote Linux",
        folder_name="Pacotes_Linux",
        description="Linux packages and AppImages",
        extensions=[".appimage", ".deb", ".rpm", ".flatpakref", ".snap", ".pkg.tar.zst",
                   ".pkg.tar.xz", ".run"]
    ),
    Category(
        name="Imagem de Disco",
        folder_name="Imagens_Disco",
        description="Disk images and ISOs",
        extensions=[".iso", ".img", ".dmg", ".vhd", ".vmdk", ".qcow2"]
    ),
    
    Category(
        name="Vídeo",
        folder_name="Videos",
        description="Video files",
        extensions=[".mp4", ".mkv", ".avi", ".mov", ".webm", ".flv", ".wmv", ".m4v",
                   ".mpg", ".mpeg", ".3gp", ".ts"]
    ),
    Category(
        name="Áudio",
        folder_name="Audios",
        description="Audio files",
        extensions=[".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac", ".wma", ".opus",
                   ".aiff", ".mid", ".midi"]
    ),
    Category(
        name="Legenda",
        folder_name="Legendas",
        description="Subtitle files",
        extensions=[".srt", ".vtt", ".sub", ".ass", ".ssa", ".idx"]
    ),
    
    Category(
        name="Ícone/Vetor",
        folder_name="Icones_Vetores",
        description="Vector graphics and icons",
        extensions=[".svg", ".eps", ".ai", ".sketch"]
    ),
    Category(
        name="Design",
        folder_name="Design",
        description="Design project files",
        extensions=[".psd", ".xcf", ".fig", ".xd", ".blend", ".kra"]
    ),
    Category(
        name="Fonte",
        folder_name="Fontes",
        description="Font files",
        extensions=[".ttf", ".otf", ".woff", ".woff2", ".eot", ".fon"]
    ),
    
    Category(
        name="Dicionário",
        folder_name="Dicionarios",
        description="Dictionary and spell-check files",
        extensions=[".dic", ".aff", ".dict"]
    ),
    Category(
        name="Certificado",
        folder_name="Certificados",
        description="Certificate and key files",
        extensions=[".pem", ".crt", ".cer", ".key", ".p12", ".pfx", ".jks"]
    ),
    Category(
        name="Banco de Dados",
        folder_name="Bancos_Dados",
        description="Database files",
        extensions=[".db", ".sqlite", ".sqlite3", ".sql", ".mdb", ".accdb"]
    ),
    
    Category(
        name="Torrent",
        folder_name="Torrents",
        description="Torrent files",
        extensions=[".torrent", ".magnet"]
    ),
    
    Category(
        name="E-book",
        folder_name="Ebooks",
        description="E-book files",
        extensions=[".epub", ".mobi", ".azw", ".azw3", ".fb2", ".djvu", ".cbr", ".cbz"]
    ),
    
    Category(
        name="Modelo 3D",
        folder_name="Modelos_3D",
        description="3D model files",
        extensions=[".obj", ".fbx", ".stl", ".dae", ".gltf", ".glb", ".3ds", ".blend"]
    ),
    
    Category(
        name="Backup",
        folder_name="Backups",
        description="Backup files",
        extensions=[".bak", ".backup", ".old", ".orig"]
    ),
    Category(
        name="Download Incompleto",
        folder_name="Downloads_Incompletos",
        description="Partial/incomplete download files",
        extensions=[".part", ".crdownload", ".download", ".partial", ".tmp"]
    ),
    
    Category(
        name="Streaming/Playlist",
        folder_name="Streaming_Playlists",
        description="Streaming and playlist files",
        extensions=[".strm", ".m3u", ".m3u8", ".pls", ".xspf", ".asx"]
    ),
]



class CategoryManager:
    
    def __init__(self):
        self.image_categories: list[Category] = list(DEFAULT_IMAGE_CATEGORIES)
        self.document_categories: list[Category] = list(DEFAULT_DOCUMENT_CATEGORIES)
        self.custom_categories: list[Category] = []
    
    def get_image_categories(self) -> list[Category]:
        return self.image_categories + [c for c in self.custom_categories if not c.extensions]
    
    def get_document_categories(self) -> list[Category]:
        return self.document_categories
    
    def get_category_by_extension(self, extension: str, filename: str = "") -> Optional[Category]:
        """
        
        Args:
            extension: Simple extension (e.g., '.xz')
            filename: Full filename to check for compound extensions (e.g., 'file.tar.xz')
        """
        ext_lower = extension.lower()
        filename_lower = filename.lower()
        
        if filename_lower:
            for category in self.document_categories:
                for cat_ext in category.extensions:
                    if filename_lower.endswith(cat_ext.lower()):
                        return category
        
        for category in self.document_categories:
            if ext_lower in [e.lower() for e in category.extensions]:
                return category
        
        return None
    
    def get_full_extension(self, filename: str) -> str:
   
        filename_lower = filename.lower()
        
        compound_extensions = [
            '.tar.gz', '.tar.xz', '.tar.bz2', '.pkg.tar.zst', '.pkg.tar.xz'
        ]
        for compound in compound_extensions:
            if filename_lower.endswith(compound):
                return compound
        
        special_extensions = ['.appimage', '.flatpakref']
        for special in special_extensions:
            if filename_lower.endswith(special):
                return special
        
        from pathlib import Path
        return Path(filename).suffix.lower()
    
    def add_custom_category(self, category: Category) -> None:
        self.custom_categories.append(category)
    
    def parse_user_prompt(self, prompt: str) -> list[Category]:
        custom_cats = []
        seen_folders = set()
        
        all_pattern = r"(?:pasta\s+)?chamada\s+['\"]?(\w+)['\"]?\s+para\s+(?:os?|as?)?\s*([^,]+?)(?=\s+e\s+outra|\s+e\s+uma|\s*$|\s*\.)"
        
        matches = re.finditer(all_pattern, prompt, re.IGNORECASE)
        for match in matches:
            folder_name = match.group(1).strip()
            description = match.group(2).strip()
            
            description = re.sub(r'\s+outra\s*$', '', description)
            description = re.sub(r'\s+uma\s*$', '', description)
            
            folder_lower = folder_name.lower()
            if folder_lower not in seen_folders:
                seen_folders.add(folder_lower)
                category = Category(
                    name=folder_name.capitalize(),
                    folder_name=folder_name,
                    description=description,
                    keywords=[description.lower()]
                )
                custom_cats.append(category)
        
        en_pattern = r"folder\s+(?:named\s+)?['\"]?(\w+)['\"]?\s+for\s+(.+?)(?:\s+and\s+|$|\.)"
        matches = re.finditer(en_pattern, prompt, re.IGNORECASE)
        for match in matches:
            folder_name = match.group(1).strip()
            description = match.group(2).strip()
            
            folder_lower = folder_name.lower()
            if folder_lower not in seen_folders:
                seen_folders.add(folder_lower)
                category = Category(
                    name=folder_name.capitalize(),
                    folder_name=folder_name,
                    description=description,
                    keywords=[description.lower()]
                )
                custom_cats.append(category)
        
        return custom_cats
    
    def apply_user_prompt(self, prompt: str) -> list[Category]:
        categories = self.parse_user_prompt(prompt)
        for cat in categories:
            self.add_custom_category(cat)
        return categories
    
    def get_clip_prompts(self) -> list[str]:
        prompts = []
        for cat in self.get_image_categories():
            prompts.append(f"a photo of {cat.description}")
        return prompts
    
    def get_category_names(self) -> list[str]:
        return [cat.name for cat in self.get_image_categories()]
