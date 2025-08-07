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
from typing import List
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import pickle
import spacy
from flask import Flask, request, jsonify

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

# Initialize the word selector
curated_words_path = os.path.join(os.path.dirname(__file__), "..", "curated_words.txt")
word_selector = SmartWordSelector(curated_words_path)

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
        
        relevant_words = word_selector.find_relevant_words(context, top_k)
        
        return jsonify({
            'relevant_words': relevant_words,
            'count': len(relevant_words)
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
        
        relevant_words = word_selector.find_words_by_topics(topics, words_per_topic)
        
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
        if not isinstance(phrase, str):
            return jsonify({'error': 'Phrase must be a string'}), 400
        
        percentage = word_selector.validate_phrase(phrase)
        
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
        
        # Get relevant words for the context
        relevant_words = word_selector.find_relevant_words(context, top_k)
        
        # Validate the response
        validation_score = word_selector.validate_phrase(response)
        
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

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'total_words': len(word_selector.words),
        'embeddings_loaded': word_selector.embeddings is not None
    })

if __name__ == '__main__':
    print("\n=== Smart Word Selection System ===")
    print("This system uses semantic embeddings to find relevant words")
    print("from your curated list based on conversation context.\n")
    
    # Example usage
    print("Example usage:")
    test_context = "Ich möchte über das Wetter und Sport sprechen"
    relevant_words = word_selector.find_relevant_words(test_context, 10)
    print(f"Context: {test_context}")
    print(f"Relevant words: {', '.join(relevant_words)}")
    
    # Test phrase validation
    test_phrase = "Das Wetter ist heute sehr schön und warm."
    validation_score = word_selector.validate_phrase(test_phrase)
    print(f"\nPhrase validation example:")
    print(f"Phrase: {test_phrase}")
    print(f"Curated word score: {validation_score:.1f}%")
    
    print(f"\nStarting Flask API server on port 5004...")
    print("Available endpoints:")
    print("- POST /relevant-words - Get contextual words")
    print("- POST /validate-phrase - Validate German text")
    print("- POST /analyze-with-suggestions - Combined analysis")
    print("- GET /health - Health check")
    app.run(debug=True, host='0.0.0.0', port=5004)
