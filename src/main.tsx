import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { registerService } from './services/serviceRegistry.ts';
import { loadPosts } from './services/internalPostService.ts';
import { loadExternalPosts } from './services/externalPostService.ts';

/** Register post-loading services before the app renders. */
registerService('internal', loadPosts);
registerService('external', loadExternalPosts);

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
