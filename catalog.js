export const icons = {
  brand: '<path d="M6 4v16M18 4v16M6 9h12M6 15h12"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  'chevron-right': '<path d="m9 6 6 6-6 6"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  play: '<path d="m8 5 12 7-12 7z" fill="currentColor" stroke="none"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  mouse: '<rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 7v4"/>',
  workflow: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><path d="M6 9v5a4 4 0 0 0 4 4h5"/>',
  history: '<path d="M4 7a9 9 0 1 1-.8 9M4 3v5h5m3-1v5l4 2"/>',
  layout: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18m-12 0v11"/>',
  plug: '<path d="M9 3v4m6-4v4M7 7h10v3a5 5 0 0 1-10 0zm5 8v6"/>',
  cursor: '<path d="m5 3 14 10-6 1-3 6-5-17Z"/>',
  hand: '<path d="M8 13V6a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-5a1.5 1.5 0 0 1 3 0v6-2a1.5 1.5 0 0 1 3 0v4a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-3-5a1.5 1.5 0 0 1 2.5-1.5L8 13Z"/>',
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M5 12h14m-7-7v14"/>',
  fit: '<path d="M9 4H4v5m11-5h5v5m-5 11h5v-5M4 15v5h5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  file: '<path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Zm0 0v7h7M8 14h8m-8 3h6"/>',
  shield: '<path d="M12 22s7-4 7-10V5l-7-3-7 3v7c0 6 7 10 7 10Z"/><path d="m9 12 2 2 4-4"/>',
  database: '<ellipse cx="12" cy="5.5" rx="8" ry="3.5"/><path d="M4 6v6c0 2 3.5 3.5 8 3.5s8-1.5 8-3.5V6M4 12v6c0 2 3.5 3.5 8 3.5s8-1.5 8-3.5v-6"/>',
  sparkle: '<path d="M10 3c0 5-2 7-7 7 5 0 7 2 7 7 0-5 2-7 7-7-5 0-7-2-7-7Zm8 10c0 2.5-1.5 4-4 4 2.5 0 4 1.5 4 4 0-2.5 1.5-4 4-4-2.5 0-4-1.5-4-4Z"/>',
  box: '<path d="m12 2 9 5v10l-9 5-9-5V7Zm-9 5 9 5 9-5m-9 5v10M7.5 4.5l9 5"/>',
  book: '<path d="M12 5v15M3 5c3-2 6-2 9 0 3-2 6-2 9 0v14c-3-2-6-2-9 0-3-2-6-2-9 0z"/>',
  chart: '<path d="M4 3v17h17M8 16v-4m5 4V8m5 8V5"/>',
  research: '<circle cx="10" cy="9" r="6"/><path d="m15 14 5 5M7 10l2-2 2 2 2-3"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  reset: '<path d="M4 7a8.5 8.5 0 1 1-.5 9M4 3v5h5"/>',
  heart: '<path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-3 3 0 7 2 9l6 6 6-6c2-2 5-6 2-9Z"/>'
};

export function icon(name) {
  return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[name] + '</svg>';
}

export const groups = [
  { title: 'ОСНОВНОЕ', types: ['task', 'brief', 'validation'] },
  { title: 'НАВЫКИ', types: ['context', 'hypotheses', 'prototype'] },
  { title: 'MCP-КОННЕКТОРЫ', types: ['knowledge', 'metrics', 'research'] }
];

