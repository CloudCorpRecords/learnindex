/**
 * learnindex core: a forwarding client for the hosted
 * Goldseam MCP server, which publishes United States
 * learning data — certifications, institutions, programs,
 * course checklists, transfer agreements and pathways —
 * for read-only querying.
 *
 * Nothing from that catalogue is stored locally.
 * tools/list is answered from the literal definitions
 * below, which reproduce a live capture of the upstream
 * server word for word (name, title, description and
 * inputSchema exactly as captured). A tools/call travels
 * upstream over a streamable-HTTP JSON-RPC session: an
 * initialize POST, a notifications/initialized POST, then
 * the tools/call POST, carrying the Mcp-Session-Id
 * response header on later requests when the upstream
 * issues one. The session opens lazily on the first
 * forwarded call and is reused for the client's lifetime.
 *
 * This is a labelled subset: 51 of the 57 captured tools
 * are registered — the published-dataset surface plus the
 * structured comparators that run published rules over
 * caller-supplied items. The six omitted tools form the
 * personal-evidence ingestion cluster (they read a
 * person's own transcript files, resume and life-history
 * statements into an evidence package) and are absent
 * here at every level: registry, MCP layer and CLI.
 *
 * The endpoint is pinned to
 * https://goldseam.ksaworks.com/mcp and may be replaced
 * with the GOLDSEAM_MCP_URL environment variable (that
 * override is a labelled reconstruction). The registry
 * record declares NO headers on the remote: no auth
 * header is ever sent, under any environment.
 *
 * A successful upstream result is returned exactly as
 * received, isError flag and extra fields included.
 * Failures — an upstream JSON-RPC error, a non-2xx
 * status, a body that cannot be parsed, or a fetch that
 * throws or times out — become an isError result whose
 * text begins with `learnindex error:` (that rendering
 * is a labelled reconstruction). Replies may be plain
 * JSON or SSE (`data:` lines); the JSON-RPC message
 * whose id matches the request wins.
 */
import type {
  FetchFn,
  FetchResponseLike,
  ForwardDeps,
  ToolArgs,
  ToolDef,
  ToolResult,
} from "./types.js";

export const VERSION = "0.1.0";

export const DEFAULT_ENDPOINT_URL = "https://goldseam.ksaworks.com/mcp";

export const DEFAULT_TIMEOUT_MS = 30000;

export const PROTOCOL_VERSION = "2025-03-26";

/** The six captured tools this labelled subset deliberately omits. */
export const OMITTED_TOOLS: readonly string[] = [
  "assemble_my_formal_education",
  "assemble_my_work_and_credentials",
  "assert_my_life_experiences",
  "my_selfie_ksa_view",
  "draft_my_claims",
  "suggest_credit_for_my_learning",
];

/* ------------------------------------------------------------------ */
/* Tool definitions (tools/list literals, verbatim from the live       */
/* capture in harness/fixtures/ksaworks-goldseam-tools-original.json;  */
/* generated programmatically by parsing and re-serialising the        */
/* fixture JSON, never retyped)                                        */
/* ------------------------------------------------------------------ */

