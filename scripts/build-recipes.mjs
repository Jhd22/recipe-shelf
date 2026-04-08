import { promises as fs } from "node:fs";
import path from "node:path";
import { proteinOverrides } from "./recipe-overrides.mjs";

const rootDir = process.cwd();
const outputFile = path.join(rootDir, "recipes-data.js");

const ignoreDirs = new Set([
  ".git",
  ".DS_Store",
  "node_modules",
  "scripts",
]);

const sourceAliases = new Map([
  ["america's test kitchen", "America's Test Kitchen"],
  ["americas test kitchen", "America's Test Kitchen"],
  ["cook's illustrated", "Cook's Illustrated"],
  ["cooks illustrated", "Cook's Illustrated"],
  ["cook's country", "Cook's Country"],
  ["cooks country", "Cook's Country"],
  ["bon appetit", "Bon Appetit"],
  ["bon appetit", "Bon Appetit"],
  ["mob", "Mob"],
  ["molly baz", "Molly Baz"],
  ["nigella lawson", "Nigella Lawson"],
  ["serious eats", "Serious Eats"],
  ["jesse jenkins", "Jesse Jenkins"],
  ["kitchen studio", "Kitchen Studio"],
]);

const collectionAliases = new Map([
  ["", "Open Shelf"],
  ["adip", "ADIP"],
  ["mob", "Mob"],
  ["the club-kopi", "The Club"],
  ["bon app\u0065\u0301tit", "Bon Appetit"],
]);

const categoryRules = [
  {
    label: "Dessert",
    patterns: [
      "cake",
      "cookie",
      "cookies",
      "brownie",
      "brownies",
      "bar",
      "bars",
      "tiramisu",
      "galette",
      "pie",
      "tart",
      "clafouti",
      "cheesecake",
      "ice cream",
      "pudding",
      "meringue",
      "shortbread",
      "biscotti",
      "financier",
      "financiers",
      "muffin",
      "muffins",
      "sticky buns",
      "granola",
      "fudge sauce",
    ],
  },
  {
    label: "Drinks",
    patterns: ["martini", "negroni", "cocktail", "kombucha"],
  },
  {
    label: "Sauces & Condiments",
    patterns: [
      "sauce",
      "salsa",
      "aioli",
      "pesto",
      "harissa",
      "hot sauce",
      "mustard",
      "confit",
      "pickled",
      "dressing",
      "romesco",
      "guacamole",
      "tapenade",
      "za'atar",
      "zaatar",
      "salt",
      "broth base",
      "ricotta cheese",
      "butter",
      "hummus",
      "muhummara",
      "muhammara",
      "garlic confit",
      "starter",
    ],
  },
  {
    label: "Baking & Bread",
    patterns: [
      "bread",
      "naan",
      "biscuit",
      "biscuits",
      "pizza",
      "focaccia",
      "bagel",
      "bagels",
      "dough",
      "scone",
      "scones",
      "pita",
      "tortilla",
      "pie crust",
      "starter",
      "pancake",
      "pancakes",
      "crepe",
      "crepes",
    ],
  },
  {
    label: "Breakfast & Eggs",
    patterns: [
      "egg",
      "eggs",
      "frittata",
      "shakshuka",
      "huevos",
      "sandwich",
      "hash browns",
      "roesti",
      "bokkeumbap",
    ],
  },
  {
    label: "Soups & Stews",
    patterns: [
      "soup",
      "stew",
      "chowder",
      "gazpacho",
      "harira",
      "broth",
      "tagine",
      "ramen",
      "maeuntang",
      "minestrone",
    ],
  },
  {
    label: "Salads & Vegetables",
    patterns: [
      "salad",
      "greens",
      "cabbage",
      "broccoli",
      "cauliflower",
      "eggplant",
      "aubergine",
      "asparagus",
      "beet",
      "fennel",
      "radish",
      "ratatouille",
      "zucchini",
      "squash",
      "tomato",
      "zaalouk",
      "palak",
      "palabok",
    ],
  },
  {
    label: "Pasta & Noodles",
    patterns: [
      "pasta",
      "noodle",
      "noodles",
      "fettuccine",
      "penne",
      "gnocchi",
      "lasagna",
      "lasagne",
      "ragu",
      "alfredo",
      "arrabbiata",
      "carbonara",
      "alla norma",
      "tagliolini",
      "udon",
      "ravioli",
      "couscous",
      "semolina",
    ],
  },
  {
    label: "Rice & Grains",
    patterns: [
      "rice",
      "risotto",
      "farrotto",
      "farro",
      "quinoa",
      "barley",
      "bulgur",
      "polenta",
      "basmati",
      "pilaf",
      "koshari",
      "biryani",
    ],
  },
  {
    label: "Beans & Legumes",
    patterns: [
      "bean",
      "beans",
      "lentil",
      "lentils",
      "chickpea",
      "chickpeas",
      "dal",
      "falafel",
      "ceci",
      "hummus",
      "moros y cristianos",
      "palak dal",
    ],
  },
  {
    label: "Seafood",
    patterns: [
      "fish",
      "salmon",
      "cod",
      "trout",
      "tuna",
      "scallop",
      "scallops",
      "shrimp",
      "crab",
      "lobster",
      "clam",
      "sole",
      "snapper",
      "ceviche",
      "gravlax",
      "roe",
    ],
  },
];

