import { marketplaceCategoryCatalog } from "@aikad/shared";

export const SEARCH_SYNONYM_MAP: Record<string, string[]> = {
  bicycle: ["cycle", "bike", "bikes", "cycles"],
  bicycles: ["bicycle", "cycle", "bike", "bikes", "cycles"],
  cycle: ["bicycle", "bicycles", "bike", "bikes", "cycles"],
  cycles: ["cycle", "bicycle", "bikes"],
  bike: ["bicycle", "cycle", "motorcycle", "bikes"],
  bikes: ["bike", "bicycle", "motorcycle", "cycles"],
  motorcycle: ["bike", "bikes", "motorbike"],
  motorcycles: ["motorcycle", "bike", "bikes"],
  mobile: ["mobiles", "phone", "phones", "smartphone", "smartphones", "cellphone"],
  mobiles: ["mobile", "phone", "phones", "smartphone", "smartphones"],
  phone: ["mobile", "mobiles", "smartphone", "cellphone"],
  phones: ["phone", "mobile", "mobiles", "smartphones"],
  smartphone: ["mobile", "phone", "android", "iphone"],
  smartphones: ["smartphone", "mobile", "phones"],
  car: ["cars", "vehicle", "vehicles", "auto", "automobile"],
  cars: ["car", "vehicle", "vehicles", "auto"],
  vehicle: ["vehicles", "car", "cars", "auto"],
  vehicles: ["vehicle", "cars", "car", "auto"],
  property: ["house", "home", "apartment", "flat", "plot", "rent", "sale"],
  house: ["home", "property", "apartment", "flat"],
  home: ["house", "property"],
  laptop: ["laptops", "computer", "computers", "notebook"],
  laptops: ["laptop", "computer", "computers"],
  sofa: ["couch", "settee", "sofas"],
  sofas: ["sofa", "couch", "settee"],
  tv: ["television", "televisions", "led", "lcd"],
  television: ["tv", "led", "lcd"],
  fridge: ["refrigerator", "freezer", "fridges"],
  fridges: ["fridge", "refrigerator", "freezer"]
};

const KNOWN_CITIES = [
  "karachi",
  "lahore",
  "islamabad",
  "rawalpindi",
  "faisalabad",
  "multan",
  "peshawar",
  "hyderabad",
  "quetta",
  "gujranwala",
  "sialkot",
  "sargodha"
];

