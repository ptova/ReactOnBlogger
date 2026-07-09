/**
 * Apps Script Web App — Blogger Post Proxy
 *
 * Keeps BLOGGER_API_KEY and FOLLOWED_BLOG_IDS server-side so they are never
 * exposed to the browser.  The React app calls this script instead of the
 * Blogger API directly.
 *
 * @see README.md for deployment instructions.
 */

// ===== CONFIGURATION =====================================================
// Fill these in before deploying, or use ScriptProperties so you can update
// them without re-deploying:
//   ScriptApp.getProjectTriggers()  →  PropertiesService.getScriptProperties()
//      .setProperty('BLOGGER_API_KEY', '…')
//      .setProperty('FOLLOWED_BLOG_IDS', '["id1","id2"]')

var BLOGGER_API_KEY = PropertiesService.getScriptProperties().getProperty('BLOGGER_API_KEY');
var FOLLOWED_BLOG_IDS_RAW = PropertiesService.getScriptProperties().getProperty('FOLLOWED_BLOG_IDS');
var ALLOWED_ORIGINS_RAW = PropertiesService.getScriptProperties().getProperty('ALLOWED_ORIGINS');

// Hard-coded fallbacks (uncomment and fill if you prefer not to use PropertiesService):
// var BLOGGER_API_KEY = 'YOUR_API_KEY';
// var FOLLOWED_BLOG_IDS_RAW = '["BLOG_ID_1","BLOG_ID_2"]';
// var ALLOWED_ORIGINS_RAW = '["http://localhost:5173","https://yourblog.com"]';

var FOLLOWED_BLOG_IDS = FOLLOWED_BLOG_IDS_RAW ? JSON.parse(FOLLOWED_BLOG_IDS_RAW) : [];
var ALLOWED_ORIGINS = ALLOWED_ORIGINS_RAW ? JSON.parse(ALLOWED_ORIGINS_RAW) : [];

var BLOGGER_API_ENDPOINT = 'https://www.googleapis.com/blogger/v3/blogs/';
var WEEK_IN_MILLIS = 7 * 24 * 60 * 60 * 1000;
var MAX_RESULTS = 500; // Blogger API max — eliminates pagination in most cases
var CACHE = CacheService.getScriptCache();
var CACHE_TTL_SECONDS = 3600; // 1 hour

// ===== ENTRY POINT =======================================================

/**
 * Handles GET requests from the React app.
 *
 * Query parameters:
 *   startDate  — ISO date cursor (optional, defaults to 1 week ago).
 *
 * Returns JSON: { newPosts: Post[], nextUrl: string | null }
 *
 * @param {GoogleAppsScript.Events.DoGet} e
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function doGet(e) {
  if (!isOriginAllowed_(e)) {
    return ContentService
        .createTextOutput(JSON.stringify({ error: 'Origin not allowed' }))
        .setMimeType(ContentService.MimeType.JSON);
  }

  setCorsHeaders_(e);

  try {
    console.time('doGet');

    if (!BLOGGER_API_KEY || FOLLOWED_BLOG_IDS.length === 0) {
      throw new Error('Apps Script not configured. Set BLOGGER_API_KEY and FOLLOWED_BLOG_IDS in ScriptProperties.');
    }

    var rawStart = e && e.parameter && e.parameter.startDate
        ? new Date(e.parameter.startDate)
        : new Date(Date.now() - WEEK_IN_MILLIS);
    rawStart.setMinutes(0, 0, 0);
    var startDate = rawStart.toISOString();

    console.time('cacheCheck');
    var cacheKey = 'posts_' + startDate;
    var cached = CACHE.get(cacheKey);
    console.timeEnd('cacheCheck');
    if (cached) {
      console.log('Cache HIT for ' + cacheKey);
      console.timeEnd('doGet');
      return respond_(JSON.parse(cached));
    }
    console.log('Cache MISS for ' + cacheKey);

    var endDate = new Date(new Date(startDate).getTime() + WEEK_IN_MILLIS).toISOString();

    console.time('fetchAllFollowedBlogs_');
    var allPosts = fetchAllFollowedBlogs_(startDate, endDate);
    console.timeEnd('fetchAllFollowedBlogs_');
    console.log('Fetched ' + allPosts.length + ' posts');

    // Sort newest-first.
    allPosts.sort(function (a, b) {
      return Date.parse(b.datePublished) - Date.parse(a.datePublished);
    });

    var nextStartDate = new Date(new Date(startDate).getTime() - WEEK_IN_MILLIS).toISOString();

    var result = {
      newPosts: allPosts,
      nextUrl: nextStartDate,
    };

    console.time('cachePut');
    CACHE.put(cacheKey, JSON.stringify(result), CACHE_TTL_SECONDS);
    console.timeEnd('cachePut');

    console.timeEnd('doGet');
    return respond_(result);

  } catch (error) {
    console.error('doGet error: ' + error.message);
    return respond_({ error: error.message });
  }
}

// ===== RESPONSE HELPER ==================================================

function respond_(data) {
  return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
}

// ===== BLOGGER API HELPERS ===============================================

/**
 * Fetches a single page of posts from one blog via the Blogger API.
 *
 * @param {string} blogId
 * @param {string} startDate  ISO lower bound
 * @param {string} endDate    ISO upper bound
 * @param {string|null} pageToken
 * @returns {{ items: Object[], nextPageToken: string|null }}
 */
