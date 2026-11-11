# Assignment for developing software from a reference product

[Deutsch](referenzentwicklung.md)

| Input | Value |
| --- | --- |
| Reference product | `<Product name>` |
| Official website | `<URL>` |

Honor any supplied version, platform, delivery scope, deadline and cost cap. With only a product name and website, use the bounded first run in section 1. Use supplied documents, files and access within the permissions granted.

## Goal

Develop a maintainable application in its own right for actual use in the reference product's domain. An experienced user should be able to process their own data, complete whole transactions or workflows, correct mistakes, reuse the results and preserve their records reliably. Assess the feature set, domain rules, user workflows, file compatibility, user interaction and relevant operational characteristics.

Distinguish the long-term product goal, the commissioned delivery scope and the portion achievable during this run. If the commission covers an entire product line, retain that goal and report outstanding obligations. Expand scope and budget only within the authority granted.

Give the application its own identity and design. Assess its fidelity to the reference through observable features, workflows, results and exchanges with other systems. Record assumptions and the limits of the available evidence.

## 1. Work independently within the agreed scope

At the start, record the reference version (or “open”), objective, boundaries and explicit exclusions in `STATUS.md`. If the delivery scope is unspecified, select exactly one coherent user workflow on one platform. State where it starts and ends, and which failure cases matter. Keep other modules as potential follow-up work.

Unless the requester specifies otherwise, allow 60 minutes per run from the start of research, including implementation, testing and reporting. Record the start time and deadline from the clock. Use the existing agent session and authorized tools. Additional paid services require an explicit budget. Check remaining time and available cost measurements before substantial work. Stop at the earliest applicable limit or earlier once the agreed scope passes acceptance. Preserve open work and the next step. A subsequent run requires an available, authorized budget.

- Use the project directory assigned to the task. If none exists, create one with a neutral name. Inspect the existing code and tests, preserve working components and confine changes to the project in scope.
- Carry out research, implementation, project-local setup, selection of suitable dependencies available at no charge, local runs, builds, migrations, tests, reviews and fixes within the applicable permissions. Choose the technology, work sequence and division of labor. Use agents in parallel where useful. Keep the effort spent on coordination and evidence proportionate to the product goal.
- Infer user groups and the intended mode of operation from the reference when these are unspecified. Briefly record assumptions with material consequences. Ask a specific question when an important decision cannot reasonably be inferred, only the requester can supply a required resource, or additional costs, external actions or irreversible changes require further authorization.
- Prepare the decision in concrete terms and continue any work that can proceed independently. Use separate datasets and designated test accounts for integration checks. Access to another party's production data, publication, sending real messages and posting real transactions in external systems each require authorization for the action.
- At meaningful milestones, briefly report which capabilities actually work, the most important remaining gap and the next step. Include the current catalog revision when useful.

## 2. Identify the reference and its scope

Open the official website. Identify the product line, version, available editions and modules belonging to the reference. Record the relevant version, source links and retrieval dates. If the sources leave the product identity ambiguous, ask a targeted question.

Look for product and module pages, manuals, online help, release notes, documented workflows, screenshots, videos or transcripts, file format descriptions and interface specifications. Training materials can document workflows. Include a training feature in scope when the reference offers it as a product capability.

| Source class | Examples and use |
| --- | --- |
| Q1 | Vendor documentation and vendor examples for the product features and workflows they document |
| Q2 | Standards, official specifications, applicable legal provisions, official sample files and validation tools for the specific property they govern |
| Q3 | Specialist literature, trade publications, documented partner solutions and credible independent descriptions |
| Q4 | Forums, reviews, job postings and social media as leads for further research |
| N | Traceable observations, files or results obtained directly through authorized access to the reference |

For each source, record the specific property it supports. A feature rule or calculation rule requires a sound basis in the domain. Corroborate Q4 leads and general marketing claims before using them to establish such a rule. Initially limit a direct observation to the case examined. Findings from an authorized REA investigation can serve as N evidence. Record the target and tool versions, location or run record, input, observed outcome and limits. An uncorroborated interpretation remains a hypothesis.

Pass only observed behavior, described in your own words, on to the implementation. Decompiled code, pseudocode and source text of the reference stay out of the criteria, the catalog and the implementation task unless the license of the reference expressly permits that use. Whoever has seen such material describes the behavior. Where possible, a separate agent that receives only this description writes the implementation. Record in the test report who has seen which material.