export function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeToken(value: string) {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

export function toSingularToken(token: string) {
  if (token.endsWith("ies") && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.endsWith("es") && token.length > 4) {
    return token.slice(0, -2);
  }
  if (token.endsWith("s") && token.length > 3) {
    return token.slice(0, -1);
  }
  return token;
}

export function tokenizeSearchText(value: string) {
  const normalized = normalizeSearchText(value);
  if (!normalized) {
    return [];
  }

  const tokens = normalized
    .split(/\s+/)
    .map((token) => normalizeToken(token))
    .filter((token) => token.length >= 2);

  const expanded = new Set<string>();
  for (const token of tokens) {
    expanded.add(token);
    expanded.add(toSingularToken(token));
  }

  return Array.from(expanded).filter((token) => token.length >= 2);
}

export function buildQueryTerms(query: string, extraTerms?: string[]) {
  const base = query
    .toLowerCase()
    .split(/[\s,./\\\-_:;]+/)
    .map((token) => normalizeToken(token))
    .filter((token) => token.length >= 2);

  if (query.length >= 2) {
    base.unshift(normalizeSearchText(query));
  }

  for (const token of [...base]) {
    const normalized = token.replace(/\s+/g, "");
    if (normalized.length < 5) {
      continue;
    }

    for (const city of KNOWN_CITIES) {
      const index = normalized.indexOf(city);
      if (index < 0) {
        continue;
      }

      const before = normalized.slice(0, index);
      const after = normalized.slice(index + city.length);
      if (before.length >= 2) {
        base.push(before);
      }
      if (after.length >= 2) {
        base.push(after);
      }
      base.push(city);
    }
  }

  for (const token of [...base]) {
    base.push(toSingularToken(token));
    const synonyms = SEARCH_SYNONYM_MAP[token] ?? [];
    for (const synonym of synonyms) {
      base.push(normalizeSearchText(synonym));
    }
  }

  if (extraTerms?.length) {
    for (const term of extraTerms) {
      const clean = normalizeSearchText(term);
      if (clean.length >= 2) {
        base.push(clean);
      }
    }
  }

  return Array.from(new Set(base));
}

export function expandSemanticTerms(query: string) {
  const tokens = tokenizeSearchText(query);
  const expanded = new Set(tokens);

  for (const token of tokens) {
    const synonyms = SEARCH_SYNONYM_MAP[token] ?? [];
    for (const synonym of synonyms) {
      expanded.add(normalizeSearchText(synonym));
    }
  }

  return Array.from(expanded);
}

export function buildCategorySearchText(category?: {
  name?: string | null;
  slug?: string | null;
  parent?: { name?: string | null; slug?: string | null } | null;
} | null) {
  if (!category) {
    return "";
  }

  return [category.parent?.name, category.parent?.slug, category.name, category.slug]
    .filter(Boolean)
    .join(" ");
}

export function buildCategoryAliasTerms(name: string, slug: string) {
  const base = new Set<string>();
  const sourceTerms = [
    normalizeSearchText(name),
    normalizeSearchText(slug.replace(/-/g, " "))
  ];

  for (const source of sourceTerms) {
    if (!source) {
      continue;
    }
    base.add(source);
    for (const token of tokenizeSearchText(source)) {
      base.add(token);
      base.add(toSingularToken(token));
      const synonyms = SEARCH_SYNONYM_MAP[token] ?? [];
      for (const synonym of synonyms) {
        base.add(normalizeSearchText(synonym));
      }
    }
  }

  return Array.from(base).filter((term) => term.length >= 2);
}

export function levenshteinDistance(a: string, b: string) {
  if (a === b) {
    return 0;
  }
  if (!a.length) {
    return b.length;
  }
  if (!b.length) {
    return a.length;
  }

  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array<number>(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

export function hasFuzzyTokenMatch(tokens: string[], target: string) {
  const normalizedTarget = toSingularToken(normalizeToken(target));
  if (normalizedTarget.length < 5) {
    return false;
  }

  return tokens.some((token) => {
    const normalizedToken = toSingularToken(normalizeToken(token));
    if (
      !normalizedToken ||
      normalizedToken.length < 5 ||
      Math.abs(normalizedToken.length - normalizedTarget.length) > 2
    ) {
      return false;
    }

    if (normalizedToken === normalizedTarget) {
      return true;
    }

    const maxDistance =
      Math.max(normalizedToken.length, normalizedTarget.length) >= 7 ? 2 : 1;
    return levenshteinDistance(normalizedToken, normalizedTarget) <= maxDistance;
  });
}

export function matchesCategorySearchQuery(
  normalizedQuery: string,
  queryTerms: string[],
  categoryTerms: string[]
) {
  const relevantTerms = new Set<string>([
    normalizedQuery,
    ...queryTerms.map((term) => normalizeSearchText(term))
  ]);
  const categoryTokens = Array.from(
    new Set(categoryTerms.flatMap((term) => tokenizeSearchText(term)))
  );

  for (const term of relevantTerms) {
    if (!term || term.length < 2) {
      continue;
    }

    const termTokens = tokenizeSearchText(term);
    if (
      termTokens.some(
        (token) => categoryTokens.includes(token) || hasFuzzyTokenMatch(categoryTokens, token)
      )
    ) {
      return true;
    }
  }

  return false;
}

export function detectQueryCategorySignals(query: string, queryTerms: string[]) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return {
      matchedSlugs: [] as string[],
      semanticTerms: [] as string[]
    };
  }

  const matchedSlugs = new Set<string>();
  const semanticTerms = new Set<string>();

  for (const root of marketplaceCategoryCatalog) {
    const rootTerms = buildCategoryAliasTerms(root.name, root.slug);
    const rootMatched = matchesCategorySearchQuery(normalizedQuery, queryTerms, rootTerms);

    if (rootMatched) {
      matchedSlugs.add(root.slug);
      for (const child of root.subcategories) {
        matchedSlugs.add(child.slug);
      }
      for (const term of rootTerms) {
        semanticTerms.add(term);
      }
    }

    for (const subcategory of root.subcategories) {
      const subTerms = buildCategoryAliasTerms(subcategory.name, subcategory.slug);
      if (!matchesCategorySearchQuery(normalizedQuery, queryTerms, subTerms)) {
        continue;
      }

      matchedSlugs.add(root.slug);
      matchedSlugs.add(subcategory.slug);
      for (const term of [...rootTerms, ...subTerms]) {
        semanticTerms.add(term);
      }
    }
  }

  return {
    matchedSlugs: Array.from(matchedSlugs),
    semanticTerms: Array.from(semanticTerms)
  };
}

export function minimumSemanticScore(queryTerms: string[]) {
  if (queryTerms.length <= 1) {
    return 1.15;
  }
  if (queryTerms.length <= 3) {
    return 1.4;
  }
  return 1.6;
}

export function scoreSearchDocument(params: {
  query: string;
  terms: string[];
  title: string;
  text: string;
  categoryPath?: string;
  trust?: number;
}) {
  const titleLower = normalizeSearchText(params.title);
  const textLower = normalizeSearchText(params.text);
  const categoryLower = normalizeSearchText(params.categoryPath ?? "");
  const queryLower = normalizeSearchText(params.query);
  const titleTokens = tokenizeSearchText(params.title);
  const textTokens = tokenizeSearchText(params.text);
  const categoryTokens = tokenizeSearchText(params.categoryPath ?? "");
  let score = 0;

  if (titleLower === queryLower) {
    score += 9;
  } else if (titleLower.startsWith(queryLower)) {
    score += 7;
  } else if (titleLower.includes(queryLower)) {
    score += 5;
  }

  if (textLower.includes(queryLower)) {
    score += 2.5;
  }
  if (categoryLower.includes(queryLower)) {
    score += 3.4;
  }

  for (const term of params.terms) {
    if (term.length < 2) {
      continue;
    }
    const normalizedTerm = normalizeSearchText(term);
    if (titleLower === normalizedTerm) {
      score += 3.2;
    } else if (titleLower.startsWith(normalizedTerm)) {
      score += 2.6;
    } else if (titleLower.includes(normalizedTerm)) {
      score += 1.8;
    }
    if (textLower.includes(normalizedTerm)) {
      score += 0.7;
    }
    if (categoryLower.includes(normalizedTerm)) {
      score += 1.4;
    }
  }

  for (const token of tokenizeSearchText(params.query)) {
    if (titleTokens.includes(token)) {
      score += 2.3;
    } else if (hasFuzzyTokenMatch(titleTokens, token)) {
      score += 1.7;
    }

    if (categoryTokens.includes(token)) {
      score += 1.7;
    } else if (hasFuzzyTokenMatch(categoryTokens, token)) {
      score += 1.1;
    }

    if (textTokens.includes(token)) {
      score += 0.9;
    } else if (hasFuzzyTokenMatch(textTokens, token)) {
      score += 0.45;
    }
  }

  return score + (params.trust ?? 0) / 120;
}
