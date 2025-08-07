from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
import torch

device = "cuda:0" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

model_id = "openai/whisper-small"

model = AutoModelForSpeechSeq2Seq.from_pretrained(
    model_id, torch_dtype=torch_dtype, low_cpu_mem_usage=True, use_safetensors=True
)
model.to(device)

processor = AutoProcessor.from_pretrained(model_id)


pipe = pipeline(
    "automatic-speech-recognition",
    model=model,
    tokenizer=processor.tokenizer,
    feature_extractor=processor.feature_extractor,
    torch_dtype=torch_dtype,
    device=device,
)

sample_path = '/Users/gabrielcliseru/Project/Langu/static/audio/message_da4e52c7-ab42-4dad-bb10-6459ec6e4c2f.mp3'
result = pipe(sample_path, generate_kwargs={"language": "german"})

print(result)