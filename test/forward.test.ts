import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import {
  LearnindexClient,
  callTool,
  createClient,
  DEFAULT_ENDPOINT_URL,
  isKnownTool,
  OMITTED_TOOLS,
  parseRpcBody,
  PROTOCOL_VERSION,
  TOOL_DEFS,
  TOOL_NAMES,
  VERSION,
} from "../src/forward.js";
import { createServer, handleCallTool } from "../src/mcp.js";
import type {
  FetchFn,
  FetchResponseLike,
  ToolDef,
  ToolResult,
} from "../src/types.js";

/**
 * Every test runs against a stubbed JSON-RPC upstream that
 * implements the streamable-HTTP session flow
 * (initialize -> notifications/initialized -> tools/call):
 * no live network, and the real Goldseam endpoint is
 * never contacted.
 */

const FIXTURE_URL = new URL(
  "../../../harness/fixtures/ksaworks-goldseam-tools-original.json",
  import.meta.url,
);
const FIXTURE_AVAILABLE = existsSync(FIXTURE_URL);
const fixture = (
  FIXTURE_AVAILABLE
    ? JSON.parse(readFileSync(FIXTURE_URL, "utf-8"))
    : { tools: [] }
) as {
  tools: ToolDef[];
};
/**
 * Publish-survival guard (Wave 29 P1 preflight, proven Wave 24 pattern):
 * the parity fixture lives in the build harness, outside the published
 * repo tree, so fixture-dependent tests skip cleanly when it is absent;
 * with the fixture present they run in full, with no skips.
 */
function skipWithoutFixture(t: {
  skip: (message: string) => void;
}): boolean {
  if (FIXTURE_AVAILABLE) return false;
  t.skip("parity fixture lives in the build harness, not the repo tree");
  return true;
}


const KEPT_TOOLS = [
  "search_certifications",
  "get_certification",
  "certifications_for_occupation",
  "occupations_for_certification",
  "related_certifications",
  "certifications_for_program",
  "list_issuers",
  "resolve_term",
  "expand_term",
  "get_dictionary_summary",
  "crosswalk_code",
  "compare_program_checklists",
  "find_institution",
  "programs_for_institution",
  "get_checklist",
  "learning_units",
  "get_institution",
  "find_catalogs",
  "get_catalog",
  "find_programs",
  "get_program",
  "get_learning_unit",
  "find_policies",
  "get_policy",
  "find_checklists",
  "find_agreements",
  "get_agreement",
  "find_pathways",
  "get_pathway",
  "find_comparability",
  "get_comparability",
  "find_transfer_frameworks",
  "get_transfer_framework",
  "checklists_requiring_learning_unit",
  "search_programs_and_learning_units",
  "get_courseshelf_summary",
  "comparability_for_learning_unit",
  "comparability_for_courses",
  "get_courseshelf_performance",
  "find_transitions",
  "compare_destinations",
  "will_my_credits_transfer",
  "comparable_map",
  "checklist_map",
  "list_persona_transcripts",
  "get_persona_transcript",
  "find_my_major",
  "compare_my_major",
  "find_my_school",
  "compare_my_school",
  "find_my_best_pathway",
];

const OMITTED = [
  "assemble_my_formal_education",
  "assemble_my_work_and_credentials",
  "assert_my_life_experiences",
  "my_selfie_ksa_view",
  "draft_my_claims",
  "suggest_credit_for_my_learning",
];

/** Required fields per kept tool, exactly as captured; null = no `required` key. */
const REQUIRED_MAP: Record<string, string[] | null> = {
  search_certifications: ["query"],
  get_certification: ["id"],
  certifications_for_occupation: ["soc"],
  occupations_for_certification: ["id"],
  related_certifications: ["id"],
  certifications_for_program: ["cip"],
  list_issuers: [],
  resolve_term: ["term"],
  expand_term: ["term"],
  get_dictionary_summary: null,
  crosswalk_code: ["code"],
  compare_program_checklists: ["unitids", "program"],
  find_institution: null,
  programs_for_institution: ["unitid"],
  get_checklist: ["checklist_id"],
  learning_units: ["unitid"],
  get_institution: null,
  find_catalogs: ["unitid"],
  get_catalog: ["catalog_id"],
  find_programs: ["query"],
  get_program: ["program_id"],
  get_learning_unit: ["learning_unit_id"],
  find_policies: ["unitid"],
  get_policy: ["policy_id"],
  find_checklists: ["unitid"],
  find_agreements: null,
  get_agreement: ["agreement_id"],
  find_pathways: null,
  get_pathway: ["pathway_id"],
  find_comparability: null,
  get_comparability: ["comparability_id"],
  find_transfer_frameworks: null,
  get_transfer_framework: ["framework_id"],
  checklists_requiring_learning_unit: ["learning_unit_id"],
  search_programs_and_learning_units: null,
  get_courseshelf_summary: null,
  comparability_for_learning_unit: null,
  comparability_for_courses: ["target_unitid", "items"],
  get_courseshelf_performance: null,
  find_transitions: null,
  compare_destinations: ["from_soc", "to_socs"],
  will_my_credits_transfer: ["held", "target_unitid"],
  comparable_map: ["target_unitid", "item"],
  checklist_map: ["target_unitid"],
  list_persona_transcripts: null,
  get_persona_transcript: ["persona_id"],
  find_my_major: null,
  compare_my_major: ["majors", "level"],
  find_my_school: ["major", "level"],
  compare_my_school: ["unitids", "major", "level"],
  find_my_best_pathway: ["goal", "level"],
};

