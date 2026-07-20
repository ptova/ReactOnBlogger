/**
 * Application entry point.
 *
 * Responsibilities:
 * 1. Register all post-loading services in the service registry BEFORE React
 *    renders. This ensures `getService()` calls in components resolve immediately.
 * 2. Mount the <App /> tree into the #root element defined in index.html.
 * 3. Wrap in StrictMode to enable additional development-time checks (double
 *    invokes of effects, deprecated API warnings, etc.).
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { registerService } from './services/serviceRegistry.ts';
import { loadPosts } from './services/internalPostService.ts';
import { loadExternalPosts } from './services/externalPostService.ts';

// Services are keyed by PostSource ('internal' | 'external').
// 'internal' scrapes Blogger HTML pages directly.
// 'external' calls a Google Apps Script proxy to the Blogger API.
registerService('internal', loadPosts);
registerService('external', loadExternalPosts);

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
