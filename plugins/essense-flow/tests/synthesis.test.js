"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const syn = require("../lib/synthesis");

// --- splitIntoItems ---

describe("splitIntoItems", () => {
  it("splits bullet list items", () => {
    const items = syn.splitIntoItems("- item one\n- item two\n- item three");
    assert.equal(items.length, 3);
    assert.equal(items[0], "item one");
  });

  it("splits numbered list items", () => {
    const items = syn.splitIntoItems("1. first\n2. second\n3. third");
    assert.equal(items.length, 3);
    assert.equal(items[0], "first");
  });

  it("splits asterisk bullet items", () => {
    const items = syn.splitIntoItems("* alpha\n* beta");
    assert.equal(items.length, 2);
  });

  it("splits paragraphs when no list markers", () => {
    const items = syn.splitIntoItems("para one\n\npara two\n\npara three");
    assert.equal(items.length, 3);
  });

  it("returns single item for plain text", () => {
    const items = syn.splitIntoItems("just one thing");
    assert.equal(items.length, 1);
  });

  it("returns empty array for empty input", () => {
    assert.deepEqual(syn.splitIntoItems(""), []);
    assert.deepEqual(syn.splitIntoItems(null), []);
  });
});

// --- extractEntityName ---

describe("extractEntityName", () => {
  it("extracts bold name pattern", () => {
    assert.equal(syn.extractEntityName("**Auth Module** — handles login"), "Auth Module");
  });

  it("extracts bold name with colon", () => {
    assert.equal(syn.extractEntityName("**Database:** stores data"), "Database");
  });

  it("extracts colon-separated name", () => {
    assert.equal(syn.extractEntityName("Rate Limiting: enforce limits"), "Rate Limiting");
  });

  it("extracts dash-separated name", () => {
    assert.equal(syn.extractEntityName("Caching — add redis layer"), "Caching");
  });

  it("falls back to first 5 words", () => {
    const name = syn.extractEntityName("a b c d e f g h");
    assert.equal(name, "a b c d e");
  });
});

// --- buildNormalizer ---

describe("buildNormalizer", () => {
  it("normalizes aliases to canonical form", () => {
    const vocab = { Authentication: { aliases: ["auth", "login"] } };
    const norm = syn.buildNormalizer(vocab);
    assert.equal(norm("auth"), "authentication");
    assert.equal(norm("login"), "authentication");
    assert.equal(norm("Authentication"), "authentication");
  });

  it("passes through unknown terms lowercased", () => {
    const norm = syn.buildNormalizer({ X: { aliases: ["y"] } });
    assert.equal(norm("Unknown"), "unknown");
  });

  it("handles null vocabulary", () => {
    const norm = syn.buildNormalizer(null);
    assert.equal(norm("Hello"), "hello");
  });

  it("normalizes punctuation variants via canonicalize", () => {
    const vocab = { "OAuth 2.0": { aliases: ["oauth2"] } };
    const norm = syn.buildNormalizer(vocab);
    assert.equal(norm("oauth2"), "oauth 2.0");
    assert.equal(norm("OAuth 2.0"), "oauth 2.0");
  });

  it("catches whitespace variants via canonicalize", () => {
    const vocab = { "Rate Limiting": { aliases: ["rate-limit"] } };
    const norm = syn.buildNormalizer(vocab);
    assert.equal(norm("rate limiting"), "rate limiting");
    assert.equal(norm("Rate  Limiting"), "rate limiting");
    assert.equal(norm("rate-limit"), "rate limiting");
  });

  it("fuzzy matches within Levenshtein threshold", () => {
    const vocab = { Authentication: { aliases: [] } };
    const norm = syn.buildNormalizer(vocab);
    assert.equal(norm("authentcation"), "authentication");
  });

  it("rejects fuzzy match beyond threshold", () => {
    const vocab = { Authentication: { aliases: [] } };
    const norm = syn.buildNormalizer(vocab);
    assert.equal(norm("completely_different"), "completely_different");
  });

  it("skips _config keys in vocabulary", () => {
    const vocab = {
      _config: { fuzzy_threshold: 3 },
      Auth: { aliases: ["login"] },
    };
    const norm = syn.buildNormalizer(vocab);
    assert.equal(norm("login"), "auth");
    assert.equal(norm("_config"), "_config");
  });
});