const NO_REQUIRED_TOOLS = KEPT_TOOLS.filter(
  (name) => REQUIRED_MAP[name] === null,
);

const SAMPLE_RESULT = {
  content: [{ type: "text", text: "{\"rows\":[{\"id\":\"x1\"}]}" }],
  structuredContent: { rows: [{ id: "x1" }] },
};

interface Captured {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

interface FakeOptions {
  callResult?: Record<string, unknown>;
  callBodyText?: string;
  callError?: Record<string, unknown>;
  callStatus?: number;
  initError?: Record<string, unknown>;
  throwOn?: "initialize" | "tools/call";
  sessionId?: string | null;
  hangOnCall?: boolean;
  sse?: boolean;
}

function makeResponse(
  status: number,
  bodyText: string,
  headers: Record<string, string> = {},
): FetchResponseLike {
  const lowered = new Map(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => lowered.get(name.toLowerCase()) ?? null },
    text: async () => bodyText,
  };
}

function jsonResponse(
  status: number,
  payload: unknown,
  headers: Record<string, string> = {},
) {
  return makeResponse(status, JSON.stringify(payload), headers);
}

function makeUpstream(options: FakeOptions = {}): {
  fetchFn: FetchFn;
  calls: Captured[];
} {
  const calls: Captured[] = [];
  const fetchFn: FetchFn = async (url, init) => {
    const body = JSON.parse(init?.body ?? "{}") as Record<string, unknown>;
    calls.push({ url, headers: init?.headers ?? {}, body });
    const method = body.method as string;
    if (options.throwOn === method) throw new Error("socket hang up");
    if (method === "initialize") {
      if (options.initError !== undefined) {
        return jsonResponse(200, {
          jsonrpc: "2.0",
          id: body.id,
          error: options.initError,
        });
      }
      const headers: Record<string, string> = {};
      const sessionId =
        options.sessionId === undefined ? "sess-xyz" : options.sessionId;
      if (sessionId !== null) headers["mcp-session-id"] = sessionId;
      return jsonResponse(
        200,
        {
          jsonrpc: "2.0",
          id: body.id,
          result: {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {},
            serverInfo: { name: "goldseam", version: "1.2.0" },
          },
        },
        headers,
      );
    }
    if (method === "notifications/initialized") {
      return makeResponse(202, "");
    }
    if (method === "tools/call") {
      if (options.hangOnCall) {
        return new Promise<FetchResponseLike>((_resolve, reject) => {
          const signal = init?.signal;
          if (signal) {
            if (signal.aborted) {
              reject(new Error("aborted"));
              return;
            }
            signal.addEventListener("abort", () => reject(new Error("aborted")));
          }
        });
      }
      if (options.callBodyText !== undefined) {
        return makeResponse(options.callStatus ?? 200, options.callBodyText);
      }
      if (options.callError !== undefined) {
        return jsonResponse(200, {
          jsonrpc: "2.0",
          id: body.id,
          error: options.callError,
        });
      }
      const result = options.callResult ?? SAMPLE_RESULT;
      const payload = { jsonrpc: "2.0", id: body.id, result };
      if (options.sse) {
        return makeResponse(
          200,
          `event: message\ndata: ${JSON.stringify(payload)}\n\n`,
        );
      }
      return jsonResponse(options.callStatus ?? 200, payload);
    }
    return jsonResponse(200, {});
  };
  return { fetchFn, calls };
}

function stubClient(options: FakeOptions = {}, extra: Record<string, unknown> = {}) {
  const upstream = makeUpstream(options);
  const c = new LearnindexClient({
    fetchFn: upstream.fetchFn,
    env: {},
    ...extra,
  });
  return { client: c, calls: upstream.calls };
}

function textOf(result: ToolResult): string {
  const content = result.content as Array<{ type: string; text: string }>;
  return content[0].text;
}

function methods(calls: Captured[]): string[] {
  return calls.map((c) => c.body.method as string);
}

function schemaOf(tool: ToolDef): Record<string, any> {
  return tool.inputSchema as Record<string, any>;
}

function defOf(name: string): ToolDef {
  const def = TOOL_DEFS.find((t) => t.name === name);
  assert.ok(def !== undefined, `missing tool def ${name}`);
  return def;
}

/** Build a plausible argument object from a tool's required properties. */
function sampleArgsFor(tool: ToolDef): Record<string, unknown> {
  const schema = schemaOf(tool);
  const args: Record<string, unknown> = {};
  for (const key of (schema.required as string[] | undefined) ?? []) {
    const prop = (schema.properties?.[key] ?? {}) as Record<string, any>;
    if (prop.type === "array") {
      const itemType = (prop.items as Record<string, any> | undefined)?.type;
      args[key] = [itemType === "object" ? {} : "sample"];
    } else if (prop.type === "object") {
      args[key] = {};
    } else if (prop.type === "integer" || prop.type === "number") {
      args[key] = 3;
    } else if (prop.type === "boolean") {
      args[key] = true;
    } else {
      args[key] = "sample";
    }
  }
  return args;
}

/* CLI helpers. */

const CLI_ROOT = fileURLToPath(new URL("..", import.meta.url));
const CLI_PATH = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

