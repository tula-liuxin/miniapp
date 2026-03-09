function formatBarWidth(value, maxValue) {
  if (!maxValue) {
    return "0%";
  }
  const percent = Math.max(0, Math.min(100, Math.round((value / maxValue) * 100)));
  return `${percent}%`;
}

function formatDate(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function pick(value) {
  return Array.isArray(value) ? value : [];
}

function labelStage(stage) {
  const labels = {
    chemo: "化疗期",
    radiotherapy: "放疗期",
    rehabilitation: "康复期",
    perioperative: "围手术期"
  };
  return labels[stage] || stage;
}

module.exports = {
  formatBarWidth,
  labelStage,
  formatDate,
  pick
};
