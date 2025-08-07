<script lang="ts">
  interface Props {
    onTranscription: (text: string) => void;
    disabled?: boolean;
  }
  
  let { onTranscription, disabled = false }: Props = $props();
  
  let isRecording = $state(false);
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];
  let isProcessing = $state(false);
  
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });
      
      // Try different MIME types for better compatibility
      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      }
      
      mediaRecorder = new MediaRecorder(stream, options);
      audioChunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder?.mimeType || 'audio/wav';
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        await sendAudioForTranscription(audioBlob);
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start(1000); // Collect data every second
      isRecording = true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check your permissions.');
    }
  }
  
  function stopRecording() {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      isRecording = false;
    }
  }
  
  async function sendAudioForTranscription(audioBlob: Blob) {
    try {
      isProcessing = true;
      
      console.log('Audio blob size:', audioBlob.size, 'bytes');
      console.log('Audio blob type:', audioBlob.type);
      
      if (audioBlob.size === 0) {
        throw new Error('No audio data recorded');
      }
      
      const formData = new FormData();
      const filename = `recording.${audioBlob.type.includes('webm') ? 'webm' : 'wav'}`;
      formData.append('audio', audioBlob, filename);
      
      const response = await fetch('http://localhost:5004/speech-to-text', {
        method: 'POST',
        body: formData,
        mode: 'cors'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Transcription result:', result);
      
      if (result.success && result.text) {
        onTranscription(result.text);
      } else {
        throw new Error(result.error || 'Failed to transcribe audio');
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (error instanceof TypeError && errorMessage.includes('fetch')) {
        alert('Cannot connect to speech-to-text server. Make sure the Python server is running on port 5004.');
      } else {
        alert(`Error transcribing audio: ${errorMessage}`);
      }
    } finally {
      isProcessing = false;
    }
  }
  
  function toggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }
</script>

<button
  onclick={toggleRecording}
  disabled={disabled || isProcessing}
  class="mic-button"
  class:recording={isRecording}
  class:processing={isProcessing}
  title={isRecording ? 'Stop recording' : 'Start recording'}
>
  {#if isProcessing}
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  {:else if isRecording}
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2"/>
    </svg>
  {:else}
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4Z"/>
      <path d="M8 18v4"/>
      <path d="M16 18v4"/>
      <path d="M12 22h6"/>
      <path d="M12 22H6"/>
      <path d="M19 14s-1 3-7 3-7-3-7-3"/>
    </svg>
  {/if}
</button>

<style>
  .mic-button {
    padding: 0.75rem;
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    min-width: 48px;
    height: 48px;
  }
  
  .mic-button:hover {
    background-color: #5a6268;
  }
  
  .mic-button.recording {
    background-color: #dc3545;
    animation: pulse 1.5s infinite;
  }
  
  .mic-button.recording:hover {
    background-color: #c82333;
  }
  
  .mic-button.processing {
    background-color: #007bff;
    cursor: not-allowed;
  }
  
  .mic-button:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
    opacity: 0.6;
  }
  
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(220, 53, 69, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(220, 53, 69, 0);
    }
  }
</style>