function runCli(args: string[]) {
  return spawnSync(process.execPath, ["--import", "tsx", CLI_PATH, ...args], {
    cwd: CLI_ROOT,
    encoding: "utf8",
    timeout: 30000,
  });
}

/* MCP client over an in-memory transport, for tools/list and
 * tools/call assertions at the MCP layer itself. */
async function withMcpClient<T>(
  upstream: { fetchFn: FetchFn },
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  const server = createServer({ fetchFn: upstream.fetchFn, env: {} });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client(
    { name: "learnindex-test", version: "0.0.0" },
    { capabilities: {} },
  );
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    return await fn(client);
  } finally {
    await client.close();
    await server.close();
  }
}

/* ------------------------------------------------------------------ */

describe("registration integrity (labelled subset, captured surface)", () => {
  it("serves exactly the fixture's 51 tools, deep-equal, in order", (t) => {
    if (skipWithoutFixture(t)) return;
    assert.equal(fixture.tools.length, 51);
    assert.deepEqual(TOOL_DEFS, fixture.tools);
  });

  it("serves the 51 tool names in fixture order", (t) => {
    if (skipWithoutFixture(t)) return;
    assert.deepEqual(TOOL_NAMES, KEPT_TOOLS);
    assert.deepEqual(
      TOOL_NAMES,
      fixture.tools.map((t) => t.name),
    );
  });

  it("carries exactly the fixture's keys on every tool", () => {
    for (const tool of TOOL_DEFS) {
      assert.deepEqual(Object.keys(tool).sort(), [
        "description",
        "inputSchema",
        "name",
        "title",
      ]);
    }
  });

  it("carries the fixture's titles verbatim", (t) => {
    if (skipWithoutFixture(t)) return;
    assert.deepEqual(
      TOOL_DEFS.map((t) => t.title),
      fixture.tools.map((t) => t.title),
    );
    assert.equal(defOf("search_certifications").title, "Search Certifications");
    assert.equal(
      defOf("get_courseshelf_summary").title,
      "CourseShelf Holdings Summary",
    );
    assert.equal(defOf("find_my_best_pathway").title, "Find My Best Pathway");
  });

  it("carries the fixture's descriptions verbatim", (t) => {
    if (skipWithoutFixture(t)) return;
    for (let i = 0; i < TOOL_DEFS.length; i++) {
      assert.equal(TOOL_DEFS[i].description, fixture.tools[i].description);
    }
    assert.match(
      defOf("search_certifications").description,
      /Which certification is this prose name/,
    );
    assert.match(
      defOf("get_courseshelf_performance").description,
      /call log/,
    );
    assert.match(
      defOf("will_my_credits_transfer").description,
      /Will my prior credits apply as credit at my target school/,
    );
  });

  it("carries the required array exactly as captured on every tool", () => {
    for (const name of KEPT_TOOLS) {
      const expected = REQUIRED_MAP[name];
      const schema = schemaOf(defOf(name));
      if (expected === null) {
        assert.equal("required" in schema, false, `${name} must have no required key`);
      } else {
        assert.deepEqual(schema.required, expected, `${name} required`);
      }
    }
  });

  it("list_issuers carries an explicit empty required array, verbatim", () => {
    const schema = schemaOf(defOf("list_issuers"));
    assert.equal("required" in schema, true);
    assert.deepEqual(schema.required, []);
  });

  it("the 14 tools captured without a required key serve none", () => {
    assert.equal(NO_REQUIRED_TOOLS.length, 14);
    for (const name of NO_REQUIRED_TOOLS) {
      assert.equal("required" in schemaOf(defOf(name)), false, name);
    }
  });

  it("every inputSchema is an object schema with no $schema and no additionalProperties", () => {
    for (const tool of TOOL_DEFS) {
      const schema = schemaOf(tool);
      assert.equal(schema.type, "object", tool.name);
      assert.equal("$schema" in schema, false, tool.name);
      assert.equal("additionalProperties" in schema, false, tool.name);
    }
  });

  it("carries every fixture property, in order, for every tool", (t) => {
    if (skipWithoutFixture(t)) return;
    for (let i = 0; i < TOOL_DEFS.length; i++) {
      const served = Object.keys(schemaOf(TOOL_DEFS[i]).properties);
      const expected = Object.keys(schemaOf(fixture.tools[i]).properties);
      assert.deepEqual(served, expected, TOOL_DEFS[i].name);
    }
    assert.deepEqual(
      Object.keys(schemaOf(defOf("search_certifications")).properties),
      ["issuer", "limit", "offset", "query"],
    );
    assert.deepEqual(
      Object.keys(schemaOf(defOf("find_comparability")).properties).length,
      13,
    );
    assert.deepEqual(
      Object.keys(schemaOf(defOf("search_programs_and_learning_units")).properties)
        .length,
      16,
    );
  });

  it("get_dictionary_summary, get_courseshelf_summary and list_persona_transcripts take no properties", () => {
    for (const name of [
      "get_dictionary_summary",
      "get_courseshelf_summary",
      "list_persona_transcripts",
    ]) {
      assert.deepEqual(schemaOf(defOf(name)).properties, {});
    }
  });

  it("search_certifications' query carries its captured examples", () => {
    const query = schemaOf(defOf("search_certifications")).properties.query;
    assert.equal(query.type, "string");
    assert.deepEqual(query.examples, [
      "nursing",
      "HVAC",
      "welding",
      "IBM",
      "project management",
    ]);
  });

  it("get_institution carries its captured anyOf identity requirement", () => {
    assert.deepEqual(schemaOf(defOf("get_institution")).anyOf, [
      { required: ["organization_id"] },
      { required: ["unitid"] },
    ]);
  });

  it("find_transitions and find_my_major carry their captured anyOf requirements", () => {
    assert.deepEqual(schemaOf(defOf("find_transitions")).anyOf, [
      { required: ["from_soc"] },
      { required: ["from"] },
    ]);
    assert.deepEqual(schemaOf(defOf("find_my_major")).anyOf, [
      { required: ["words"] },
      { required: ["soc"] },
    ]);
  });

  it("find_comparability's kind is the captured known/inferred/both enum", () => {
    const kind = schemaOf(defOf("find_comparability")).properties.kind;
    assert.equal(kind.type, "string");
    assert.deepEqual(kind.enum, ["known", "inferred", "both"]);
  });

  it("will_my_credits_transfer's held is an array of objects and target_unitid a string", () => {
    const props = schemaOf(defOf("will_my_credits_transfer")).properties;
    assert.equal(props.held.type, "array");
    assert.deepEqual(props.held.items, { type: "object" });
    assert.equal(props.target_unitid.type, "string");
  });

  it("comparable_map's item is an object and checklist_map accepts an optional package object", () => {
    const item = schemaOf(defOf("comparable_map")).properties.item;
    assert.equal(item.type, "object");
    const pkg = schemaOf(defOf("checklist_map")).properties.package;
    assert.equal(pkg.type, "object");
    assert.equal(
      (schemaOf(defOf("checklist_map")).required as string[]).includes("package"),
      false,
    );
  });

  it("isKnownTool recognises every kept tool and rejects others", () => {
    for (const name of KEPT_TOOLS) assert.equal(isKnownTool(name), true, name);
    assert.equal(isKnownTool("search"), false);
    assert.equal(isKnownTool("goldseam"), false);
    assert.equal(isKnownTool(""), false);
  });

  it("the MCP tools/list response carries exactly the fixture's 51 tools", async (t) => {
    if (skipWithoutFixture(t)) return;
    const upstream = makeUpstream();
    const listed = await withMcpClient(upstream, async (client) => {
      const res = await client.listTools();
      return res.tools;
    });
    assert.deepEqual(
      listed.map((t) => t.name),
      KEPT_TOOLS,
    );
    assert.deepEqual(listed, fixture.tools);
    assert.equal(upstream.calls.length, 0);
  });
});

