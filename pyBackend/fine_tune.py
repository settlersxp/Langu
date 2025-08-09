#!/usr/bin/env python3
"""
Smart Word Selection System for German Language Learning

Instead of fine-tuning (which requires massive resources), this system uses 
semantic embeddings to dynamically select relevant words from your curated 
list based on conversation context.

Approach:
1. Create embeddings for all 5000 words
2. For each conversation, find semantically similar words 
3. Provide only relevant subset (50-100 words) to the system prompt
4. Cache embeddings for performance

This is much more efficient than fine-tuning and gives better contextual results.
"""

import os
import numpy as np
from typing import List, Set, Optional, Dict
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import pickle
import spacy
from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
import torch
import tempfile
from PyPDF2 import PdfReader

class SmartWordSelector:
    def __init__(self, curated_words_path: str, cache_path: str = "word_embeddings.pkl"):
        self.curated_words_path = curated_words_path
        self.cache_path = cache_path
        self.model = SentenceTransformer('distiluse-base-multilingual-cased')
        self.words = []
        self.embeddings = None
        
        # Initialize spaCy for phrase validation
        self.nlp = spacy.load('de_core_news_md')
        self.curated_words_set = set()
        
        self._load_words()
        self._load_or_create_embeddings()
    
    def reload_from_disk(self):
        """Reload curated words and embeddings from disk (may take minutes)."""
        self._load_words()
        self._load_or_create_embeddings()
    
    def _load_words(self):
        """Load the curated words from file"""
        with open(self.curated_words_path, 'r', encoding='utf-8') as f:
            self.words = [word.strip() for word in f.readlines() if word.strip()]
        
        # Create a set for fast lookup in phrase validation
        self.curated_words_set = set(self.words)
        print(f"Loaded {len(self.words)} words")
    
    def _load_or_create_embeddings(self):
        """Load cached embeddings or create new ones"""
        if os.path.exists(self.cache_path):
            print("Loading cached embeddings...")
            with open(self.cache_path, 'rb') as f:
                cache_data = pickle.load(f)
                if cache_data['words'] == self.words:
                    self.embeddings = cache_data['embeddings']
                    print("Embeddings loaded from cache")
                    return
        
        print("Creating new embeddings (this may take a few minutes)...")
        self.embeddings = self.model.encode(self.words, show_progress_bar=True)
        
        # Cache the embeddings
        cache_data = {
            'words': self.words,
            'embeddings': self.embeddings
        }
        with open(self.cache_path, 'wb') as f:
            pickle.dump(cache_data, f)
        print("Embeddings cached for future use")
    
    def find_relevant_words(self, context: str, top_k: int = 80) -> List[str]:
        """
        Find the most relevant words based on conversation context
        
        Args:
            context: The conversation context (recent messages + topic)
            top_k: Number of most relevant words to return
            
        Returns:
            List of relevant German words
        """
        # Create embedding for the context
        context_embedding = self.model.encode([context])
        
        # Calculate cosine similarity
        similarities = cosine_similarity(context_embedding, self.embeddings)[0]
        
        # Get top-k most similar words
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        relevant_words = [self.words[i] for i in top_indices]
        
        return relevant_words
    
    def find_words_by_topics(self, topics: List[str], words_per_topic: int = 30) -> List[str]:
        """
        Find relevant words for multiple topics
        
        Args:
            topics: List of topic keywords
            words_per_topic: Words to find per topic
            
        Returns:
            Unique list of relevant words
        """
        all_relevant_words = set()
        
        for topic in topics:
            topic_words = self.find_relevant_words(topic, words_per_topic)
            all_relevant_words.update(topic_words)
        
        return list(all_relevant_words)
    
    def validate_phrase(self, phrase: str) -> float:
        """
        Validate a phrase and return the percentage of words from the curated list
        (copied from phrase_validator.py)
        
        Args:
            phrase: German text to validate
            
        Returns:
            Percentage of words that are in the curated list (0-100)
        """
        actual_words = set()
        number_of_exceptions = 0
        total_words = 0
        doc = self.nlp(phrase)
        
        for word in doc:
            if word.pos_ in ["PUNCT", "SYM", "X", "CD", "ADP"]:
                continue

            actual_words.add(word.lemma_.lower())
            total_words += 1

        for word in actual_words:
            if word not in self.curated_words_set:
                number_of_exceptions += 1

        # Calculate percentage of words that are in the curated list
        if total_words == 0:
            return 0.0
        
        valid_words = total_words - number_of_exceptions
        return (valid_words / total_words) * 100

