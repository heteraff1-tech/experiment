import { catalog, defaultTask, groups, hypotheses, icon, initialGraph } from './catalog.js';

const $ = (selector) => document.querySelector(selector);
const canvas = $('#canvas');
const world = $('#world');
const nodesEl = $('#nodes');
const inspector = $('#inspector');
const search = $('#search');
const library = $('.library');

const nodeSize = { width: 82, height: 82 };
const sourceSize = { width: 158, height: 59 };
const coordinates = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] };
const labels = { left: 'слева', right: 'справа', top: 'сверху', bottom: 'снизу' };
const layout = {
  task: { out: ['right'] },
  brief: { in: ['left'], out: ['right'] },
  validation: { in: ['left'], out: ['right'] },
  context: { in: ['left', 'top'], out: ['right'] },
  hypotheses: { in: ['left'], out: ['right'] },
  prototype: { in: ['left'] },
  knowledge: { out: ['bottom'] },
  metrics: { out: ['bottom'] },
  research: { out: ['bottom'] }
};
const isSource = (node) => catalog[node.type].tag === 'MCP';
const sizeFor = (node) => isSource(node) ? sourceSize : nodeSize;
const nodeById = (id) => graph.nodes.find((item) => item.id === id);
const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const badge = (item) => '<span class="badge-icon ' + item.color + '">' + icon(item.icon) + '</span>';
const clamp = (number, min, max) => Math.max(min, Math.min(number, max));

let graph = initialGraph();
let selected = null;
let selectedEdge = null;
let inspectorTab = 'settings';
let currentView = 'canvas';
let activeRun = null;
let logs = [];
let ready = false;
let chosen = 0;
let reviewNotes = '';
let preview = { step: 0, doctor: 0, slot: '10:30' };
let transform = { x: 0, y: 0, scale: 1 };
let mode = 'select';
let spaceDown = false;
let gesture = null;
let link = null;
let toastTimer;
let easeTimer;
let runTimer;
let nextId = 1;
let initialFit = false;
let nodeElements = new Map();

for (const element of document.querySelectorAll('[data-icon]')) {
  element.innerHTML = icon(element.dataset.icon);
}

function notify(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2500);
}

function renderLibrary() {
  const filter = search.value.trim().toLocaleLowerCase('ru');
  const markup = groups.map(({ title, types }) => {
    const matches = types.filter((type) => {
      const item = catalog[type];
      return [title, item.title, item.description].some((value) => value.toLocaleLowerCase('ru').includes(filter));
    });
    if (!matches.length) return '';
    return '<section class="library-group"><h3>' + title + '</h3>' + matches.map((type) => {
      const item = catalog[type];
      return '<button class="library-item" data-type="' + type + '" draggable="true" title="' + item.description + '">' +
        badge(item) + '<span>' + item.title + '</span><span class="add-icon">' + icon('plus') + '</span></button>';
    }).join('') + '</section>';
  }).join('');
  $('#library-list').innerHTML = markup || '<p class="inspector-empty">Блоки не найдены.</p>';
}

function ports(node) {
  return ['in', 'out'].flatMap((direction) => (layout[node.type][direction] || []).map((side) =>
    '<button type="button" class="port" data-direction="' + direction + '" data-side="' + side +
    '" aria-label="' + (direction === 'in' ? 'Вход ' : 'Выход ') + labels[side] + '"></button>'
  )).join('');
}

function renderNodes() {
  nodesEl.innerHTML = graph.nodes.map((node) => {
    const item = catalog[node.type];
    const source = isSource(node);
    const start = node.type === 'task';
    const done = activeRun?.done.includes(node.id);
    const status = done ? '<span class="node-status">' + icon('check') + '</span>' : '';
    const trigger = start ? '<span class="trigger-mark">' + icon('bolt') + '</span>' : '';
    const copy = '<span class="' + (source ? 'source-copy' : 'node-copy') + '"><span class="node-title">' + item.title +
      '</span><span class="node-description">' + item.description + '</span></span>';
    return '<div class="node ' + item.color + (source ? ' source' : '') + (start ? ' start-node' : '') + (done ? ' is-done' : '') + '"' +
      ' role="group" tabindex="0" aria-label="' + item.title + '" data-id="' + node.id + '" style="left:' + node.x + 'px;top:' + node.y + 'px">' +
      trigger + badge(item) + copy + status + ports(node) + '</div>';
  }).join('');
  nodeElements = new Map([...nodesEl.children].map((element) => [element.dataset.id, element]));
  styleNodes();
  drawWires();
  renderMinimap();
  updateStatus();
}