/* ------------------------------------------------------------------ */

describe("omitted tools are absent at every level", () => {
  it("the exported omission list names exactly the six omitted tools", () => {
    assert.deepEqual([...OMITTED_TOOLS].sort(), [...OMITTED].sort());
  });

  for (const name of OMITTED) {
    it(`registry: ${name} is not registered`, () => {
      assert.equal(TOOL_NAMES.includes(name), false);
      assert.equal(TOOL_DEFS.some((t) => t.name === name), false);
      assert.equal(isKnownTool(name), false);
    });
  }

  it("MCP tools/list contains none of the omitted tools", async () => {
    const upstream = makeUpstream();
    const listed = await withMcpClient(upstream, async (client) => {
      const res = await client.listTools();
      return res.tools;
    });
    assert.equal(listed.length, 51);
    for (const name of OMITTED) {
      assert.equal(
        listed.some((t) => t.name === name),
        false,
        name,
      );
    }
  });

  it("the MCP layer rejects every omitted tool before any network hop", async () => {
    const upstream = makeUpstream();
    const c = createClient({ fetchFn: upstream.fetchFn, env: {} });
    for (const name of OMITTED) {
      await assert.rejects(
        () => handleCallTool(c, name, {}),
        (err: unknown) =>
          err instanceof McpError && err.code === ErrorCode.MethodNotFound,
        name,
      );
    }
    assert.equal(upstream.calls.length, 0);
  });

  it("an MCP tools/call for an omitted tool is rejected and never reaches the upstream", async () => {
    const upstream = makeUpstream();
    await withMcpClient(upstream, async (client) => {
      for (const name of OMITTED) {
        await assert.rejects(
          () => client.callTool({ name, arguments: {} }),
          undefined,
          name,
        );
      }
    });
    assert.equal(upstream.calls.length, 0);
  });

  for (const name of OMITTED) {
    it(`CLI: ${name} has no subcommand and exits 2`, () => {
      const res = runCli([name, "{}"]);
      assert.equal(res.status, 2);
      assert.match(res.stderr, /Usage:/);
    });
  }
});

/* ------------------------------------------------------------------ */

