import { existsSync, readFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configDir = path.resolve(process.env.CONFIG_DIR || path.join(__dirname, 'config'));

loadEnvFile(path.join(configDir, 'app.env'));

const port = Number(process.env.PORT || 3000);
const requestTimeoutMs = Number(process.env.STATUS_TIMEOUT_MS || 3000);
const publicDir = path.join(__dirname, 'public');
const sitesPath = path.join(configDir, 'sites.json');
const legacySitesPath = path.join(__dirname, 'sites.json');
const appConfigPath = path.join(configDir, 'app.json');
const configIconsDir = path.join(configDir, 'icons');
const internalHosts = new Set(
  String(process.env.INTERNAL_HOSTS || '')
    .split(',')
    .map(host => host.trim().toLowerCase())
    .filter(Boolean),
);

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.ico', 'image/x-icon'],
  ['.webp', 'image/webp'],
]);

const defaultAppConfig = {
  title: '内网主页',
  eyebrow: 'LAN Home',
  icon: '/config-icons/favicon.svg',
  categories: [
    { id: 'all', name: '全部' },
  ],
};

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    const value = rawValue
      .replace(/^(['"])(.*)\1$/, '$2')
      .trim();

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function readSites() {
  const activeSitesPath = existsSync(sitesPath) ? sitesPath : legacySitesPath;
  const raw = await fs.readFile(activeSitesPath, 'utf8');
  const sites = JSON.parse(raw);

  if (!Array.isArray(sites)) {
    throw new Error('sites.json must contain an array');
  }

  return sites.map((site, index) => ({
    id: site.id || slugify(`${site.name || 'site'}-${index}`),
    name: String(site.name || `站点 ${index + 1}`),
    internalUrl: String(site.internalUrl || site.url || ''),
    externalUrl: String(site.externalUrl || site.url || ''),
    description: String(site.description || ''),
    internalDescription: String(site.internalDescription || site.description || ''),
    externalDescription: String(site.externalDescription || site.description || ''),
    icon: String(site.icon || ''),
    category: String(site.category || ''),
    maintenance: site.maintenance === true || site.maintenance === 'true',
    internalOnly: site.internalOnly === true || site.internalOnly === 'true',
    showExternal: site.showExternal !== false && site.showExternal !== 'false',
  })).filter(site => site.internalUrl || site.externalUrl);
}

async function readAppConfig() {
  if (!existsSync(appConfigPath)) {
    return defaultAppConfig;
  }

  const raw = await fs.readFile(appConfigPath, 'utf8');
  const config = JSON.parse(raw);

  return {
    title: String(config.title || defaultAppConfig.title),
    eyebrow: String(config.eyebrow || defaultAppConfig.eyebrow),
    icon: String(config.icon || defaultAppConfig.icon),
    categories: normalizeCategories(config.categories),
  };
}

function normalizeCategories(categories) {
  const items = Array.isArray(categories) ? categories : defaultAppConfig.categories;
  const normalized = items
    .map((category) => {
      if (typeof category === 'string') {
      return {
        id: slugify(category),
        name: category,
        icon: '',
      };
    }

    return {
      id: slugify(String(category?.id || category?.name || '')),
      name: String(category?.name || category?.id || ''),
      icon: String(category?.icon || ''),
    };
  })
    .filter(category => category.id && category.name);

  if (!normalized.some(category => category.id === 'all')) {
    normalized.unshift({ id: 'all', name: '全部' });
  }

  return normalized;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'site';
}

function sendJson(response, statusCode, data) {
  const body = JSON.stringify(data);
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(body);
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
  });
  response.end(text);
}

function getOrigin(url) {
  try {
    return new URL(url).origin;
  }
  catch {
    return '';
  }
}

function getHostnameFromRequest(request) {
  const forwardedHost = String(request.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const host = String(forwardedHost || request.headers.host || 'localhost').toLowerCase();

  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    return end > 0 ? host.slice(1, end) : host;
  }

  return host.includes(':') ? host.split(':')[0] : host;
}

function isPrivateIPv4(hostname) {
  const parts = hostname.split('.').map(part => Number(part));

  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [first, second] = parts;

  return first === 10
    || first === 127
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || (first === 169 && second === 254)
    || (first === 198 && (second === 18 || second === 19));
}

function isInternalHostname(hostname) {
  return hostname === 'localhost'
    || hostname === '::1'
    || hostname === '0.0.0.0'
    || (!hostname.includes('.') && !hostname.includes(':'))
    || hostname.endsWith('.local')
    || hostname.endsWith('.lan')
    || hostname.endsWith('.internal')
    || internalHosts.has(hostname)
    || isPrivateIPv4(hostname);
}

function getAccessMode(request) {
  const hostname = getHostnameFromRequest(request);
  return isInternalHostname(hostname) ? 'internal' : 'external';
}

function applyAccessMode(site, accessMode) {
  const activeUrl = accessMode === 'internal'
    ? site.internalUrl || site.externalUrl
    : site.internalOnly ? '' : site.externalUrl;
  const activeDescription = accessMode === 'internal'
    ? site.internalDescription || site.description
    : site.externalDescription || site.description;

  return {
    ...site,
    accessMode,
    activeUrl,
    activeDescription,
    url: activeUrl,
    description: activeDescription,
    isUrlConfigured: Boolean(activeUrl),
  };
}

function isVisibleInAccessMode(site, accessMode) {
  return accessMode === 'internal' || site.showExternal;
}

function resolveIconUrl(site) {
  const baseUrl = site.activeUrl || site.url;

  if (!site.icon) {
    return resolveDefaultIconUrl(baseUrl);
  }

  if (site.icon && site.icon.startsWith('/config-icons/')) {
    return site.icon;
  }

  try {
    return new URL(site.icon, baseUrl).toString();
  }
  catch {
    return '';
  }
}

function resolveDefaultIconUrl(baseUrl) {
  try {
    return new URL('/favicon.ico', baseUrl).toString();
  }
  catch {
    return '';
  }
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function parseHtmlIconUrls(html, baseUrl) {
  const urls = [];
  const linkPattern = /<link\b[^>]*>/gi;
  const attrPattern = /\s([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  const links = html.match(linkPattern) || [];

  for (const link of links) {
    const attrs = new Map();
    let attrMatch;

    while ((attrMatch = attrPattern.exec(link)) !== null) {
      attrs.set(attrMatch[1].toLowerCase(), attrMatch[2] || attrMatch[3] || attrMatch[4] || '');
    }

    const rel = String(attrs.get('rel') || '').toLowerCase().split(/\s+/);
    const href = attrs.get('href');

    if (!href || !rel.some(value => value === 'icon' || value === 'shortcut' || value === 'apple-touch-icon')) {
      continue;
    }

    try {
      urls.push(new URL(href, baseUrl).toString());
    }
    catch {
      // Ignore malformed icon links and keep trying other candidates.
    }
  }

  return urls;
}

async function discoverIconUrls(site, signal) {
  const baseUrl = site.activeUrl || site.url;

  if (!baseUrl || site.icon) {
    return [];
  }

  try {
    const pageResponse = await fetch(baseUrl, {
      redirect: 'follow',
      signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'LocalServerPage/1.0',
      },
    });

    if (!pageResponse.ok) {
      return [];
    }

    const contentType = pageResponse.headers.get('content-type') || '';

    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return [];
    }

    const html = await pageResponse.text();
    return parseHtmlIconUrls(html, pageResponse.url || baseUrl);
  }
  catch {
    return [];
  }
}

function toClientSite(site) {
  return {
    id: site.id,
    name: site.name,
    description: site.description,
    accessMode: site.accessMode,
    activeUrl: site.activeUrl,
    url: site.url,
    isUrlConfigured: site.isUrlConfigured,
    category: site.category,
    maintenance: site.maintenance,
    internalOnly: site.internalOnly,
    showExternal: site.showExternal,
    iconUrl: resolveIconUrl(site),
  };
}

async function checkSite(site) {
  if (site.maintenance) {
    return {
      id: site.id,
      online: false,
      maintenance: true,
      status: null,
      latencyMs: 0,
      checkedAt: new Date().toISOString(),
      error: 'maintenance',
    };
  }

  if (site.accessMode === 'external' && site.internalOnly) {
    return {
      id: site.id,
      online: false,
      maintenance: false,
      internalOnly: true,
      status: null,
      latencyMs: 0,
      checkedAt: new Date().toISOString(),
      error: 'internal-only',
    };
  }

  if (!site.activeUrl) {
    return {
      id: site.id,
      online: false,
      maintenance: false,
      internalOnly: false,
      status: null,
      latencyMs: 0,
      checkedAt: new Date().toISOString(),
      error: 'not-configured',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(site.activeUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    });

    return {
      id: site.id,
      online: response.status < 500,
      maintenance: false,
      internalOnly: false,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    };
  }
  catch (error) {
    return {
      id: site.id,
      online: false,
      maintenance: false,
      internalOnly: false,
      status: null,
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
      error: error.name === 'AbortError' ? 'timeout' : 'unreachable',
    };
  }
  finally {
    clearTimeout(timeout);
  }
}

async function handleSites(request, response) {
  const accessMode = getAccessMode(request);
  const sites = await readSites();
  const visibleSites = sites
    .filter(site => isVisibleInAccessMode(site, accessMode))
    .map(site => applyAccessMode(site, accessMode));

  sendJson(response, 200, {
    accessMode,
    sites: visibleSites.map(toClientSite),
  });
}

async function handleStatus(request, response) {
  const accessMode = getAccessMode(request);
  const sites = (await readSites())
    .filter(site => isVisibleInAccessMode(site, accessMode))
    .map(site => applyAccessMode(site, accessMode));
  const statuses = await Promise.all(sites.map(checkSite));

  sendJson(response, 200, { accessMode, statuses });
}

async function handleAppConfig(_request, response) {
  const config = await readAppConfig();
  sendJson(response, 200, config);
}

async function handleIcon(request, response, pathname) {
  const id = decodeURIComponent(pathname.replace('/api/icon/', ''));
  const accessMode = getAccessMode(request);
  const sites = (await readSites())
    .filter(site => isVisibleInAccessMode(site, accessMode))
    .map(site => applyAccessMode(site, accessMode));
  const site = sites.find(item => item.id === id);

  if (!site) {
    response.writeHead(404);
    response.end();
    return;
  }

  const explicitIconUrl = resolveIconUrl(site);

  if (!explicitIconUrl) {
    response.writeHead(404);
    response.end();
    return;
  }

  if (explicitIconUrl.startsWith('/config-icons/')) {
    await handleConfigIcon(response, explicitIconUrl);
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const iconUrls = uniqueValues([
      ...await discoverIconUrls(site, controller.signal),
      explicitIconUrl,
    ]);

    for (const iconUrl of iconUrls) {
      try {
        const iconResponse = await fetch(iconUrl, {
          redirect: 'follow',
          signal: controller.signal,
          headers: {
            Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'User-Agent': 'LocalServerPage/1.0',
          },
        });

        if (!iconResponse.ok) {
          continue;
        }

        const contentType = iconResponse.headers.get('content-type') || 'image/x-icon';
        const buffer = Buffer.from(await iconResponse.arrayBuffer());

        response.writeHead(200, {
          'Cache-Control': 'public, max-age=3600',
          'Content-Length': buffer.byteLength,
          'Content-Type': contentType,
        });
        response.end(buffer);
        return;
      }
      catch {
        // Try the next discovered icon candidate.
      }
    }

    response.writeHead(404);
    response.end();
  }
  catch {
    response.writeHead(404);
    response.end();
  }
  finally {
    clearTimeout(timeout);
  }
}

async function handleStatic(request, response, pathname) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const decodedPath = decodeURIComponent(requestedPath);
  const filePath = path.normalize(path.join(publicDir, decodedPath));

  if (!filePath.startsWith(publicDir)) {
    sendText(response, 403, 'Forbidden');
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const contentType = mimeTypes.get(path.extname(filePath)) || 'application/octet-stream';

    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Length': file.byteLength,
      'Content-Type': contentType,
    });
    response.end(file);
  }
  catch {
    sendText(response, 404, 'Not found');
  }
}