// TOOL_DEFS_GENERATED_START
export const TOOL_DEFS: ToolDef[] = [
  {
    "name": "search_certifications",
    "title": "Search Certifications",
    "description": "Which certification is this prose name? Start here for any plain question — a trade, field, job, skill, or company in everyday words. Returns candidates with ids, issuers, and source basis — candidates rather than a single guess when the name is ambiguous; the ids feed the other certification tools.",
    "inputSchema": {
      "properties": {
        "issuer": {
          "description": "Optional: only certifications from this organization",
          "type": "string"
        },
        "limit": {
          "description": "Optional page size (default 20, at most 50)",
          "type": "integer"
        },
        "offset": {
          "description": "Optional: the next_offset from a previous answer",
          "type": "integer"
        },
        "query": {
          "description": "What you are looking for, in everyday words — a trade, field, job, or company",
          "examples": [
            "nursing",
            "HVAC",
            "welding",
            "IBM",
            "project management"
          ],
          "type": "string"
        }
      },
      "required": [
        "query"
      ],
      "type": "object"
    }
  },
  {
    "name": "get_certification",
    "title": "Get Certification",
    "description": "Everything held about one certification: issuer and issuer domain, occupations served, exam and renewal requirements, education-or-experience routes, Credential Engine registry identity where held, and the basis and source URL for the claim.",
    "inputSchema": {
      "properties": {
        "id": {
          "description": "A certification id, copied from a search result's id field",
          "examples": [
            "LU_CERT_ONET_13108200_8F3480AC7A"
          ],
          "type": "string"
        }
      },
      "required": [
        "id"
      ],
      "type": "object"
    }
  },
  {
    "name": "certifications_for_occupation",
    "title": "Certifications for Occupation",
    "description": "What certifications serve this occupation? SOC-keyed lookup (dashed SOC accepted with or without the O*NET .00 suffix).",
    "inputSchema": {
      "properties": {
        "limit": {
          "description": "Optional page size (default 20, at most 50)",
          "type": "integer"
        },
        "offset": {
          "description": "Optional: the next_offset from a previous answer",
          "type": "integer"
        },
        "soc": {
          "description": "An occupation code (SOC), e.g. 29-1141 for Registered Nurses or 47-2111 for Electricians — don't know it? search by the job name instead",
          "examples": [
            "29-1141",
            "47-2111"
          ],
          "type": "string"
        }
      },
      "required": [
        "soc"
      ],
      "type": "object"
    }
  },
  {
    "name": "occupations_for_certification",
    "title": "Occupations for Certification",
    "description": "What occupations does this certification serve?",
    "inputSchema": {
      "properties": {
        "id": {
          "description": "A certification id, copied from a search result's id field",
          "examples": [
            "LU_CERT_ONET_13108200_8F3480AC7A"
          ],
          "type": "string"
        },
        "limit": {
          "description": "Optional page size (default 20, at most 50)",
          "type": "integer"
        },
        "offset": {
          "description": "Optional: the next_offset from a previous answer",
          "type": "integer"
        }
      },
      "required": [
        "id"
      ],
      "type": "object"
    }
  },
  {
    "name": "related_certifications",
    "title": "Related Certifications",
    "description": "What else serves the same occupation? Traverses on SOC only — a certification sharing solely an instructional program (CIP) is not related (contract § 4).",
    "inputSchema": {
      "properties": {
        "id": {
          "description": "A certification id to find others like it, copied from a search result's id field",
          "examples": [
            "LU_CERT_ONET_29114100_50CD2891D4"
          ],
          "type": "string"
        },
        "limit": {
          "description": "Optional page size (default 20, at most 50)",
          "type": "integer"
        },
        "offset": {
          "description": "Optional: the next_offset from a previous answer",
          "type": "integer"
        }
      },
      "required": [
        "id"
      ],
      "type": "object"
    }
  },
  {
    "name": "certifications_for_program",
    "title": "Certifications for Program",
    "description": "Broad academic cross-reference by instructional program (CIP). A deliberately broader, lower-precision question than an occupation lookup — never its peer (contract § 4).",
    "inputSchema": {
      "properties": {
        "cip": {
          "description": "A college program code (CIP), e.g. 51.3801 for Registered Nursing or 47.0201 for HVAC technology",
          "examples": [
            "51.3801",
            "47.0201"
          ],
          "type": "string"
        },
        "limit": {
          "description": "Optional page size (default 20, at most 50)",
          "type": "integer"
        },
        "offset": {
          "description": "Optional: the next_offset from a previous answer",
          "type": "integer"
        }
      },
      "required": [
        "cip"
      ],
      "type": "object"
    }
  },
  {
    "name": "list_issuers",
    "title": "List Issuers",
    "description": "The issuing organizations, optionally filtered by a name query.",
    "inputSchema": {
      "properties": {
        "limit": {
          "description": "Optional page size (default 20, at most 50)",
          "type": "integer"
        },
        "offset": {
          "description": "Optional: the next_offset from a previous answer",
          "type": "integer"
        },
        "query": {
          "description": "Optional: part of an organization's name",
          "examples": [
            "IBM",
            "nursing"
          ],
          "type": "string"
        }
      },
      "required": [],
      "type": "object"
    }
  },
  {
    "name": "resolve_term",
    "title": "Resolve Term",
    "description": "Where does a word place in the KSA model? The KSA Dictionary is the shared vocabulary that defines the terms a learner uses to assert what they know, do, and are — and the terms a learning offering uses to express what it comprises — so both sides resolve to the same identifiers, never spelling matches. Answers from three linked layers (governed lexicon, O*NET content model, WordNet-derived index), each placement attributed to its layer with provenance; the WordNet placement carries the word's definition (gloss) and synonyms.",
    "inputSchema": {
      "properties": {
        "term": {
          "description": "A word for something a person knows or can do, e.g. carpentry or mathematics",
          "examples": [
            "carpentry",
            "mathematics",
            "welding"
          ],
          "type": "string"
        }
      },
      "required": [
        "term"
      ],
      "type": "object"
    }
  },
  {
    "name": "expand_term",
    "title": "Expand Term",
    "description": "What is this word, upward? Walks the WordNet is-a (hypernym) chain meaning to parent meaning, from the word's KSA-mapped sense toward its broader categories, so every step stays in the sense it started in. Each step carries its definition (gloss) and synonyms.",
    "inputSchema": {
      "properties": {
        "term": {
          "description": "A word to see what broader kind of thing it is, e.g. carpentry",
          "examples": [
            "carpentry",
            "nursing"
          ],
          "type": "string"
        }
      },
      "required": [
        "term"
      ],
      "type": "object"
    }
  },
  {
    "name": "get_dictionary_summary",
    "title": "Get Dictionary Summary",
    "description": "What does the KSA Dictionary hold? The words and meanings it places, the governed terms, the O*NET content-model elements, the link words and the CIP-SOC crosswalk, each with its own version and build date where the layer publishes one, and an honest not held where it does not. Read as published at boot, never computed at request time, and never a word lookup: for one word use resolve_term. The words it holds are those it places; it is not all of WordNet, and the answer says so.",
    "inputSchema": {
      "properties": {},
      "type": "object"
    }
  },
  {
    "name": "crosswalk_code",
    "title": "Crosswalk Code",
    "description": "What does this code cross to? Auto-detects the family — dotted CIP (52.0201) or dashed SOC (11-1021, O*NET .00 suffix accepted) — and answers the other family's codes and titles from the federal CIP-SOC crosswalk.",
    "inputSchema": {
      "properties": {
        "code": {
          "description": "A college program code (CIP, e.g. 51.3801) or an occupation code (SOC, e.g. 29-1141)",
          "examples": [
            "51.3801",
            "29-1141"
          ],
          "type": "string"
        },
        "limit": {
          "description": "Optional page size (default 20, at most 50)",
          "type": "integer"
        },
        "offset": {
          "description": "Optional: the next_offset from a previous answer",
          "type": "integer"
        }
      },
      "required": [
        "code"
      ],
      "type": "object"
    }
  },
  {
    "name": "compare_program_checklists",
    "title": "Compare Program Checklists",
    "description": "Compare what a program takes at several institutions: for each IPEDS UNITID, that institution's published checklist for the program (requirement groups, items, published credit strings — the work effort) beside its published tuition and fee policy (the cost). Schedule is stated not held. Nothing is summed or computed by the service; an institution, checklist, or cost the catalogs do not hold is stated as such. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "detail": {
          "description": "Optional: full (the default: every requirement group and item) or summary (per checklist its program, award, year, credits and group and item counts, with each school's College Scorecard tuition)",
          "examples": [
            "summary"
          ],
          "type": "string"
        },
        "institution_offset": {
          "description": "Optional: the next_institution_offset from a previous answer, for the next 5 institutions",
          "type": "integer"
        },
        "program": {
          "description": "Program or award words to match, e.g. nursing or Bachelor of Science in Nursing",
          "examples": [
            "Welding"
          ],
          "type": "string"
        },
        "unitids": {
          "description": "1 to 10 IPEDS UNITIDs, e.g. [\"100663\", \"127060\"]; answered 5 institutions per call, up to 3 checklists each",
          "examples": [
            [
              "225070"
            ]
          ],
          "items": {
            "type": "string"
          },
          "type": "array"
        }
      },
      "required": [
        "unitids",
        "program"
      ],
      "type": "object"
    }
  },
  {
    "name": "find_institution",
    "title": "Find Institution",
    "description": "Which institution is this? A name fragment or an IPEDS UNITID answers with the institution's identity, sector, identifiers with their sources, and how many programs, checklists, and learning units its published catalog holds here. A state lists that state's institutions by name; with no name and no state, the answer is the states that hold institutions, each with its count. A web address answers the institution that publishes it, so a school named by its own site is identified without an IPEDS number in hand. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "city": {
          "description": "Optional city, one of a state answer's cities, e.g. Denison",
          "examples": [
            "Denison"
          ],
          "type": "string"
        },
        "domain": {
          "description": "Optional: the institution's own web address, matched against the addresses it publishes, e.g. uindy.edu",
          "examples": [
            "uindy.edu"
          ],
          "type": "string"
        },
        "limit": {
          "description": "Optional page size (default 20, at most 100)",
          "type": "integer"
        },
        "offset": {
          "description": "Optional: the next_offset from a previous answer",
          "type": "integer"
        },
        "query": {
          "description": "Name fragment or IPEDS UNITID, e.g. Denver or 127060",
          "examples": [
            "Grayson",
            "225070"
          ],
          "type": "string"
        },
        "state": {
          "description": "Optional two-letter state, e.g. TX: that state's institutions, those with a catalog held first; the answer lists the state's cities",
          "examples": [
            "TX"
          ],
          "type": "string"
        }
      },
      "type": "object"
    }
  },
  {
    "name": "programs_for_institution",
    "title": "Programs for Institution",
    "description": "What programs does this institution publish? Award, credential class, CIP, the published credit figure verbatim, catalog edition, the captured page each came from, and the checklist ids to pass to get_checklist. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "limit": {
          "description": "Optional page size (default 100, at most 200)",
          "type": "integer"
        },
        "offset": {
          "description": "Optional: the next_offset from a previous answer",
          "type": "integer"
        },
        "query": {
          "description": "Optional program or award words to filter by",
          "type": "string"
        },
        "unitid": {
          "description": "The institution's IPEDS UNITID",
          "examples": [
            "225070"
          ],
          "type": "string"
        }
      },
      "required": [
        "unitid"
      ],
      "type": "object"
    }
  },
  {
    "name": "get_checklist",
    "title": "Get Checklist",
    "description": "What does this award require? One checklist: its requirement groups (every header and full item count), each group's items with published credit strings, alternatives, and — where an item resolved to a course — that course's own code, title, and published credits, attributed to the course. Items come in pages across the groups; the answer states items_total and next_item_offset. Every row names the captured page it came from. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "checklist_id": {
          "description": "A checklist id from programs_for_institution or compare_program_checklists",
          "examples": [
            "CK_225070_05e6e123"
          ],
          "type": "string"
        },
        "item_limit": {
          "description": "Optional items per page (default 60, at most 150)",
          "type": "integer"
        },
        "item_offset": {
          "description": "Optional: the next_item_offset from a previous answer",
          "type": "integer"
        }
      },
      "required": [
        "checklist_id"
      ],
      "type": "object"
    }
  },
  {
    "name": "learning_units",
    "title": "Learning Units",
    "description": "What courses does this institution publish? Filter by subject abbreviation, course code (spaces and case ignored), or title words; each course carries its published credit string verbatim (ranges stay ranges), edition, and the captured page. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "code": {
          "description": "Optional course code, e.g. BIO 201",
          "type": "string"
        },
        "limit": {
          "description": "Optional page size (default 50, at most 100)",
          "type": "integer"
        },
        "offset": {
          "description": "Optional: the next_offset from a previous answer",
          "type": "integer"
        },
        "query": {
          "description": "Optional title words",
          "type": "string"
        },
        "subject": {
          "description": "Optional subject abbreviation, e.g. BIO",
          "examples": [
            "RNSG"
          ],
          "type": "string"
        },
        "unit_type": {
          "description": "Optional learning-unit type, one of the answer's unit_types, e.g. course",
          "type": "string"
        },
        "unitid": {
          "description": "The institution's IPEDS UNITID",
          "examples": [
            "225070"
          ],
          "type": "string"
        }
      },
      "required": [
        "unitid"
      ],
      "type": "object"
    }
  },
  {
    "name": "get_institution",
    "title": "Get Institution",
    "description": "Everything held about one institution: its identity row, identifiers, addresses, websites, accreditations, relationships, identity history, published costs and calendar dates, each table under its own name, with counts of its programs, courses, checklists, catalogs, policies and agreements and the service that lists each. Contacts name people and are not served. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "anyOf": [
        {
          "required": [
            "organization_id"
          ]
        },
        {
          "required": [
            "unitid"
          ]
        }
      ],
      "properties": {
        "organization_id": {
          "description": "The institution's organization id from find_institution, e.g. ORG_225070",
          "examples": [
            "ORG_225070"
          ],
          "type": "string"
        },
        "unitid": {
          "description": "Or its IPEDS UNITID instead, e.g. 225070",
          "type": "string"
        }
      },
      "type": "object"
    }
  },
  {
    "name": "find_catalogs",
    "title": "Find Catalogs",
    "description": "Which published catalog editions are held for this institution? Each catalog's edition year, format and source. Answers none held when the build holds none. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "limit": {
          "description": "Optional page size (default 20, at most 100)",
          "type": "integer"
        },
        "offset": {
          "description": "Optional: the next_offset from a previous answer",
          "type": "integer"
        },
        "unitid": {
          "description": "The institution's IPEDS UNITID, e.g. 225070",
          "type": "string"
        }
      },
      "required": [
        "unitid"
      ],
      "type": "object"
    }
  },
  {
    "name": "get_catalog",
    "title": "Get Catalog",
    "description": "One catalog edition: its row, the institutions that use it (and whom it is shared from), and how many programs it holds. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "catalog_id": {
          "description": "A catalog id from find_catalogs",
          "type": "string"
        }
      },
      "required": [
        "catalog_id"
      ],
      "type": "object"
    }
  },
  {
    "name": "find_programs",
    "title": "Find Programs",
    "description": "Which programs match these words, across institutions? Program or award words (optionally one institution's UNITID) answer with each program's award, CIP, published credit figure verbatim, edition, source page and institution. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "city": {
          "description": "Optional city: programs at that city's institutions",
          "type": "string"
        },
        "limit": {
          "description": "Optional page size (default 20, at most 100)",
          "type": "integer"
        },
        "offset": {
          "description": "Optional: the next_offset from a previous answer",
          "type": "integer"
        },
        "query": {
          "description": "Program or award words, e.g. welding or nursing",
          "examples": [
            "Welding"
          ],
          "type": "string"
        },
        "state": {
          "description": "Optional two-letter state: programs at that state's institutions",
          "type": "string"
        },
        "unitid": {
          "description": "Optional: one institution's IPEDS UNITID",
          "type": "string"
        }
      },
      "required": [
        "query"
      ],
      "type": "object"
    }
  },
  {
    "name": "get_program",
    "title": "Get Program",
    "description": "One program whole: its row, identifiers, offerings (campus resolved), its institution, and the checklists that lead to its award — pass one to get_checklist. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "program_id": {
          "description": "A program id from programs_for_institution or find_programs",
          "examples": [
            "PG_225070_8c96bb26"
          ],
          "type": "string"
        }
      },
      "required": [
        "program_id"
      ],
      "type": "object"
    }
  },
  {
    "name": "get_learning_unit",
    "title": "Get Learning Unit",
    "description": "One course whole: its row, prerequisites and corequisites, aliases, terms offered, articulation statements and comparable members — each linked course resolved or stated unresolved, never guessed — plus the transfer frameworks it maps to. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "learning_unit_id": {
          "description": "A learning unit id from learning_units or get_checklist",
          "examples": [
            "LU_course_225070_ENGL1301_20262027"
          ],
          "type": "string"
        }
      },
      "required": [
        "learning_unit_id"
      ],
      "type": "object"
    }
  },
  {
    "name": "find_policies",
    "title": "Find Policies",
    "description": "Which academic policies does this institution publish (transfer credit, prior learning, tuition and fees …)? Optional words narrow them. Answers none held when the build holds none. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "limit": {
          "description": "Optional page size (default 20, at most 100)",
          "type": "integer"
        },
        "offset": {
          "description": "Optional: the next_offset from a previous answer",
          "type": "integer"
        },
        "query": {
          "description": "Optional policy words, e.g. transfer",
          "type": "string"
        },
        "unitid": {
          "description": "The institution's IPEDS UNITID, e.g. 225070",
          "type": "string"
        }
      },
      "required": [
        "unitid"
      ],
      "type": "object"
    }
  },
  {
    "name": "get_policy",
    "title": "Get Policy",
    "description": "One published academic policy: its section, verbatim text, page, edition and source. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "policy_id": {
          "description": "A policy id from find_policies",
          "type": "string"
        }
      },
      "required": [
        "policy_id"
      ],
      "type": "object"
    }
  },
  {
    "name": "find_checklists",
    "title": "Find Checklists",
    "description": "Which checklists — the generic itinerary of requirements for an award — does this institution publish? Optional award words or a program id narrow them; pass one to get_checklist. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "limit": {
          "description": "Optional page size (default 20, at most 100)",
          "type": "integer"
        },
        "offset": {
          "description": "Optional: the next_offset from a previous answer",
          "type": "integer"
        },
        "program_id": {
          "description": "Optional: one program's id",
          "type": "string"
        },
        "query": {
          "description": "Optional award words, e.g. welding",
          "type": "string"
        },
        "unitid": {
          "description": "The institution's IPEDS UNITID",
          "examples": [
            "225070"
          ],
          "type": "string"
        }
      },
      "required": [
        "unitid"
      ],
      "type": "object"
    }
  },
  {
    "name": "find_agreements",
    "title": "Find Agreements",
    "description": "Which articulation or transfer agreements are held? Optional title words, or an institution's UNITID as a party. Answers none held when the build holds none. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "limit": {
          "description": "Optional page size (default 20, at most 100)",
          "type": "integer"
        },
        "offset": {
          "description": "Optional: the next_offset from a previous answer",
          "type": "integer"
        },
        "query": {
          "description": "Optional agreement title words",
          "type": "string"
        },
        "unitid": {
          "description": "Optional: an institution party's IPEDS UNITID",
          "type": "string"
        }
      },
      "type": "object"
    }
  },
  {
    "name": "get_agreement",
    "title": "Get Agreement",
    "description": "One agreement: its row, its parties (organizations resolved), and the pathways, comparability bundles and checklists that cite it. Signatories name people and are not served. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "agreement_id": {
          "description": "An agreement id from find_agreements",
          "type": "string"
        }
      },
      "required": [
        "agreement_id"
      ],
      "type": "object"
    }
  },
  {
    "name": "find_pathways",
    "title": "Find Pathways",
    "description": "Which pathways are held? Optional title words, an agreement id, or a checklist id. Answers none held when the build holds none. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "agreement_id": {
          "description": "Optional: the agreement a pathway rests on",
          "type": "string"
        },
        "checklist_id": {
          "description": "Optional: the checklist a pathway follows",
          "type": "string"
        },
        "limit": {
          "description": "Optional page size (default 20, at most 100)",
          "type": "integer"
        },
        "offset": {
          "description": "Optional: the next_offset from a previous answer",
          "type": "integer"
        },
        "query": {
          "description": "Optional pathway title words",
          "type": "string"
        }
      },
      "type": "object"
    }
  },
  {
    "name": "get_pathway",
    "title": "Get Pathway",
    "description": "One pathway: its row and the checklist and agreement it links. Contacts name people and are not served. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "pathway_id": {
          "description": "A pathway id from find_pathways",
          "type": "string"
        }
      },
      "required": [
        "pathway_id"
      ],
      "type": "object"
    }
  },
  {
    "name": "find_comparability",
    "title": "Find Comparability",
    "description": "Count and list stored comparability bundles by type, sending institution, receiving institution, source authority and known/inferred kind, with agreement, learning-unit and exam filters. Filters combine and remain in pagination. Counts describe stored_comparability_records, not a live four-source inference inventory. Read full evidence with get_comparability. Answers none held when the selected stored records are absent. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "agreement_id": {
          "description": "Optional: the agreement that states it",
          "type": "string"
        },
        "bundle_type": {
          "description": "Optional: the bundle type, case aside, e.g. ExamScore or CourseTransfer",
          "type": "string"
        },
        "exam_code": {
          "description": "Optional: the exam code, case and spacing aside, e.g. AP 0300",
          "type": "string"
        },
        "exam_program": {
          "description": "Optional: the exam programme, case aside, e.g. AP",
          "type": "string"
        },
        "kind": {
          "description": "Stored known or inferred records; both by default. Does not initiate live inference",
          "enum": [
            "known",
            "inferred",
            "both"
          ],
          "type": "string"
        },
        "learning_unit_id": {
          "description": "Optional: a course named in it",
          "type": "string"
        },
        "limit": {
          "description": "Optional page size (default 20, at most 100)",
          "type": "integer"
        },
        "offset": {
          "description": "Optional: the next_offset from a previous answer",
          "type": "integer"
        },
        "receiving_organization_id": {
          "description": "Optional: exact receiving organization ID; unitid remains the receiving IPEDS filter",
          "type": "string"
        },
        "sending_organization_id": {
          "description": "Optional: exact sending organization ID, including sources without an IPEDS UNITID",
          "type": "string"
        },
        "sending_unitid": {
          "description": "Optional: sending institution's actual IPEDS UNITID",
          "type": "string"
        },
        "source_authority": {
          "description": "Optional: stored source authority, distinct from sending institution",
          "type": "string"
        },
        "unitid": {
          "description": "Optional: the receiving institution's IPEDS UNITID",
          "type": "string"
        }
      },
      "type": "object"
    }
  },
  {
    "name": "get_comparability",
    "title": "Get Comparability",
    "description": "One comparability bundle: its row (credits awarded published beside any parse), the receiving institution, and its source and substitute courses, each resolved or stated unresolved. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "comparability_id": {
          "description": "A comparability id from find_comparability",
          "type": "string"
        }
      },
      "required": [
        "comparability_id"
      ],
      "type": "object"
    }
  },
  {
    "name": "find_transfer_frameworks",
    "title": "Find Transfer Frameworks",
    "description": "Which statewide or compact transfer frameworks are held? Optional name or jurisdiction words. Answers none held when the build holds none. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "limit": {
          "description": "Optional page size (default 20, at most 100)",
          "type": "integer"
        },
        "offset": {
          "description": "Optional: the next_offset from a previous answer",
          "type": "integer"
        },
        "query": {
          "description": "Optional framework name or jurisdiction words",
          "type": "string"
        }
      },
      "type": "object"
    }
  },
  {
    "name": "get_transfer_framework",
    "title": "Get Transfer Framework",
    "description": "One transfer framework: its row, authority, codes with their meanings, and the courses mapped to it (resolved). Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "framework_id": {
          "description": "A framework id from find_transfer_frameworks",
          "type": "string"
        }
      },
      "required": [
        "framework_id"
      ],
      "type": "object"
    }
  },
  {
    "name": "checklists_requiring_learning_unit",
    "title": "Checklists Requiring Learning Unit",
    "description": "Which checklists require this course? Each requirement item that resolved to it, with its checklist id, award and group heading. Items that did not resolve to a course are never guessed into this list. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "learning_unit_id": {
          "description": "A learning unit id from learning_units or get_learning_unit",
          "examples": [
            "LU_course_225070_ENGL1301_20262027"
          ],
          "type": "string"
        },
        "limit": {
          "description": "Optional page size (default 20, at most 100)",
          "type": "integer"
        },
        "offset": {
          "description": "Optional: the next_offset from a previous answer",
          "type": "integer"
        }
      },
      "required": [
        "learning_unit_id"
      ],
      "type": "object"
    }
  },
  {
    "name": "search_programs_and_learning_units",
    "title": "Search Programs and Learning Units",
    "description": "Which programs or courses match, and where? Words, a subject (CIP family, or unknown), a course subject prefix, a credential class, an award as published, and a school's state, city, type or UNITID answer with product cards (name, award, length and college when held, school and city, subject, checklist size, and what the program leads to through the CIP-SOC crosswalk) and the counts to refine by. Courses across every school need words of 3 or more characters; words held by very many courses need a state, city or school. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "award": {
          "description": "Optional award exactly as published, one of the answer's awards",
          "examples": [
            "Certificate"
          ],
          "type": "string"
        },
        "cip": {
          "description": "Optional: programs or learning units with this six-digit CIP code (e.g. 48.0508), a comma-separated list, or an array of codes"
        },
        "city": {
          "description": "Optional city, one of a state answer's cities",
          "type": "string"
        },
        "code": {
          "description": "Optional, courses only: a course code as printed, e.g. ZOO 2015; lists that code at every school, or within the state, city or school given",
          "type": "string"
        },
        "credential": {
          "description": "Optional, programs only: a credential class, one of the answer's credential values (e.g. ceterms:AssociateDegree), or none",
          "type": "string"
        },
        "limit": {
          "description": "Optional page size (default 10, at most 50)",
          "type": "integer"
        },
        "offset": {
          "description": "Optional: the next_offset from a previous answer",
          "type": "integer"
        },
        "place": {
          "description": "Optional: a place the question names, read as a state (name or code), a city, or a school, e.g. Wyoming or Casper",
          "type": "string"
        },
        "query": {
          "description": "Words: a program's name or award, or a course's title",
          "examples": [
            "nursing"
          ],
          "type": "string"
        },
        "sector": {
          "description": "Optional school type as IPEDS labels it, e.g. public 2-year",
          "type": "string"
        },
        "state": {
          "description": "Optional two-letter state",
          "examples": [
            "TX"
          ],
          "type": "string"
        },
        "subject": {
          "description": "Optional CIP family (two digits, e.g. 51) or unknown",
          "type": "string"
        },
        "subject_code": {
          "description": "Optional: a course subject prefix, e.g. NURS, one of the answer's subject codes. A course's own prefix as printed, or a prefix a program's checklist requires",
          "type": "string"
        },
        "type": {
          "description": "program (the default) or learning_unit",
          "examples": [
            "program"
          ],
          "type": "string"
        },
        "unitid": {
          "description": "Optional: one school's IPEDS UNITID",
          "type": "string"
        },
        "view": {
          "description": "For type=learning_unit: count returns filtered entity counts without fetching cards; details returns bounded pageable cards for all schools or selected state/school, combined with subject_code, CIP, title query and printed code. Omit for automatic shop behavior. Explicit view is not supported for type=program.",
          "enum": [
            "count",
            "details"
          ],
          "type": "string"
        }
      },
      "type": "object"
    }
  },
  {
    "name": "get_courseshelf_summary",
    "title": "CourseShelf Holdings Summary",
    "description": "What does CourseShelf hold? From the records published with the build, read as published and never computed: per catalog area, how many institutions have loaded content and how many records were loaded; every table's row count; organizations by sector; the census of the whole index with its verdicts; and per-state counts and per-school verdicts where the build publishes them. Anything not published for this build is said so. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {},
      "type": "object"
    }
  },
  {
    "name": "comparability_for_learning_unit",
    "title": "Comparability for a Course",
    "description": "Where does a course land, and what lands on it? Reuses GoldCheck's combined parent for published CourseShelf comparables, school-published CourseAtlas equivalencies, and each source's separate inferred paths through anchors. Select sources individually or together; omitted catalog arguments retain kind known, while explicit sources without kind select from all four. Where it lands supports one named receiver or all receiving endpoints; what lands on it is held CourseShelf evidence only. Preserve source authority, published rules, actual identities, conditions, score evidence and inferred paths. Inference never establishes confirmed completion. Live published and local/inferred evidence use independent labelled source pages, actual counts where read, and full continue.arguments; rules is the union of the displayed source-page slices, not a globally sorted complete inventory. Known-overlap suppression is scoped where live published evidence is paged: retain source-labelled inferred paths without claiming the destination is inferred-only. Unread sources and unread totals are explicit, never zero or absence. Recognition remains the school's act. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "audience": {
          "description": "Optional: who the answer is for. student (the default): a course at the target school itself is met from the student's own transcript, or as entered, unless its grade is failing (F, U, NC) or withdrawn (W). institution: the target's own course counts only with explicit earned-credit or completion evidence. Carried in continue.arguments; send it back unchanged.",
          "enum": [
            "student",
            "institution"
          ],
          "type": "string"
        },
        "code": {
          "description": "The course code as printed, e.g. HIST 201",
          "type": "string"
        },
        "continuation_context": {
          "description": "Set by continue.arguments: binds identities, options and the pinned publication. Send back unchanged.",
          "type": "string"
        },
        "direction": {
          "description": "lands_as: where it lands; lands_on: what lands on it; both (default)",
          "enum": [
            "lands_as",
            "lands_on",
            "both"
          ],
          "type": "string"
        },
        "kind": {
          "description": "known selects sources 1-2, inferred selects 3-4, both selects all four; intersects explicit sources. With neither argument supplied, the catalog's existing known default applies. Explicit sources without kind selects from all four.",
          "enum": [
            "known",
            "inferred",
            "both"
          ],
          "type": "string"
        },
        "learning_unit_id": {
          "description": "The course, by its learning unit id",
          "type": "string"
        },
        "limit": {
          "description": "Optional page size per list (default 10, at most 50)",
          "type": "integer"
        },
        "offset": {
          "description": "Optional: the offset of the next page",
          "type": "integer"
        },
        "school": {
          "description": "Or: the course's school, by name (with code or title)",
          "type": "string"
        },
        "source_offsets": {
          "description": "Set by continue.arguments: independent local and live source offsets. Replay the full continuation unchanged; a single global offset cannot page the combined sources reliably.",
          "type": "object"
        },
        "sources": {
          "description": "Optional information-source selection: all (default), or a nonempty array of distinct numbers: 1 gathered published CourseShelf comparables, 2 school-published CourseAtlas equivalencies, 3 inferred CourseShelf comparability through anchors, 4 inferred CourseAtlas equivalency through anchors. Any combination is allowed. An explicit kind intersects this selection; an empty intersection is invalid. Unselected engines report not_requested. Required identity/reference reads may still be needed. Send continuation arguments unchanged.",
          "oneOf": [
            {
              "enum": [
                "all"
              ],
              "type": "string"
            },
            {
              "items": {
                "enum": [
                  1,
                  2,
                  3,
                  4
                ],
                "type": "integer"
              },
              "maxItems": 4,
              "minItems": 1,
              "type": "array",
              "uniqueItems": true
            }
          ]
        },
        "target_unitid": {
          "description": "Optional: narrow where it lands to one receiving school (IPEDS UNITID)",
          "type": "string"
        },
        "title": {
          "description": "Or: the course title, matched exactly",
          "type": "string"
        },
        "unitid": {
          "description": "Or: the course's school, by IPEDS UNITID (with code or title)",
          "type": "string"
        }
      },
      "type": "object"
    }
  },
  {
    "name": "comparability_for_courses",
    "title": "Comparability for Many Courses",
    "description": "Where does each course or exam land at one receiving school? Each typed item uses GoldCheck's shared combined parent, retaining its full evidence and separate known/inferred results. Sources 1-4 select gathered published comparables, school-published CourseAtlas equivalencies, and each source's inferred paths through anchors. The effective selection is stated; unselected engines say not_requested. Omitted catalog arguments retain kind known; explicit sources without kind select from all four. Actual school/exam identities and ambiguity are retained. Failed or budget-limited reads are unread rather than no-rule findings. Inferred paths remain separate from confirmed coverage and checklist progress. Recognition remains the school's act. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "audience": {
          "description": "Optional: who the answer is for. student (the default): a course at the target school itself is met from the student's own transcript, or as entered, unless its grade is failing (F, U, NC) or withdrawn (W). institution: the target's own course counts only with explicit earned-credit or completion evidence. Carried in continue.arguments; send it back unchanged.",
          "enum": [
            "student",
            "institution"
          ],
          "type": "string"
        },
        "items": {
          "description": "What was taken: each item a course (its school by unitid or name, with code or title) or an exam (exam_program with exam). At most 60 in one call.",
          "items": {
            "properties": {
              "code": {
                "description": "The course code as printed, e.g. HIST 201",
                "type": "string"
              },
              "exam": {
                "description": "For an exam: the exam as printed, by title or code",
                "examples": [
                  "AP Psychology"
                ],
                "type": "string"
              },
              "exam_program": {
                "description": "For an exam: its program, e.g. AP",
                "examples": [
                  "AP"
                ],
                "type": "string"
              },
              "item_id": {
                "description": "Optional: the caller's own id for this item, echoed back; the position is used when absent",
                "type": "string"
              },
              "school": {
                "description": "Or: the course's school, by name",
                "type": "string"
              },
              "score": {
                "description": "For an exam: its actual held score, a string or number. When omitted, published tiers can be shown but no held score is established.",
                "oneOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "number"
                  }
                ]
              },
              "title": {
                "description": "Or: the course title, matched exactly",
                "type": "string"
              },
              "unitid": {
                "description": "The course's school, by IPEDS UNITID",
                "type": "string"
              }
            },
            "type": "object"
          },
          "type": "array"
        },
        "kind": {
          "description": "known selects sources 1-2, inferred selects 3-4, both selects all four; intersects explicit sources. With neither argument supplied, the catalog's existing known default applies. Explicit sources without kind selects from all four.",
          "enum": [
            "known",
            "inferred",
            "both"
          ],
          "type": "string"
        },
        "limit": {
          "description": "Optional page size per item's rules (default 10, at most 50)",
          "type": "integer"
        },
        "sources": {
          "description": "Optional information-source selection: all (default), or a nonempty array of distinct numbers: 1 gathered published CourseShelf comparables, 2 school-published CourseAtlas equivalencies, 3 inferred CourseShelf comparability through anchors, 4 inferred CourseAtlas equivalency through anchors. Any combination is allowed. An explicit kind intersects this selection; an empty intersection is invalid. Unselected engines report not_requested. Required identity/reference reads may still be needed. Send continuation arguments unchanged.",
          "oneOf": [
            {
              "enum": [
                "all"
              ],
              "type": "string"
            },
            {
              "items": {
                "enum": [
                  1,
                  2,
                  3,
                  4
                ],
                "type": "integer"
              },
              "maxItems": 4,
              "minItems": 1,
              "type": "array",
              "uniqueItems": true
            }
          ]
        },
        "target_unitid": {
          "description": "The receiving school, by IPEDS UNITID",
          "examples": [
            "151263"
          ],
          "type": "string"
        }
      },
      "required": [
        "target_unitid",
        "items"
      ],
      "type": "object"
    }
  },
  {
    "name": "get_courseshelf_performance",
    "title": "CourseShelf Performance",
    "description": "How did calls to the CourseShelf box perform? From the box's call log: each call that reached the box, newest first, with its time (at), tool, outcome (answered; stopped by a budget; busy, queue full or wait expired; invalid_params; error; not_pinned), ms from the slot being taken to the answer, the build that answered, and the stated cause where there is one; per tool, the count of each outcome; and the log files read. Also returns effective INI settings and the pinned database's page size, page count and free-list pages. Request storage_details for the largest table/index objects from SQLite dbstat, within the query budget. These are storage measures, not compaction-savings estimates or RAM measurements. Arguments are logged for the catalog services only. An empty log window is said so.",
    "inputSchema": {
      "properties": {
        "from": {
          "description": "Optional ISO time the window starts (default 24 hours before 'to')",
          "examples": [
            "2026-10-21T00:00:00Z"
          ],
          "type": "string"
        },
        "limit": {
          "description": "Optional call page size (default 200); also limits storage objects to at most the default page size. The answer-size budget may trim either list further and says so",
          "type": "integer"
        },
        "min_ms": {
          "description": "Optional: only the calls that took at least this many ms",
          "type": "integer"
        },
        "outcome": {
          "description": "Optional: only the calls with this outcome",
          "enum": [
            "answered",
            "stopped",
            "busy",
            "invalid_params",
            "error",
            "not_pinned"
          ],
          "type": "string"
        },
        "storage_details": {
          "description": "Optional, default false: read the largest table/index objects from SQLite dbstat, showing allocated, payload and unused-within-pages bytes. This can scan the artifact; it runs only on request under the existing query budget. An unavailable breakdown is stated, never reported as zero.",
          "type": "boolean"
        },
        "to": {
          "description": "Optional ISO time the window ends (default now)",
          "type": "string"
        },
        "tool": {
          "description": "Optional: only the calls of this tool",
          "examples": [
            "search_programs_and_learning_units"
          ],
          "type": "string"
        }
      },
      "type": "object"
    }
  },
  {
    "name": "find_transitions",
    "title": "Find Transitions",
    "description": "Where can this occupation lead? For a SOC code: destination occupations, each with its typed roads (published by O*NET or by a credential serving both; mapped through the CIP-SOC crosswalk), each road with its source, basis and its class's karat; the bridges (credentials with their exam, education and experience conditions, and programs with checklists nearest the state given); and demand as O*NET publishes it. Roads only, no person data.",
    "inputSchema": {
      "anyOf": [
        {
          "required": [
            "from_soc"
          ]
        },
        {
          "required": [
            "from"
          ]
        }
      ],
      "properties": {
        "class": {
          "description": "Optional: only destinations with a road of this class (published, mapped)",
          "type": "string"
        },
        "from": {
          "description": "Or the job in everyday words, e.g. welder; several matching occupations answer candidates to pick from",
          "type": "string"
        },
        "from_soc": {
          "description": "The occupation's SOC code, e.g. 51-4121 (an O*NET .00 code is accepted)",
          "examples": [
            "51-4121"
          ],
          "type": "string"
        },
        "limit": {
          "description": "Optional page size (default 10, at most 25)",
          "type": "integer"
        },
        "offset": {
          "description": "Optional: the next_offset from a previous answer",
          "type": "integer"
        },
        "prefer": {
          "description": "Optional preference such as less physical; answered not held when O*NET work context is not held",
          "type": "string"
        },
        "state": {
          "description": "Optional two-letter state for the program bridges",
          "type": "string"
        }
      },
      "type": "object"
    }
  },
  {
    "name": "compare_destinations",
    "title": "Compare Destinations",
    "description": "Line up 2 to 6 destination occupations side by side from one occupation: the bridge size (credential only, or the program bridges' awards as published), O*NET demand (median wage, outlook, bright outlook) and the evidence classes of the roads. Each cell is copied or counted, never scored.",
    "inputSchema": {
      "properties": {
        "from_soc": {
          "description": "The occupation compared from, e.g. 51-4121",
          "examples": [
            "51-4121"
          ],
          "type": "string"
        },
        "to_socs": {
          "description": "2 to 6 destination SOC codes, e.g. from find_transitions",
          "examples": [
            [
              "51-4122",
              "17-3029"
            ]
          ],
          "items": {
            "type": "string"
          },
          "type": "array"
        }
      },
      "required": [
        "from_soc",
        "to_socs"
      ],
      "type": "object"
    }
  },
  {
    "name": "will_my_credits_transfer",
    "title": "Will My Credits Transfer",
    "description": "Will my prior credits apply as credit at my target school? For each thing a person holds (an exam and its score, in any exam programme this build holds, or a course taken at a school) the combined check at the target. Two equal sources, four steps run side by side: (1) comparability direct from CourseShelf - the receiver's own published mappings; (2) known equivalencies direct from CourseAtlas, live - what institutions report, CollegeBoard's among them as CourseAtlas carries them; (3) inferred comparability from CourseShelf's comparability anchors (hop 1: an exam at a shared score, a state course, a mapping, crossing kinds); (4) inferred equivalency from CourseAtlas's equivalency anchors (hop 2, its own chain). `kind` narrows them: known runs 1 and 2, inferred runs 3 and 4, both runs all four. The state comes from steps 1 and 2 alone, in three states: covered (a known mapping carries it to a course at the target), missing (the target holds score tiers for the exam and the score meets none), unknown (no known mapping held; never a guess); the inferred landings are shown beside it, never counted as covered. An exam lays out every score tier the target holds - its minimum and the courses it earns - with the held score placed and the highest tier met marked. Each covered item names the course it lands as, every rule with its kind (comparable, known equivalent), minimum score and dates, how many rules agree, and the target's programs whose checklists require that course; every step is said with its outcome and ms. An exam is identified by its learning unit under its board (its programme and code), whatever its wording: a matched exam names its `exam_unit`, and an exam that fits none, or more than one, comes back unknown with `candidates` to choose from, never a guess. Held items are compared 5 per call: an answer with more to compare carries `continue.arguments` to send back as they are. A case to argue, not a verdict; recognition is the school's act. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "audience": {
          "description": "Optional: who the answer is for. student (the default): a course at the target school itself is met from the student's own transcript, or as entered, unless its grade is failing (F, U, NC) or withdrawn (W). institution: the target's own course counts only with explicit earned-credit or completion evidence. Carried in continue.arguments; send it back unchanged.",
          "enum": [
            "student",
            "institution"
          ],
          "type": "string"
        },
        "carried": {
          "description": "Set by `continue.arguments`: the progress so far (counts, what was compared), sent back unchanged",
          "type": "object"
        },
        "checklist_id": {
          "description": "Optional: the target program's checklist id; the answer then names the lines each covered item addresses",
          "type": "string"
        },
        "held": {
          "description": "1 to 20 things held: an exam { program: any exam programme this build holds (e.g. AP, CLEP, IB), exam: its code or title, score }, or a course { unitid or school, code as printed }. Retain transcript title, grade, credits, term and evidence identity. Receiver-owned coursework has distinct origin held_at_receiver; explicit earned-credit or completed evidence is needed to count it as earned completion. Grade alone does not define a passing policy",
          "examples": [
            [
              {
                "exam": "United States History",
                "program": "AP",
                "score": 3
              }
            ]
          ],
          "items": {
            "type": "object"
          },
          "type": "array"
        },
        "held_offset": {
          "description": "Set by `continue.arguments`: the held item to start this call's 5 from",
          "type": "integer"
        },
        "kind": {
          "description": "Optional: known (steps 1-2), inferred (steps 3-4) or both (default)",
          "enum": [
            "known",
            "inferred",
            "both"
          ],
          "type": "string"
        },
        "sources": {
          "description": "Optional information-source selection: all (default), or a nonempty array of distinct numbers: 1 gathered published CourseShelf comparables, 2 school-published CourseAtlas equivalencies, 3 inferred CourseShelf comparability through anchors, 4 inferred CourseAtlas equivalency through anchors. Any combination is allowed. An explicit kind intersects this selection; an empty intersection is invalid. Unselected engines report not_requested. Required identity/reference reads may still be needed. Send continuation arguments unchanged.",
          "oneOf": [
            {
              "enum": [
                "all"
              ],
              "type": "string"
            },
            {
              "items": {
                "enum": [
                  1,
                  2,
                  3,
                  4
                ],
                "type": "integer"
              },
              "maxItems": 4,
              "minItems": 1,
              "type": "array",
              "uniqueItems": true
            }
          ]
        },
        "target_unitid": {
          "description": "The target school's IPEDS UNITID, e.g. 216038",
          "examples": [
            "216038"
          ],
          "type": "string"
        }
      },
      "required": [
        "held",
        "target_unitid"
      ],
      "type": "object"
    }
  },
  {
    "name": "comparable_map",
    "title": "Comparable Map",
    "description": "What is one thing I hold comparable to at a school I am considering? One learning unit of any kind - a course at the school it was taken at, an exam at a score, a learning unit by id, or a certification - compared with any target school: the combined check. Two equal sources, four steps run side by side: (1) comparability direct from CourseShelf - the receiver's own published mappings; (2) known equivalencies direct from CourseAtlas, live - what institutions report, CollegeBoard's among them as CourseAtlas carries them; (3) inferred comparability from CourseShelf's comparability anchors (hop 1: an exam at a shared score, a state course, a mapping, crossing kinds); (4) inferred equivalency from CourseAtlas's equivalency anchors (hop 2, its own chain). `kind` narrows them: known runs 1 and 2, inferred runs 3 and 4, both runs all four. The inferred comparability walks the published links of every kind (a published rule one way; an exam, through its learning unit, at a shared score, a common course number, or an agreement's or state's course both ways), crossing kinds, up to `depth` links. Each step says found, none, not held, error, timeout or skipped, with its time in ms. The known mappings (steps 1 and 2) decide the state - covered, missing or unknown - and the same mapping in both sources is corroboration, both rows shown; an exam lays out every score tier the target holds with the held score placed and the highest tier met marked. The inferred landings sit beside it, each with its path of published links and the rows it rests on, never counted, and not listed again on a course a known mapping reaches. Every row says its kind: comparable, known equivalent, inferred comparable, inferred equivalent. An exam is read by its learning unit under its board. Recognition is the target school's act. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "audience": {
          "description": "Optional: who the answer is for. student (the default): a course at the target school itself is met from the student's own transcript, or as entered, unless its grade is failing (F, U, NC) or withdrawn (W). institution: the target's own course counts only with explicit earned-credit or completion evidence. Carried in continue.arguments; send it back unchanged.",
          "enum": [
            "student",
            "institution"
          ],
          "type": "string"
        },
        "courseatlas_depth": {
          "description": "Optional: CourseAtlas's chain depth, 1 to 3 (default 2, the transfer map's own)",
          "type": "integer"
        },
        "depth": {
          "description": "Optional: the most published links an inferred path may take, 1 to 3 (default 2)",
          "type": "integer"
        },
        "item": {
          "description": "One learning unit: a course { unitid, code as printed (e.g. BIOL 100) }, an exam { program (e.g. AP), exam (its code or title), score }, { learning_unit_id }, or { certification_ctid }",
          "examples": [
            {
              "exam": "Biology",
              "program": "AP",
              "score": "4"
            },
            {
              "code": "BIOL 100",
              "unitid": "216038"
            }
          ],
          "type": "object"
        },
        "kind": {
          "description": "Optional: known (steps 1-2), inferred (steps 3-4) or both (default)",
          "enum": [
            "known",
            "inferred",
            "both"
          ],
          "type": "string"
        },
        "sources": {
          "description": "Optional information-source selection: all (default), or a nonempty array of distinct numbers: 1 gathered published CourseShelf comparables, 2 school-published CourseAtlas equivalencies, 3 inferred CourseShelf comparability through anchors, 4 inferred CourseAtlas equivalency through anchors. Any combination is allowed. An explicit kind intersects this selection; an empty intersection is invalid. Unselected engines report not_requested. Required identity/reference reads may still be needed. Send continuation arguments unchanged.",
          "oneOf": [
            {
              "enum": [
                "all"
              ],
              "type": "string"
            },
            {
              "items": {
                "enum": [
                  1,
                  2,
                  3,
                  4
                ],
                "type": "integer"
              },
              "maxItems": 4,
              "minItems": 1,
              "type": "array",
              "uniqueItems": true
            }
          ]
        },
        "target_unitid": {
          "description": "The school to compare with, any school, by IPEDS UNITID, e.g. 240727",
          "examples": [
            "240727"
          ],
          "type": "string"
        }
      },
      "required": [
        "target_unitid",
        "item"
      ],
      "type": "object"
    }
  },
  {
    "name": "checklist_map",
    "title": "Checklist Map",
    "description": "How far along am I in a program at a school I am considering? One checklist at any target school, chosen by its name or title (or its checklist_id), line by line against what a person holds. Each held item is compared through the combined check. Two equal sources, four steps run side by side: (1) comparability direct from CourseShelf - the receiver's own published mappings; (2) known equivalencies direct from CourseAtlas, live - what institutions report, CollegeBoard's among them as CourseAtlas carries them; (3) inferred comparability from CourseShelf's comparability anchors (hop 1: an exam at a shared score, a state course, a mapping, crossing kinds); (4) inferred equivalency from CourseAtlas's equivalency anchors (hop 2, its own chain). `kind` narrows them: known runs 1 and 2, inferred runs 3 and 4, both runs all four. Each landing is joined to the checklist's lines; a GoldRibbon package, when given, adds the lines its prior learning may meet. Each line is met (a known mapping lands a held item on it), reached_by_inference (only an inferred landing reaches it: shown with its path of published links, never counted as met), may_be_met_by_prior_learning, or open, with every way it is reached. Each group gives its lines by state beside the choice rule it prints. Last, what does not count: each held item that reaches no line, with its reason (no rule, below the score, landing on a course this checklist does not require, unresolved, not held, or a source not read - never an absence). A case to show the school, not a verdict; recognition is the school's act. Each row names its current FORM's wording source: source_url, capture_file, catalog_year and source_catalog_name are that one source's, never the record's whole span. A row whose record holds more than one form or more than one source also carries version_count, source_count, first_edition_seen and last_edition_seen, and one sentence saying so in words; a record with one form and one source carries none of them and reads exactly as it always has. The forms themselves, each with its own content and its own sources, come from the one-record get, never from a list. A record last seen in an older edition says so, because the Union keeps a record no current catalog prints.",
    "inputSchema": {
      "properties": {
        "audience": {
          "description": "Optional: who the answer is for. student (the default): a course at the target school itself is met from the student's own transcript, or as entered, unless its grade is failing (F, U, NC) or withdrawn (W). institution: the target's own course counts only with explicit earned-credit or completion evidence. Carried in continue.arguments; send it back unchanged.",
          "enum": [
            "student",
            "institution"
          ],
          "type": "string"
        },
        "carried": {
          "description": "Set by `continue.arguments`: the map's progress so far, sent back unchanged",
          "type": "object"
        },
        "checklist": {
          "description": "The checklist's name or title at the target (its award title), e.g. Nursing BSN; several fitting are listed, never guessed",
          "type": "string"
        },
        "checklist_id": {
          "description": "Or the checklist's id, from find_checklists",
          "examples": [
            "CK_225070_05e6e123"
          ],
          "type": "string"
        },
        "held": {
          "description": "0 to 20 things held, each as comparable_map takes one: a course { unitid or school, code }, an exam { program, exam, score }, { learning_unit_id } or { certification_ctid }. Compared 5 per call: an answer with more to compare carries `continue.arguments` to send back as they are",
          "items": {
            "type": "object"
          },
          "type": "array"
        },
        "held_offset": {
          "description": "Set by `continue.arguments`: the held item to start this call's 5 from",
          "type": "integer"
        },
        "kind": {
          "description": "Optional: known (steps 1-2), inferred (steps 3-4) or both (default)",
          "enum": [
            "known",
            "inferred",
            "both"
          ],
          "type": "string"
        },
        "package": {
          "description": "Optional: the person's GoldRibbon package; its prior learning is read on the first call for the lines it may meet",
          "type": "object"
        },
        "sources": {
          "description": "Optional information-source selection: all (default), or a nonempty array of distinct numbers: 1 gathered published CourseShelf comparables, 2 school-published CourseAtlas equivalencies, 3 inferred CourseShelf comparability through anchors, 4 inferred CourseAtlas equivalency through anchors. Any combination is allowed. An explicit kind intersects this selection; an empty intersection is invalid. Unselected engines report not_requested. Required identity/reference reads may still be needed. Send continuation arguments unchanged.",
          "oneOf": [
            {
              "enum": [
                "all"
              ],
              "type": "string"
            },
            {
              "items": {
                "enum": [
                  1,
                  2,
                  3,
                  4
                ],
                "type": "integer"
              },
              "maxItems": 4,
              "minItems": 1,
              "type": "array",
              "uniqueItems": true
            }
          ]
        },
        "target_unitid": {
          "description": "The school whose checklist is mapped, by IPEDS UNITID, e.g. 240727",
          "examples": [
            "240727"
          ],
          "type": "string"
        }
      },
      "required": [
        "target_unitid"
      ],
      "type": "object"
    }
  },
  {
    "name": "list_persona_transcripts",
    "title": "List Persona Transcripts",
    "description": "The example personas whose transcripts can be used in a demonstration: each persona_id, display name and description, the schools its transcript comes from, and the transcript types it offers (official, unofficial). These are example persona transcripts of made-up people, not real students. Every answer carries its steps: the source files read, the outcome, count and elapsed ms.",
    "inputSchema": {
      "properties": {},
      "type": "object"
    }
  },
  {
    "name": "get_persona_transcript",
    "title": "Get Persona Transcript",
    "description": "One example persona's transcript, parsed now by assemble_my_formal_education: `held` (the course list will_my_credits_transfer, checklist_map and comparable_map take, unchanged), `courses` (each course as read: school and IPEDS UNITID where it resolved, code, title, credits, grade and term; exams with their scores) and `package` (for suggest_credit_for_my_learning). Official and unofficial read the same transcript, labelled: official stands in for a transcript vendor request, unofficial for importing unofficial coursework. `vendor_delay_ms`, official only, waits that long first to show an official request may not come back at once; the wait counts against the call's time. The answer says plainly it is an example persona transcript, and carries its steps: the persona file, any vendor wait, and the parse, each with its outcome, count, elapsed ms and files.",
    "inputSchema": {
      "properties": {
        "persona_id": {
          "description": "A persona_id from list_persona_transcripts",
          "examples": [
            "jordan"
          ],
          "type": "string"
        },
        "transcript_type": {
          "description": "Which transcript to read; unofficial when omitted",
          "enum": [
            "official",
            "unofficial"
          ],
          "type": "string"
        },
        "vendor_delay_ms": {
          "description": "Official only: milliseconds to wait first, imitating a slow transcript vendor",
          "minimum": 0,
          "type": "integer"
        }
      },
      "required": [
        "persona_id"
      ],
      "type": "object"
    }
  },
  {
    "name": "find_my_major",
    "title": "Find My Major",
    "description": "What should I study? For a person's own words — an interest, a subject or a job — or a job code (SOC), the majors that answer. Each major carries its plain definition (NCES verbatim), the award levels it is conferred at (IPEDS AWLEVEL, each completers flag in its own field and never summed), how many schools offer it nationally, the jobs it leads to through the federal CIP-SOC crosswalk, and its related majors — same series, same family, or sharing a named occupation. Words resolve through the KSA Dictionary, never by spelling match; words that match nothing are told so with the closest words the Dictionary holds. The count for a person's own state is stated not held: the per-school IPEDS rows are not in this publish.",
    "inputSchema": {
      "anyOf": [
        {
          "required": [
            "words"
          ]
        },
        {
          "required": [
            "soc"
          ]
        }
      ],
      "properties": {
        "level": {
          "description": "Optional award level to narrow to, e.g. certificate, associate or bachelor's",
          "type": "string"
        },
        "limit": {
          "description": "Optional page size (default 10, at most 25)",
          "type": "integer"
        },
        "offset": {
          "description": "Optional: the offset of the next page",
          "type": "integer"
        },
        "soc": {
          "description": "Or a job code (SOC), e.g. 29-1141 for Registered Nurses; every major the federal crosswalk ties to it answers",
          "examples": [
            "29-1141"
          ],
          "type": "string"
        },
        "state": {
          "description": "Optional two-letter state, for the school counts",
          "type": "string"
        },
        "words": {
          "description": "The person's own words: an interest, a subject, or a job, e.g. I like fixing things",
          "examples": [
            "carpentry"
          ],
          "type": "string"
        }
      },
      "type": "object"
    }
  },
  {
    "name": "compare_my_major",
    "title": "Compare My Major",
    "description": "How do these majors differ? Two to five majors at one level, side by side: definition, the schools offering it, the jobs and their outlook from O*NET, and earnings at 1 and 5 years with debt — given as the LOWEST-TO-HIGHEST RANGE across the schools that publish them, with the number of schools stated. A range of school figures, never a median computed from them. A six-digit major's earnings come from its four-digit series and every such figure is labelled series-level. Every column is complete, or it says which figure is not published.",
    "inputSchema": {
      "properties": {
        "level": {
          "description": "The credential level to compare at, e.g. certificate",
          "examples": [
            "certificate"
          ],
          "type": "string"
        },
        "majors": {
          "description": "2 to 5 majors, each a major_minor_id (e.g. CIP:51.3801) or a CIP code",
          "examples": [
            [
              "CIP:51.3901",
              "CIP:51.3902"
            ]
          ],
          "items": {
            "type": "string"
          },
          "type": "array"
        },
        "state": {
          "description": "Optional two-letter state, for the school counts",
          "type": "string"
        }
      },
      "required": [
        "majors",
        "level"
      ],
      "type": "object"
    }
  },
  {
    "name": "find_my_school",
    "title": "Find My School",
    "description": "Where can I study this? A match-up, not a dump: for a major and a level, the schools that award it, ranked by how many of the person's own criteria each one meets, with met, not met and not testable kept as three different results — a school that does not publish a fact is not testable on it, never failed. Each criterion names the source that decided it, each school carries its own program, award, credits required, cost, earnings, debt and whether it can be done online, and a filter only ever excludes on a fact we hold. The answer states its ranking rule and never recommends a school. TODAY the candidate set is the schools CourseShelf has captured a program for, not yet every school IPEDS lists, and every answer opens by saying so.",
    "inputSchema": {
      "properties": {
        "also_offers": {
          "description": "Optional other subjects or majors the school should also offer",
          "items": {
            "type": "string"
          },
          "type": "array"
        },
        "award": {
          "description": "Optional award title or credential class",
          "type": "string"
        },
        "city": {
          "description": "Optional city",
          "type": "string"
        },
        "cost_max": {
          "description": "Optional: the most the person will pay. A school that publishes no cost is not removed by it — it is ranked below and marked not testable on cost",
          "type": "number"
        },
        "delivery": {
          "description": "Optional: in person, hybrid or online",
          "type": "string"
        },
        "exclude_untestable": {
          "description": "Optional strict exclusion, off by default: remove schools that do not publish one of the criteria. The answer then says how many were removed and by which criterion",
          "type": "boolean"
        },
        "level": {
          "description": "The credential level, e.g. certificate, associate or bachelor's",
          "examples": [
            "associate"
          ],
          "type": "string"
        },
        "limit": {
          "description": "Optional page size (default 10, at most 25)",
          "type": "integer"
        },
        "major": {
          "description": "The major: a major_minor_id (e.g. CIP:51.3801) or a CIP code",
          "examples": [
            "CIP:51.3801"
          ],
          "type": "string"
        },
        "near": {
          "description": "Optional: a place and a distance, e.g. Casper WY within 50 miles",
          "type": "string"
        },
        "offset": {
          "description": "Optional: the offset of the next page",
          "type": "integer"
        },
        "sector": {
          "description": "Optional school type as IPEDS labels it, e.g. public 2-year",
          "type": "string"
        },
        "state": {
          "description": "Optional two-letter state. With no state, city or place the answer is national and says so",
          "type": "string"
        },
        "with_checklist": {
          "description": "Optional: only schools whose requirements CourseShelf holds",
          "type": "boolean"
        }
      },
      "required": [
        "major",
        "level"
      ],
      "type": "object"
    }
  },
  {
    "name": "compare_my_school",
    "title": "Compare My School",
    "description": "Which of these schools is better for me? Two to five schools, one major and a level, side by side: program and award, credits required verbatim, requirements compared line by line, and — when the person offers their courses and exam scores — what each school's own published rules would count them for, with GoldCheck's states and reasons carried through unchanged. Credits left is reduced only by items a school's own rules cover; an unknown item, or an inference, never reduces it. Cost, earnings, debt with its 10-year monthly payment beside it, and payback in months where both inputs are published; where either is missing, payback is not computed and the missing input is named. The comparison never ranks: no score is invented to decide for the person.",
    "inputSchema": {
      "properties": {
        "held": {
          "description": "Optional: the same shape will_my_credits_transfer takes — an exam { program, exam, score } or a course { unitid or school, code }",
          "items": {
            "type": "object"
          },
          "type": "array"
        },
        "level": {
          "description": "The credential level",
          "type": "string"
        },
        "major": {
          "description": "The major: a major_minor_id or a CIP code",
          "type": "string"
        },
        "package": {
          "description": "Optional: the agent-held GoldRibbon package. GoldSeam stores no copy of it",
          "type": "object"
        },
        "unitids": {
          "description": "2 to 5 schools, by IPEDS UNITID",
          "examples": [
            [
              "240505",
              "240628"
            ]
          ],
          "items": {
            "type": "string"
          },
          "type": "array"
        }
      },
      "required": [
        "unitids",
        "major",
        "level"
      ],
      "type": "object"
    }
  },
  {
    "name": "find_my_best_pathway",
    "title": "Find My Best Pathway",
    "description": "What's my best way there? For a goal — a major or a job — and what the person brings (courses, exams, their Competency Selfie, work and life experience), the paths to it, each saying WHY it ranks where it does and naming the figures that moved it. The steps appear only where an agreement or pathway document states them, never assembled from award levels alone. Every item the person brought is marked counted, not counted or needs review and appears in the answer: nothing is dropped silently. A path missing an input is ranked with that gap named rather than penalised invisibly.",
    "inputSchema": {
      "properties": {
        "goal": {
          "description": "A major (a major_minor_id or CIP) or a job (a SOC code)",
          "examples": [
            "29-1141"
          ],
          "type": "string"
        },
        "held": {
          "description": "Optional: courses and exams, the shape will_my_credits_transfer takes",
          "items": {
            "type": "object"
          },
          "type": "array"
        },
        "level": {
          "description": "The level the person wants",
          "type": "string"
        },
        "limit": {
          "description": "Optional page size (default 10, at most 25)",
          "type": "integer"
        },
        "package": {
          "description": "Optional: the agent-held GoldRibbon package, read by suggest_credit_for_my_learning. GoldSeam stores no copy",
          "type": "object"
        },
        "state": {
          "description": "Optional two-letter state: where they are",
          "type": "string"
        }
      },
      "required": [
        "goal",
        "level"
      ],
      "type": "object"
    }
  }
];
// TOOL_DEFS_GENERATED_END