describe("session establishment and reuse", () => {
  it("runs initialize, notifications/initialized, then tools/call in order", async () => {
    const { client: c, calls } = stubClient();
    const out = await c.callTool("search_certifications", { query: "nursing" });
    assert.equal(out.isError, undefined);
    assert.deepEqual(methods(calls), [
      "initialize",
      "notifications/initialized",
      "tools/call",
    ]);
    assert.ok(calls.every((call) => call.url === DEFAULT_ENDPOINT_URL));
    assert.equal(
      DEFAULT_ENDPOINT_URL,
      "https://goldseam.ksaworks.com/mcp",
    );
    for (const call of calls) {
      assert.equal(call.headers["Content-Type"], "application/json");
      assert.equal(call.headers["Accept"], "application/json, text/event-stream");
    }
    assert.equal(calls[0].headers["Mcp-Session-Id"], undefined);
    assert.equal(calls[1].headers["Mcp-Session-Id"], "sess-xyz");
    assert.equal(calls[2].headers["Mcp-Session-Id"], "sess-xyz");
  });

  it("sends clientInfo name learnindex and the pinned protocol version on initialize", async () => {
    const { client: c, calls } = stubClient();
    await c.callTool("search_certifications", { query: "nursing" });
    const initParams = calls[0].body.params as Record<string, unknown>;
    assert.equal(initParams.protocolVersion, PROTOCOL_VERSION);
    assert.equal(PROTOCOL_VERSION, "2025-03-26");
    assert.deepEqual(initParams.capabilities, {});
    assert.deepEqual(initParams.clientInfo, {
      name: "learnindex",
      version: VERSION,
    });
  });

  it("establishes the session lazily once and reuses it on later calls", async () => {
    const { client: c, calls } = stubClient();
    await c.callTool("search_certifications", { query: "nursing" });
    await c.callTool("list_issuers", {});
    assert.deepEqual(methods(calls), [
      "initialize",
      "notifications/initialized",
      "tools/call",
      "tools/call",
    ]);
    assert.equal(calls[3].headers["Mcp-Session-Id"], "sess-xyz");
    assert.notEqual(calls[2].body.id, calls[3].body.id);
  });

  it("sends no session header when the upstream issues none", async () => {
    const { client: c, calls } = stubClient({ sessionId: null });
    const out = await c.callTool("search_certifications", { query: "nursing" });
    assert.equal(out.isError, undefined);
    assert.ok(calls.every((call) => call.headers["Mcp-Session-Id"] === undefined));
  });

  it("honours the GOLDSEAM_MCP_URL env override", async () => {
    const upstream = makeUpstream();
    const c = new LearnindexClient({
      fetchFn: upstream.fetchFn,
      env: { GOLDSEAM_MCP_URL: "https://staging.example.com/mcp" },
    });
    await c.callTool("search_certifications", { query: "nursing" });
    assert.ok(
      upstream.calls.every(
        (call) => call.url === "https://staging.example.com/mcp",
      ),
    );
  });

  it("honours an explicit url override over the default endpoint", async () => {
    const upstream = makeUpstream();
    const c = createClient({
      fetchFn: upstream.fetchFn,
      env: {},
      url: "https://alt.example.com/mcp",
    });
    await c.callTool("search_certifications", { query: "nursing" });
    assert.ok(
      upstream.calls.every((call) => call.url === "https://alt.example.com/mcp"),
    );
  });

  it("prefers an explicit url override over the env override", async () => {
    const upstream = makeUpstream();
    const c = createClient({
      fetchFn: upstream.fetchFn,
      env: { GOLDSEAM_MCP_URL: "https://env.example.com/mcp" },
      url: "https://explicit.example.com/mcp",
    });
    await c.callTool("search_certifications", { query: "nursing" });
    assert.ok(
      upstream.calls.every(
        (call) => call.url === "https://explicit.example.com/mcp",
      ),
    );
  });

  it("falls back to the pinned endpoint when the env override is blank", async () => {
    const upstream = makeUpstream();
    const c = new LearnindexClient({
      fetchFn: upstream.fetchFn,
      env: { GOLDSEAM_MCP_URL: "   " },
    });
    await c.callTool("search_certifications", { query: "nursing" });
    assert.ok(upstream.calls.every((call) => call.url === DEFAULT_ENDPOINT_URL));
  });
});

/* ------------------------------------------------------------------ */

describe("no auth header is ever sent (record declares NO headers)", () => {
  it("sends no Authorization header when the environment is empty", async () => {
    const { client: c, calls } = stubClient();
    await c.callTool("search_certifications", { query: "nursing" });
    assert.equal(calls.length, 3);
    assert.ok(calls.every((call) => call.headers["Authorization"] === undefined));
  });

  it("sends no Authorization header even when a GOLDSEAM_API_KEY-style env var is present", async () => {
    const upstream = makeUpstream();
    const c = new LearnindexClient({
      fetchFn: upstream.fetchFn,
      env: { GOLDSEAM_API_KEY: "some-key-42" },
    });
    await c.callTool("search_certifications", { query: "nursing" });
    assert.ok(
      upstream.calls.every((call) => call.headers["Authorization"] === undefined),
    );
  });

  it("sends no Authorization header even when AUTHORIZATION / API_KEY env vars are present", async () => {
    const upstream = makeUpstream();
    const c = new LearnindexClient({
      fetchFn: upstream.fetchFn,
      env: {
        AUTHORIZATION: "Bearer x",
        API_KEY: "y",
        GOLDSEAM_TOKEN: "z",
      },
    });
    await c.callTool("get_certification", { id: "cert-1" });
    assert.ok(
      upstream.calls.every((call) => call.headers["Authorization"] === undefined),
    );
  });

  it("never sends an X-API-Key header either", async () => {
    const upstream = makeUpstream();
    const c = new LearnindexClient({
      fetchFn: upstream.fetchFn,
      env: { GOLDSEAM_API_KEY: "some-key-42" },
    });
    await c.callTool("search_certifications", { query: "nursing" });
    assert.ok(
      upstream.calls.every((call) => call.headers["X-API-Key"] === undefined),
    );
  });

  it("sends only Content-Type, Accept and (when issued) Mcp-Session-Id headers", async () => {
    const { client: c, calls } = stubClient();
    await c.callTool("search_certifications", { query: "nursing" });
    assert.deepEqual(Object.keys(calls[0].headers).sort(), [
      "Accept",
      "Content-Type",
    ]);
    assert.deepEqual(Object.keys(calls[2].headers).sort(), [
      "Accept",
      "Content-Type",
      "Mcp-Session-Id",
    ]);
  });
});

