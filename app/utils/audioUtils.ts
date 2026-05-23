/**
 * Detect the duration of an audio file from a URL
 * @param url - The URL of the audio file
 * @returns Promise<number> - Duration in seconds (rounded to nearest integer)
 */
export async function detectAudioDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    
    // Set up event listeners
    audio.addEventListener('loadedmetadata', () => {
      const duration = Math.round(audio.duration);
      audio.src = ''; // Clean up
      resolve(duration);
    });

    audio.addEventListener('error', (error) => {
      audio.src = ''; // Clean up
      reject(new Error(`Failed to load audio: ${error}`));
    });

    // Start loading the audio
    audio.src = url;
    audio.load();
  });
}

/**
 * Format duration in seconds to MM:SS format
 * @param seconds - Duration in seconds
 * @returns Formatted string like "3:45"
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Convert MM:SS format to seconds
 * @param timeString - Time string like "3:45"
 * @returns Duration in seconds
 */
export function parseTimeString(timeString: string): number {
  const parts = timeString.split(':');
  if (parts.length === 2) {
    const mins = parseInt(parts[0]) || 0;
    const secs = parseInt(parts[1]) || 0;
    return mins * 60 + secs;
  }
  return parseInt(timeString) || 0;
}
