const TIMEZONE = "Europe/Madrid";
const DAY_MS = 24 * 60 * 60 * 1000;

const params = new URLSearchParams(window.location.search);

const settings = {
  theme: params.get("theme") || "dark",
  mode: params.get("mode") || "full",
  lang: params.get("lang") || "es",
  seasonStart: params.get("seasonStart") || "2025-09-01",
  seasonEnd: params.get("seasonEnd") || "2026-08-31",
  seasonLabel: params.get("seasonLabel") || "2025/26"
};

document.documentElement.dataset.theme = settings.theme;
document.documentElement.dataset.mode = settings.mode;
document.documentElement.lang = settings.lang;

const copy = {
  es: {
    season: `TEMPORADA ${settings.seasonLabel}`,
    month: "MES",
    week: "SEMANA",
    day: "DÍA",
    footer: "ES PENINSULAR"
  },
  en: {
    season: `SEASON ${settings.seasonLabel}`,
    month: "MONTH",
    week: "WEEK",
    day: "DAY",
    footer: "MAINLAND SPAIN"
  }
};

const text = copy[settings.lang] || copy.es;

const elements = {
  labels: {
    season: document.getElementById("label-season"),
    month: document.getElementById("label-month"),
    week: document.getElementById("label-week"),
    day: document.getElementById("label-day")
  },
  values: {
    season: document.getElementById("value-season"),
    month: document.getElementById("value-month"),
    week: document.getElementById("value-week"),
    day: document.getElementById("value-day")
  },
  bars: {
    season: document.getElementById("bar-season"),
    month: document.getElementById("bar-month"),
    week: document.getElementById("bar-week"),
    day: document.getElementById("bar-day")
  },
  localTime: document.getElementById("local-time"),
  seasonWindow: document.getElementById("season-window")
};

elements.labels.season.textContent = text.season;
elements.labels.month.textContent = text.month;
elements.labels.week.textContent = text.week;
elements.labels.day.textContent = text.day;
elements.seasonWindow.textContent = text.footer;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function parseISODate(value) {
  const [year, month, day] = value.split("-").map(Number);

  return {
    year,
    month,
    day
  };
}

function toPseudoMadridMs(parts) {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour || 0,
    parts.minute || 0,
    parts.second || 0
  );
}

function getMadridParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });

  const parts = formatter.formatToParts(date);
  const get = (type) => Number(parts.find((part) => part.type === type).value);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second")
  };
}

function progressBetween(nowMs, startMs, endMs) {
  if (endMs <= startMs) return 0;

  const progress = ((nowMs - startMs) / (endMs - startMs)) * 100;

  return clamp(progress, 0, 100);
}

function getMonthProgress(parts) {
  const nowMs = toPseudoMadridMs(parts);

  const startMs = Date.UTC(parts.year, parts.month - 1, 1);
  const endMs = Date.UTC(parts.year, parts.month, 1);

  return progressBetween(nowMs, startMs, endMs);
}

function getWeekProgress(parts) {
  const currentDateMs = Date.UTC(parts.year, parts.month - 1, parts.day);
  const currentDate = new Date(currentDateMs);

  const dayOfWeek = currentDate.getUTCDay();
  const mondayOffset = (dayOfWeek + 6) % 7;

  const weekStartMs = currentDateMs - mondayOffset * DAY_MS;
  const nowMs = toPseudoMadridMs(parts);
  const weekEndMs = weekStartMs + 7 * DAY_MS;

  return progressBetween(nowMs, weekStartMs, weekEndMs);
}

function getDayProgress(parts) {
  const elapsedSeconds =
    parts.hour * 3600 +
    parts.minute * 60 +
    parts.second;

  return (elapsedSeconds / 86400) * 100;
}

function getSeasonProgress(parts) {
  const seasonStart = parseISODate(settings.seasonStart);
  const seasonEnd = parseISODate(settings.seasonEnd);

  const nowMs = toPseudoMadridMs(parts);
  const startMs = toPseudoMadridMs(seasonStart);

  /*
    seasonEnd se interpreta como último día incluido.
    Ejemplo:
    seasonStart=2025-09-01
    seasonEnd=2026-08-31
    La barra llega al 100% al empezar el 2026-09-01.
  */
  const endMs = toPseudoMadridMs(seasonEnd) + DAY_MS;

  return progressBetween(nowMs, startMs, endMs);
}

function setProgress(key, percentage) {
  const rounded = Math.round(percentage);
  const safeValue = clamp(percentage, 0, 100);

  elements.values[key].textContent = `${rounded}%`;
  elements.bars[key].style.width = `${safeValue}%`;
}

function formatMadridTime(date = new Date()) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).format(date);
}

function updateWidget() {
  const now = new Date();
  const madridParts = getMadridParts(now);

  setProgress("season", getSeasonProgress(madridParts));
  setProgress("month", getMonthProgress(madridParts));
  setProgress("week", getWeekProgress(madridParts));
  setProgress("day", getDayProgress(madridParts));

  elements.localTime.textContent = formatMadridTime(now);
}

updateWidget();
setInterval(updateWidget, 1000);