/* ------------------------------------------------------------------ */

describe("tools/call forwarding", () => {
  for (const tool of fixture.tools) {
    it(`forwards a ${tool.name} call verbatim under its own name`, async () => {
      const upstream = makeUpstream();
      const c = createClient({ fetchFn: upstream.fetchFn, env: {} });
      const args = sampleArgsFor(tool);
      const out = await c.callTool(tool.name, args);
      assert.deepEqual(out, SAMPLE_RESULT);
      const params = upstream.calls[2].body.params as Record<string, unknown>;
      assert.equal(params.name, tool.name);
      assert.deepEqual(params.arguments, args);
    });
  }

  it("forwards a search_certifications call with query, issuer, limit and offset", async () => {
    const { client: c, calls } = stubClient();
    await c.callTool("search_certifications", {
      query: "nursing",
      issuer: "IBM",
      limit: 10,
      offset: 20,
    });
    const params = calls[2].body.params as Record<string, unknown>;
    assert.equal(params.name, "search_certifications");
    assert.deepEqual(params.arguments, {
      query: "nursing",
      issuer: "IBM",
      limit: 10,
      offset: 20,
    });
  });

  it("forwards a will_my_credits_transfer call with its held items untouched", async () => {
    const upstream = makeUpstream();
    const c = createClient({ fetchFn: upstream.fetchFn, env: {} });
    const held = [
      { program: "AP", exam: "United States History", score: 3 },
      { unitid: "216038", code: "BIOL 100" },
    ];
    await c.callTool("will_my_credits_transfer", {
      held,
      target_unitid: "216038",
    });
    const params = upstream.calls[2].body.params as Record<string, unknown>;
    assert.equal(params.name, "will_my_credits_transfer");
    assert.deepEqual(params.arguments, { held, target_unitid: "216038" });
  });

  it("forwards a comparable_map call with its single item untouched", async () => {
    const upstream = makeUpstream();
    const c = createClient({ fetchFn: upstream.fetchFn, env: {} });
    const item = { code: "BIOL 100", unitid: "216038" };
    await c.callTool("comparable_map", { target_unitid: "216038", item });
    const params = upstream.calls[2].body.params as Record<string, unknown>;
    assert.equal(params.name, "comparable_map");
    assert.deepEqual(params.arguments, { target_unitid: "216038", item });
  });

  it("forwards a checklist_map call carrying the optional package handle", async () => {
    const upstream = makeUpstream();
    const c = createClient({ fetchFn: upstream.fetchFn, env: {} });
    const pkg = { package_id: "pkg-1" };
    await c.callTool("checklist_map", {
      target_unitid: "216038",
      package: pkg,
    });
    const params = upstream.calls[2].body.params as Record<string, unknown>;
    assert.equal(params.name, "checklist_map");
    assert.deepEqual(params.arguments, {
      target_unitid: "216038",
      package: pkg,
    });
  });

  it("forwards a find_my_best_pathway call with goal and level", async () => {
    const upstream = makeUpstream();
    const c = createClient({ fetchFn: upstream.fetchFn, env: {} });
    await c.callTool("find_my_best_pathway", {
      goal: "become a nurse",
      level: "bachelors",
    });
    const params = upstream.calls[2].body.params as Record<string, unknown>;
    assert.equal(params.name, "find_my_best_pathway");
    assert.deepEqual(params.arguments, {
      goal: "become a nurse",
      level: "bachelors",
    });
  });

  it("forwards a get_dictionary_summary call with empty arguments", async () => {
    const upstream = makeUpstream();
    const c = createClient({ fetchFn: upstream.fetchFn, env: {} });
    await c.callTool("get_dictionary_summary", {});
    const params = upstream.calls[2].body.params as Record<string, unknown>;
    assert.equal(params.name, "get_dictionary_summary");
    assert.deepEqual(params.arguments, {});
  });

  it("passes the upstream result through verbatim, including extra fields", async () => {
    const { client: c } = stubClient();
    const out = await c.callTool("search_certifications", { query: "nursing" });
    assert.deepEqual(out, SAMPLE_RESULT);
  });

  it("passes an upstream isError result through untouched", async () => {
    const upstreamResult = {
      content: [{ type: "text", text: "no such certification upstream" }],
      isError: true,
    };
    const { client: c } = stubClient({ callResult: upstreamResult });
    const out = await c.callTool("get_certification", { id: "nope" });
    assert.deepEqual(out, upstreamResult);
  });

  it("reads an SSE-framed tools/call response", async () => {
    const { client: c } = stubClient({ sse: true });
    const out = await c.callTool("search_certifications", { query: "nursing" });
    assert.equal(out.isError, undefined);
    assert.deepEqual(out, SAMPLE_RESULT);
  });

  it("the one-shot callTool helper forwards under the right tool name", async () => {
    const upstream = makeUpstream();
    const out = await callTool(
      "find_my_school",
      { major: "nursing", level: "bachelors" },
      { fetchFn: upstream.fetchFn, env: {} },
    );
    assert.equal(out.isError, undefined);
    const params = upstream.calls[2].body.params as Record<string, unknown>;
    assert.equal(params.name, "find_my_school");
    assert.deepEqual(params.arguments, {
      major: "nursing",
      level: "bachelors",
    });
  });
});

