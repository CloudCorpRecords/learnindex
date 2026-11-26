# BUILD REPORT — learnindex

Clean-room rebuild of `com.ksaworks/goldseam` v1.2.0
(remote-only MCP server at `https://goldseam.ksaworks.com/mcp`),
built 2026-10-28 as a forwarding client. Package: `@reneturcios/learnindex`
0.1.0, registry name `io.github.CloudCorpRecords/learnindex`.

## Surface built

**LABELLED SUBSET: 51 of the 57 captured tools built** — the
published-dataset surface plus the structured comparators and the
demo-persona reads. The six omitted tools are the personal-evidence
ingestion cluster, absent at registry, MCP-layer and CLI level
(asserted in tests):

- `assemble_my_formal_education`
- `assemble_my_work_and_credentials`
- `assert_my_life_experiences`
- `my_selfie_ksa_view`
- `draft_my_claims`
- `suggest_credit_for_my_learning`

Kept tools, with required fields exactly as served:

| Tool | Required fields as served |
|------|---------------------------|
| `search_certifications` | `query` |
| `get_certification` | `id` |
| `certifications_for_occupation` | `soc` |
| `occupations_for_certification` | `id` |
| `related_certifications` | `id` |
| `certifications_for_program` | `cip` |
| `list_issuers` | *(empty `required: []`, present verbatim)* |
| `resolve_term` | `term` |
| `expand_term` | `term` |
| `get_dictionary_summary` | *(none — no `required` key in the capture, served verbatim)* |
| `crosswalk_code` | `code` |
| `compare_program_checklists` | `unitids`, `program` |
| `find_institution` | *(none — no `required` key)* |
| `programs_for_institution` | `unitid` |
| `get_checklist` | `checklist_id` |
| `learning_units` | `unitid` |
| `get_institution` | *(none — no `required` key; carries the captured `anyOf` identity requirement)* |
| `find_catalogs` | `unitid` |
| `get_catalog` | `catalog_id` |
| `find_programs` | `query` |
| `get_program` | `program_id` |
| `get_learning_unit` | `learning_unit_id` |
| `find_policies` | `unitid` |
| `get_policy` | `policy_id` |
| `find_checklists` | `unitid` |
| `find_agreements` | *(none — no `required` key)* |
| `get_agreement` | `agreement_id` |
| `find_pathways` | *(none — no `required` key)* |
| `get_pathway` | `pathway_id` |
| `find_comparability` | *(none — no `required` key)* |
| `get_comparability` | `comparability_id` |
| `find_transfer_frameworks` | *(none — no `required` key)* |
| `get_transfer_framework` | `framework_id` |
| `checklists_requiring_learning_unit` | `learning_unit_id` |
| `search_programs_and_learning_units` | *(none — no `required` key)* |
| `get_courseshelf_summary` | *(none — no `required` key)* |
| `comparability_for_learning_unit` | *(none — no `required` key)* |
| `comparability_for_courses` | `target_unitid`, `items` |
| `get_courseshelf_performance` | *(none — no `required` key)* |
| `find_transitions` | *(none — no `required` key; carries the captured `anyOf` requirement)* |
| `compare_destinations` | `from_soc`, `to_socs` |
| `will_my_credits_transfer` | `held`, `target_unitid` |
| `comparable_map` | `target_unitid`, `item` |
| `checklist_map` | `target_unitid` |
| `list_persona_transcripts` | *(none — no `required` key)* |
| `get_persona_transcript` | `persona_id` |
| `find_my_major` | *(none — no `required` key; carries the captured `anyOf` requirement)* |
| `compare_my_major` | `majors`, `level` |
| `find_my_school` | `major`, `level` |
| `compare_my_school` | `unitids`, `major`, `level` |
| `find_my_best_pathway` | `goal`, `level` |

Each served tool carries exactly the keys `name`, `title`,
`description`, `inputSchema`. No inputSchema carries a `$schema`
marker or an `additionalProperties` key — none was captured, none
was invented. Shapes are served verbatim, including
`search_certifications`' optional `issuer`/`limit`/`offset` and its
`query` examples, `find_comparability`'s 13 filter properties and
its `kind` enum (`known`/`inferred`/`both`),
`will_my_credits_transfer`'s `held` (array of objects), the optional
`package` handle on `checklist_map` / `compare_my_school` /
`find_my_best_pathway`, and the `anyOf` blocks on `get_institution`,
`find_transitions` and `find_my_major`. The tool literals were
generated programmatically from
`harness/fixtures/ksaworks-goldseam-tools-original.json` by the
script at `/tmp/laneb8-learnindex-scratch/gen.py` (parse +
re-serialise, spliced into `src/forward.ts` between the
TOOL_DEFS_GENERATED markers) — never retyped — and the generator's
round-trip check confirmed the spliced block parses back deep-equal
to the fixture's 51 tool objects, in order. Tools are registered
via the MCP SDK low-level Server API (`ListToolsRequestSchema` /
`CallToolRequestSchema` handlers), not McpServer+zod.

Note: the captured description of `get_persona_transcript` mentions
two omitted tool names in its prose (it describes how its example
transcript relates to them). That text is fixture data and is
served verbatim; the omission holds at the registry, MCP-layer and
CLI levels, where no omitted tool can be listed or called.