function styleNodes() {
  for (const [id, element] of nodeElements) {
    const current = activeRun?.current === id;
    element.classList.toggle('selected', selected === id);
    element.classList.toggle('is-running', current && activeRun.state === 'running');
    element.classList.toggle('is-review', current && activeRun.state === 'review');
    for (const port of element.querySelectorAll('.port.linking')) port.classList.remove('linking');
  }
  if (link) nodeElements.get(link.id)?.querySelector('.port[data-side="' + link.side + '"]')?.classList.add('linking');
}

function portPoint(node, side) {
  const { width, height } = sizeFor(node);
  const [dx, dy] = coordinates[side];
  return { x: node.x + width * (1 + dx) / 2, y: node.y + height * (1 + dy) / 2, dx, dy };
}

function curve(from, to) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const bend = clamp(distance * .43, 19, 115);
  return 'M ' + from.x + ' ' + from.y + ' C ' +
    (from.x + from.dx * bend) + ' ' + (from.y + from.dy * bend) + ' ' +
    (to.x + to.dx * bend) + ' ' + (to.y + to.dy * bend) + ' ' + to.x + ' ' + to.y;
}

function drawWires() {
  const markup = graph.edges.map((edge, index) => {
    const from = nodeById(edge.from);
    const to = nodeById(edge.to);
    const path = curve(portPoint(from, edge.out), portPoint(to, edge.in));
    const style = [
      'wire',
      isSource(from) ? 'mcp' : '',
      activeRun?.done.includes(from.id) ? 'passed' : '',
      activeRun?.current === to.id ? 'active' : '',
      selectedEdge === index ? 'connected' : ''
    ].join(' ');
    return '<path class="wire-hit" data-edge="' + index + '" d="' + path + '"/>' +
      '<path class="' + style + '" d="' + path + '" marker-end="url(#arrow)"/>';
  });
  if (link?.point) {
    const start = portPoint(nodeById(link.id), link.side);
    markup.push('<path class="wire connected" d="' + curve(start, { ...link.point, dx: 0, dy: 0 }) + '"/>');
  }
  $('#wires').innerHTML = markup.join('');
}

function graphBounds() {
  return {
    left: Math.min(0, ...graph.nodes.map((node) => node.x - 50)),
    top: Math.min(0, ...graph.nodes.map((node) => node.y)),
    right: Math.max(1170, ...graph.nodes.map((node) => node.x + Math.max(sizeFor(node).width, 133))),
    bottom: Math.max(377, ...graph.nodes.map((node) => node.y + sizeFor(node).height + (isSource(node) ? 0 : 49)))
  };
}

function renderMinimap() {
  const bounds = graphBounds();
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const viewport = {
    x: clamp(-transform.x / transform.scale, bounds.left, bounds.right),
    y: clamp(-transform.y / transform.scale, bounds.top, bounds.bottom),
    right: clamp((canvas.clientWidth - transform.x) / transform.scale, bounds.left, bounds.right),
    bottom: clamp((canvas.clientHeight - transform.y) / transform.scale, bounds.top, bounds.bottom)
  };
  $('#minimap').innerHTML = '<svg viewBox="' + [bounds.left, bounds.top, width, height].join(' ') + '" aria-hidden="true">' +
    graph.nodes.map((node) => '<rect x="' + node.x + '" y="' + node.y + '" width="' + sizeFor(node).width +
      '" height="' + sizeFor(node).height + '" rx="9" fill="' +
      (node.id === selected ? '#c64133' : isSource(node) ? '#7a9a87' : '#a69b90') + '"/>').join('') +
    '<rect x="' + viewport.x + '" y="' + viewport.y + '" width="' + (viewport.right - viewport.x) +
    '" height="' + (viewport.bottom - viewport.y) + '" rx="10" fill="#c6413309" stroke="#d6a89b" stroke-width="7"/></svg>';
}

function applyTransform(ease = false) {
  clearTimeout(easeTimer);
  world.classList.toggle('eased', ease);
  if (ease) easeTimer = setTimeout(() => world.classList.remove('eased'), 240);
  world.style.transform = 'translate(' + transform.x + 'px,' + transform.y + 'px) scale(' + transform.scale + ')';
  canvas.style.setProperty('--grid-spacing', Math.max(14, 21 * transform.scale) + 'px');
  canvas.style.setProperty('--grid-x', transform.x + 'px');
  canvas.style.setProperty('--grid-y', transform.y + 'px');
  $('#scale').textContent = Math.round(transform.scale * 100) + '%';
  renderMinimap();
}

