import spacy
nlp = spacy.load("de_core_news_md")   

text = "Heute ist ein schöner Tag, sonnig und warm, ideal für einen Spaziergang im Park oder eine Radtour durch die Stadt mit Freunden."
doc = nlp(text)

for token in doc:
    print(token.text, token.pos_)