## Fixture conflicts

**None.** The spec and the fixture agree on the 51 kept tools'
names, titles, descriptions, the `required` arrays (including
`list_issuers`' explicit empty `required: []` and the 14 tools with
no `required` key), the `anyOf` blocks, and the property shapes.

## Labelled reconstructions (from the spec's Wire section)

- Upstream endpoint pinned: `https://goldseam.ksaworks.com/mcp`.
- Env override `GOLDSEAM_MCP_URL` — labelled reconstruction.
- The registry record declares NO headers on the remote: no auth
  header is ever sent, under any environment. Tests assert that no
  `Authorization` header (and no `X-API-Key` header) is sent with an
  empty environment, with a `GOLDSEAM_API_KEY`-style variable
  present, and with `AUTHORIZATION` / `API_KEY` /
  `GOLDSEAM_TOKEN` variables present.
- Error rendering `learnindex error:` text for upstream failures
  — labelled reconstruction.
- Upstream results pass through verbatim, including `isError` and
  extra fields. tools/call is forwarded as streamable-HTTP JSON-RPC:
  initialize (protocolVersion `2025-03-26`) →
  notifications/initialized → tools/call, honouring `Mcp-Session-Id`
  when issued; plain-JSON and SSE replies are both parsed. The
  forwarding core takes an injectable fetch; tests stub the
  upstream — no live network calls in tests, and no live call is
  claimed beyond the coordinator's tools/list capture.

## Deviations

**None.** No write-guard workaround was needed in this session:
`tsc` and the test suite ran through the direct
`node_modules/.bin/` binaries, and `dist/` is the direct output
of `tsc` on the validated sources. The lockfile hash was stable
from birth: the clean Route-3 generation, the post-`npm ci`
on-disk file, and a fresh clean-room regeneration (empty
directory, package.json only) all hash identically to
`36065a0939cab2707edee797dff45ab07182d68a40c608da3f219449ed062f00`
(byte-for-byte, deep-equal, 128 entries).

## Lockfile

Generated clean from birth (Route 3, clean dir, no
`node_modules`, no pre-existing lockfile):
`npm install --package-lock-only --ignore-scripts --offline`
→ success. Parses as JSON; `name` == `@reneturcios/learnindex`;
exactly **128** package entries; sha256
`36065a0939cab2707edee797dff45ab07182d68a40c608da3f219449ed062f00`.
`npm ci --ignore-scripts --offline` then succeeded and the
lockfile sha256 was re-verified **unchanged** afterwards; a fresh
clean-room regeneration also reproduced it byte-for-byte.

## server.json

- Description exactly: "Published US learning data: certifications, institutions, programs, checklists, transfer." — **89 characters** (measured from the written file).
- npm package entry carries `"version": "0.1.0"`; the OCI entry
  (`ghcr.io/cloudcorprecords/learnindex:0.1.0`) carries **no**
  `version` field. Both entries carry packageArguments
  `[{type: positional, value: mcp}]` and transport stdio. Dockerfile
  (node:20-alpine, both stages) carries the label
  `io.modelcontextprotocol.server.name="io.github.CloudCorpRecords/learnindex"`.
  Container workflow `IMAGE` is `ghcr.io/cloudcorprecords/learnindex`
  and its smoke test asserts the server name `learnindex`.

## Verification (run 2026-10-28, builder session)

1. `npm install --package-lock-only --ignore-scripts --offline`
   → success; lockfile parses, name `@reneturcios/learnindex`,
   128 package entries (see Lockfile).
2. `npm ci --ignore-scripts --offline` → success.
3. `tsc --noEmit` (direct `node_modules/.bin/tsc`) → exit 0.
4. `tsc` build → exit 0; `node dist/cli.js --version` → `0.1.0`.
5. Full suite (`tsx --test test/*.test.ts`, direct
   `node_modules/.bin/tsx`) → **139 tests, 139 pass, 0 fail**
   (registration-integrity suite deep-equals the served tools/list
   against the fixture's 51 tools, in order, at both the registry
   level and through an in-memory-transport MCP `tools/list`; the
   full per-tool required map, the `list_issuers` empty-required
   case and the captured `anyOf` blocks are asserted; omission
   assertions cover all six omitted tools at registry, MCP-layer
   and CLI level; plus session handling/reuse, env override, the
   no-Authorization-header assertions under every environment,
   verbatim argument forwarding for all 51 tools and result
   pass-through including upstream isError, SSE parsing, error
   rendering, MCP-layer validation, and CLI behaviour).
6. Parity (harness, tools-file mode):
   `python3 /home/hatch/workspace/mcp-rebuild-100/harness/parity.py --original /home/hatch/workspace/mcp-rebuild-100/harness/fixtures/ksaworks-goldseam-tools-original.json --rebuild "stdio:node /home/hatch/workspace/mcp-rebuild-100/builds/learnindex/dist/cli.js mcp" --out /home/hatch/workspace/mcp-rebuild-100/builds/learnindex/parity-out`
   → **verdict PASS, parity 100.0** (51/51 identical, 0 missing,
   0 extra, no schema diffs). Output in `parity-out/`.