function fit(ease = true, focusStart = false) {
  const { clientWidth: width, clientHeight: height } = canvas;
  if (!width || !height) return;
  const bounds = graphBounds();
  const graphWidth = bounds.right - bounds.left;
  const graphHeight = bounds.bottom - bounds.top;
  const top = 37;
  const margin = width < 600 ? 9 : 24;
  const room = Math.max(115, height - 92 - top);
  const mobileStart = focusStart && width < 600;
  const scale = mobileStart ? .77 : clamp(Math.min((width - 2 * margin) / graphWidth, room / graphHeight), .19, 1.14);
  transform = {
    x: (mobileStart ? 6 : (width - graphWidth * scale) / 2) - bounds.left * scale,
    y: top + Math.max(0, room - graphHeight * scale) * .28 - bounds.top * scale,
    scale
  };
  applyTransform(ease);
  initialFit = true;
}

function zoom(factor, x = canvas.clientWidth / 2, y = canvas.clientHeight / 2, ease = true) {
  const scale = clamp(transform.scale * factor, .19, 2.4);
  const ratio = scale / transform.scale;
  transform = { x: x - (x - transform.x) * ratio, y: y - (y - transform.y) * ratio, scale };
  applyTransform(ease);
}

function worldPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return { x: (clientX - rect.left - transform.x) / transform.scale, y: (clientY - rect.top - transform.y) / transform.scale };
}

function setMode(nextMode) {
  mode = nextMode;
  for (const tool of ['select', 'pan']) {
    const control = $('#' + tool + '-tool');
    control.classList.toggle('active', tool === mode);
    control.setAttribute('aria-pressed', String(tool === mode));
  }
  canvas.classList.toggle('panning', mode === 'pan' || spaceDown);
}

function setDrawer(drawer = null) {
  inspector.hidden = drawer !== inspector;
  library.hidden = drawer !== library;
  for (const toggle of [$('#library-toggle'), $('#library-shortcut')]) {
    toggle.setAttribute('aria-expanded', String(!library.hidden));
  }
}

function toggleLibrary() {
  const open = library.hidden;
  if (open) showView('canvas');
  setDrawer(open ? library : null);
  if (open && !matchMedia('(pointer: coarse)').matches) search.focus();
}

function selectNode(id, open = true) {
  if (selected !== id) inspectorTab = 'settings';
  selected = id;
  selectedEdge = null;
  styleNodes();
  drawWires();
  renderMinimap();
  renderInspector();
  if (id && open) setDrawer(inspector);
}

function addNode(type, point) {
  if (!catalog[type]) return;
  showView('canvas');
  const position = point || worldPoint(
    canvas.getBoundingClientRect().left + canvas.clientWidth * .47,
    canvas.getBoundingClientRect().top + canvas.clientHeight * .68
  );
  const id = 'block-' + nextId++;
  const { width, height } = sizeFor({ type });
  graph.nodes.push({
    id, type,
    x: Math.round(position.x - width / 2),
    y: Math.round(position.y - height / 2)
  });
  renderNodes();
  selectNode(id);
  notify('Блок добавлен');
}

function removeSelected() {
  if (activeRun && ['running', 'review'].includes(activeRun.state)) {
    notify('Остановите демо перед удалением');
    return;
  }
  if (selectedEdge !== null) {
    graph.edges.splice(selectedEdge, 1);
  } else if (selected) {
    graph.nodes = graph.nodes.filter((node) => node.id !== selected);
    graph.edges = graph.edges.filter((edge) => edge.from !== selected && edge.to !== selected);
  } else {
    return;
  }
  selected = null;
  selectedEdge = null;
  renderNodes();
  renderInspector();
  notify('Удалено');
}

function finishLink(target) {
  if (!link) return;
  const source = link;
  link = null;
  if (target?.dataset.direction === 'in') {
    const id = target.closest('.node').dataset.id;
    const duplicate = graph.edges.some((edge) => edge.from === source.id && edge.to === id);
    if (id !== source.id && !duplicate) {
      graph.edges.push({ from: source.id, out: source.side, to: id, in: target.dataset.side });
      notify('Связь добавлена');
    } else {
      notify(id === source.id ? 'Выберите другой блок' : 'Эти блоки уже связаны');
    }
  }
  styleNodes();
  drawWires();
  updateStatus();
}