export const TOOL_NAMES = TOOL_DEFS.map((t) => t.name);

/** Whether `name` belongs to the kept (labelled-subset) surface. */
export function isKnownTool(name: string): boolean {
  return TOOL_NAMES.includes(name);
}

/* ------------------------------------------------------------------ */
/* Forwarding client                                                   */
/* ------------------------------------------------------------------ */

function errorResult(detail: string): ToolResult {
  return {
    content: [{ type: "text", text: `learnindex error: ${detail}` }],
    isError: true,
  };
}

function rpcErrorMessage(error: unknown): string {
  if (error !== null && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message !== "") return message;
    return JSON.stringify(error);
  }
  return String(error);
}

/**
 * Read a JSON-RPC response body, tolerating SSE framing.
 * Returns the message whose id matches `expectedId` when
 * present, otherwise the last parseable message, otherwise
 * null when nothing in the body parses.
 */
export function parseRpcBody(
  text: string,
  expectedId?: number,
): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const candidates: Record<string, unknown>[] = [];
  const tryPush = (payload: string): void => {
    try {
      const parsed: unknown = JSON.parse(payload);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        candidates.push(parsed as Record<string, unknown>);
      }
    } catch {
      // Not a JSON payload; skip this candidate.
    }
  };
  if (trimmed.includes("data:")) {
    for (const line of trimmed.split("\n")) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice("data:".length).trim();
      if (payload !== "" && payload !== "[DONE]") tryPush(payload);
    }
  } else {
    tryPush(trimmed);
  }
  if (candidates.length === 0) return null;
  if (expectedId !== undefined) {
    const match = candidates.find((c) => c.id === expectedId);
    if (match !== undefined) return match;
  }
  return candidates[candidates.length - 1];
}

