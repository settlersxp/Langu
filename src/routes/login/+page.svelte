<script lang="ts">
  import { goto } from '$app/navigation';
  
  let isLoading = false;
  let errorMessage = '';
  
  async function handleLogin() {
    isLoading = true;
    errorMessage = '';
    
    try {
      const response = await fetch('/api/auth/google-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        goto('/tts-protected/dashboard');
      } else {
        const data = await response.json();
        errorMessage = data.message || 'Authentication failed';
      }
    } catch (error) {
      errorMessage = 'Failed to connect to authentication service';
      console.error(error);
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="login-container">
  <h1>Login with Google Cloud</h1>
  
  <p>
    This page allows you to authenticate with Google Cloud Text-to-Speech service.
    Make sure you have set up your credentials properly.
  </p>
  
  {#if errorMessage}
    <div class="error">
      {errorMessage}
    </div>
  {/if}
  
  <button on:click={handleLogin} disabled={isLoading}>
    {isLoading ? 'Authenticating...' : 'Login with Google Cloud'}
  </button>
  
  <div class="instructions">
    <h2>Setup Instructions</h2>
    <ol>
      <li>Create a Google Cloud project</li>
      <li>Enable the Text-to-Speech API</li>
      <li>Create and download service account credentials</li>
      <li>Set the GOOGLE_APPLICATION_CREDENTIALS environment variable to point to your credentials file</li>
    </ol>
  </div>
</div>

<style>
  .login-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .error {
    background-color: #ffdddd;
    color: #d00;
    padding: 1rem;
    margin: 1rem 0;
    border-radius: 4px;
  }
  
  button {
    background-color: #4285f4;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
  
  .instructions {
    margin-top: 2rem;
    padding: 1rem;
    background-color: #f8f9fa;
    border-radius: 4px;
  }
</style> 