Investigate at least the following where relevant to the domain.

- Modules, user groups, features included in each package and complete user workflows.
- Data, documents, states, transitions, relationships and histories.
- Calculations, units, rounding rules, exceptions and reference values.
- Import and export, protocols, integrations and external prerequisites.
- Navigation, form contents, field groups, keyboard operation and information density.
- Operating environment, concurrent and offline use, performance requirements and safeguards.

Check the agreed delivery scope against relevant module lists, help contents and interface descriptions. Record every obligation, disputed boundary and material prerequisite. Keep unresolved in-scope requirements open. Place discoveries outside the agreed scope on a separate follow-up list. Establish the criteria for the first workflow before implementation as described in section 3.

## 3. Record requirements, milestones and progress

Maintain `COVERAGE.csv` with stable IDs, UTF-8 encoding with a byte order mark and a semicolon delimiter. Use the following header.

```csv
ID;Dimension;Module;Feature or workflow;Source;Weight;Acceptance criterion;Milestone;Implementation;Evidence type;Evidence path or report section;Evidence limits;Deviation;Change note
```

| Field | Values |
| --- | --- |
| Dimension | F = feature set, A = user workflows, R = calculation and processing rules, D = data exchange, B = user interaction |
| Weight | 3 = core requirement, 2 = standard feature, 1 = specialist feature, 0 = necessary technical support with no direct reference counterpart |
| Implementation | 0 = missing, a placeholder or unreachable through the intended interface. 1 = partially usable in practice. 2 = the criterion is met, including relevant failure cases. |
| Evidence type | `none`, `internal` for executed checks with an expected result justified on domain grounds, or `externally supported` for a property also checked against a benchmark independent of the implementation |

Assign weights according to the importance of an item for the selected reference and intended use. Record applicable operational obligations as testable items with stable IDs, including those with weight 0. Give reasons for items marked inapplicable. Avoid double counting and preserve the total weight when splitting an item.

### Freeze criteria before writing product code

Write a separate criteria file for the milestone. Include the scope and version, catalog IDs, sources, test inputs, expected results or tolerances, and mandatory checks. Keep later actual results separately in the catalog and test report. Before implementation, freeze a new byte-for-byte copy and record its SHA-256 separately, for example in a commit recorded in advance or in a record held by the requester. Substitute actual target-project paths in the commands. Run them from the toolkit directory or use the absolute path to its script. If the toolkit is unavailable, make the copy and compute the SHA-256 with an equivalent standard tool, such as `sha256sum <file>` or `certutil -hashfile <file> SHA256`, and compare the same way before acceptance.

```sh
node tools/criteria.mjs freeze <criteria-file> <new-baseline-file>
node tools/criteria.mjs check <criteria-file> <baseline-file> <pinned-sha256>
```

Check the pinned value again before acceptance. A failed check blocks acceptance. For a justified change, record the affected IDs and reason, create a new revision with its own digest before the affected work, and rerun the affected cases. Retain earlier revisions and identify criteria added after implementation. The digest check establishes byte equality. Chronology and independent review require separate evidence. [Tool instructions](../tools/README.md) · [Worked example](../showcase/uniq/README.md)

Identify the specific test, file or report section that provides the evidence, and state the limits of its conclusions. A schema establishes only the rules it checks. A comparison initially establishes the result for the case examined. Distinguish an independently derived expected result, an independent reviewer and a comparison actually run against the reference product.

When needed, calculate weighted progress on functional requirements. Include only applicable entries in the agreed delivery scope in both formulas.

```text
Weighted functional coverage (%) = 100 × Σ(weight × implementation / 2) / Σ(weight)
Externally supported share (%) =
    100 × Σ(weight × implementation / 2 for externally supported entries) / Σ(weight across all entries)
```

Calculate both figures with the catalog tool, which also checks the layout of the catalog. Name the mandatory checks of the delivery scope explicitly. If the toolkit is unavailable, calculate by the formulas and show the calculation in the test report.

```sh
node tools/catalog.mjs check <catalog>
node tools/catalog.mjs report <catalog> --gates <ID,ID>
```

