(function () {
  const recipes = Array.isArray(window.RECIPES) ? window.RECIPES : [];
  const storageKey = "recipe-shelf-favorites";

  const elements = {
    heroStats: document.getElementById("hero-stats"),
    searchInput: document.getElementById("search-input"),
    clearFilters: document.getElementById("clear-filters"),
    randomPick: document.getElementById("random-pick"),
    favoritesOnly: document.getElementById("favorites-only"),
    sortSelect: document.getElementById("sort-select"),
    resultsTitle: document.getElementById("results-title"),
    resultMeta: document.getElementById("result-meta"),
    activeFilters: document.getElementById("active-filters"),
    grid: document.getElementById("recipe-grid"),
    emptyState: document.getElementById("empty-state"),
    categoryFilters: document.getElementById("category-filters"),
    sourceFilters: document.getElementById("source-filters"),
    collectionFilters: document.getElementById("collection-filters"),
    focusFilters: document.getElementById("focus-filters"),
    tagFilters: document.getElementById("tag-filters"),
    ingredientFilters: document.getElementById("ingredient-filters"),
    modal: document.getElementById("recipe-modal"),
    modalCategory: document.getElementById("modal-category"),
    modalTitle: document.getElementById("modal-title"),
    modalMeta: document.getElementById("modal-meta"),
    modalDescription: document.getElementById("modal-description"),
    modalTags: document.getElementById("modal-tags"),
    modalOpenLink: document.getElementById("modal-open-link"),
    modalFavorite: document.getElementById("modal-favorite"),
    modalFrame: document.getElementById("modal-frame"),
    closeModal: document.getElementById("close-modal"),
  };

  const state = {
    search: "",
    favoritesOnly: false,
    sort: "recommended",
    selectedRecipeKey: null,
    favorites: loadFavorites(),
    filters: {
      categories: new Set(),
      sources: new Set(),
      collections: new Set(),
      focus: new Set(),
      tags: new Set(),
      ingredients: new Set(),
    },
  };

  const filterGroups = [
    { key: "categories", element: elements.categoryFilters, accessor: (recipe) => recipe.categories },
    { key: "sources", element: elements.sourceFilters, accessor: (recipe) => [recipe.source] },
    { key: "collections", element: elements.collectionFilters, accessor: (recipe) => [recipe.collection] },
    { key: "focus", element: elements.focusFilters, accessor: (recipe) => [recipe.focus] },
    { key: "tags", element: elements.tagFilters, accessor: (recipe) => recipe.tags },
    { key: "ingredients", element: elements.ingredientFilters, accessor: (recipe) => recipe.ingredients },
  ];

  renderHero();
  renderFilterGroups();
  render();
  attachEvents();

  function loadFavorites() {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = JSON.parse(raw || "[]");
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  }

  function saveFavorites() {
    window.localStorage.setItem(storageKey, JSON.stringify([...state.favorites]));
  }

  function normalize(value) {
    return (value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function formatDate(isoDate) {
    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(isoDate));
  }

  function countBy(accessor, limit) {
    const counts = new Map();

    for (const recipe of recipes) {
      const values = accessor(recipe);
      for (const value of values) {
        counts.set(value, (counts.get(value) || 0) + 1);
      }
    }

    return [...counts.entries()]
      .sort((left, right) => {
        if (right[1] !== left[1]) {
          return right[1] - left[1];
        }

        return left[0].localeCompare(right[0]);
      })
      .slice(0, limit);
  }

  function renderHero() {
    const stats = [
      {
        value: recipes.length,
        label: "PDF recipes",
      },
      {
        value: new Set(recipes.map((recipe) => recipe.source)).size,
        label: "sources",
      },
      {
        value: countBy((recipe) => recipe.categories, 1)[0]?.[0] || "Mains",
        label: "most common lane",
      },
      {
        value: recipes.filter((recipe) => recipe.isHighProtein).length,
        label: "40g+ protein picks",
      },
    ];

    const popularSources = countBy((recipe) => [recipe.source], 3)
      .map(([label]) => label)
      .join(" / ");

    elements.heroStats.innerHTML = `
      <p class="eyebrow">At a glance</p>
      <h2>Built for scanning a big archive fast.</h2>
      <div class="hero-stats-grid">
        ${stats
          .map(
            (stat) => `
              <article class="stat-card">
                <strong>${escapeHtml(String(stat.value))}</strong>
                <span>${escapeHtml(stat.label)}</span>
              </article>
            `,
          )
          .join("")}
      </div>
      <p class="hero-text">Heavy hitters: ${escapeHtml(popularSources)}</p>
    `;
  }

  function renderFilterGroups() {
    for (const group of filterGroups) {
      const options = countBy(group.accessor, group.key === "ingredients" ? 18 : group.key === "tags" ? 8 : 14);
      const isMulti = true;

      group.element.innerHTML = options
        .map(([label, count]) => {
          const active = state.filters[group.key].has(label);
          return `
            <button
              class="filter-pill ${active ? "active" : ""}"
              type="button"
              data-filter-group="${group.key}"
              data-filter-value="${escapeAttribute(label)}"
              aria-pressed="${active}"
              data-multi="${isMulti}"
            >
              <span>${escapeHtml(label)}</span>
              <small>${count}</small>
            </button>
          `;
        })
        .join("");
    }
  }

  function attachEvents() {
    elements.searchInput.addEventListener("input", (event) => {
      state.search = event.target.value;
      render();
    });

    elements.clearFilters.addEventListener("click", () => {
      state.search = "";
      state.favoritesOnly = false;
      state.sort = "recommended";
      state.filters.categories.clear();
      state.filters.sources.clear();
      state.filters.collections.clear();
      state.filters.focus.clear();
      state.filters.tags.clear();
      state.filters.ingredients.clear();
      elements.searchInput.value = "";
      elements.favoritesOnly.checked = false;
      elements.sortSelect.value = "recommended";
      renderFilterGroups();
      render();
    });

    elements.randomPick.addEventListener("click", () => {
      const filtered = getFilteredRecipes();

      if (filtered.length === 0) {
        return;
      }

      const randomRecipe = filtered[Math.floor(Math.random() * filtered.length)];
      openRecipe(randomRecipe.key);
    });

    elements.favoritesOnly.addEventListener("change", (event) => {
      state.favoritesOnly = event.target.checked;
      render();
    });

    elements.sortSelect.addEventListener("change", (event) => {
      state.sort = event.target.value;
      render();
    });

    document.addEventListener("click", (event) => {
      const filterButton = event.target.closest("[data-filter-group]");

      if (filterButton) {
        const group = filterButton.getAttribute("data-filter-group");
        const value = filterButton.getAttribute("data-filter-value");
        const groupState = state.filters[group];

        if (groupState.has(value)) {
          groupState.delete(value);
        } else {
          groupState.add(value);
        }

        renderFilterGroups();
        render();
        return;
      }

      const card = event.target.closest("[data-recipe-key]");

      if (card && !event.target.closest("[data-favorite-button]")) {
        openRecipe(card.getAttribute("data-recipe-key"));
        return;
      }

      const favoriteButton = event.target.closest("[data-favorite-button]");

      if (favoriteButton) {
        toggleFavorite(favoriteButton.getAttribute("data-favorite-button"));
        return;
      }

      if (event.target.matches("[data-remove-filter]")) {
        const group = event.target.getAttribute("data-remove-filter");
        const value = event.target.getAttribute("data-remove-value");
        state.filters[group].delete(value);
        renderFilterGroups();
        render();
      }

      if (event.target.matches("[data-close-modal='true']")) {
        closeRecipe();
      }
    });

    elements.closeModal.addEventListener("click", closeRecipe);

    elements.modalFavorite.addEventListener("click", () => {
      if (state.selectedRecipeKey) {
        toggleFavorite(state.selectedRecipeKey);
        const recipe = recipes.find((entry) => entry.key === state.selectedRecipeKey);
        if (recipe) {
          updateModal(recipe);
        }
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !elements.modal.classList.contains("hidden")) {
        closeRecipe();
      }
    });
  }

  function getFilteredRecipes() {
    const search = normalize(state.search);

    return recipes.filter((recipe) => {
      if (state.favoritesOnly && !state.favorites.has(recipe.key)) {
        return false;
      }

      if (state.filters.categories.size > 0 && !recipe.categories.some((value) => state.filters.categories.has(value))) {
        return false;
      }

      if (state.filters.sources.size > 0 && !state.filters.sources.has(recipe.source)) {
        return false;
      }

      if (state.filters.collections.size > 0 && !state.filters.collections.has(recipe.collection)) {
        return false;
      }

      if (state.filters.focus.size > 0 && !state.filters.focus.has(recipe.focus)) {
        return false;
      }

      if (state.filters.tags.size > 0 && !recipe.tags.some((value) => state.filters.tags.has(value))) {
        return false;
      }

      if (state.filters.ingredients.size > 0 && !recipe.ingredients.some((value) => state.filters.ingredients.has(value))) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = normalize(
        [
          recipe.title,
          recipe.source,
          recipe.collection,
          recipe.cuisine,
          recipe.focus,
          recipe.tags.join(" "),
          recipe.proteinPerServingG ? `${recipe.proteinPerServingG}g protein` : "",
          recipe.primaryCategory,
          recipe.categories.join(" "),
          recipe.ingredients.join(" "),
        ].join(" "),
      );

      return haystack.includes(search);
    });
  }

  function sortRecipes(list) {
    const sorted = [...list];

    switch (state.sort) {
      case "az":
        sorted.sort((left, right) => left.sortTitle.localeCompare(right.sortTitle));
        break;
      case "recent":
        sorted.sort((left, right) => new Date(right.modifiedAt) - new Date(left.modifiedAt));
        break;
      case "size":
        sorted.sort((left, right) => right.fileSizeKb - left.fileSizeKb);
        break;
      default:
        sorted.sort((left, right) => {
          const favoriteBonus = Number(state.favorites.has(right.key)) - Number(state.favorites.has(left.key));
          if (favoriteBonus !== 0) {
            return favoriteBonus;
          }

          const scoreLeft = scoreRecipe(left);
          const scoreRight = scoreRecipe(right);
          if (scoreRight !== scoreLeft) {
            return scoreRight - scoreLeft;
          }

          return left.sortTitle.localeCompare(right.sortTitle);
        });
        break;
    }

    return sorted;
  }

  function scoreRecipe(recipe) {
    let score = 0;
    score += Math.min(recipe.categories.length, 3) * 4;
    score += Math.min(recipe.ingredients.length, 5) * 2;
    score += recipe.versions > 1 ? 3 : 0;
    score += recipe.collection !== "Open Shelf" ? 2 : 0;
    score += recipe.source !== "Personal Archive" ? 2 : 0;
    score += recipe.isHighProtein ? 6 : 0;
    return score;
  }

  function render() {
    const filtered = sortRecipes(getFilteredRecipes());

    renderActiveFilters();
    renderResultsMeta(filtered.length);
    renderGrid(filtered);
    syncSelectedRecipe(filtered);
  }

  function renderResultsMeta(count) {
    elements.resultsTitle.textContent = state.favoritesOnly ? "Favorite recipes" : "All recipes";
    elements.resultMeta.textContent = `${count} shown`;
  }

  function renderActiveFilters() {
    const chips = [];

    if (state.search.trim()) {
      chips.push(`
        <button class="chip active" type="button">
          Search: ${escapeHtml(state.search.trim())}
        </button>
      `);
    }

    for (const [group, values] of Object.entries(state.filters)) {
      for (const value of values) {
        chips.push(`
          <button
            class="chip active"
            type="button"
            data-remove-filter="${group}"
            data-remove-value="${escapeAttribute(value)}"
          >
            ${escapeHtml(value)}
          </button>
        `);
      }
    }

    if (state.favoritesOnly) {
      chips.push('<button class="chip active" type="button">Favorites</button>');
    }

    elements.activeFilters.innerHTML = chips.join("");
    elements.activeFilters.classList.toggle("hidden", chips.length === 0);
  }

  function renderGrid(list) {
    if (list.length === 0) {
      elements.grid.innerHTML = "";
      elements.emptyState.classList.remove("hidden");
      return;
    }

    elements.emptyState.classList.add("hidden");

    elements.grid.innerHTML = list
      .map((recipe) => {
        const favorite = state.favorites.has(recipe.key);
        const previewTags = [];

        if (recipe.proteinPerServingG) {
          previewTags.push({
            label: `${recipe.proteinPerServingG}g protein`,
            className: "protein",
          });
        }

        previewTags.push(
          { label: recipe.primaryCategory, className: "category" },
          { label: recipe.focus, className: "" },
          { label: recipe.cuisine, className: "" },
          ...recipe.ingredients.slice(0, 2).map((tag) => ({ label: tag, className: "" })),
        );

        return `
          <article class="card" data-recipe-key="${escapeAttribute(recipe.key)}" tabindex="0">
            <div class="card-top">
              <div>
                <p class="eyebrow">${escapeHtml(recipe.collection)}</p>
                <h3>${escapeHtml(recipe.title)}</h3>
              </div>
              <button
                class="favorite-button ${favorite ? "active" : ""}"
                type="button"
                data-favorite-button="${escapeAttribute(recipe.key)}"
                aria-label="${favorite ? "Remove favorite" : "Add favorite"}"
              >
                ${favorite ? "★" : "☆"}
              </button>
            </div>

            <p class="card-subtitle">
              ${escapeHtml(recipe.source)} · ${escapeHtml(recipe.cuisine)} · ${escapeHtml(formatDate(recipe.modifiedAt))}
            </p>

            <div class="card-tags">
              ${previewTags
                .filter((tag) => tag.label)
                .slice(0, 5)
                .map(
                  (tag) => `
                    <span class="tag ${tag.className}">${escapeHtml(tag.label)}</span>
                  `,
                )
                .join("")}
            </div>

            <div class="card-footer">
              <div class="meta-stack">
                <span>${escapeHtml(recipe.relativePath)}</span>
                <span>${recipe.fileSizeKb} KB${recipe.versions > 1 ? ` · ${recipe.versions} versions` : ""}</span>
              </div>
              <span class="button button-ghost">Preview</span>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function openRecipe(recipeKey) {
    const recipe = recipes.find((entry) => entry.key === recipeKey);
    if (!recipe) {
      return;
    }

    state.selectedRecipeKey = recipeKey;
    updateModal(recipe);
    elements.modal.classList.remove("hidden");
    elements.modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeRecipe() {
    state.selectedRecipeKey = null;
    elements.modal.classList.add("hidden");
    elements.modal.setAttribute("aria-hidden", "true");
    elements.modalFrame.src = "about:blank";
    document.body.style.overflow = "";
  }

  function updateModal(recipe) {
    const favorite = state.favorites.has(recipe.key);

    elements.modalCategory.textContent = recipe.primaryCategory;
    elements.modalTitle.textContent = recipe.title;
    elements.modalMeta.innerHTML = `
      <span class="tag category">${escapeHtml(recipe.source)}</span>
      <span class="tag">${escapeHtml(recipe.collection)}</span>
      <span class="tag">${escapeHtml(recipe.cuisine)}</span>
      ${recipe.proteinPerServingG ? `<span class="tag protein">${recipe.proteinPerServingG}g protein</span>` : ""}
      <span class="tag">${recipe.fileSizeKb} KB</span>
    `;
    elements.modalDescription.textContent = [
      recipe.sourceDetail,
      recipe.proteinPerServingG ? `Protein: ${recipe.proteinPerServingG}g per serving.` : null,
      `Focus: ${recipe.focus}.`,
      `Last updated ${formatDate(recipe.modifiedAt)}.`,
    ]
      .filter(Boolean)
      .join(" ");
    elements.modalTags.innerHTML = recipe.tags
      .concat(recipe.categories)
      .concat(recipe.ingredients)
      .slice(0, 8)
      .map((tag, index) => {
        const className = tag === "40g+ Protein" ? "protein" : index === 0 ? "category" : "";
        return `<span class="tag ${className}">${escapeHtml(tag)}</span>`;
      })
      .join("");
    elements.modalOpenLink.href = recipe.href;
    elements.modalFavorite.textContent = favorite ? "Remove favorite" : "Add to favorites";
    elements.modalFrame.src = recipe.href;
  }

  function toggleFavorite(recipeKey) {
    if (state.favorites.has(recipeKey)) {
      state.favorites.delete(recipeKey);
    } else {
      state.favorites.add(recipeKey);
    }

    saveFavorites();
    render();
  }

  function syncSelectedRecipe(list) {
    if (!state.selectedRecipeKey) {
      return;
    }

    const selected = list.find((recipe) => recipe.key === state.selectedRecipeKey)
      || recipes.find((recipe) => recipe.key === state.selectedRecipeKey);

    if (selected) {
      updateModal(selected);
      return;
    }

    closeRecipe();
  }

  function escapeHtml(value) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }
})();
