import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/tiny5/latin-400.css';
import '@fontsource/dseg7-classic/latin-400.css';
import './styles/tokens.css';
import './styles/desktop.css';
import './styles/window.css';
import './styles/main-window.css';
import './styles/equalizer.css';
import './styles/playlist.css';
import './styles/menus.css';
import './styles/taskbar.css';
import './styles/about.css';
import './styles/responsive.css';
import './styles/mobile.css';
import App from './App';
import { usePlayerStore } from './store/playerStore';
import { engine } from './audio/engine';

if (import.meta.env.DEV) {
  const debugWindow = window as unknown as {
    __winamp?: typeof usePlayerStore;
    __winampEngine?: typeof engine;
  };
  debugWindow.__winamp = usePlayerStore;
  debugWindow.__winampEngine = engine;
}

const container = document.getElementById('root');
if (!container) throw new Error('Root element missing');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