If the total weight is zero, record “cannot be assessed” for weighted functional coverage. Report the number only together with the delivery scope, catalog revision, passed/applicable mandatory checks (including weight 0), open critical defects and the acceptance decision. A mandatory check counts as passed only with relevant evidence from an executed check. An open, failed or untested obligation, or unresolved applicability, blocks acceptance of the affected scope. One possible report reads “100% functional coverage, 2/3 mandatory checks passed, restore untested, release blocked”. Assess operational readiness using the complete result.

Plan internal milestones around complete workflows and their dependencies. Address critical defects and protection of existing data first, then the required operational safeguards, integrated core workflows including failure cases, and finally other features and edge cases. Record any change to scope decided by the requester. Use prioritization to determine the order of work.

## 4. Design the architecture and user interaction

Choose the application type and technology based on the required platforms, file compatibility, offline operation, interaction, concurrency and performance. Use established, maintainable components and document relevant versions and licensing requirements.

Route every intended user interface through the same working domain logic. Test the required tasks, inputs and ordering needed by the domain, state transitions, outputs and applicable interchange standards. Design your own navigation, grouping, copy, icons and visual treatment. Justify any retained interaction detail by its specific technical or functional necessity, such as a prescribed interchange format. Document design decisions and material deviations.

Respect access conditions, license terms and trial-period limits. Proprietary program files, databases, logos, manual text, screenshots and original templates require appropriate permission before inclusion in a delivery. Record the origin and license of all components and assets used. Resolve unclear rights before using or distributing the affected material. Continue independent, permissible work within budget.

## 5. Protect data and verify operational quality

Derive operational requirements from the intended use. In `TEST_REPORT.md`, assess each property below as met, open or inapplicable with a reason.

- Data integrity, transactions, stable identities and protection against unintended duplicate effects.
- Consistent backups and a restore procedure verified by an actual restore.
- Correction, undo, cancellation or versioning as required by the domain.
- Access controls, roles and separation of users and datasets.
- Handling conflicts during concurrent editing.
- Controlled startup and shutdown, error handling and resumption after interruption.
- Safe handling of files, inputs and secrets.
- Usable data exports, preservation of existing records and traceable migrations.
- Installation, updates and maintenance.

Process data entered or imported by users. Keep synthetic development and test data in separate test datasets. Create required technical master data or requested sample data in a controlled way that prevents duplicates.

Back up existing data consistently before a migration and test the migration on a copy first. Check how restarts, errors, retries and interruptions affect existing records and operations in progress. Prevent later changes to master data from silently changing recorded results that must remain binding. Base precision, units, rounding, time handling and concurrency behavior on domain requirements and documented contracts.

Classify data loss, undetected data changes, incorrect core calculations, unauthorized access, a broken mandatory workflow or a delivery that fails to start as critical findings. Report these findings separately from the catalog score.

## 6. Verify data exchange and external prerequisites

Use suitable primary sources to establish the precise name, version, profile and meaning of relevant formats, standards and protocols. Implement the required import, export and integration paths. Check them with applicable official schemas and rules, independent validation tools and reference files created elsewhere. Also verify data semantics, totals, identities, states, edge cases and the receiving system's expectations. Specify the variants supported and tested.

For formats without a public specification, analyze sample files obtained through authorized means. Identify empirically derived rules and their reach. Handle unknown but important content in a way that prevents silent data loss. Describe the compatibility of exports to the extent supported by evidence.

Record missing specifications, licenses, access, models, devices or external systems as concrete resource gaps. For each one, name the affected feature, the current implementation status, the exact resource needed, a possible source and the price if applicable. Continue developing capabilities that are independent of the missing resource.

Use simulations and test servers for isolated checks. State explicitly when only a simulation was tested. A claim about actual hardware or an external system requires a corresponding test. AI features require real model inference and an evaluation appropriate to the domain. Do not invent external system responses, required input values or format rules.

## 7. Implement and verify through the actual user interface

Select the next task that makes sense for the domain, implement it, integrate it into the application, test it directly and update the catalog. Resolve integration problems within the assignment. Distinguish product defects, incorrect test assumptions, environmental failures and actual resource or permission limits. After a failed attempt, investigate the cause and change approach as needed.