const focusRules = [
  { label: "Sweet", patterns: ["cake", "pie", "cookie", "brownie", "dessert", "pudding", "tart", "ice cream"] },
  { label: "Seafood", patterns: ["fish", "salmon", "cod", "trout", "tuna", "scallop", "shrimp", "crab", "lobster", "clam", "sole", "snapper", "roe"] },
  { label: "Beans", patterns: ["bean", "beans", "lentil", "lentils", "chickpea", "chickpeas", "dal", "falafel"] },
  { label: "Tofu", patterns: ["tofu"] },
  { label: "Eggs", patterns: ["egg", "eggs", "frittata", "shakshuka", "huevos"] },
  { label: "Vegetables", patterns: ["eggplant", "aubergine", "broccoli", "cauliflower", "cabbage", "beet", "fennel", "greens", "tomato", "mushroom", "squash"] },
  { label: "Bread", patterns: ["bread", "pizza", "naan", "focaccia", "bagel", "pita", "tortilla"] },
];

const cuisineRules = [
  { label: "Italian", patterns: ["pasta", "gnocchi", "alfredo", "arrabbiata", "alla norma", "vodka", "carbonara", "ragu", "risotto", "focaccia", "pizza", "pesto", "polenta"] },
  { label: "Indian", patterns: ["dal", "biryani", "masala", "paneer", "palak", "basmati", "tikka", "harira"] },
  { label: "Mexican", patterns: ["taco", "tortilla", "enchilada", "esquites", "guacamole", "jalapeno", "jalapeno\u0303", "rancheros", "chipotle", "cotija", "salsa"] },
  { label: "Korean", patterns: ["kimchi", "gochujang", "bokkeumbap", "pajeon", "maeuntang"] },
  { label: "Japanese", patterns: ["miso", "ponzu", "chawanmushi", "udon", "sushi"] },
  { label: "Chinese", patterns: ["mapo", "cantonese", "xihongshi", "potsticker", "dumpling", "wonton", "scallion pancake"] },
  { label: "Thai", patterns: ["thai", "fish curry", "coconut rice"] },
  { label: "Middle Eastern", patterns: ["harissa", "zaalouk", "falafel", "tahini", "hummus", "pita", "shakshuka", "muhummara", "zaatar", "za'atar"] },
  { label: "Mediterranean", patterns: ["halloumi", "feta", "spanakopita", "romesco", "fennel", "olive", "couscous", "tabbouleh"] },
  { label: "French", patterns: ["clafouti", "suzette", "galette", "meunie", "tarte tatin", "financier"] },
];

const ingredientRules = [
  { label: "Salmon", patterns: ["salmon", "gravlax"] },
  { label: "Cod", patterns: ["cod"] },
  { label: "Tofu", patterns: ["tofu"] },
  { label: "Chickpeas", patterns: ["chickpea", "chickpeas", "garbanzos", "hummus", "falafel"] },
  { label: "Beans", patterns: ["bean", "beans"] },
  { label: "Lentils", patterns: ["lentil", "lentils", "dal"] },
  { label: "Mushrooms", patterns: ["mushroom", "shiitake"] },
  { label: "Eggplant", patterns: ["eggplant", "aubergine"] },
  { label: "Cauliflower", patterns: ["cauliflower"] },
  { label: "Broccoli", patterns: ["broccoli"] },
  { label: "Cabbage", patterns: ["cabbage"] },
  { label: "Tomato", patterns: ["tomato", "tomatoes", "gazpacho"] },
  { label: "Fish", patterns: ["fish", "trout", "tuna", "sole", "snapper"] },
  { label: "Scallops", patterns: ["scallop", "scallops"] },
  { label: "Shrimp", patterns: ["shrimp"] },
  { label: "Crab", patterns: ["crab"] },
  { label: "Lobster", patterns: ["lobster"] },
  { label: "Eggs", patterns: ["egg", "eggs", "frittata", "shakshuka", "huevos"] },
  { label: "Halloumi", patterns: ["halloumi"] },
  { label: "Rice", patterns: ["rice", "biryani"] },
  { label: "Pasta", patterns: ["pasta", "penne", "fettuccine", "gnocchi", "lasagna", "alfredo", "carbonara", "udon", "ravioli"] },
  { label: "Bread", patterns: ["bread", "pita", "naan", "pizza", "focaccia", "bagel", "biscuit"] },
  { label: "Chocolate", patterns: ["chocolate", "cocoa", "brownie"] },
  { label: "Fruit", patterns: ["apple", "apricot", "lemon", "strawberry", "rhubarb", "watermelon", "cherry", "pear"] },
];

