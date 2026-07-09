# Apps Script: Blogger API Proxy

This script replaces the client-side Blogger API calls with a server-side proxy,
keeping `BLOGGER_API_KEY` and `FOLLOWED_BLOG_IDS` hidden from the browser.

## Deployment

### 1. Create a new Apps Script project

- Go to https://script.google.com
- Click **+ New project**
- Delete the default `Code.js` content and paste the contents of `Code.js`

### 2. Set configuration (choose one)

**Option A — ScriptProperties (recommended):**
Run this once in the Apps Script editor's console:

```javascript
PropertiesService.getScriptProperties()
    .setProperty('BLOGGER_API_KEY', 'YOUR_API_KEY')
    .setProperty('FOLLOWED_BLOG_IDS', '["BLOG_ID_1","BLOG_ID_2"]')
    .setProperty('ALLOWED_ORIGINS', '["http://localhost:5173","https://yourblog.com"]');
```

**Option B — Hard-coded:**
Uncomment the fallback lines in `Code.js` and fill in your values.

### 3. Deploy as web app

- Click **Deploy > New deployment**
- **Type:** Web app
- **Execute as:** Me
- **Who has access:** Anyone
- Click **Deploy**
- Copy the **Web app URL** (looks like `https://script.google.com/macros/s/.../exec`)

### 4. Configure the React app

Add the URL to your React config:

**Development** — in `hiddenEnv.json`:
```json
{
  "APPS_SCRIPT_URL": "https://script.google.com/macros/s/.../exec"
}
```

Or as an environment variable:
```
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
```

**Production** — add it to the `#HiddenEnv` element's `data-info` attribute in your Blogger theme:
```html
<div id="HiddenEnv" data-info='{"MAIN_POST_SOURCE_URL":"...","APPS_SCRIPT_URL":"https://script.google.com/macros/s/.../exec"}'></div>
```

## Updating config at runtime

If you used **ScriptProperties**, just update the property without re-deploying:

```javascript
PropertiesService.getScriptProperties()
    .setProperty('FOLLOWED_BLOG_IDS', '["NEW_ID_1","NEW_ID_2"]')
    .setProperty('ALLOWED_ORIGINS', '["http://localhost:5173","https://yourblog.com"]');
```

If you hard-coded them, edit `Code.js`, save, and deploy a new version.

## Origin restriction (CORS guard)

The React app sends `?origin=<window.location.origin>` with every request.  The server
checks it against `ALLOWED_ORIGINS` (from ScriptProperties or hard-coded).  If the list
is empty, all origins are allowed (useful during development).

This is defense-in-depth — a motivated attacker can spoof the query parameter — but it
stops casual scrapers.  Set `ALLOWED_ORIGINS` to your deployed site URL(s) in production.

## Caching

The Apps Script fetches all followed blogs in parallel using `UrlFetchApp.fetchAll`,
then paginates any remaining pages sequentially. The React app also caches results
in memory so scrolling back doesn't re-fetch.

## Limits

- 20,000 URL Fetch calls/day (more than enough for personal use)
- 6 min execution per invocation (the script should finish well within this)
- 50 MB response data (Blogger posts are small; this won't be an issue)