# Flask app for API integration
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize repository paths (no eager embeddings!)
repo_root = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
default_currated_dir = os.path.join(repo_root, "currated_words", "german")
default_words_file = os.path.join(default_currated_dir, "B1.txt")

# Cache of selectors per dictionary file
selectors_cache: Dict[str, SmartWordSelector] = {}

def _safe_cache_path_for(words_path: str) -> str:
    base = os.path.splitext(os.path.basename(words_path))[0]
    embeddings_dir = os.path.join(repo_root, "embeddings", "german")
    os.makedirs(embeddings_dir, exist_ok=True)
    return os.path.join(embeddings_dir, f"{base}.pkl")

def get_selector(words_file: Optional[str]) -> SmartWordSelector:
    """Return a SmartWordSelector for the given words file under currated_words/german.
    Lazily initializes embeddings for that specific dictionary on first use.
    """
    # Resolve default when not provided
    if not words_file:
        if os.path.isfile(default_words_file):
            target_path = default_words_file
        else:
            target_path = os.path.join(repo_root, "curated_words.txt")
            if not os.path.isfile(target_path):
                raise FileNotFoundError("No default dictionary found (expected B1.txt or curated_words.txt)")
        target_path = os.path.normpath(target_path)
        if target_path in selectors_cache:
            return selectors_cache[target_path]
        cache_path = _safe_cache_path_for(target_path)
        selector = SmartWordSelector(curated_words_path=target_path, cache_path=cache_path)
        selectors_cache[target_path] = selector
        return selector
    # If an absolute path was passed, use it; else resolve under currated dir
    if os.path.isabs(words_file):
        target_path = words_file
    else:
        target_path = os.path.join(default_currated_dir, words_file)
    target_path = os.path.normpath(target_path)

    if not os.path.isfile(target_path):
        # If the user passed a level like "B1", add .txt
        alt = target_path + ".txt"
        if os.path.isfile(alt):
            target_path = alt
        else:
            raise FileNotFoundError(f"Dictionary file not found: {target_path}")

    if target_path in selectors_cache:
        return selectors_cache[target_path]

    cache_path = _safe_cache_path_for(target_path)
    selector = SmartWordSelector(curated_words_path=target_path, cache_path=cache_path)
    selectors_cache[target_path] = selector
    return selector

def list_dictionaries() -> List[Dict[str, object]]:
    os.makedirs(default_currated_dir, exist_ok=True)
    dictionaries: List[Dict[str, object]] = []
    for fname in sorted(os.listdir(default_currated_dir)):
        if not fname.lower().endswith('.txt'):
            continue
        txt_path = os.path.join(default_currated_dir, fname)
        cache_path = _safe_cache_path_for(txt_path)
        in_memory = os.path.normpath(txt_path) in selectors_cache
        words_count = 0
        try:
            with open(txt_path, 'r', encoding='utf-8') as f:
                words_count = sum(1 for line in f if line.strip())
        except Exception:
            words_count = 0
        dictionaries.append({
            'filename': fname,
            'txt_path': txt_path,
            'pkl_exists': os.path.exists(cache_path),
            'in_memory': in_memory,
            'words_count': words_count,
        })
    return dictionaries

