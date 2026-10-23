"use strict";

(() => {
  // Propositions transcrites de 1792415164582.jpg, colonne gauche puis droite.
  const propositions = [
    "Accepter les amis et la famille.",
    "Avoir des avis différents mais les respecter, même si on n’est pas d’accord.",
    "Les décisions importantes sont prises ensemble.",
    "Ne pas prendre les choses personnellement quand notre partenaire nous fait une remarque.",
    "On peut avoir chacun nos activités de notre côté mais quand on veut en faire une ensemble on s’assure d’être tous les deux d’accord de la faire.",
    "Parfois, ignorer son partenaire.",
    "Rabaisser les avis de son partenaire.",
    "Dénigrer souvent de son partenaire en public ou en privé.",
    "Surveiller les conversations, l’argent, les sorties et la façon dont s’habille son partenaire.",
    "Ça peut arriver de frapper son partenaire avec un objet.",
    "Casser un mur, une porte, une tv quand on n’en peut plus.",
    "Contrôler les sorties, les amis.",
    "Toucher ou coucher avec son partenaire, quoi qu’il en dise.",
    "Envoyer un sms menaçant son partenaire de mort.",
    "Frapper son partenaire une seule fois ?",
    "Prendre en compte les avis et les désirs de chacun.",
    "Se faire confiance mutuellement mais aussi envers soi-même.",
    "Se sentir heureux et sentir son partenaire heureux et inversement.",
    "Dans les disputes, les mots dépassent les pensées (cris, dépréciation de l’autre).",
    "Douter de la sincérité de son partenaire, jusqu’à douter de sa fidélité.",
    "Être en couple c’est ne faire plus qu’un : on pense les mêmes choses, on fait tout ensemble, on ne se sépare jamais, c’est pour la vie.",
    "Intimidation ou un climat de terreur peut être une façon d’obtenir ce qu’on souhaite de notre partenaire (ex. « si tu sors sans moi je te quitte »).",
    "Isoler son partenaire pour ne l’avoir plus que pour soi.",
    "Menacer son partenaire de lui faire du mal ou aux gens qu’il aime.",
    "Ne plus avoir de limite dans sa violence.",
    "Péter un plomb pour un détail.",
    "Garder l’argent et les papiers de son partenaire.",
    "Refuser la rupture, jusqu’à penser à tuer son partenaire ou soi-même. Un couple ne se sépare pas. À la vie à la mort.",
    "Insulter son partenaire.",
  ];
  // Correction de 1792587430519.jpg. Indices du catalogue source, avant mélange.
  const correctionByText = new Map([
    ...[0, 1, 2, 3, 4, 15, 16, 17].map((id) => [propositions[id], "respect"]),
    ...[5, 6, 7, 8, 18, 19, 20, 21].map((id) => [propositions[id], "vigilance"]),
    ...[9, 10, 11, 12, 13, 14, 22, 23, 24, 25, 26, 27, 28].map((id) => [propositions[id], "danger"]),
  ]);
  const definitions = [
    { id: "respect", title: "1 · Relation égalitaire", advice: "PROFITE", prompt: "Ton environnement de travail\nest sain quand…" },
    { id: "vigilance", title: "2 · Relation à risque", advice: "C’EST ANORMAL, PARLES-EN", prompt: "Il y a de la violence quand…" },
    { id: "danger", title: "3 · Relation violente", advice: "PROTÈGE-TOI, DEMANDE DE L’AIDE", prompt: "Tu es en danger quand…" },
  ];
  const editor = document.querySelector("#editor");
  const title = document.querySelector("#document-title");
  const propositionText = document.querySelector("#example-text");
  const entryTitle = document.querySelector("#entry-title");
  const categoryOptions = document.querySelector("#category-options");
  const radios = [...editor.querySelectorAll('input[name="category"]')];
  const saveButton = document.querySelector("#save-example");
  const cancelButton = document.querySelector("#cancel-edit");
  const finishButton = document.querySelector("#finish-button");
  const preview = document.querySelector("#preview");
  const correctionButton = document.querySelector("#correction-button");
  const correctionDialog = document.querySelector("#correction-dialog");
  const correctionAccessForm = document.querySelector("#correction-access-form");
  const correctionCode = document.querySelector("#correction-code");
  const correctionCodeError = document.querySelector("#correction-code-error");
  const status = document.querySelector("#status");
  // Une entrée par indice du parcours mélangé, stable jusqu'au redémarrage.
  const answers = new Map();
  let sessionPropositions = [];
  let editingId = null;
  let pendingCategory = "";
  let correctionVisible = false;
  let classificationFinalized = false;

  function shuffledPropositions() {
    const shuffled = [...propositions];
    // Fisher–Yates : chaque proposition est conservée exactement une fois.
    for (let index = shuffled.length - 1; index > 0; index--) {
      const target = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
    }
    return shuffled;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function announce(message) {
    status.textContent = message;
  }

  function selectedCategory() {
    return radios.find((radio) => radio.checked)?.value || "";
  }

  function selectCategory(category) {
    radios.forEach((radio) => { radio.checked = radio.value === category; });
  }

  function showCurrentProposition() {
    const isEditing = editingId !== null;
    const complete = !isEditing && answers.size === propositions.length;
    const id = isEditing ? editingId : answers.size;
    entryTitle.textContent = complete ? "Classement terminé"
      : `${isEditing ? "Modifier la proposition" : "Proposition"} ${id + 1} / ${propositions.length}`;
    propositionText.textContent = complete
      ? classificationFinalized
        ? "Votre document est verrouillé. Cliquez sur « Réactiver la modification » et saisissez le code confidentiel pour modifier vos réponses sans masquer la correction. Vous pourrez ensuite la masquer en cliquant à nouveau sur ce bouton."
        : "Toutes les propositions sont classées. Vous pouvez encore revoir leurs catégories dans l’aperçu, puis cliquer sur « J'ai terminé. » pour verrouiller le document et afficher la correction."
      : sessionPropositions[id];
    finishButton.disabled = !complete || classificationFinalized;
    title.readOnly = classificationFinalized;
    categoryOptions.disabled = complete;
    document.querySelector("#classification-fields").hidden = complete;
    saveButton.disabled = complete;
    saveButton.textContent = isEditing ? "Enregistrer la modification" : "Valider la catégorie";
    cancelButton.hidden = !isEditing;
    selectCategory(isEditing ? answers.get(id) : pendingCategory);
    document.querySelector("#progress").textContent = `${answers.size} / ${propositions.length} propositions classées`;
    const progress = document.querySelector("#classification-progress");
    progress.max = propositions.length;
    progress.value = answers.size;
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

  function editExample(id) {
    if (classificationFinalized || editingId === id) return;
    if (editingId !== null && selectedCategory() !== answers.get(editingId)
      && !window.confirm("Abandonner la modification de catégorie en cours ?")) return;
    if (editingId === null) pendingCategory = selectedCategory();
    editingId = id;
    showCurrentProposition();
    entryTitle.focus();
    announce("Modifiez la catégorie de cette proposition, puis enregistrez. Votre progression est conservée.");
  }

  function editButton(id) {
    const label = `Modifier la catégorie de la proposition ${id + 1}`;
    const button = element("button", "icon-button edit-button");
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.title = label;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M4 20l4-1L20 7l-3-3L5 16l-1 4zM14 7l3 3");
    svg.append(path);
    button.append(svg);
    button.addEventListener("click", () => editExample(id));
    return button;
  }

  function correctionCodeRequired() {
    return classificationFinalized || !correctionVisible;
  }

  function setCorrectionVisible(visible) {
    correctionVisible = visible;
    correctionButton.setAttribute("aria-pressed", String(visible));
    correctionButton.setAttribute("aria-haspopup", correctionCodeRequired() ? "dialog" : "false");
    correctionButton.textContent = classificationFinalized ? "Réactiver la modification"
      : visible ? "Masquer la correction" : "Voir la correction";
    document.querySelector("#correction-legend").hidden = !visible;
  }

  function clearCorrectionCode() {
    correctionCode.value = "";
    correctionCode.removeAttribute("aria-invalid");
    correctionCodeError.textContent = "";
  }

  function closeCorrectionDialog() {
    clearCorrectionCode();
    if (correctionDialog.open) correctionDialog.close();
  }

  function markIncorrectAnswer(text, expectedCategory) {
    const definition = definitions.find((item) => item.id === expectedCategory);
    text.classList.add("preview-example--incorrect");
    text.replaceChildren(element("strong", "", text.textContent));
    const marker = element("span", `correction-marker correction-marker--${expectedCategory}`);
    const description = `Catégorie attendue : ${definition.title.slice(4)}`;
    marker.setAttribute("role", "img");
    marker.setAttribute("aria-label", description);
    marker.title = description;
    text.append(marker);
  }

  function updatePreview() {
    preview.classList.toggle("preview--locked", classificationFinalized);
    document.querySelector("#preview-title").textContent = title.value.trim() || "Mon violentomètre";
    document.querySelector("#document-progress").textContent = answers.size === propositions.length
      ? `Classement complet : ${answers.size} / ${propositions.length} propositions.`
      : `Classement incomplet : ${answers.size} / ${propositions.length} propositions. Les propositions non validées ne figurent pas dans ce document.`;
    const container = document.querySelector("#preview-zones");
    container.replaceChildren();
    for (const definition of definitions) {
      const section = createMeterZone(definition);
      const rows = section.querySelector(".meter-examples");
      const items = sessionPropositions.map((text, id) => ({ text, id }))
        .filter((item) => answers.get(item.id) === definition.id);
      items.forEach((example) => {
        const row = element("div", "meter-row");
        row.dataset.exampleId = String(example.id);
        row.dataset.category = definition.id;
        const text = element("p", "preview-example", example.text);
        const expectedCategory = correctionByText.get(example.text);
        if (correctionVisible && expectedCategory !== definition.id) {
          markIncorrectAnswer(text, expectedCategory);
        }
        row.append(text);
        if (!classificationFinalized) {
          const actions = element("div", "example-actions");
          actions.append(editButton(example.id));
          row.append(actions);
        }
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
    if (classificationFinalized) return;
    const category = selectedCategory();
    if (!definitions.some((definition) => definition.id === category)) {
      categoryOptions.reportValidity();
      return;
    }
    const wasEditing = editingId !== null;
    const id = wasEditing ? editingId : answers.size;
    if (id >= propositions.length) return;
    answers.set(id, category);
    editingId = null;
    if (!wasEditing) pendingCategory = "";
    showCurrentProposition();
    updatePreview();
    const button = wasEditing && preview.querySelector(`[data-example-id="${id}"] .edit-button`);
    (button || entryTitle).focus();
    announce(wasEditing ? "Catégorie modifiée. Vous pouvez reprendre le classement."
      : answers.size === propositions.length ? "Toutes les propositions sont classées."
        : `Catégorie enregistrée. Proposition suivante : ${answers.size + 1} sur ${propositions.length}.`);
  });
  title.addEventListener("input", updatePreview);
  cancelButton.addEventListener("click", () => {
    if (classificationFinalized || editingId === null) return;
    const id = editingId;
    editingId = null;
    showCurrentProposition();
    const button = preview.querySelector(`[data-example-id="${id}"] .edit-button`);
    (button || entryTitle).focus();
    announce("Modification annulée. La catégorie d’origine est conservée.");
  });
  finishButton.addEventListener("click", () => {
    if (classificationFinalized || editingId !== null || answers.size !== propositions.length) return;
    classificationFinalized = true;
    closeCorrectionDialog();
    setCorrectionVisible(true);
    showCurrentProposition();
    updatePreview();
    entryTitle.focus();
    announce("Classement finalisé : le document est verrouillé et la correction est affichée.");
  });
  correctionButton.addEventListener("click", () => {
    if (correctionCodeRequired()) {
      clearCorrectionCode();
      const action = classificationFinalized ? "Réactiver la modification" : "Afficher la correction";
      document.querySelector("#correction-dialog-title").textContent = classificationFinalized ? action : "Accéder à la correction";
      document.querySelector("#correction-code-help").textContent = `Saisissez le code confidentiel pour ${action.toLowerCase()}.`;
      correctionAccessForm.querySelector('button[type="submit"]').textContent = action;
      if (!correctionDialog.open) correctionDialog.showModal();
      correctionCode.focus();
      return;
    }
    setCorrectionVisible(!correctionVisible);
    updatePreview();
    announce(correctionVisible
      ? "Correction affichée : les erreurs sont en gras, le carré indique la catégorie attendue."
      : "Correction masquée. Vos réponses sont conservées.");
  });
  correctionAccessForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!correctionDialog.open) return;
    // Verrou d'interface local, pas une authentification sécurisée côté serveur.
    if (correctionCode.value !== "Corrige") {
      correctionCode.value = "";
      correctionCode.setAttribute("aria-invalid", "true");
      correctionCodeError.textContent = "Code incorrect. Réessayez ou annulez.";
      correctionCode.focus();
      return;
    }
    closeCorrectionDialog();
    if (classificationFinalized) {
      classificationFinalized = false;
      setCorrectionVisible(correctionVisible);
      showCurrentProposition();
      updatePreview();
      announce("Modification réactivée. La correction reste affichée. Vous pouvez maintenant modifier votre document ou masquer la correction.");
      return;
    }
    setCorrectionVisible(true);
    updatePreview();
    announce("Correction affichée : les erreurs sont en gras, le carré indique la catégorie attendue.");
  });
  correctionCode.addEventListener("input", () => {
    correctionCode.removeAttribute("aria-invalid");
    correctionCodeError.textContent = "";
  });
  document.querySelector("#cancel-correction-access").addEventListener("click", closeCorrectionDialog);
  correctionDialog.addEventListener("close", clearCorrectionCode);
  window.addEventListener("beforeprint", updatePreview);
  function resetResponses() {
    closeCorrectionDialog();
    sessionPropositions = shuffledPropositions();
    answers.clear();
    editingId = null;
    pendingCategory = "";
    classificationFinalized = false;
    setCorrectionVisible(false);
    title.value = "";
    showCurrentProposition();
    updatePreview();
  }

  document.querySelector("#reset-button").addEventListener("click", () => {
    if (!window.confirm("Recommencer le classement des propositions ? Toutes les catégories choisies et le titre seront effacés.")) return;
    resetResponses();
    entryTitle.focus();
    announce("Classement réinitialisé. Toutes les propositions sont à classer à nouveau.");
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