function startLink(port) {
  link = { id: port.closest('.node').dataset.id, side: port.dataset.side };
  styleNodes();
  drawWires();
}

function pointerDown(event) {
  if (event.target.closest('.canvas-tools, .canvas-actions, .run-controls, .minimap')) return;
  if (![0, 1].includes(event.button)) return;
  const pan = mode === 'pan' || spaceDown || event.button === 1;
  const node = event.target.closest('.node');
  const port = event.target.closest('.port');
  const wire = event.target.closest('.wire-hit');
  if (!pan && wire) return;
  if (!pan && port?.dataset.direction === 'in') {
    if (link) finishLink(port);
    return;
  }
  if (!pan && port && link && link.id === node.dataset.id && link.side === port.dataset.side) {
    finishLink(null);
    return;
  }
  if (pan || !node) finishLink(null);
  const point = { x: event.clientX, y: event.clientY };
  gesture = { id: event.pointerId, point, kind: 'pan', moved: false, ...transform };
  if (!pan && port) {
    startLink(port);
    gesture.kind = 'link';
  } else if (!pan && node) {
    const block = nodeById(node.dataset.id);
    gesture.kind = 'node';
    gesture.block = block;
    gesture.x = block.x;
    gesture.y = block.y;
    selectNode(block.id, false);
  }
  canvas.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function pointerMove(event) {
  if (!gesture) {
    if (link) {
      link.point = worldPoint(event.clientX, event.clientY);
      drawWires();
    }
    return;
  }
  if (gesture.id !== event.pointerId) return;
  const dx = event.clientX - gesture.point.x;
  const dy = event.clientY - gesture.point.y;
  gesture.moved ||= Math.hypot(dx, dy) > 4;
  if (!gesture.moved) return;
  if (gesture.kind === 'link') {
    if (link) {
      link.point = worldPoint(event.clientX, event.clientY);
      drawWires();
    }
    return;
  }
  canvas.classList.add('dragging');
  if (gesture.kind === 'node') {
    const block = gesture.block;
    block.x = Math.round(gesture.x + dx / transform.scale);
    block.y = Math.round(gesture.y + dy / transform.scale);
    const element = nodeElements.get(block.id);
    element.style.left = block.x + 'px';
    element.style.top = block.y + 'px';
    drawWires();
    renderMinimap();
  } else {
    transform.x = gesture.x + dx;
    transform.y = gesture.y + dy;
    applyTransform();
  }
}

function pointerUp(event) {
  if (gesture?.id !== event.pointerId) return;
  if (gesture.kind === 'link' && gesture.moved) {
    finishLink(document.elementFromPoint(event.clientX, event.clientY)?.closest('.port'));
  } else if (gesture.kind === 'node' && !gesture.moved) {
    selectNode(gesture.block.id);
  } else if (gesture.kind === 'pan' && !gesture.moved) {
    selectNode(null);
    setDrawer();
  }
  gesture = null;
  canvas.classList.remove('dragging');
}

function renderInspector() {
  if (selectedEdge !== null) {
    const edge = graph.edges[selectedEdge];
    inspector.innerHTML = '<div class="inspector-empty"><div class="drawer-heading"><h2>Связь блоков</h2>' +
      '<button class="button icon-button quiet" data-action="close" aria-label="Скрыть настройки">' + icon('x') + '</button></div><p>' +
      catalog[nodeById(edge.from).type].title + ' → ' + catalog[nodeById(edge.to).type].title +
      '</p></div><div class="inspector-bottom"><button class="button" data-action="remove">' + icon('trash') + 'Удалить связь</button></div>';
    return;
  }
  const node = nodeById(selected);
  if (!node) {
    inspector.innerHTML = '<div class="inspector-empty"><h2>Настройки блока</h2><p>Выберите блок или связь на холсте.</p></div>';
    return;
  }
  const item = catalog[node.type];
  const reviewing = activeRun?.state === 'review' && activeRun.current === node.id;
  const isDone = activeRun?.done.includes(node.id);
  const top = '<div class="inspector-top"><div class="inspector-heading">НАСТРОЙКИ БЛОКА' +
    '<button type="button" data-action="close" aria-label="Скрыть настройки">' + icon('x') + '</button></div>' +
    '<div class="inspector-identity">' + badge(item) + '<div><h2>' + item.title + '</h2><small>' + item.kind + '</small></div></div></div>' +
    '<div class="inspector-tabs" aria-label="Информация о блоке">' +
    ['settings', 'output'].map((tab) => '<button class="tab ' + (inspectorTab === tab ? 'active' : '') +
      '" data-inspector-tab="' + tab + '">' + (tab === 'settings' ? 'Параметры' : 'Результат') + '</button>').join('') + '</div>';

  let body;
  if (reviewing) {
    body = '<div class="info-callout">' + icon('info') + '<p>Пайплайн на паузе. Выберите гипотезу и при необходимости уточните её.</p></div>' +
      '<div class="review-list" aria-label="Гипотезы">' + hypotheses.map((option, index) =>
        '<button class="hypothesis" aria-pressed="' + (chosen === index) + '" data-hypothesis="' + index + '">' +
        icon(chosen === index ? 'check' : 'sparkle') + option.title + '</button>'
      ).join('') + '</div><div class="field"><label for="review-notes">Уточнение</label>' +
      '<textarea id="review-notes" class="hypothesis-notes" placeholder="Добавьте правку к гипотезе…">' + safe(reviewNotes) + '</textarea></div>' +
      '<button class="button primary" data-action="continue">' + icon('play') + 'Подтвердить и продолжить</button>';
  } else if (inspectorTab === 'output') {
    body = '<div class="info-callout">' + icon('info') + '<p>' +
      (isDone ? safe(resultFor(node)) : 'Результат появится после прохождения блока в демо.') + '</p></div>';
    if (node.type === 'prototype' && ready) body += '<button class="button primary" data-action="prototype">' + icon('layout') + 'Открыть прототип</button>';
  } else {
    const field = node.type === 'task'
      ? '<div class="field"><label for="node-value">Запрос</label><textarea id="node-value" placeholder="Что хотите проверить?">' +
        safe(node.value ?? defaultTask) + '</textarea><small>Этот текст станет входом для сценария.</small></div>'
      : '<div class="field"><p class="field-title">Назначение</p><small>' + item.details + '</small></div>';
    body = '<div class="field"><p class="field-title">Название</p><input aria-label="Название" value="' +
      item.title + '" readonly></div>' + field +
      '<div class="inspector-info"><p class="section-label">О БЛОКЕ</p><div class="info-row"><span>Тип</span><strong class="type-value">' +
      item.kind + '</strong></div><div class="info-row"><span>Выход</span><strong>' + item.output + '</strong></div></div>';
    if (node.type === 'task') body += '<div class="info-callout">' + icon('info') +
      '<p>После запуска Harness передаст запрос следующему блоку.</p></div>';
  }

  inspector.innerHTML = top + '<div class="inspector-body">' + body + '</div><div class="inspector-bottom">' +
    '<button class="button" data-action="remove">' + icon('trash') + 'Удалить блок</button></div>';
}

function updateStatus() {
  const state = activeRun?.state;
  const running = state === 'running';
  const reviewing = state === 'review';
  const blocks = graph.nodes.length;
  const edges = graph.edges.length;
  const countText = (number, words) => {
    const last = number % 10;
    const index = number % 100 >= 11 && number % 100 <= 14 ? 2 : last === 1 ? 0 : last >= 2 && last <= 4 ? 1 : 2;
    return number + ' ' + words[index];
  };
  $('#counts').textContent = countText(blocks, ['блок', 'блока', 'блоков']) +
    '  ·  ' + countText(edges, ['связь', 'связи', 'связей']);
  $('#status-text').textContent = reviewing ? 'Ожидает выбора гипотезы' : running ? 'Демо выполняется' : ready ? 'Прототип готов' : 'Готов к запуску';
  $('.status-right').classList.toggle('busy', running);
  $('.status-right').classList.toggle('review', reviewing);
  $('#run-label').textContent = running || reviewing ? 'Остановить' : 'Запустить демо';
  $('#run > span:first-child').innerHTML = icon(running || reviewing ? 'stop' : 'play');
}

function runOrder() {
  const starter = graph.nodes.find((node) => node.type === 'task');
  if (!starter) return [];
  const visited = new Set();
  const order = [];
  const visit = (id) => {
    if (visited.has(id)) return;
    visited.add(id);
    for (const edge of graph.edges.filter((item) => item.to === id && isSource(nodeById(item.from)))) {
      visit(edge.from);
    }
    order.push(id);
    for (const edge of graph.edges.filter((item) => item.from === id && !isSource(nodeById(id)))) visit(edge.to);
  };
  visit(starter.id);
  return order;
}

function renderProgress() {
  renderNodes();
  if (!inspector.contains(document.activeElement) || document.activeElement.tagName !== 'TEXTAREA') renderInspector();
  if (currentView === 'runs') renderRuns();
  if (currentView === 'prototype') renderPrototype();
}

function startRun() {
  if (['running', 'review'].includes(activeRun?.state)) {
    finishRun('Остановлен');
    return;
  }
  const order = runOrder();
  if (!order.length) {
    notify('Добавьте блок «Постановка задачи»');
    return;
  }
  ready = false;
  chosen = 0;
  reviewNotes = '';
  preview = { step: 0, doctor: 0, slot: '10:30' };
  activeRun = { current: null, order, done: [], events: [], state: 'running' };
  setDrawer();
  showView('canvas');
  nextStep();
}

function resultFor(node) {
  if (node.type === 'task') return node.value ?? defaultTask;
  if (node.type === 'hypotheses') return hypotheses[chosen].title + (reviewNotes ? ' · ' + reviewNotes : '');
  return catalog[node.type].result;
}

function completeStep() {
  const node = nodeById(activeRun.current);
  activeRun.done.push(node.id);
  activeRun.events.push({
    title: catalog[node.type].title,
    result: resultFor(node)
  });
  if (node.type === 'prototype') ready = true;
  nextStep();
}

function nextStep() {
  activeRun.current = activeRun.order[activeRun.done.length];
  const next = nodeById(activeRun.current);
  if (!next) {
    finishRun('Завершён');
    return;
  }
  activeRun.state = 'running';
  renderProgress();
  runTimer = setTimeout(() => {
    if (next.type === 'hypotheses') {
      activeRun.state = 'review';
      showView('canvas');
      selectNode(next.id);
      renderProgress();
      notify('Выберите гипотезу для прототипа');
      return;
    }
    completeStep();
  }, isSource(next) ? 290 : 610);
}

function finishRun(status) {
  clearTimeout(runTimer);
  activeRun.state = 'complete';
  activeRun.current = null;
  logs.unshift({
    status,
    date: new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date()),
    events: [...activeRun.events]
  });
  renderProgress();
  if (status === 'Завершён' && ready) {
    showView('prototype');
    notify('Прототип готов');
  } else if (status === 'Завершён') {
    notify('Демо завершено. Подключите блок сборки, чтобы увидеть прототип.');
  } else {
    notify('Демо остановлено');
  }
}