async function defaultFetch(
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
): Promise<FetchResponseLike> {
  return fetch(url, init) as unknown as FetchResponseLike;
}

/**
 * A forwarding client holding a single upstream session,
 * opened lazily on first use and reused from then on
 * (for the process lifetime in the MCP server, or for a
 * single invocation in the CLI).
 */
export class LearnindexClient {
  private readonly deps: ForwardDeps;
  private sessionId: string | null = null;
  private ready = false;
  private sessionPromise: Promise<void> | null = null;
  private idCounter = 0;

  constructor(deps: ForwardDeps = {}) {
    this.deps = deps;
  }

  private fetchFn(): FetchFn {
    return this.deps.fetchFn ?? defaultFetch;
  }

  private endpointUrl(): string {
    if (this.deps.url && this.deps.url.trim() !== "") return this.deps.url.trim();
    const raw = (this.deps.env ?? process.env).GOLDSEAM_MCP_URL;
    if (raw && raw.trim() !== "") return raw.trim();
    return DEFAULT_ENDPOINT_URL;
  }

  private timeoutMs(): number {
    if (typeof this.deps.timeoutMs === "number" && this.deps.timeoutMs > 0) {
      return this.deps.timeoutMs;
    }
    return DEFAULT_TIMEOUT_MS;
  }

