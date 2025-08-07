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
    """Create initial embeddings for all words"""
    print("Creating embeddings for all words...")
    try:
        from fine_tune import SmartWordSelector
        
        curated_words_path = os.path.join(os.path.dirname(__file__), "..", "curated_words.txt")
        if not os.path.exists(curated_words_path):
            print(f"❌ Could not find curated_words.txt at {curated_words_path}")
            return False
        
        # This will create the embeddings and cache them
        word_selector = SmartWordSelector(curated_words_path)
        print(f"✅ Embeddings created for {len(word_selector.words)} words")
        return True
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