export const catalog = {
  task: {
    title: 'Постановка задачи', description: 'Промпт продакта', icon: 'target', color: 'purple',
    tag: 'ВХОД', kind: 'Ручной ввод', output: 'Постановка задачи',
    details: 'Сформулируйте, какую идею хотите проверить и что продемонстрировать команде.',
    result: 'Запрос продакта передан в бриф.'
  },
  brief: {
    title: 'Бриф', description: 'Цели и критерии успеха', icon: 'file', color: 'blue',
    tag: 'ШАГ', kind: 'Шаг', output: 'Продуктовый бриф',
    details: 'Опишите аудиторию, проблему и критерий успеха простыми словами.',
    result: 'Цель демо — показать, как пациент повторно записывается на приём. Критерий — запись за три шага.'
  },
  validation: {
    title: 'Валидация ограничений', description: 'Проверка рамок проекта', icon: 'shield', color: 'teal',
    tag: 'ШАГ', kind: 'Шаг', output: 'Чек-лист ограничений',
    details: 'Укажите рамки сценария и обязательные требования к прототипу.',
    result: 'В сценарии используются знакомые компоненты и демонстрационные данные.'
  },
  context: {
    title: 'Сбор контекста', description: 'Цели, метрики и ресёрч', icon: 'database', color: 'teal',
    tag: 'НАВЫК', kind: 'Навык', output: 'Сводка источников',
    details: 'Подключите к блоку источники контекста через входы по бокам и снизу.',
    result: 'Собраны образцы продуктовых целей, метрик записи и выводов интервью.'
  },
  hypotheses: {
    title: 'Генерация гипотез', description: 'Выбор и корректировка', icon: 'sparkle', color: 'orange',
    tag: 'РЕВЬЮ', kind: 'Навык с ревью', output: 'Выбранная гипотеза',
    details: 'Во время запуска сценарий остановится здесь. Выберите гипотезу и при желании оставьте правку.',
    result: 'Гипотеза согласована для прототипирования.'
  },
  prototype: {
    title: 'Сборка прототипа', description: 'Компоненты дизайн-системы', icon: 'box', color: 'pink',
    tag: 'ВЫХОД', kind: 'Навык', output: 'Кликабельное превью',
    details: 'Покажите выбранную гипотезу на интерактивных экранах с демонстрационными компонентами.',
    result: 'Кликабельное превью доступно на вкладке «Прототип».'
  },
  knowledge: {
    title: 'База знаний', description: 'Цели продукта', icon: 'book', color: 'blue',
    tag: 'MCP', kind: 'Коннектор MCP', output: 'Продуктовые цели',
    details: 'Демонстрационный источник продуктовых целей и внутренних материалов.',
    result: 'Цель продукта — упростить повторную запись пациента.'
  },
  metrics: {
    title: 'Метрики', description: 'Продуктовая аналитика', icon: 'chart', color: 'green',
    tag: 'MCP', kind: 'Коннектор MCP', output: 'Сводка метрик',
    details: 'Демонстрационный источник показателей воронки записи.',
    result: 'Демо-метрика — доля пациентов, завершивших повторную запись.'
  },
  research: {
    title: 'Исследования', description: 'Интервью и инсайты', icon: 'research', color: 'purple',
    tag: 'MCP', kind: 'Коннектор MCP', output: 'Выводы интервью',
    details: 'Демонстрационный источник пользовательских интервью.',
    result: 'В демо-интервью пациенты хотят быстрее находить своего врача.'
  }
};

export const defaultTask = 'Покажи на внутреннем демо, как пациент может повторно записаться к своему врачу в мобильном приложении.';
export const hypotheses = [
  { title: 'Повторить прошлую запись', screen: 'Повторная запись', description: 'Выберите врача из недавних визитов.' },
  { title: 'Предложить ближайшее время', screen: 'Ближайший приём', description: 'Сравните ближайшие даты приёма знакомых врачей.' },
  { title: 'Записаться из карточки врача', screen: 'Мои врачи', description: 'Откройте карточку врача и выберите удобное время.' }
];

export function initialGraph() {
  return {
    nodes: [
      { id: 'task', type: 'task', x: 26, y: 6, value: defaultTask },
      { id: 'brief', type: 'brief', x: 303, y: 6 },
      { id: 'validation', type: 'validation', x: 580, y: 6 },
      { id: 'context', type: 'context', x: 580, y: 179 },
      { id: 'hypotheses', type: 'hypotheses', x: 303, y: 179 },
      { id: 'prototype', type: 'prototype', x: 26, y: 179 },
      { id: 'knowledge', type: 'knowledge', x: 26, y: 363 },
      { id: 'metrics', type: 'metrics', x: 303, y: 363 },
      { id: 'research', type: 'research', x: 580, y: 363 }
    ],
    edges: [
      { from: 'task', out: 'right', to: 'brief', in: 'left' },
      { from: 'brief', out: 'right', to: 'validation', in: 'left' },
      { from: 'validation', out: 'bottom', to: 'context', in: 'top' },
      { from: 'context', out: 'left', to: 'hypotheses', in: 'right' },
      { from: 'hypotheses', out: 'left', to: 'prototype', in: 'right' },
      { from: 'knowledge', out: 'top', to: 'context', in: 'bottom' },
      { from: 'metrics', out: 'top', to: 'context', in: 'bottom' },
      { from: 'research', out: 'top', to: 'context', in: 'bottom' }
    ]
  };
}