function renderRuns() {
  const live = ['running', 'review'].includes(activeRun?.state);
  const entries = live ? [{ status: activeRun.state === 'review' ? 'Ожидает ревью' : 'Выполняется', events: activeRun.events }, ...logs] : logs;
  const action = entries.length ? runAction(live ? 'Остановить' : 'Запустить демо', live ? 'stop' : 'play') : '';
  $('#runs-view').innerHTML = '<div class="view-heading"><h1>Запуски</h1>' + action + '</div>' +
    '<p>История прохождения демонстрационного сценария.</p>' +
    (entries.length ? entries.map((entry, index) =>
      '<details class="log"' + (index === 0 ? ' open' : '') + '><summary>' +
      entry.status + (entry.date ? ' · ' + entry.date : '') + '</summary>' +
      (entry.events.length ? '<ol>' + entry.events.map((event) => '<li><strong>' + safe(event.title) + '</strong> · ' +
        safe(event.result) + '</li>').join('') + '</ol>' : '') + '</details>'
    ).join('') : '<div class="empty-state">' + badge({ icon: 'history', color: 'purple' }) +
      '<h2>Пока нет запусков</h2><p>Запустите демо, чтобы увидеть, как сценарий проходит по блокам.</p>' +
      '<button class="button primary" data-view-action="run">' + icon('play') + 'Запустить демо</button></div>');
}