// --- canonicalize ---

describe("canonicalize", () => {
  it("strips punctuation and collapses whitespace", () => {
    assert.equal(syn.canonicalize("OAuth 2.0"), "oauth 20");
    assert.equal(syn.canonicalize("rate-limit"), "ratelimit");
  });
});

// --- levenshteinDistance ---

describe("levenshteinDistance", () => {
  it("returns 0 for identical strings", () => {
    assert.equal(syn.levenshteinDistance("abc", "abc"), 0);
  });

  it("returns string length for empty comparisons", () => {
    assert.equal(syn.levenshteinDistance("", "abc"), 3);
    assert.equal(syn.levenshteinDistance("abc", ""), 3);
  });

  it("computes known distances", () => {
    assert.equal(syn.levenshteinDistance("kitten", "sitting"), 3);
    assert.equal(syn.levenshteinDistance("flaw", "lawn"), 2);
  });
});

// --- significantWords ---

describe("significantWords", () => {
  it("extracts non-stopword words", () => {
    const words = syn.significantWords("The quick brown fox jumps over the lazy dog");
    assert.ok(words.has("quick"));
    assert.ok(words.has("brown"));
    assert.ok(words.has("fox"));
    assert.ok(!words.has("the"));
    assert.ok(!words.has("over"));
  });

  it("filters short words (length <= 2)", () => {
    const words = syn.significantWords("I am a ok no");
    assert.equal(words.size, 0);
  });
});

// --- contentAgreement ---

describe("contentAgreement", () => {
  it("detects agreement on similar content", () => {
    assert.ok(syn.contentAgreement(
      "JWT tokens authentication security validation",
      "JWT tokens authentication security validation checks"
    ));
  });

  it("detects disagreement on different content", () => {
    assert.ok(!syn.contentAgreement(
      "PostgreSQL relational database storage engine",
      "Redis caching memory layer performance"
    ));
  });

  it("does NOT agree on empty content (insufficient words)", () => {
    assert.ok(!syn.contentAgreement("", ""));
  });

  it("does NOT agree when one text is empty", () => {
    assert.ok(!syn.contentAgreement("", "JWT tokens authentication security validation"));
  });

  it("does NOT agree on single-word text (insufficient words)", () => {
    assert.ok(!syn.contentAgreement("auth", "JWT tokens authentication security validation framework"));
  });

  it("does NOT agree on two-word text (below minimum threshold)", () => {
    assert.ok(!syn.contentAgreement("auth security", "JWT tokens authentication security validation framework"));
  });

  it("still agrees when both texts have 3+ significant words with high overlap", () => {
    assert.ok(syn.contentAgreement(
      "JWT tokens authentication security validation",
      "JWT tokens authentication security validation checks"
    ));
  });

  it("does NOT agree on null input (no crash)", () => {
    assert.ok(!syn.contentAgreement(null, "JWT tokens authentication security"));
    assert.ok(!syn.contentAgreement("JWT tokens authentication security", null));
    assert.ok(!syn.contentAgreement(null, null));
  });
});

// --- extractEntities ---

