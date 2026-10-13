"use strict";

(() => {
  const definitions = [
    { id: "respect", title: "1 · Respect", advice: "PROFITE", prompt: "Ton environnement de travail\nest sain quand…" },
    { id: "vigilance", title: "2 · Vigilance", advice: "C’EST ANORMAL, PARLES-EN", prompt: "Il y a de la violence quand…" },
    { id: "danger", title: "3 · Danger", advice: "PROTÈGE-TOI, DEMANDE DE L’AIDE", prompt: "Tu es en danger quand…" },
  ];
  const palette = [
    { position: 0, rgb: [198, 233, 152] },
    { position: 25, rgb: [134, 189, 74] },
    { position: 40, rgb: [241, 185, 57] },
    { position: 60, rgb: [231, 126, 54] },
    { position: 80, rgb: [214, 38, 48] },
    { position: 100, rgb: [120, 12, 24] },
  ];
  const editor = document.querySelector("#editor");
  const title = document.querySelector("#document-title");
  const input = document.querySelector("#example-text");
  const slider = document.querySelector("#example-position");
  const saveButton = document.querySelector("#save-example");
  const cancelButton = document.querySelector("#cancel-edit");
  const preview = document.querySelector("#preview");
  const previewButton = document.querySelector("#preview-button");
  const status = document.querySelector("#status");
  let examples = [];
  let editingId = null;
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

  function zoneFor(position) {
    return definitions[position < 30 ? 0 : position < 70 ? 1 : 2];
  }

  function colorFor(position) {
    const upper = palette.findIndex((stop) => stop.position >= position);
    if (upper === 0) return palette[0].rgb;
    const start = palette[upper - 1];
    const end = palette[upper];
    const fraction = (position - start.position) / (end.position - start.position);
    return start.rgb.map((channel, index) => Math.round(channel + (end.rgb[index] - channel) * fraction));
  }

  function updateSelection() {
    const position = Number(slider.value);
    const description = `Position ${position} / 100 · ${zoneFor(position).advice}`;
    slider.setAttribute("aria-valuetext", description);
    document.querySelector("#position-output").textContent = description;
    document.querySelector("#selected-color").style.backgroundColor = `rgb(${colorFor(position).join(", ")})`;
  }

  function createMeterZone(definition) {
    const section = element("section", `meter-zone meter-zone--${definition.id}`);
    const heading = element("h3", "sr-only", definition.title);
    heading.id = `preview-${definition.id}`;
    section.setAttribute("aria-labelledby", heading.id);
    const advice = element("div", "meter-advice");
    advice.append(element("span", "", definition.advice));
    const prompt = element("div", "meter-prompt");
    prompt.append(element("span", "", definition.prompt));
    section.append(heading, advice, prompt, element("div", "meter-examples"));
    return section;
  }

  function colorRow(row, position) {
    const rgb = colorFor(position);
    row.style.backgroundColor = `rgb(${rgb.join(", ")})`;
    const linear = rgb.map((value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    row.style.color = luminance < 0.175 ? "#ffffff" : "#000000";
  }

  function clearDraft() {
    editingId = null;
    input.value = "";
    input.setCustomValidity("");
    slider.value = "0";
    saveButton.textContent = "Ajouter au violentomètre";
    document.querySelector("#entry-title").textContent = "Ajouter un exemple";
    cancelButton.hidden = true;
    updateSelection();
  }

  function setPreviewVisible(visible) {
    preview.hidden = !visible;
    previewButton.setAttribute("aria-expanded", String(visible));
    previewButton.textContent = visible ? "Masquer l’aperçu" : "Voir l’aperçu";
  }

  function editExample(example) {
    if (input.value.trim() && editingId !== example.id
      && !window.confirm("Remplacer l’exemple en cours de saisie ? Les modifications non enregistrées seront perdues.")) return;
    editingId = example.id;
    input.value = example.text;
    input.setCustomValidity("");
    slider.value = String(example.position);
    saveButton.textContent = "Enregistrer la modification";
    document.querySelector("#entry-title").textContent = "Modifier un exemple";
    cancelButton.hidden = false;
    updateSelection();
    input.focus();
    announce("Exemple chargé dans le formulaire. Modifiez le texte ou la couleur, puis enregistrez.");
  }

  function deleteExample(example) {
    if (!window.confirm("Supprimer cet exemple ? Cette action est irréversible.")) return;
    const ordered = sortedExamples();
    const index = ordered.findIndex((item) => item.id === example.id);
    const fallback = ordered[index + 1] || ordered[index - 1];
    examples = examples.filter((item) => item.id !== example.id);
    if (editingId === example.id) clearDraft();
    updatePreview();
    const target = fallback && preview.querySelector(`[data-example-id="${fallback.id}"] .edit-button`);
    (target || input).focus();
    announce("Exemple supprimé.");
  }

  function iconButton(kind, label, onClick) {
    const button = element("button", `icon-button ${kind}-button`);
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.title = label;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", kind === "edit"
      ? "M4 20l4-1L20 7l-3-3L5 16l-1 4zM14 7l3 3"
      : "M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7");
    svg.append(path);
    button.append(svg);
    button.addEventListener("click", onClick);
    return button;
  }

  function sortedExamples() {
    return [...examples].sort((a, b) => a.position - b.position || a.id - b.id);
  }

  function updatePreview() {
    const documentTitle = title.value.trim() || "Mon violentomètre";
    document.querySelector("#preview-title").textContent = documentTitle;
    const container = document.querySelector("#preview-zones");
    container.replaceChildren();
    const ordered = sortedExamples();
    for (const definition of definitions) {
      const section = createMeterZone(definition);
      const rows = section.querySelector(".meter-examples");
      const items = ordered.filter((item) => zoneFor(item.position).id === definition.id);
      items.forEach((example) => {
        const number = ordered.findIndex((item) => item.id === example.id) + 1;
        const row = element("div", "meter-row");
        row.dataset.exampleId = String(example.id);
        row.dataset.position = String(example.position);
        const text = element("p", "preview-example", example.text);
        colorRow(text, example.position);
        const actions = element("div", "example-actions");
        actions.append(
          iconButton("edit", `Modifier l’exemple ${number}`, () => editExample(example)),
          iconButton("delete", `Supprimer l’exemple ${number}`, () => deleteExample(example)),
        );
        row.append(text, actions);
        rows.append(row);
      });
      if (!items.length) {
        const placeholder = element("div", "meter-row");
        placeholder.append(element("p", "meter-placeholder", "Aucun exemple classé dans cette rubrique."));
        rows.append(placeholder);
      }
      container.append(section);
    }
  }

  editor.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
      input.setCustomValidity("Saisissez un exemple, pas seulement des espaces.");
      input.reportValidity();
      return;
    }
    const position = Number(slider.value);
    const wasEditing = editingId !== null;
    if (wasEditing) {
      examples = examples.map((example) => example.id === editingId ? { ...example, text, position } : example);
    } else {
      examples.push({ id: ++nextId, text, position });
    }
    clearDraft();
    updatePreview();
    setPreviewVisible(true);
    input.focus();
    announce(wasEditing ? "Exemple modifié et reclassé." : "Exemple ajouté au violentomètre.");
  });
  input.addEventListener("input", () => input.setCustomValidity(""));
  slider.addEventListener("input", updateSelection);
  title.addEventListener("input", updatePreview);
  cancelButton.addEventListener("click", () => {
    const id = editingId;
    clearDraft();
    const button = preview.querySelector(`[data-example-id="${id}"] .edit-button`);
    (preview.hidden ? input : button || input).focus();
    announce("Modification annulée. L’exemple original est conservé.");
  });
  previewButton.addEventListener("click", () => {
    updatePreview();
    setPreviewVisible(preview.hidden);
    if (!preview.hidden) preview.focus();
  });
  document.querySelector("#print-button").addEventListener("click", () => {
    updatePreview();
    window.print();
  });
  window.addEventListener("beforeprint", updatePreview);
  function resetResponses() {
    examples = [];
    nextId = 0;
    title.value = "";
    clearDraft();
    updatePreview();
    setPreviewVisible(true);
  }

  document.querySelector("#reset-button").addEventListener("click", () => {
    if (!window.confirm("Effacer tous les exemples et la saisie en cours ? Cette action est irréversible.")) return;
    resetResponses();
    title.focus();
    announce("Toutes les réponses ont été effacées.");
  });

  // Neutraliser aussi une éventuelle restauration de formulaire par le navigateur.
  resetResponses();
  document.querySelector("#application").hidden = false;
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    resetResponses();
    announce("Les réponses ont été effacées après le retour sur la page.");
  });
})();
