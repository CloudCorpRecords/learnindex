# learnindex

Look up how learning counts in the United States — which certifications exist, who issues them, which schools run which programs, what a program's checklist demands, and whether credits move between institutions — without keeping a local copy of any of it. learnindex is a small forwarding client for the hosted Goldseam MCP service: the tool list is answered from your own machine using captured definitions, and each call travels upstream, with the service's answer handed back exactly as it arrived.

This build is a labelled subset: 51 of the service's 57 captured tools. Everything that reads published data is here — certifications and their issuers and occupations, the KSA Dictionary and the CIP/SOC crosswalk, institutions, programs, learning units (courses), checklists, catalogs, published academic policies, articulation and transfer agreements, pathways, comparability bundles, transfer frameworks and the CourseShelf census — along with the comparators that run those published rules over structured items you supply, and the demo-persona transcript reads. The six tools that assemble an evidence package out of a person's own transcript files, resume and life-experience statements are deliberately not part of this rebuild.

## The tools

Certifications and the dictionary:

- **`search_certifications`** — Find certifications from an everyday-words `query`, optionally narrowed by issuer.
- **`get_certification`** — The full record for one certification `id`.
- **`certifications_for_occupation`** — Certifications serving an occupation, by `soc` code.
- **`occupations_for_certification`** — Occupations served by one certification `id`.
- **`related_certifications`** — Certifications related to one certification `id`.
- **`certifications_for_program`** — Certifications tied to a program, by `cip` code.
- **`list_issuers`** — The organisations that issue certifications. No required arguments.
- **`resolve_term`** — Resolve a dictionary `term` to its entry.
- **`expand_term`** — Expand a dictionary `term` into its fuller treatment.
- **`get_dictionary_summary`** — Summary of the KSA Dictionary. No arguments.
- **`crosswalk_code`** — Walk a `code` across the CIP/SOC crosswalk.

Institutions, programs and courses:

- **`find_institution`** — Find institutions by name, place or domain. All filters optional.
- **`get_institution`** — One institution, by UNITID or organisation id.
- **`programs_for_institution`** — Programs run by the institution with the given `unitid`.
- **`find_programs`** — Find programs matching a `query`.
- **`get_program`** — One program by `program_id`.
- **`learning_units`** — The learning units (courses) of the institution with the given `unitid`.
- **`get_learning_unit`** — One learning unit by `learning_unit_id`.
- **`search_programs_and_learning_units`** — Search across programs and learning units at once. All filters optional.
- **`find_catalogs`** — Catalogs published by the institution with the given `unitid`.
- **`get_catalog`** — One catalog by `catalog_id`.
- **`find_my_major`** — Majors matching your situation. All filters optional.
- **`compare_my_major`** — Compare named `majors` at a study `level`.
- **`find_my_school`** — Schools for a `major` at a `level`, with optional cost, place and delivery filters.
- **`compare_my_school`** — Compare schools (`unitids`) for a `major` at a `level`.

Checklists, policies, agreements and transfer:

- **`get_checklist`** — One checklist by `checklist_id`.
- **`find_checklists`** — Checklists for the institution with the given `unitid`.
- **`compare_program_checklists`** — Compare one `program`'s checklists across institutions (`unitids`).
- **`checklists_requiring_learning_unit`** — Checklists that require a given `learning_unit_id`.
- **`checklist_map`** — Map held learning against the checklist of the school with the given `target_unitid`.
- **`find_policies`** — Published academic policies of the institution with the given `unitid`.
- **`get_policy`** — One policy by `policy_id`.
- **`find_agreements`** — Find articulation/transfer agreements. All filters optional.
- **`get_agreement`** — One agreement by `agreement_id`.
- **`find_pathways`** — Find pathways. All filters optional.
- **`get_pathway`** — One pathway by `pathway_id`.
- **`find_my_best_pathway`** — The best pathway toward a `goal` at a study `level`.
- **`find_comparability`** — Find comparability bundles. All filters optional.
- **`get_comparability`** — One comparability bundle by `comparability_id`.
- **`comparability_for_learning_unit`** — Comparability for a single course. All filters optional.
- **`comparability_for_courses`** — Comparability for many caller-supplied `items` against a `target_unitid`.
- **`comparable_map`** — Map one caller-supplied `item` against the school with the given `target_unitid`.
- **`will_my_credits_transfer`** — Whether caller-supplied `held` courses/exams transfer to the school with the given `target_unitid`.
- **`find_transfer_frameworks`** — Find transfer frameworks. All filters optional.
- **`get_transfer_framework`** — One transfer framework by `framework_id`.
- **`find_transitions`** — Find occupation transitions. All filters optional.
- **`compare_destinations`** — Compare destination occupations (`to_socs`) from an origin occupation (`from_soc`).