describe("extractEntities", () => {
  it("extracts entities from multiple agent payloads", () => {
    const outputs = [
      { agentId: "sec", payload: { findings: "- **Auth** — verify tokens\n- **Rate Limit** — enforce limits" } },
      { agentId: "inf", payload: { findings: "- **Auth** — token verification\n- **Scaling** — horizontal scale" } },
    ];
    const entities = syn.extractEntities(outputs, null);
    assert.ok(entities.length >= 4);
    assert.ok(entities.some((e) => e.name === "auth"));
  });

  it("extracts from multiple section types", () => {
    const outputs = [
      { agentId: "a1", payload: { findings: "- **Finding** — desc", risks: "- **Risk** — desc", constraints: "- **Constraint** — desc" } },
    ];
    const entities = syn.extractEntities(outputs, null);
    const types = new Set(entities.map((e) => e.type));
    assert.ok(types.has("requirement"));
    assert.ok(types.has("risk"));
    assert.ok(types.has("constraint"));
  });

  it("handles missing payload gracefully", () => {
    const entities = syn.extractEntities([{ agentId: "a1", payload: null }], null);
    assert.equal(entities.length, 0);
  });
});

// --- buildAlignmentMatrix ---

describe("buildAlignmentMatrix", () => {
  it("builds matrix with agreement positions", () => {
    const entities = [
      { name: "auth", type: "requirement", content: "JWT authentication security tokens", agentId: "a1" },
      { name: "auth", type: "requirement", content: "JWT token authentication security", agentId: "a2" },
      { name: "caching", type: "requirement", content: "add caching layer", agentId: "a1" },
    ];
    const matrix = syn.buildAlignmentMatrix(entities);

    // Keys are now name::type composites
    assert.ok("auth::requirement" in matrix);
    assert.equal(matrix["auth::requirement"].positions["a1"], "agrees");
    assert.equal(matrix["auth::requirement"].positions["a2"], "agrees");
    assert.equal(matrix["auth::requirement"].type, "requirement");
    assert.equal(matrix["auth::requirement"].name, "auth");
  });

  it("handles first-agent-outlier correctly (pairwise comparison)", () => {
    const entities = [
      { name: "database", type: "requirement", content: "MongoDB document storage NoSQL database", agentId: "a1" },
      { name: "database", type: "requirement", content: "PostgreSQL relational database storage engine", agentId: "a2" },
      { name: "database", type: "requirement", content: "PostgreSQL relational database SQL storage", agentId: "a3" },
    ];
    const matrix = syn.buildAlignmentMatrix(entities);
    assert.equal(matrix["database::requirement"].positions["a1"], "disagrees", "outlier agent should disagree");
    assert.equal(matrix["database::requirement"].positions["a2"], "agrees", "majority agent should agree");
    assert.equal(matrix["database::requirement"].positions["a3"], "agrees", "majority agent should agree");
  });

  it("handles all-different content (no agreement group)", () => {
    const entities = [
      { name: "approach", type: "requirement", content: "serverless lambda functions cloud", agentId: "a1" },
      { name: "approach", type: "requirement", content: "kubernetes container orchestration deploy", agentId: "a2" },
      { name: "approach", type: "requirement", content: "traditional virtual machine hosting bare-metal", agentId: "a3" },
    ];
    const matrix = syn.buildAlignmentMatrix(entities);
    const agreeCount = Object.values(matrix["approach::requirement"].positions).filter((p) => p === "agrees").length;
    const disagreeCount = Object.values(matrix["approach::requirement"].positions).filter((p) => p === "disagrees").length;
    assert.equal(agreeCount + disagreeCount, 3, "all agents have a position");
  });

  it("handles 2-agent disagreement symmetrically", () => {
    const entities = [
      { name: "auth", type: "requirement", content: "session cookie authentication browser", agentId: "a1" },
      { name: "auth", type: "requirement", content: "JWT token stateless authentication API", agentId: "a2" },
    ];
    const matrix = syn.buildAlignmentMatrix(entities);
    const positions = Object.values(matrix["auth::requirement"].positions);
    const nonSilent = positions.filter((p) => p !== "silent");
    assert.equal(nonSilent.length, 2, "both agents have positions");
  });

  it("separates same-name entities with different types", () => {
    const entities = [
      { name: "auth", type: "component", content: "authentication module component", agentId: "a1" },
      { name: "auth", type: "risk", content: "authentication bypass risk vulnerability", agentId: "a2" },
    ];
    const matrix = syn.buildAlignmentMatrix(entities);
    assert.ok("auth::component" in matrix, "component entry exists");
    assert.ok("auth::risk" in matrix, "risk entry exists");
    assert.equal(matrix["auth::component"].name, "auth");
    assert.equal(matrix["auth::risk"].name, "auth");
  });

  it("marks silent agents", () => {
    const entities = [
      { name: "auth", type: "req", content: "content", agentId: "a1" },
      { name: "auth", type: "req", content: "content", agentId: "a2" },
      { name: "cache", type: "req", content: "content", agentId: "a1" },
    ];
    const matrix = syn.buildAlignmentMatrix(entities);
    assert.equal(matrix["cache::req"].positions["a2"], "silent");
  });
});