function normalize(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function titleFromFileName(fileName) {
  const withoutExt = fileName.replace(/\.pdf$/i, "");
  const pipeSegments = withoutExt.split("|").map((segment) => segment.trim()).filter(Boolean);
  const firstSegment = pipeSegments[0] ?? withoutExt;

  return firstSegment
    .replace(/\s+-\s+by\s+.+$/i, "")
    .replace(/\s*[-_]\s*(copy|kopi)$/i, "")
    .replace(/\s+recipe$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferSource(fileName, folders) {
  const withoutExt = fileName.replace(/\.pdf$/i, "");
  const pipeSegments = withoutExt.split("|").map((segment) => segment.trim()).filter(Boolean);
  const trailingSegments = pipeSegments.slice(1);
  const detail = trailingSegments.join(" / ");
  const sourceCandidate = trailingSegments.at(-1) ?? folders.at(-1) ?? "";
  const normalizedSource = normalize(sourceCandidate);

  if (sourceAliases.has(normalizedSource)) {
    return {
      source: sourceAliases.get(normalizedSource),
      sourceDetail: detail || sourceAliases.get(normalizedSource),
    };
  }

  if (folders.length > 0) {
    const folderSource = collectionAliases.get(normalize(folders[0])) ?? folders[0];
    return {
      source: folderSource,
      sourceDetail: detail || folderSource,
    };
  }

  return {
    source: "Personal Archive",
    sourceDetail: detail || "Personal Archive",
  };
}

function inferCollection(folders) {
  const topFolder = folders[0] ?? "";
  return collectionAliases.get(normalize(topFolder)) ?? (topFolder || "Open Shelf");
}

function matchRules(target, rules) {
  const matched = [];

  for (const rule of rules) {
    if (rule.patterns.some((pattern) => target.includes(normalize(pattern)))) {
      matched.push(rule.label);
    }
  }

  return matched;
}

function buildHref(relativePath) {
  return relativePath
    .split(path.sep)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function toIsoDate(timestamp) {
  return new Date(timestamp).toISOString();
}

function resolveProteinOverride(normalizedTitle) {
  return proteinOverrides.find((override) => normalizedTitle.includes(normalize(override.match))) ?? null;
}

async function walkRecipes(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    if (ignoreDirs.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      results.push(...(await walkRecipes(absolutePath)));
      continue;
    }

    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".pdf")) {
      continue;
    }

    const relativePath = path.relative(rootDir, absolutePath);
    const folderParts = path.dirname(relativePath) === "."
      ? []
      : path.dirname(relativePath).split(path.sep).filter(Boolean);
    const stats = await fs.stat(absolutePath);
    const title = titleFromFileName(entry.name);
    const normalizedTitle = normalize(`${title} ${folderParts.join(" ")}`);
    const sourceMeta = inferSource(entry.name, folderParts);
    const categories = matchRules(normalizedTitle, categoryRules);
    const focus = matchRules(normalizedTitle, focusRules)[0] ?? "Mixed";
    const cuisine = matchRules(normalizedTitle, cuisineRules)[0] ?? "Global";
    const ingredients = matchRules(normalizedTitle, ingredientRules).slice(0, 5);
    const proteinOverride = resolveProteinOverride(normalizedTitle);
    const proteinPerServingG = proteinOverride?.proteinPerServingG ?? null;
    const tags = proteinPerServingG >= 40 ? ["40g+ Protein"] : [];

    results.push({
      title,
      relativePath: relativePath.split(path.sep).join("/"),
      href: buildHref(relativePath),
      collection: inferCollection(folderParts),
      source: sourceMeta.source,
      sourceDetail: sourceMeta.sourceDetail,
      categories: categories.length > 0 ? categories : ["Mains"],
      primaryCategory: categories[0] ?? "Mains",
      focus,
      cuisine,
      ingredients,
      tags,
      isHighProtein: proteinPerServingG >= 40,
      proteinPerServingG,
      fileSizeKb: Math.round(stats.size / 1024),
      modifiedAt: toIsoDate(stats.mtimeMs),
      sortTitle: normalize(title),
      key: normalize(relativePath.replace(/\.pdf$/i, "")),
    });
  }

  return results;
}

function addVersionCounts(recipes) {
  const counts = new Map();

  for (const recipe of recipes) {
    const groupKey = normalize(recipe.title);
    counts.set(groupKey, (counts.get(groupKey) ?? 0) + 1);
  }

  return recipes.map((recipe) => ({
    ...recipe,
    versions: counts.get(normalize(recipe.title)) ?? 1,
  }));
}

function serializeForBrowser(recipes) {
  return `window.RECIPES = ${JSON.stringify(recipes, null, 2)};\n`;
}

const recipes = addVersionCounts(await walkRecipes(rootDir)).sort((left, right) => {
  return left.sortTitle.localeCompare(right.sortTitle);
});

await fs.writeFile(outputFile, serializeForBrowser(recipes), "utf8");

console.log(`Built ${recipes.length} recipes into ${path.basename(outputFile)}.`);