@app.route('/dictionaries', methods=['GET'])
def list_dictionaries_endpoint():
    try:
        return jsonify({'dictionaries': list_dictionaries()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/embeddings/status', methods=['GET'])
def embeddings_status():
    try:
        words_file = request.args.get('words_file')
        if not words_file:
            return jsonify({'error': 'words_file is required'}), 400
        # Resolve target path similar to get_selector without creating it
        if os.path.isabs(words_file):
            target_path = words_file
        else:
            target_path = os.path.join(default_currated_dir, words_file)
        target_path = os.path.normpath(target_path)
        if not os.path.isfile(target_path):
            alt = target_path + '.txt'
            if os.path.isfile(alt):
                target_path = alt
            else:
                return jsonify({'error': f'Dictionary file not found: {target_path}'}), 404
        cache_path = _safe_cache_path_for(target_path)
        in_memory = target_path in selectors_cache
        words_count = None
        if in_memory:
            try:
                words_count = len(selectors_cache[target_path].words)
            except Exception:
                words_count = None
        exists_on_disk = os.path.exists(cache_path)
        return jsonify({
            'words_file': os.path.basename(target_path),
            'txt_path': target_path,
            'pkl_path': cache_path,
            'in_memory': in_memory,
            'cache_exists': exists_on_disk,
            'words_count': words_count
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/embeddings/load', methods=['POST'])
def embeddings_load():
    try:
        data = request.get_json(silent=True) or {}
        words_file = data.get('words_file')
        if not words_file or not isinstance(words_file, str):
            return jsonify({'error': 'words_file is required and must be a string'}), 400
        selector = get_selector(words_file)
        return jsonify({
            'loaded': True,
            'words_file': os.path.basename(selector.curated_words_path),
            'words_count': len(selector.words),
            'cache_path': selector.cache_path
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Initialize Whisper model for speech-to-text
device = "cuda:0" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

model_id = "openai/whisper-small"

whisper_model = AutoModelForSpeechSeq2Seq.from_pretrained(
    model_id, torch_dtype=torch_dtype, low_cpu_mem_usage=True, use_safetensors=True
)
whisper_model.to(device)

whisper_processor = AutoProcessor.from_pretrained(model_id)

whisper_pipe = pipeline(
    "automatic-speech-recognition",
    model=whisper_model,
    tokenizer=whisper_processor.tokenizer,
    feature_extractor=whisper_processor.feature_extractor,
    torch_dtype=torch_dtype,
    device=device,
)

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract plain text from a PDF file using PyPDF2."""
    reader = PdfReader(pdf_path)
    texts: List[str] = []
    for page in reader.pages:
        # extract_text may return None for some pages
        page_text = page.extract_text() or ""
        texts.append(page_text)
    return "\n".join(texts)

def lemmas_from_text(
    text: str,
    min_len: int = 3,
    allowed_pos: Optional[Set[str]] = None,
) -> List[str]:
    """
    Build a sorted unique list of lemma tokens from text using spaCy, excluding
    stopwords, numbers, punctuation, short tokens, and linking/functional words.
    """
    if allowed_pos is None:
        # Focus on content words
        allowed_pos = {"NOUN", "VERB", "ADJ", "ADV"}

    # Use a lightweight global spaCy pipeline for text parsing to avoid forcing selector init
    global _global_nlp
    try:
        _global_nlp
    except NameError:
        _global_nlp = spacy.load('de_core_news_md')
    doc = _global_nlp(text)
    unique_lemmas: Set[str] = set()

    for token in doc:
        # Filter obvious non-lexical tokens
        if token.is_space or token.is_punct or token.like_num:
            continue
        if token.is_stop:
            continue

        lemma = token.lemma_.lower().strip()
        if not lemma:
            continue
        # Exclude tokens with non-alphabetic chars (keep umlauts/ß as alphabetic)
        if not lemma.isalpha():
            continue
        if len(lemma) < min_len:
            continue
        if token.pos_ not in allowed_pos:
            continue

        unique_lemmas.add(lemma)

    return sorted(unique_lemmas)

@app.route('/relevant-words', methods=['POST'])
def get_relevant_words():
    """
    API endpoint to get relevant words based on context
    
    Expected JSON:
    {
        "context": "conversation context",
        "top_k": 80  // optional, defaults to 80
    }
    """
    try:
        data = request.get_json()
        if not data or 'context' not in data:
            return jsonify({'error': 'Please provide context in JSON format'}), 400
        
        context = data['context']
        top_k = data.get('top_k', 80)
        words_file = data.get('words_file')  # optional, e.g., "B1.txt"

        selector = get_selector(words_file)
        relevant_words = selector.find_relevant_words(context, top_k)
        
        return jsonify({
            'relevant_words': relevant_words,
            'count': len(relevant_words)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/build-dictionary-from-pdf', methods=['POST'])
def build_dictionary_from_pdf():
    """
    Extract German lemmas from a PDF in `pyBackend/dictionaries/german`.

    Expected JSON:
    {
        "filename": "A1_SD1_Wortliste_02.pdf",  // required, file must exist in dictionaries/german
        "min_len": 3,                              // optional
        "allowed_pos": ["NOUN","VERB","ADJ","ADV"], // optional
        "save": false,                             // optional, save under currated_words/german
        "out_file": "B1.txt",                    // optional, target filename only
        "return_limit": 0,                         // optional, 0 = return all
        "refresh_embeddings": false                // optional, rebuild embeddings after save
    }
    """
    try:
        data = request.get_json(silent=True) or {}
        filename = data.get('filename')
        if not filename or not isinstance(filename, str):
            return jsonify({'error': 'filename is required and must be a string'}), 400

        base_dir = os.path.join(os.path.dirname(__file__), 'dictionaries', 'german')
        pdf_path = os.path.join(base_dir, filename)
        if not os.path.isfile(pdf_path):
            return jsonify({'error': f'File not found: {pdf_path}'}), 404

        min_len = int(data.get('min_len', 3))
        allowed_pos_list = data.get('allowed_pos') or ["NOUN", "VERB", "ADJ", "ADV"]
        if not isinstance(allowed_pos_list, list):
            return jsonify({'error': 'allowed_pos must be a list of POS tags'}), 400
        allowed_pos: Set[str] = set([str(p).upper() for p in allowed_pos_list])

        # Extract and process
        text = extract_text_from_pdf(pdf_path)
        words = lemmas_from_text(text, min_len=min_len, allowed_pos=allowed_pos)

        # Optionally save to currated_words/german
        saved_to = None
        if bool(data.get('save', False)):
            out_file = data.get('out_file')
            if not out_file or not isinstance(out_file, str):
                out_file = os.path.splitext(os.path.basename(filename))[0] + '.txt'
            os.makedirs(default_currated_dir, exist_ok=True)
            out_path = os.path.normpath(os.path.join(default_currated_dir, out_file))
            with open(out_path, 'w', encoding='utf-8') as f:
                for w in words:
                    f.write(f"{w}\n")
            saved_to = out_path

            # Optionally refresh in-memory words and embeddings for this specific dictionary
            if bool(data.get('refresh_embeddings', False)):
                try:
                    target_selector = None
                    for cached_path, selector in selectors_cache.items():
                        if os.path.normpath(cached_path) == os.path.normpath(out_path):
                            target_selector = selector
                            break
                    if target_selector is not None:
                        target_selector.reload_from_disk()
                except Exception as reload_err:
                    return jsonify({
                        'count': len(words),
                        'words': words if int(data.get('return_limit', 0)) in (0, -1) else words[: int(data.get('return_limit', 0))],
                        'saved_to': saved_to,
                        'warning': f'Embeddings refresh failed: {str(reload_err)}'
                    })

        # Limit words in response
        return_limit = int(data.get('return_limit', 0))
        response_words = words if return_limit in (0, -1) else words[:return_limit]

        return jsonify({
            'count': len(words),
            'words': response_words,
            'saved_to': saved_to
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/words-by-topics', methods=['POST'])
def get_words_by_topics():
    """
    API endpoint to get words by multiple topics
    
    Expected JSON:
    {
        "topics": ["topic1", "topic2"],
        "words_per_topic": 30  // optional, defaults to 30
    }
    """
    try:
        data = request.get_json()
        if not data or 'topics' not in data:
            return jsonify({'error': 'Please provide topics in JSON format'}), 400
        
        topics = data['topics']
        words_per_topic = data.get('words_per_topic', 30)
        words_file = data.get('words_file')

        selector = get_selector(words_file)
        relevant_words = selector.find_words_by_topics(topics, words_per_topic)
        
        return jsonify({
            'relevant_words': relevant_words,
            'count': len(relevant_words)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/validate-phrase', methods=['POST'])
def validate_phrase_endpoint():
    """
    API endpoint to validate a phrase and get its curated word percentage
    
    Expected JSON:
    {
        "phrase": "German text to validate"
    }
    """
    try:
        data = request.get_json()
        if not data or 'phrase' not in data:
            return jsonify({'error': 'Please provide phrase in JSON format: {"phrase": "your text"}'}), 400
        
        phrase = data['phrase']
        words_file = data.get('words_file')
        if not isinstance(phrase, str):
            return jsonify({'error': 'Phrase must be a string'}), 400
        
        selector = get_selector(words_file)
        percentage = selector.validate_phrase(phrase)
        
        return jsonify({
            'phrase': phrase,
            'percentage': percentage,
            'score': 'excellent' if percentage >= 90 else 'good' if percentage >= 70 else 'fair' if percentage >= 50 else 'poor'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/analyze-with-suggestions', methods=['POST'])
def analyze_with_suggestions():
    """
    Combined endpoint: get relevant words for context AND validate a response
    
    Expected JSON:
    {
        "context": "conversation context",
        "response": "LLaMA's response to validate",
        "top_k": 80  // optional
    }
    """
    try:
        data = request.get_json()
        if not data or 'context' not in data or 'response' not in data:
            return jsonify({'error': 'Please provide both context and response'}), 400
        
        context = data['context']
        response = data['response']
        top_k = data.get('top_k', 80)
        words_file = data.get('words_file')

        selector = get_selector(words_file)
        # Get relevant words for the context
        relevant_words = selector.find_relevant_words(context, top_k)
        
        # Validate the response
        validation_score = selector.validate_phrase(response)
        
        return jsonify({
            'relevant_words': relevant_words,
            'word_count': len(relevant_words),
            'response_validation': {
                'phrase': response,
                'percentage': validation_score,
                'score': 'excellent' if validation_score >= 90 else 'good' if validation_score >= 70 else 'fair' if validation_score >= 50 else 'poor'
            }
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/speech-to-text', methods=['POST'])
def speech_to_text():
    """
    API endpoint to convert speech audio to text
    
    Expects multipart/form-data with an audio file
    """
    try:
        print("Received speech-to-text request")
        
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided', 'success': False}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({'error': 'No audio file selected', 'success': False}), 400
        
        print(f"Processing audio file: {audio_file.filename}, size: {audio_file.content_length}")
        
        # Determine file extension based on content type or filename
        content_type = audio_file.content_type or 'audio/wav'
        if 'webm' in content_type or 'webm' in audio_file.filename:
            suffix = '.webm'
        elif 'mp4' in content_type or 'mp4' in audio_file.filename:
            suffix = '.mp4'
        else:
            suffix = '.wav'
        
        # Save the uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            audio_file.save(temp_file.name)
            temp_path = temp_file.name
        
        try:
            print(f"Processing audio file at: {temp_path}")
            # Process the audio file with Whisper
            result = whisper_pipe(temp_path, generate_kwargs={"language": "german"})
            transcribed_text = result['text'].strip()
            
            print(f"Transcription result: {transcribed_text}")
            
            return jsonify({
                'text': transcribed_text,
                'success': True
            })
        
        finally:
            # Clean up the temporary file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    except Exception as e:
        print(f"Error in speech-to-text: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint (does not force-load any embeddings)."""
    loaded_levels = [os.path.basename(path) for path in selectors_cache.keys()]
    return jsonify({
        'status': 'healthy',
        'loaded_levels_count': len(loaded_levels),
        'loaded_levels': loaded_levels,
        'default_words_file': default_words_file if os.path.isfile(default_words_file) else None,
        'whisper_model_loaded': whisper_pipe is not None
    })

if __name__ == '__main__':
    print("\n=== Smart Word Selection System ===")
    print("This service lazily loads embeddings per dictionary level (e.g., B1.txt → B1.pkl) on first use.\n")
    print(f"Starting Flask API server on port 5004...")
    print("Available endpoints:")
    print("- POST /relevant-words - Get contextual words (optional words_file)")
    print("- POST /validate-phrase - Validate German text (optional words_file)")
    print("- POST /analyze-with-suggestions - Combined analysis (optional words_file)")
    print("- POST /speech-to-text - Convert audio to text")
    print("- POST /build-dictionary-from-pdf - Extract lemmas from a PDF")
    print("- GET /health - Health check")
    app.run(debug=True, host='0.0.0.0', port=5004)
