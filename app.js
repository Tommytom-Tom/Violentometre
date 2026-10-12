"use strict";

(() => {
  const definitions = [
    { id: "respect", title: "1 · Respect", description: "Des repères pour une relation respectueuse." },
    { id: "vigilance", title: "2 · Vigilance", description: "Des repères pour identifier des situations préoccupantes." },
    { id: "danger", title: "3 · Danger", description: "Des repères pour les situations nécessitant de l’aide." },
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

  function refreshLabels(section) {
    section.querySelectorAll(".example").forEach((row, index) => {
      row.querySelector("label").textContent = `Exemple ${index + 1}`;
      row.querySelector("button").setAttribute("aria-label", `Supprimer l’exemple ${index + 1} de la zone ${section.dataset.title}`);
    });
  }

  function addExample(section, focus = true) {
    const row = element("div", "example");
    const label = element("label");
    const input = element("textarea");
    input.id = `example-${++nextId}`;
    input.name = input.id;
    input.maxLength = 2000;
    input.placeholder = "Saisissez votre exemple";
    input.autocomplete = "off";
    input.spellcheck = false;
    label.htmlFor = input.id;
    const remove = element("button", "remove-button", "Supprimer cet exemple");
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
      const section = element("section", `zone zone--${definition.id}`);
      section.dataset.zone = definition.id;
      section.dataset.title = definition.title;
      const heading = element("h2", "", definition.title);
      heading.id = `zone-${definition.id}`;
      section.setAttribute("aria-labelledby", heading.id);
      const description = element("p", "zone-description", definition.description);
      const examples = element("div", "examples");
      const add = element("button", "add-button", "Ajouter un exemple");
      add.type = "button";
      add.setAttribute("aria-label", `Ajouter un exemple à la zone ${definition.title}`);
      add.addEventListener("click", () => addExample(section));
      section.append(heading, description, examples, add);
      zones.append(section);
      for (let index = 0; index < 3; index++) addExample(section, false);
    }
  }

  function updatePreview() {
    document.querySelector("#preview-title").textContent = title.value.trim() || "Mon violentomètre";
    const container = document.querySelector("#preview-zones");
    container.replaceChildren();
    for (const definition of definitions) {
      const section = element("section", `zone zone--${definition.id}`);
      const heading = element("h3", "", definition.title);
      heading.id = `preview-${definition.id}`;
      section.setAttribute("aria-labelledby", heading.id);
      section.append(heading);
      const inputs = zones.querySelectorAll(`[data-zone="${definition.id}"] textarea`);
      for (const input of inputs) {
        const text = input.value.trim();
        section.append(element("p", text ? "preview-example" : "preview-example empty-example", text || "Exemple à compléter"));
      }
      if (!inputs.length) section.append(element("p", "preview-example empty-example", "Aucun exemple"));
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
