import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import './paper.generated.css';
import './paper-night.generated.css';
// Hand-made touches last, so they win over both generated sheets (day and night).
import './paper.css';
import { PAPER } from './ui/paper';
import { loadCarveFont } from './scene/engrave';
import { preloadShrine } from './scene/Sanqing';
import { watchKeyboard } from './ui/keyboard';
import { templeAudio } from './domain/audio';

// Start loading the carving font early so inscriptions and the plaque use it.
void loadCarveFont();
// The app on paper (ui/paper.ts): no hall, so no altar painting to load.
if (PAPER) document.body.classList.add('paper');
else preloadShrine();
watchKeyboard();
// Build the sound engine in idle time while the title screen shows (see TempleAudio.prepare).
setTimeout(() => templeAudio.prepare(), 1200);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
