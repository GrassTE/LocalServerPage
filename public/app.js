const grid = document.querySelector('#siteGrid');
const template = document.querySelector('#siteTemplate');
const emptyState = document.querySelector('#emptyState');
const searchInput = document.querySelector('#searchInput');
const refreshButton = document.querySelector('#refreshButton');
const onlineCount = document.querySelector('#onlineCount');
const modeLabel = document.querySelector('#modeLabel');
const canvas = document.querySelector('#networkCanvas');
const context = canvas.getContext('2d');

let sites = [];
let statuses = new Map();
let accessMode = 'internal';
let filter = '';
let width = 0;
let height = 0;
let points = [];
let animationFrame = 0;
const pointer = {
  active: false,
  x: 0,
  y: 0,
};

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

function normalize(value) {
  return value.toLowerCase().trim();
}

function getInitials(name) {
  return [...name.trim()].slice(0, 2).join('').toUpperCase() || '?';
}

function render() {
  const filteredSites = sites.filter((site) => {
    const haystack = normalize(`${site.name} ${site.url || ''} ${site.description}`);
    return haystack.includes(filter);
  });

  grid.replaceChildren();
  emptyState.hidden = filteredSites.length > 0;

  filteredSites.forEach((site) => {
    const status = statuses.get(site.id);
    const card = template.content.firstElementChild.cloneNode(true);
    const image = card.querySelector('img');
    const fallback = card.querySelector('.fallback-icon');
    const title = card.querySelector('strong');
    const description = card.querySelector('.description');
    const state = card.querySelector('.state');
    const latency = card.querySelector('.latency');

    card.href = site.isUrlConfigured ? site.url : '#';
    card.dataset.state = status ? (status.online ? 'online' : 'offline') : 'checking';

    if (!site.isUrlConfigured) {
      card.setAttribute('aria-disabled', 'true');
      card.addEventListener('click', (event) => event.preventDefault());
    }

    image.src = `/api/icon/${encodeURIComponent(site.id)}`;
    image.addEventListener('error', () => {
      image.hidden = true;
      fallback.textContent = getInitials(site.name);
    }, { once: true });

    title.textContent = site.name;
    description.textContent = site.description || '内网站点';

    if (!status) {
      state.textContent = '检测中';
      latency.textContent = '';
    }
    else if (status.online) {
      state.textContent = '在线';
      latency.textContent = `${status.latencyMs} ms`;
    }
    else {
      state.textContent = status.error === 'not-configured' ? '未配置' : '离线';
      latency.textContent = status.error === 'timeout'
        ? '超时'
        : status.error === 'not-configured'
          ? (accessMode === 'internal' ? '缺少内网 URL' : '缺少外网 URL')
          : '不可达';
    }

    grid.append(card);
  });

  const online = [...statuses.values()].filter(status => status.online).length;
  onlineCount.textContent = statuses.size ? `在线服务 ${online}/${sites.length}` : `在线服务 --/${sites.length}`;
  modeLabel.textContent = accessMode === 'internal' ? '内网模式' : '外网模式';
}

async function loadSites() {
  const data = await fetchJson('/api/sites');
  accessMode = data.accessMode || 'internal';
  sites = data.sites;
  render();
}

async function refreshStatus() {
  refreshButton.disabled = true;
  refreshButton.classList.add('spinning');

  try {
    const data = await fetchJson('/api/status');
    accessMode = data.accessMode || accessMode;
    statuses = new Map(data.statuses.map(status => [status.id, status]));
    render();
  }
  catch (error) {
    console.error(error);
  }
  finally {
    refreshButton.disabled = false;
    refreshButton.classList.remove('spinning');
  }
}

searchInput.addEventListener('input', (event) => {
  filter = normalize(event.target.value);
  render();
});

refreshButton.addEventListener('click', refreshStatus);

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);

  const count = Math.max(38, Math.min(110, Math.floor((width * height) / 18000)));
  points = Array.from({ length: count }, () => {
    const driftAngle = Math.random() * Math.PI * 2;
    const driftSpeed = 0.12 + Math.random() * 0.22;

    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
      driftAngle,
      driftSpeed,
      pulse: Math.random() * Math.PI * 2,
    };
  });
}

function drawNetwork() {
  context.clearRect(0, 0, width, height);
  context.lineWidth = 1;

  for (const point of points) {
    if (pointer.active) {
      const dx = pointer.x - point.x;
      const dy = pointer.y - point.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 220 && distance > 0) {
        const force = (1 - distance / 220) * 0.018;
        point.vx += (dx / distance) * force;
        point.vy += (dy / distance) * force;
      }

      if (distance < 74 && distance > 0) {
        const force = (1 - distance / 74) * 0.045;
        point.vx -= (dx / distance) * force;
        point.vy -= (dy / distance) * force;
      }
    }

    point.driftAngle += Math.sin(point.pulse) * 0.0012;
    point.x += Math.cos(point.driftAngle) * point.driftSpeed + point.vx;
    point.y += Math.sin(point.driftAngle) * point.driftSpeed + point.vy;
    point.pulse += 0.016;
    point.vx *= 0.992;
    point.vy *= 0.992;

    const interactionSpeed = Math.hypot(point.vx, point.vy);

    if (interactionSpeed > 1.8) {
      point.vx = (point.vx / interactionSpeed) * 1.8;
      point.vy = (point.vy / interactionSpeed) * 1.8;
    }

    if (point.x < -20) point.x = width + 20;
    if (point.x > width + 20) point.x = -20;
    if (point.y < -20) point.y = height + 20;
    if (point.y > height + 20) point.y = -20;
  }

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];

    for (let nextIndex = index + 1; nextIndex < points.length; nextIndex += 1) {
      const next = points[nextIndex];
      const distance = Math.hypot(point.x - next.x, point.y - next.y);

      if (distance < 165) {
        const alpha = (1 - distance / 165) * 0.28;
        context.strokeStyle = `rgba(45, 212, 191, ${alpha})`;
        context.beginPath();
        context.moveTo(point.x, point.y);
        context.lineTo(next.x, next.y);
        context.stroke();
      }
    }

    if (pointer.active) {
      const pointerDistance = Math.hypot(point.x - pointer.x, point.y - pointer.y);

      if (pointerDistance < 230) {
        const alpha = (1 - pointerDistance / 230) * 0.42;
        context.strokeStyle = `rgba(125, 249, 255, ${alpha})`;
        context.beginPath();
        context.moveTo(point.x, point.y);
        context.lineTo(pointer.x, pointer.y);
        context.stroke();
      }
    }

    const radius = 1.4 + Math.sin(point.pulse) * 0.5;
    context.fillStyle = 'rgba(125, 249, 255, 0.72)';
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
  }

  if (pointer.active) {
    const glow = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 190);
    glow.addColorStop(0, 'rgba(125, 249, 255, 0.16)');
    glow.addColorStop(0.28, 'rgba(45, 212, 191, 0.08)');
    glow.addColorStop(1, 'rgba(45, 212, 191, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(pointer.x, pointer.y, 190, 0, Math.PI * 2);
    context.fill();
  }

  animationFrame = requestAnimationFrame(drawNetwork);
}

window.addEventListener('resize', () => {
  cancelAnimationFrame(animationFrame);
  resizeCanvas();
  drawNetwork();
});

window.addEventListener('pointermove', (event) => {
  pointer.active = true;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});

window.addEventListener('pointerleave', () => {
  pointer.active = false;
});

window.addEventListener('blur', () => {
  pointer.active = false;
});

resizeCanvas();
drawNetwork();

await loadSites();
await refreshStatus();
setInterval(refreshStatus, 30000);