// --- classifyPositions ---

describe("classifyPositions", () => {
  it("classifies consensus items", () => {
    const matrix = {
      auth: {
        type: "req",
        positions: { a1: "agrees", a2: "agrees", a3: "agrees" },
        contents: { a1: "c1", a2: "c2", a3: "c3" },
      },
    };
    const result = syn.classifyPositions(matrix);
    assert.equal(result.consensus.length, 1);
    assert.equal(result.consensus[0].name, "auth");
  });

  it("classifies unique items (single source)", () => {
    const matrix = {
      cache: {
        type: "req",
        positions: { a1: "agrees", a2: "silent", a3: "silent" },
        contents: { a1: "caching stuff" },
      },
    };
    const result = syn.classifyPositions(matrix);
    assert.equal(result.unique.length, 1);
  });

  it("classifies majority agreement", () => {
    const matrix = {
      db: {
        type: "req",
        positions: { a1: "agrees", a2: "agrees", a3: "disagrees" },
        contents: { a1: "c1", a2: "c2", a3: "c3" },
      },
    };
    const result = syn.classifyPositions(matrix);
    assert.equal(result.majority.length, 1);
  });

  it("classifies split (no majority)", () => {
    const matrix = {
      approach: {
        type: "req",
        positions: { a1: "agrees", a2: "disagrees" },
        contents: { a1: "c1", a2: "c2" },
      },
    };
    const result = syn.classifyPositions(matrix);
    assert.equal(result.split.length, 1);
  });
});

// --- composeSynthesis ---

describe("composeSynthesis", () => {
  const classified = {
    consensus: [
      { name: "auth", type: "req", contents: { a1: "use JWT", a2: "use JWT" }, positions: {} },
    ],
    majority: [
      { name: "db", type: "req", contents: { a1: "postgres", a2: "postgres", a3: "mongo" }, positions: { a1: "agrees", a2: "agrees", a3: "disagrees" } },
    ],
    unique: [
      { name: "cache", type: "req", contents: { a1: "add redis" }, positions: { a1: "agrees" } },
    ],
    split: [
      { name: "deploy", type: "req", contents: { a1: "kubernetes", a2: "serverless" }, positions: { a1: "agrees", a2: "disagrees" } },
    ],
  };

  it("includes all four sections", () => {
    const doc = syn.composeSynthesis(classified);
    assert.ok(doc.includes("## Consensus"));
    assert.ok(doc.includes("## Disagreements"));
    assert.ok(doc.includes("## Unique Insights"));
    assert.ok(doc.includes("## Escalations"));
  });

  it("includes consensus items", () => {
    const doc = syn.composeSynthesis(classified);
    assert.ok(doc.includes("auth"));
  });

  it("tags unique items with single-source", () => {
    const doc = syn.composeSynthesis(classified);
    assert.ok(doc.includes("[single-source"));
  });

  it("marks escalations as requiring user decision", () => {
    const doc = syn.composeSynthesis(classified);
    assert.ok(doc.includes("REQUIRES USER DECISION"));
  });

  it("handles empty classifications", () => {
    const empty = { consensus: [], majority: [], unique: [], split: [] };
    const doc = syn.composeSynthesis(empty);
    assert.ok(doc.includes("No items with full consensus"));
    assert.ok(doc.includes("No items requiring user decision"));
  });
});
