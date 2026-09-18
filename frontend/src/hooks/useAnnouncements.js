import { useEffect, useState } from 'react';
import { getToken } from '../api/client.js';

export function useAnnouncements() {
  const [announcement, setAnnouncement] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const eventSource = new EventSource(`/api/announcements/stream?token=${token}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'announcement') {
          setAnnouncement(data);
          // Play a sound when announcement is received
          playNotificationSound();
        }
      } catch (e) {
        console.error('Failed to parse SSE message', e);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Professional droplet sound
  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      
      // Pitch envelope: sharp rise then slight drop
      oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.05);
      oscillator.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);

      // Amplitude envelope: quick attack, fast decay
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.8, audioCtx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.error('Audio playback failed', e);
    }
  };

  return { announcement, clearAnnouncement: () => setAnnouncement(null) };
}
