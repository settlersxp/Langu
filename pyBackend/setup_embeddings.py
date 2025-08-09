#!/usr/bin/env python3
"""
Setup script for the Smart Word Selection System

This script installs dependencies and creates the initial embeddings cache.
Run this once before starting the fine_tune.py service.
"""

import subprocess
import sys
import os

def install_requirements():
    """Install Python requirements"""
    print("Installing Python requirements...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Requirements installed successfully")
    except subprocess.CalledProcessError:
        print("❌ Failed to install requirements")
        return False
    return True

def download_models():
    """Download the required sentence transformer model"""
    print("Downloading sentence transformer model (this may take a few minutes)...")
    try:
        from sentence_transformers import SentenceTransformer
        # This will download the model if it doesn't exist
        model = SentenceTransformer('distiluse-base-multilingual-cased')
        print("✅ Model downloaded successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to download model: {e}")
        return False

def create_embeddings():
    """Create embeddings for available word lists under currated_words/german."""
    print("Creating embeddings for available dictionaries...")
    try:
        from fine_tune import SmartWordSelector

        repo_root = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
        currated_dir = os.path.join(repo_root, "currated_words", "german")
        embeddings_dir = os.path.join(repo_root, "embeddings", "german")
        os.makedirs(embeddings_dir, exist_ok=True)

        created = 0
        if os.path.isdir(currated_dir):
            for fname in os.listdir(currated_dir):
                if not fname.lower().endswith('.txt'):
                    continue
                words_path = os.path.join(currated_dir, fname)
                cache_path = os.path.join(embeddings_dir, f"{os.path.splitext(fname)[0]}.pkl")
                print(f"→ Building embeddings for {fname} ...")
                selector = SmartWordSelector(words_path, cache_path=cache_path)
                created += 1
            print(f"✅ Created/loaded embeddings for {created} dictionaries")
            return True

        # Fallback to legacy curated_words.txt
        legacy = os.path.join(repo_root, "curated_words.txt")
        if os.path.exists(legacy):
            print("→ Building embeddings for legacy curated_words.txt ...")
            selector = SmartWordSelector(legacy, cache_path=os.path.join(embeddings_dir, "legacy.pkl"))
            print(f"✅ Embeddings created for {len(selector.words)} words")
            return True

        print("❌ No dictionaries found")
        return False
    except Exception as e:
        print(f"❌ Failed to create embeddings: {e}")
        return False

def main():
    print("=== Smart Word Selection System Setup ===\n")
    
    # Check if we're in the right directory
    if not os.path.exists("requirements.txt"):
        print("❌ Please run this script from the pyBackend directory")
        sys.exit(1)
    
    # Install requirements
    if not install_requirements():
        sys.exit(1)
    
    # Download models
    if not download_models():
        sys.exit(1)
    
    # Create embeddings
    if not create_embeddings():
        sys.exit(1)
    
    print("\n🎉 Setup completed successfully!")
    print("\nNext steps:")
    print("1. Run: python fine_tune.py")
    print("2. The service will start on http://localhost:5004")
    print("3. Your SvelteKit app will automatically use contextual word selection")
    print("4. Now includes phrase validation for LLaMA responses!")

if __name__ == "__main__":
    main()