const doctors = [
  { name: 'Анна Смирнова', specialty: 'Терапевт', time: 'Сегодня, 10:30' },
  { name: 'Михаил Орлов', specialty: 'Кардиолог', time: 'Завтра, 11:45' }
];
const slots = ['10:30', '11:45', '14:15'];

function runAction(label, symbol) {
  return '<button class="button" data-view-action="run">' + icon(symbol) + label + '</button>';
}

function renderPrototype() {
  const root = $('#prototype-view');
  const heading = '<div class="view-heading"><h1>Кликабельный прототип</h1>' +
    (ready ? runAction('Повторить демо', 'reset') : '') + '</div>';
  if (!ready) {
    root.innerHTML = heading + '<p>Здесь появится интерактивный результат сценария.</p><div class="empty-state">' +
      badge({ icon: 'layout', color: 'pink' }) + '<h2>Прототип ещё не собран</h2>' +
      '<p>Пройдите сценарий и подтвердите гипотезу на этапе ревью.</p>' +
      '<button class="button" data-view-action="canvas">' + icon('workflow') + 'Перейти на холст</button></div>';
    return;
  }
  const option = hypotheses[chosen];
  const doctor = doctors[preview.doctor];
  const initial = '<h2>' + option.screen + '</h2><p>' + option.description + '</p>' + doctors.map((item, index) =>
    '<article class="preview-card"><div><strong>' + item.name + '</strong><small>' + item.specialty +
    (chosen === 1 ? ' · ' + item.time : '') + '</small></div><button data-doctor="' + index + '">Выбрать</button></article>'
  ).join('');
  const selectTime = '<h2>Выберите время</h2><p>' + doctor.name + ' · ' + doctor.specialty +
    '</p><div class="preview-slots">' + slots.map((slot) => '<button class="preview-slot" aria-pressed="' +
      (preview.slot === slot) + '" data-slot="' + slot + '">' + slot + '</button>').join('') +
    '</div><button data-preview="confirm">Подтвердить запись</button> <button data-preview="restart">Назад</button>';
  const confirmed = '<h2>Вы записаны</h2><p>Демонстрационная запись к врачу подтверждена.</p><article class="preview-card"><div><strong>' +
    doctor.name + '</strong><small>' + doctor.specialty + ' · ' + preview.slot +
    '</small></div>' + icon('check') + '</article><button data-preview="restart">В начало</button>';
  root.innerHTML = heading + '<p>' + option.title + (reviewNotes ? ' · ' + safe(reviewNotes) : '') +
    '</p><div class="preview-frame"><div class="preview-bar"><i></i><i></i><i></i>Предпросмотр<small>Шаг ' +
    (preview.step + 1) + ' из 3</small></div><div class="preview-product"><header><strong>' + icon('heart') +
    'Здоровье</strong><small>Личный кабинет</small></header>' +
    [initial, selectTime, confirmed][preview.step] + '</div></div>';
}