async function handleConfigIcon(response, pathname) {
  const requestedPath = pathname.replace('/config-icons/', '');
  const decodedPath = decodeURIComponent(requestedPath);
  const filePath = path.normalize(path.join(configIconsDir, decodedPath));

  if (!filePath.startsWith(configIconsDir)) {
    sendText(response, 403, 'Forbidden');
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const contentType = mimeTypes.get(path.extname(filePath)) || 'application/octet-stream';

    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Length': file.byteLength,
      'Content-Type': contentType,
    });
    response.end(file);
  }
  catch {
    sendText(response, 404, 'Not found');
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

    if (request.method !== 'GET') {
      sendText(response, 405, 'Method not allowed');
      return;
    }

    if (url.pathname === '/api/sites') {
      await handleSites(request, response);
      return;
    }

    if (url.pathname === '/api/app-config') {
      await handleAppConfig(request, response);
      return;
    }

    if (url.pathname === '/api/status') {
      await handleStatus(request, response);
      return;
    }

    if (url.pathname.startsWith('/api/icon/')) {
      await handleIcon(request, response, url.pathname);
      return;
    }

    if (url.pathname.startsWith('/config-icons/')) {
      await handleConfigIcon(response, url.pathname);
      return;
    }

    await handleStatic(request, response, url.pathname);
  }
  catch (error) {
    sendJson(response, 500, { error: error.message });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Intranet home is running at http://localhost:${port}`);
});