CourseShelf and personas:

- **`get_courseshelf_summary`** — Summary of the CourseShelf census holdings. No arguments.
- **`get_courseshelf_performance`** — The upstream service's own call-log read: times, tools and outcomes. All filters optional.
- **`list_persona_transcripts`** — Example transcripts of made-up demo personas. No arguments.
- **`get_persona_transcript`** — One demo persona's transcript, by `persona_id`.

Not included, by design: `assemble_my_formal_education`, `assemble_my_work_and_credentials`, `assert_my_life_experiences`, `my_selfie_ksa_view`, `draft_my_claims` and `suggest_credit_for_my_learning` — the personal-evidence ingestion cluster. This rebuild does not read a person's own documents or life-history statements.

## Install and run

As an MCP server via npm:

```bash
npx -y @reneturcios/learnindex mcp
```

MCP client configuration:

```json
{
  "mcpServers": {
    "learnindex": {
      "command": "npx",
      "args": ["-y", "@reneturcios/learnindex", "mcp"]
    }
  }
}
```

As a container:

```bash
docker run -i ghcr.io/cloudcorprecords/learnindex
docker run --rm ghcr.io/cloudcorprecords/learnindex search_certifications '{"query":"nursing"}'
```

## CLI

A single binary covers both the command line and the MCP server. Every kept tool is a subcommand whose one argument is a JSON string of that tool's inputs:

```bash
learnindex search_certifications '{"query":"welding"}'
learnindex get_certification '{"id":"LU_CERT_EXAMPLE"}'
learnindex list_issuers '{}'
learnindex will_my_credits_transfer '{"held":[],"target_unitid":"216038"}'
learnindex find_my_school '{"major":"nursing","level":"bachelors"}'
learnindex --version
```

Exit codes: `0` for a successful forwarded call, `1` when the result that comes back is an error, and `2` for usage mistakes like an unknown subcommand or a JSON argument that does not parse.

## Configuration

- `GOLDSEAM_MCP_URL` — Replaces the upstream endpoint. Defaults to the pinned hosted endpoint, `https://goldseam.ksaworks.com/mcp`. (This override variable is a reconstruction introduced by this rebuild.)

The Goldseam registry record lists no headers for its remote, so learnindex never attaches an authentication header — every call goes upstream keyless.

When the upstream cannot answer — it returns a JSON-RPC error, answers with a non-2xx status, sends a body that cannot be read, or the request itself fails — the caller receives an error result whose text begins with `learnindex error:`.

## How forwarding works

The first call of a process opens a session against the upstream: an `initialize` request (protocol version `2025-03-26`), a `notifications/initialized` notification, and then the `tools/call`. If the service issues an `Mcp-Session-Id` header during initialize, learnindex repeats it on subsequent requests and keeps reusing that one session until the process ends. Replies are understood in both plain JSON and server-sent-events framing. Successful results are passed through untouched, `isError` flag and any extra fields included.

## Development

```bash
npm install
npm run build   # tsc -> dist/ (dist/cli.js is the bin)
npm test        # tsx --test test/*.test.ts — stubbed upstream, no network
npm run dev     # run the CLI from source
```

The suite compares the served tool list against the captured surface tool for tool, asserts the six omitted tools are absent at the registry, MCP and CLI levels, walks the session handshake and its reuse, proves no `Authorization` header is sent under any environment, and confirms that arguments travel upstream unchanged and results return unchanged across the kept surface.

## License

MIT — see `LICENSE`. Copyright (c) 2026 Rene Turcios.