/* ------------------------------------------------------------------ */

describe("upstream failures surface as learnindex error text", () => {
  it("maps a JSON-RPC error to `learnindex error: <message>`", async () => {
    const { client: c } = stubClient({
      callError: { code: -32000, message: "search failed upstream" },
    });
    const out = await c.callTool("search_certifications", { query: "nursing" });
    assert.equal(out.isError, true);
    assert.equal(textOf(out), "learnindex error: search failed upstream");
  });

  it("maps an initialize JSON-RPC error to learnindex error text", async () => {
    const { client: c } = stubClient({
      initError: { code: -32600, message: "bad initialize" },
    });
    const out = await c.callTool("search_certifications", { query: "nursing" });
    assert.equal(out.isError, true);
    assert.equal(textOf(out), "learnindex error: bad initialize");
  });

  it("maps an unparseable upstream response to a malformed-response error", async () => {
    const { client: c } = stubClient({ callBodyText: "<html>oops</html>" });
    const out = await c.callTool("search_certifications", { query: "nursing" });
    assert.equal(out.isError, true);
    assert.equal(textOf(out), "learnindex error: malformed response");
  });

  it("maps a response with no result object to a malformed-response error", async () => {
    const { client: c } = stubClient({
      callBodyText: '{"jsonrpc":"2.0","id":3,"result":null}',
    });
    const out = await c.callTool("search_certifications", { query: "nursing" });
    assert.equal(out.isError, true);
    assert.equal(textOf(out), "learnindex error: malformed response");
  });

  it("maps a non-2xx upstream status to learnindex error text", async () => {
    const { client: c } = stubClient({
      callBodyText: "internal error",
      callStatus: 500,
    });
    const out = await c.callTool("search_certifications", { query: "nursing" });
    assert.equal(out.isError, true);
    assert.equal(textOf(out), "learnindex error: HTTP 500");
  });

  it("maps a throwing fetch to learnindex error text", async () => {
    const { client: c } = stubClient({ throwOn: "tools/call" });
    const out = await c.callTool("search_certifications", { query: "nursing" });
    assert.equal(out.isError, true);
    assert.match(textOf(out), /^learnindex error: /);
  });

  it("maps a throwing initialize fetch to learnindex error text", async () => {
    const { client: c } = stubClient({ throwOn: "initialize" });
    const out = await c.callTool("search_certifications", { query: "nursing" });
    assert.equal(out.isError, true);
    assert.equal(textOf(out), "learnindex error: socket hang up");
  });

  it("maps a timed-out call to learnindex error text", async () => {
    const { client: c } = stubClient({ hangOnCall: true }, { timeoutMs: 20 });
    const out = await c.callTool("search_certifications", { query: "nursing" });
    assert.equal(out.isError, true);
    assert.match(textOf(out), /^learnindex error: /);
  });
});

/* ------------------------------------------------------------------ */

describe("parseRpcBody", () => {
  it("parses plain JSON and picks the message with the matching id", () => {
    const body = '{"jsonrpc":"2.0","id":7,"result":{"ok":true}}';
    assert.deepEqual(parseRpcBody(body, 7), {
      jsonrpc: "2.0",
      id: 7,
      result: { ok: true },
    });
  });

  it("parses SSE data lines", () => {
    const body =
      'event: message\ndata: {"jsonrpc":"2.0","id":2,"result":{"ok":true}}\n\n';
    assert.deepEqual(parseRpcBody(body, 2), {
      jsonrpc: "2.0",
      id: 2,
      result: { ok: true },
    });
  });

  it("picks the matching id among several SSE messages", () => {
    const body =
      'data: {"jsonrpc":"2.0","id":1,"result":{"n":1}}\n\n' +
      'data: {"jsonrpc":"2.0","id":2,"result":{"n":2}}\n\n';
    assert.deepEqual(parseRpcBody(body, 2), {
      jsonrpc: "2.0",
      id: 2,
      result: { n: 2 },
    });
  });

  it("ignores the SSE [DONE] sentinel", () => {
    const body =
      'data: {"jsonrpc":"2.0","id":4,"result":{"ok":true}}\ndata: [DONE]\n';
    assert.deepEqual(parseRpcBody(body, 4), {
      jsonrpc: "2.0",
      id: 4,
      result: { ok: true },
    });
  });

  it("returns null for empty and unparseable bodies", () => {
    assert.equal(parseRpcBody(""), null);
    assert.equal(parseRpcBody("not json at all"), null);
    assert.equal(parseRpcBody("[1,2,3]"), null);
  });
});

/* ------------------------------------------------------------------ */