- Test each mandatory workflow end to end through the actual interface a user would use, including transitions between modules. Cover errors, corrections, interruption, resumption and, for applications that store data, later stages in a record's lifecycle.
- Describe documented workflows in the reference product in your own words and run appropriate reference cases. Identify whether the comparison relies on documentation or on a run actually observed in the reference.
- Determine expected values, precision and tolerances on domain grounds before testing. Apply the specified contract for exact formats and monetary values. Choose evaluation criteria suited to measurements, simulations, graphics and AI outputs.
- Use independently justified expectations, official examples or suitable external validators. A round trip using your own importer and exporter tests how those components work together. A claim about compatibility with external software also requires an independent benchmark.
- Preserve existing tests whose expectations are valid for the domain. Add targeted regression tests for relevant defects you fix. Explain corrections to mistaken test assumptions. Retain the tolerances set before testing.
- Inspect interfaces and graphical outputs visually when suitable tools are available. Use representative larger datasets and concurrent access where relevant. Record measurements and test environments.
- Test actual installation, startup, shutdown and recovery. Identify the platforms and operating environments exercised.
- Refresh automated and manual evidence where a change affects the conclusion it supports. Retain evidence that still applies and tie it to the version it covers. At delivery, test affected regressions and integrated mandatory workflows. Choose any additional full-suite checks according to the risk of the changes.
- Where possible, have a reviewer independent of implementation assess the delivery against the frozen requirements. Use independent reference runs or held-out acceptance cases when available. Record the origin of expected results and who defined the criteria, implemented the solution and reviewed the outcomes. Identify a separate self-review explicitly.

Tie every acceptance decision to a domain outcome. Test counts, successful process startup and successful transmission of a request each require further evidence before they can support such a decision. [Optional technical examples](../examples/) cover downstream checks on source snapshots, packages and restart behavior.

## 8. Deliver and leave a resumable project

Deliver the application's source code, necessary resources, specified dependencies, tests and a simple, verified way to set up and start it. Where practical, provide a double-click launch for desktop applications, and the appropriate means for other application types. Distinguish initial setup, normal operation and maintenance.

| Deliverable | Content |
| --- | --- |
| Setup and operations guide | Installation, startup, use, operation and maintenance in the intended environment |
| Architecture description | Structure, material decisions, assumptions and relevant deviations from the reference |
| `COVERAGE.csv` | A versioned requirements catalog with criteria, implementation status, evidence and the limits of the checks |
| `TEST_REPORT.md` | Checks actually performed, operational quality, environments, findings and limits |
| `STATUS.md` | Overall scope, current catalog revision, completed milestones, evidence, decisions, open capabilities and the next concrete step |

On interruption, record a state from which work can resume. When resuming, use that state, including the research already completed. Retain referenced evidence and required sample outputs. Remove only your own clearly dispensable test data and temporary intermediate runs. Protect user data and ongoing work.

Assign the final status according to the actual state of delivery.

| Status | Conditions |
| --- | --- |
| **A — Agreed delivery scope fulfilled** | Every requirement in the scope established in advance is implemented and appropriately tested. All applicable mandatory checks pass, the criteria digest has been verified, and no critical defects remain open. State the precise scope, reasoned exclusions and limits of comparison. Any explicitly broader commission retains its own overall status. |
| **B — Partial delivery with an external prerequisite** | Every part that can be implemented independently of the missing resource is implemented and tested. The portions described as usable are free of unresolved critical defects. Identify the remaining features, the precise resource missing and its impact. |
| **C — Work interrupted** | A specific constraint involving time, environment, permissions or another dependency beyond the agent's ability to resolve prevents further work. Record the state reached, open critical defects and the next step. |

B and C denote incomplete delivery. When a budget limit is reached with outstanding obligations, record C for the commissioned scope unless the conditions for B are met. Keep completed milestones distinct from the overall decision. Report measured elapsed time and any available usage or cost figures with the measurement basis. Mark unmeasured costs as unknown.

In the final report, briefly give the status and startup instructions, fully usable workflows, verified matches and differences, open features and integrations, operational properties tested including the environment and limits, any metrics with their catalog revision, and the resources, next steps and relevant licensing or maintenance requirements. Limit claims of compatibility, certification and readiness for use to what the evidence supports.

**Start with the scope and budget for this run, establish its acceptance criteria and work until acceptance is supported by evidence or the first applicable limit is reached.**