function showView(view) {
  currentView = view;
  for (const tab of document.querySelectorAll('[data-view]')) {
    const active = tab.dataset.view === view;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-current', active ? 'page' : 'false');
    $('#' + tab.dataset.view + '-view').hidden = !active;
  }
  $('#editor-shortcut').classList.toggle('active', view === 'canvas');
  if (view !== 'canvas') setDrawer();
  if (view === 'runs') renderRuns();
  if (view === 'prototype') renderPrototype();
  if (view === 'canvas' && !initialFit) fit(false, true);
}

function toggleMenu(isOpen) {
  $('#more-menu').hidden = !isOpen;
  $('#more').setAttribute('aria-expanded', String(isOpen));
}

function resetDemo() {
  clearTimeout(runTimer);
  graph = initialGraph();
  activeRun = null;
  logs = [];
  ready = false;
  selected = null;
  selectedEdge = null;
  inspectorTab = 'settings';
  link = null;
  search.value = '';
  setDrawer();
  toggleMenu(false);
  setMode('select');
  showView('canvas');
  renderLibrary();
  renderProgress();
  renderInspector();
  fit(true, true);
  notify('Демо сброшено');
}

$('#library-list').addEventListener('click', (event) => {
  const item = event.target.closest('.library-item');
  if (item) addNode(item.dataset.type);
});
$('#library-list').addEventListener('dragstart', (event) => {
  const item = event.target.closest('.library-item');
  if (!item) return;
  event.dataTransfer.setData('application/x-harness-block', item.dataset.type);
  event.dataTransfer.effectAllowed = 'copy';
});
canvas.addEventListener('dragover', (event) => {
  if (!event.dataTransfer.types.includes('application/x-harness-block')) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
});
canvas.addEventListener('drop', (event) => {
  const type = event.dataTransfer.getData('application/x-harness-block');
  if (!type) return;
  event.preventDefault();
  addNode(type, worldPoint(event.clientX, event.clientY));
});
search.addEventListener('input', renderLibrary);