  private nextId(): number {
    this.idCounter += 1;
    return this.idCounter;
  }

  private async post(
    body: unknown,
    withSession: boolean,
  ): Promise<FetchResponseLike> {
    // The registry record declares NO headers on the remote:
    // no Authorization (or any other auth) header is ever sent.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    if (withSession && this.sessionId !== null) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs());
    try {
      return await this.fetchFn()(this.endpointUrl(), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async ensureSession(): Promise<void> {
    if (this.ready) return;
    if (this.sessionPromise === null) {
      this.sessionPromise = (async () => {
        const initId = this.nextId();
        const initRes = await this.post(
          {
            jsonrpc: "2.0",
            id: initId,
            method: "initialize",
            params: {
              protocolVersion: PROTOCOL_VERSION,
              capabilities: {},
              clientInfo: { name: "learnindex", version: VERSION },
            },
          },
          false,
        );
        const sessionId = initRes.headers.get("mcp-session-id");
        if (sessionId) this.sessionId = sessionId;
        const initText = await initRes.text();
        const initParsed = parseRpcBody(initText, initId);
        if (initParsed !== null && initParsed.error) {
          throw new Error(rpcErrorMessage(initParsed.error));
        }
        if (initRes.status < 200 || initRes.status >= 300) {
          throw new Error(`HTTP ${initRes.status}`);
        }
        if (initParsed === null && initText.trim() !== "") {
          throw new Error("malformed response");
        }
        const initializedRes = await this.post(
          { jsonrpc: "2.0", method: "notifications/initialized" },
          true,
        );
        try {
          await initializedRes.text();
        } catch {
          // Nothing needed from the notification response body.
        }
        this.ready = true;
      })();
    }
    try {
      await this.sessionPromise;
    } catch (err) {
      this.sessionPromise = null;
      this.sessionId = null;
      throw err;
    }
  }

  /** Forward one tool call; upstream failures come back as isError results. */
  async callTool(name: string, args: ToolArgs): Promise<ToolResult> {
    try {
      await this.ensureSession();
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }

    const callId = this.nextId();
    let callRes: FetchResponseLike;
    try {
      callRes = await this.post(
        {
          jsonrpc: "2.0",
          id: callId,
          method: "tools/call",
          params: { name, arguments: args ?? {} },
        },
        true,
      );
    } catch (err) {
      return errorResult(
        `request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const parsed = parseRpcBody(await callRes.text(), callId);
    if (parsed !== null && parsed.error) {
      return errorResult(rpcErrorMessage(parsed.error));
    }
    if (callRes.status < 200 || callRes.status >= 300) {
      return errorResult(`HTTP ${callRes.status}`);
    }
    if (parsed === null) return errorResult("malformed response");
    const result = parsed.result as ToolResult | undefined;
    if (result === undefined || result === null || typeof result !== "object") {
      return errorResult("malformed response");
    }
    // Hand the upstream result back exactly as received.
    return result;
  }
}

/** Build a forwarding client; tests inject a fake fetch and env through deps. */
export function createClient(deps: ForwardDeps = {}): LearnindexClient {
  return new LearnindexClient(deps);
}

/** One-shot helper: a fresh client for a single call (the CLI path). */
export async function callTool(
  name: string,
  args: ToolArgs,
  deps: ForwardDeps = {},
): Promise<ToolResult> {
  return new LearnindexClient(deps).callTool(name, args);
}
