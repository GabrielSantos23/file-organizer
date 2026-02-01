# 🗂️ File Organizer - Intelligent File Categorization Engine

Um motor de backend inteligente para organização de arquivos usando IA local (CLIP) para categorização automática.

## ✨ Funcionalidades

- **Categorização por IA**: Usa CLIP localmente para analisar imagens e sugerir categorias
- **Suporte a GPU**: Utiliza CUDA automaticamente quando disponível
- **Modo Manual**: Exibe sugestões em tabela antes de mover arquivos
- **Comandos Personalizados**: Aceita instruções em linguagem natural do usuário
- **Modular**: Arquitetura separada para fácil integração com interfaces desktop

## 📦 Instalação

```bash
# Criar ambiente virtual
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# ou .venv\Scripts\activate  # Windows

# Instalar dependências
pip install -r requirements.txt
```

## 🚀 Uso

### Modo Básico (Categorias Pré-definidas)

```bash
python engine.py /caminho/para/pasta
```

### Modo com Prompt Personalizado

```bash
python engine.py /caminho/para/pasta --prompt "crie uma pasta chamada imagens para as fotos aleatorias e outra chamada wallpapers para os wallpapers"
```

### Opções Disponíveis

```bash
python engine.py --help
```

## 🏗️ Arquitetura

```
file-organizer/
├── engine.py           # CLI principal
├── core/
│   ├── __init__.py
│   ├── inference.py    # Lógica de IA (CLIP)
│   ├── file_ops.py     # Operações de arquivo
│   ├── scanner.py      # Escaneamento de diretórios
│   └── categories.py   # Definições de categorias
├── utils/
│   ├── __init__.py
│   └── display.py      # Exibição de tabelas (rich)
└── requirements.txt
```

## 🎯 Categorias Padrão

- Wallpaper
- Screenshot
- Documento Escaneado
- Foto de Viagem
- Meme
- Documento (PDF, DOCX)
- Outros

## 📋 Requisitos

- Python 3.10+
- CUDA (opcional, para aceleração GPU)
- 4GB+ RAM para modelo CLIP