canvas.addEventListener('pointerdown', pointerDown);
canvas.addEventListener('pointermove', pointerMove);
canvas.addEventListener('pointerup', pointerUp);
canvas.addEventListener('pointercancel', () => {
  gesture = null;
  finishLink(null);
  canvas.classList.remove('dragging');
});
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  zoom(Math.exp(-event.deltaY * (event.deltaMode ? .018 : .0015)), event.clientX - rect.left, event.clientY - rect.top, false);
}, { passive: false });
canvas.addEventListener('click', (event) => {
  const wire = event.target.closest('.wire-hit');
  if (!wire || mode === 'pan' || spaceDown) return;
  finishLink(null);
  selected = null;
  selectedEdge = Number(wire.dataset.edge);
  styleNodes();
  drawWires();
  renderMinimap();
  renderInspector();
  setDrawer(inspector);
});
canvas.addEventListener('keydown', (event) => {
  if (!['Enter', ' '].includes(event.key)) return;
  const node = event.target.closest('.node');
  if (!node) return;
  event.preventDefault();
  event.stopPropagation();
  const port = event.target.closest('.port');
  if (port?.dataset.direction === 'out') startLink(port);
  else if (port) finishLink(port);
  else selectNode(node.dataset.id);
});

inspector.addEventListener('input', (event) => {
  if (event.target.id === 'node-value') nodeById(selected).value = event.target.value;
  if (event.target.id === 'review-notes') reviewNotes = event.target.value;
});
inspector.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.inspectorTab) {
    inspectorTab = button.dataset.inspectorTab;
    renderInspector();
  }
  if (button.dataset.hypothesis !== undefined) {
    chosen = Number(button.dataset.hypothesis);
    renderInspector();
    inspector.querySelector('[data-hypothesis="' + chosen + '"]').focus();
  }
  switch (button.dataset.action) {
    case 'remove': removeSelected(); break;
    case 'close': selectNode(null); setDrawer(); break;
    case 'continue':
      if (activeRun?.state === 'review') {
        setDrawer();
        completeStep();
      }
      break;
    case 'prototype': showView('prototype'); break;
  }
});

$('.view-tabs').addEventListener('click', (event) => {
  const tab = event.target.closest('[data-view]');
  if (tab) showView(tab.dataset.view);
});
$('.editor').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const { viewAction, doctor, slot, preview: action } = button.dataset;
  if (viewAction === 'canvas') showView('canvas');
  if (viewAction === 'run') startRun();
  if (doctor !== undefined) {
    preview = { step: 1, doctor: Number(doctor), slot: slots[chosen === 1 ? Number(doctor) : 0] };
  }
  if (slot) preview.slot = slot;
  if (action === 'confirm') preview.step = 2;
  if (action === 'restart') preview.step = 0;
  if (doctor !== undefined || slot || action) renderPrototype();
});

$('#run').addEventListener('click', startRun);
$('#more').addEventListener('click', () => toggleMenu($('#more-menu').hidden));
$('#reset').addEventListener('click', resetDemo);
document.addEventListener('click', (event) => {
  if (!event.target.closest('.top-actions')) toggleMenu(false);
});
$('#select-tool').addEventListener('click', () => setMode('select'));
$('#pan-tool').addEventListener('click', () => setMode('pan'));
$('#zoom-in').addEventListener('click', () => zoom(1.18));
$('#zoom-out').addEventListener('click', () => zoom(1 / 1.18));
$('#fit').addEventListener('click', () => fit());
$('#minimap').addEventListener('click', () => fit());
$('#library-toggle').addEventListener('click', toggleLibrary);
$('#library-shortcut').addEventListener('click', toggleLibrary);
$('#close-library').addEventListener('click', () => setDrawer());
$('#editor-shortcut').addEventListener('click', () => showView('canvas'));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    finishLink(null);
    setDrawer();
    toggleMenu(false);
    return;
  }
  if (event.target.matches('input, textarea, button, summary') || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === '/') {
    event.preventDefault();
    showView('canvas');
    setDrawer(library);
    search.focus();
  }
  if (currentView !== 'canvas') return;
  switch (event.code) {
    case 'Space':
      event.preventDefault();
      spaceDown = true;
      setMode(mode);
      break;
    case 'KeyV': setMode('select'); break;
    case 'KeyH': setMode('pan'); break;
    case 'Digit0': fit(); break;
    case 'Delete':
    case 'Backspace': removeSelected(); break;
  }
});
document.addEventListener('keyup', (event) => {
  if (event.code === 'Space' && spaceDown) {
    spaceDown = false;
    setMode(mode);
  }
});
window.addEventListener('blur', () => {
  spaceDown = false;
  setMode(mode);
});
new ResizeObserver(() => {
  if (currentView === 'canvas' && !gesture) fit(false, true);
}).observe(canvas);
renderLibrary();
renderNodes();
renderInspector();
showView('canvas');