describe("MCP layer validation", () => {
  it("rejects an unknown tool with MethodNotFound before any network hop", async () => {
    const upstream = makeUpstream();
    const c = createClient({ fetchFn: upstream.fetchFn, env: {} });
    await assert.rejects(
      () => handleCallTool(c, "not_a_tool", {}),
      (err: unknown) =>
        err instanceof McpError && err.code === ErrorCode.MethodNotFound,
    );
    assert.equal(upstream.calls.length, 0);
  });

  it("rejects array arguments with InvalidParams before any network hop", async () => {
    const upstream = makeUpstream();
    const c = createClient({ fetchFn: upstream.fetchFn, env: {} });
    await assert.rejects(
      () => handleCallTool(c, "search_certifications", ["nope"]),
      (err: unknown) =>
        err instanceof McpError && err.code === ErrorCode.InvalidParams,
    );
    assert.equal(upstream.calls.length, 0);
  });

  it("rejects string arguments with InvalidParams before any network hop", async () => {
    const upstream = makeUpstream();
    const c = createClient({ fetchFn: upstream.fetchFn, env: {} });
    await assert.rejects(
      () => handleCallTool(c, "search_certifications", "query=nursing"),
      (err: unknown) =>
        err instanceof McpError && err.code === ErrorCode.InvalidParams,
    );
    assert.equal(upstream.calls.length, 0);
  });

  it("forwards a valid search_certifications call through the MCP layer unchanged", async () => {
    const upstream = makeUpstream();
    const c = createClient({ fetchFn: upstream.fetchFn, env: {} });
    const out = await handleCallTool(c, "search_certifications", {
      query: "nursing",
    });
    assert.deepEqual(out, SAMPLE_RESULT);
    const params = upstream.calls[2].body.params as Record<string, unknown>;
    assert.deepEqual(params.arguments, { query: "nursing" });
  });

  it("forwards a valid list_issuers call through the MCP layer unchanged", async () => {
    const upstream = makeUpstream();
    const c = createClient({ fetchFn: upstream.fetchFn, env: {} });
    const out = await handleCallTool(c, "list_issuers", {});
    assert.deepEqual(out, SAMPLE_RESULT);
    const params = upstream.calls[2].body.params as Record<string, unknown>;
    assert.equal(params.name, "list_issuers");
    assert.deepEqual(params.arguments, {});
  });

  it("treats omitted arguments as an empty object", async () => {
    const upstream = makeUpstream();
    const c = createClient({ fetchFn: upstream.fetchFn, env: {} });
    const out = await handleCallTool(c, "get_dictionary_summary", undefined);
    assert.deepEqual(out, SAMPLE_RESULT);
    const params = upstream.calls[2].body.params as Record<string, unknown>;
    assert.deepEqual(params.arguments, {});
  });

  it("an MCP tools/call round-trips a kept tool end to end", async () => {
    const upstream = makeUpstream();
    const out = await withMcpClient(upstream, async (client) => {
      return client.callTool({
        name: "get_certification",
        arguments: { id: "cert-1" },
      });
    });
    assert.deepEqual(out.content, SAMPLE_RESULT.content);
    const params = upstream.calls[2].body.params as Record<string, unknown>;
    assert.equal(params.name, "get_certification");
    assert.deepEqual(params.arguments, { id: "cert-1" });
  });

  it("an MCP tools/call for an unknown tool is rejected and never reaches the upstream", async () => {
    const upstream = makeUpstream();
    await withMcpClient(upstream, async (client) => {
      await assert.rejects(() =>
        client.callTool({ name: "delete_everything", arguments: {} }),
      );
    });
    assert.equal(upstream.calls.length, 0);
  });
});

/* ------------------------------------------------------------------ */

describe("CLI", () => {
  it("--version prints 0.1.0 and exits 0", () => {
    const res = runCli(["--version"]);
    assert.equal(res.status, 0);
    assert.equal(res.stdout.trim(), "0.1.0");
    assert.equal(res.stdout.trim(), VERSION);
  });

  it("-v prints 0.1.0 and exits 0", () => {
    const res = runCli(["-v"]);
    assert.equal(res.status, 0);
    assert.equal(res.stdout.trim(), "0.1.0");
  });

  it("an unknown command prints usage on stderr and exits 2", () => {
    const res = runCli(["not-a-tool"]);
    assert.equal(res.status, 2);
    assert.match(res.stderr, /Usage:/);
    assert.match(res.stderr, /search_certifications/);
    assert.match(res.stderr, /find_my_best_pathway/);
  });

  it("usage lists all 51 kept tools and none of the omitted ones", () => {
    const res = runCli(["not-a-tool"]);
    assert.equal(res.status, 2);
    for (const name of KEPT_TOOLS) {
      assert.ok(res.stderr.includes(name), `usage missing ${name}`);
    }
    for (const name of OMITTED) {
      assert.equal(res.stderr.includes(name), false, `usage leaks ${name}`);
    }
  });

  it("no command at all prints usage on stderr and exits 2", () => {
    const res = runCli([]);
    assert.equal(res.status, 2);
    assert.match(res.stderr, /Usage:/);
  });

  it("a non-JSON argument exits 2", () => {
    const res = runCli(["search_certifications", "not json"]);
    assert.equal(res.status, 2);
  });

  it("a JSON array argument exits 2", () => {
    const res = runCli(["search_certifications", "[]"]);
    assert.equal(res.status, 2);
  });

  it("extra arguments after a tool exit 2", () => {
    const res = runCli(["search_certifications", "{}", "extra"]);
    assert.equal(res.status, 2);
  });

  it("extra arguments after mcp exit 2", () => {
    const res = runCli(["mcp", "extra"]);
    assert.equal(res.status, 2);
  });
});