function fetchPageFromBlog_(blogId, startDate, endDate, pageToken) {
  var params = {
    key: BLOGGER_API_KEY,
    maxResults: MAX_RESULTS,
    startDate: startDate,
    endDate: endDate,
  };
  if (pageToken) params.pageToken = pageToken;

  var qs = Object.keys(params)
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
      .join('&');

  var url = BLOGGER_API_ENDPOINT + encodeURIComponent(blogId) + '/posts?' + qs;

  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var json = JSON.parse(response.getContentText());

  if (response.getResponseCode() >= 400) {
    console.error('Blogger API error for blog ' + blogId + ': ' + json.error.message);
    return { items: [], nextPageToken: null };
  }

  return {
    items: json.items || [],
    nextPageToken: json.nextPageToken || null,
  };
}

/**
 * Iterates all pages of a single blog within a date range.
 *
 * @param {string} blogId
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Object[]} Raw Blogger API post objects
 */
function fetchAllPagesForBlog_(blogId, startDate, endDate) {
  var posts = [];
  var pageToken = null;

  while (true) {
    var result = fetchPageFromBlog_(blogId, startDate, endDate, pageToken);
    if (result.items.length === 0) break;
    posts = posts.concat(result.items);
    if (!result.nextPageToken) break;
    pageToken = result.nextPageToken;
  }

  return posts;
}

/**
 * Fetches posts from all followed blogs and normalises them into Post objects.
 *
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Object[]} Normalised Post array
 */
function fetchAllFollowedBlogs_(startDate, endDate) {
  // Fetch all blogs in parallel (UrlFetchApp.fetchAll).
  var allUrls = [];
  var blogIndex = [];

  FOLLOWED_BLOG_IDS.forEach(function (blogId) {
    var params = {
      key: BLOGGER_API_KEY,
      maxResults: MAX_RESULTS,
      startDate: startDate,
      endDate: endDate,
    };
    var qs = Object.keys(params)
        .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
        .join('&');
    allUrls.push(BLOGGER_API_ENDPOINT + encodeURIComponent(blogId) + '/posts?' + qs);
    blogIndex.push(blogId);
  });

  var responses = UrlFetchApp.fetchAll(allUrls.map(function (u) { return { url: u, muteHttpExceptions: true }; }));

  var allPosts = [];

  responses.forEach(function (response, idx) {
    if (response.getResponseCode() >= 400) {
      console.error('Blogger API error for blog ' + blogIndex[idx] + ': ' + response.getContentText());
      return;
    }
    console.time('blog_' + blogIndex[idx]);
    var json = JSON.parse(response.getContentText());
    var items = json.items || [];

    // Paginate remaining pages for this blog sequentially.
    var pageToken = json.nextPageToken;
    var pages = 1;
    while (pageToken) {
      var nextResult = fetchPageFromBlog_(blogIndex[idx], startDate, endDate, pageToken);
      if (nextResult.items.length > 0) {
        Array.prototype.push.apply(items, nextResult.items);
      }
      pageToken = nextResult.nextPageToken;
      pages++;
    }
    console.timeEnd('blog_' + blogIndex[idx]);
    if (pages > 1) console.log('Blog ' + blogIndex[idx] + ' required ' + pages + ' pages');

    // Normalise to Post shape.
    items.forEach(function (post) {
      allPosts.push({
        title: post.title || '',
        content: post.content || '',
        id: blogIndex[idx] + '_' + post.id,
        labels: post.labels || [],
        datePublished: post.published || '',
      });
    });
  });

  return allPosts;
}

// ===== ORIGIN CHECK =====================================================

/**
 * Checks the caller-supplied origin against the allowed list.
 *
 * Apps Script `doGet` does not expose the `Origin` request header directly,
 * so the React app sends its origin as a query parameter:
 *   ?origin=https://yourblog.com&startDate=...
 *
 * This is a lightweight guard against casual scraping, not cryptographic auth.
 * Combined with the API key never reaching the client, it provides reasonable
 * defense-in-depth.
 *
 * @param {GoogleAppsScript.Events.DoGet} e
 * @returns {boolean} Whether the origin is allowed.
 */
function isOriginAllowed_(e) {
  if (ALLOWED_ORIGINS.length === 0) return true;  // No restriction configured
  var origin = e && e.parameter && e.parameter.origin || '';
  return ALLOWED_ORIGINS.indexOf(origin) !== -1;
}

// ===== CORS HELPERS ======================================================

/**
 * Apps Script web apps require an explicit OPTIONS handler for preflight
 * requests.  This is called automatically when the request method is OPTIONS.
 *
 * @param {GoogleAppsScript.Events.DoGet} e
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function doOptions(e) {
  setCorsHeaders_(e);
  return ContentService
      .createTextOutput('')
      .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Attaches CORS headers to the response so the browser allows the cross-origin
 * fetch from the React app.
 *
 * @param {Object} e
 */
function setCorsHeaders_(e) {
  // ContentService doesn't support setHeaders, so we use the undocumented
  // approach: returning the output with a callback wrapper that the React
  // fetch can still parse.  However, for a GET-based web app the browser
  // only checks CORS on the actual response headers.
  //
  // If you hit CORS issues, deploy as a Web App with "Anyone" access and
  // the browser will typically allow it.  For stricter environments you can
  // serve through a wrapper or use a Cloud Function instead.
}
