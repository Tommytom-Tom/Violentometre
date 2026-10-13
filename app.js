"use strict";

(() => {
  const definitions = [
    { id: "respect", title: "1 · Respect", count: 6,
      advice: "PROFITE", prompt: "Ton environnement de travail\nest sain quand…", start: "#86bd4a", end: "#86bd4a" },
    { id: "vigilance", title: "2 · Vigilance", count: 12,
      advice: "C’EST ANORMAL, PARLES-EN", prompt: "Il y a de la violence quand…", start: "#f1b939", end: "#d63030" },
    { id: "danger", title: "3 · Danger", count: 9,
      advice: "PROTÈGE-TOI, DEMANDE DE L’AIDE", prompt: "Tu es en danger quand…", start: "#d62630", end: "#d62630" },
  ];
  const zones = document.querySelector("#zones");
  const editor = document.querySelector("#editor");
  const title = document.querySelector("#document-title");
  const preview = document.querySelector("#preview");
  const previewButton = document.querySelector("#preview-button");
  const status = document.querySelector("#status");
  let nextId = 0;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function announce(message) {
    status.textContent = message;
  }

  function createMeterZone(definition, view) {
    const section = element("section", `meter-zone meter-zone--${definition.id}`);
    const heading = element("h3", "sr-only", definition.title);
    heading.id = `${view}-${definition.id}`;
    section.setAttribute("aria-labelledby", heading.id);
    const advice = element("div", "meter-advice");
    advice.append(element("span", "", definition.advice));
    const prompt = element("div", "meter-prompt");
    prompt.append(element("span", "", definition.prompt));
    const examples = element("div", view === "editor" ? "meter-examples examples" : "meter-examples");
    section.append(heading, advice, prompt, examples);
    return section;
  }

  function colorRow(row, definition, index, count) {
    const colors = [definition.start, definition.end].map((hex) => hex.match(/[a-f\d]{2}/gi).map((value) => parseInt(value, 16)));
    const fraction = count > 1 ? index / (count - 1) : 0;
    const rgb = colors[0].map((value, channel) => Math.round(value + (colors[1][channel] - value) * fraction));
    row.style.backgroundColor = `rgb(${rgb.join(", ")})`;
    const linear = rgb.map((value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    row.style.color = luminance < 0.175 ? "#ffffff" : "#000000";
  }

  function refreshLabels(section) {
    const definition = definitions.find((item) => item.id === section.dataset.zone);
    const rows = section.querySelectorAll(".example");
    rows.forEach((row, index) => {
      row.querySelector("label").textContent = `Exemple ${index + 1}`;
      row.querySelector("button").setAttribute("aria-label", `Supprimer l’exemple ${index + 1} de la zone ${section.dataset.title}`);
      colorRow(row, definition, index, rows.length);
    });
  }

  function addExample(section, focus = true) {
    const row = element("div", "example");
    const label = element("label", "sr-only");
    const input = element("textarea");
    input.id = `example-${++nextId}`;
    input.name = input.id;
    input.maxLength = 2000;
    input.rows = 2;
    input.autocomplete = "off";
    input.spellcheck = false;
    label.htmlFor = input.id;
    const remove = element("button", "remove-button", "×");
    remove.title = "Supprimer cet exemple";
    remove.type = "button";
    remove.addEventListener("click", () => {
      const fallback = row.nextElementSibling?.querySelector("textarea")
        || row.previousElementSibling?.querySelector("textarea")
        || section.querySelector(".add-button");
      if (input.value.trim() && !window.confirm("Supprimer cet exemple ? Cette action est irréversible.")) return;
      row.remove();
      refreshLabels(section);
      updatePreview();
      fallback.focus();
      announce(`Exemple supprimé de la zone ${section.dataset.title}.`);
    });
    row.append(label, input, remove);
    section.querySelector(".examples").append(row);
    refreshLabels(section);
    if (focus) {
      updatePreview();
      input.focus();
      announce(`Exemple ajouté à la zone ${section.dataset.title}.`);
    }
  }

  function initializeZones() {
    zones.replaceChildren();
    for (const definition of definitions) {
      const section = createMeterZone(definition, "editor");
      section.dataset.zone = definition.id;
      section.dataset.title = definition.title;
      const add = element("button", "add-button", "Ajouter un exemple");
      add.type = "button";
      add.setAttribute("aria-label", `Ajouter un exemple à la zone ${definition.title}`);
      add.addEventListener("click", () => addExample(section));
      section.append(add);
      zones.append(section);
      for (let index = 0; index < definition.count; index++) addExample(section, false);
    }
  }

  function updatePreview() {
    const documentTitle = title.value.trim() || "Mon violentomètre";
    document.querySelector("#preview-title").textContent = documentTitle;
    document.querySelector("#editor-title").textContent = documentTitle;
    const container = document.querySelector("#preview-zones");
    container.replaceChildren();
    for (const definition of definitions) {
      const section = createMeterZone(definition, "preview");
      const examples = section.querySelector(".meter-examples");
      const inputs = zones.querySelectorAll(`[data-zone="${definition.id}"] textarea`);
      inputs.forEach((input, index) => {
        const text = input.value.trim();
        const row = element("p", text ? "preview-example" : "preview-example empty-example", text);
        colorRow(row, definition, index, inputs.length);
        if (!text) {
          row.setAttribute("role", "img");
          row.setAttribute("aria-label", `Case vierge : exemple ${index + 1} à compléter`);
        }
        examples.append(row);
      });
      if (!inputs.length) examples.append(element("p", "preview-example", "Aucun exemple"));
      container.append(section);
    }
  }

  editor.addEventListener("submit", (event) => event.preventDefault());
  editor.addEventListener("input", updatePreview);
  previewButton.addEventListener("click", () => {
    updatePreview();
    preview.hidden = !preview.hidden;
    previewButton.setAttribute("aria-expanded", String(!preview.hidden));
    previewButton.textContent = preview.hidden ? "Voir l’aperçu" : "Masquer l’aperçu";
    if (!preview.hidden) preview.focus();
  });
  document.querySelector("#print-button").addEventListener("click", () => {
    updatePreview();
    window.print();
  });
  window.addEventListener("beforeprint", updatePreview);
  document.querySelector("#reset-button").addEventListener("click", () => {
    if (!window.confirm("Effacer toutes vos réponses et rétablir les cases vierges ? Cette action est irréversible.")) return;
    title.value = "";
    initializeZones();
    updatePreview();
    title.focus();
    announce("Toutes les réponses ont été effacées. Les cases sont à nouveau vierges.");
  });

  // Neutraliser aussi une éventuelle restauration de formulaire par le navigateur.
  title.value = "";
  initializeZones();
  updatePreview();
  document.querySelector("#application").hidden = false;
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    title.value = "";
    initializeZones();
    updatePreview();
    announce("Les réponses ont été effacées après le retour sur la page.");
  });
})();
