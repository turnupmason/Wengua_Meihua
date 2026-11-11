import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import { loadCarveFont } from './scene/engrave';
import { preloadShrine } from './scene/Sanqing';
import { watchKeyboard } from './ui/keyboard';
import { templeAudio } from './domain/audio';

// Start loading the carving font early so inscriptions and the plaque use it.
void loadCarveFont();
// And the painting of the Three Pure Ones on the altar.
preloadShrine();
watchKeyboard();
// Build the sound engine in idle time while the title screen shows (see TempleAudio.prepare).
setTimeout(() => templeAudio.prepare(), 1200);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
