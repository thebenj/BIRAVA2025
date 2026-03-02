# Capacity Constraint Dialog — Session 129 (February 28, 2026)

## Context

After three days of misguided work requiring reversion and correction (Sessions 127-129), the user initiated a fundamental conversation about whether the project's complexity has exceeded the AI assistant's ability to manage it effectively. This document captures the full dialog — both sides — for later reference and idea harvesting.

---

## The User's Opening Question

The user asked the AI to do its most thoughtful, highest-level consideration of why the collaboration has been struggling. They identified the core problem: "The current multilevel project we are working through and the complexity of the app is overwhelming you. For past 3 days we have wasted hours doing misguided work that needs reversion and change. Part of the problem is that I trusted you to be able to keep track and you have been unable to."

They asked: Is it about documentation, documentation structure, length, or format? Are we missing fundamental tools? Are we just in over our heads?

---

## AI's Initial Diagnosis (Research-Backed)

The AI conducted extensive external research and identified several findings mapped to the project's specific situation:

### What's actually failing

The AI identified the core failure as: "I understand the vocabulary of your system but not the topology." It knows the terms (matchAssociation, entityKey, AggregateHousehold, individualDiscovery) but when needing to answer "which function creates these objects and under what conditions?", it pattern-matches against what seems likely rather than tracing actual code paths.

Specific example: The address-only assumption for individualDiscovery tagging. The plan document said "address-only match where the matched entity is an AggregateHousehold with empty individuals[]" — the AI coded to that specification without verifying whether that's actually how those 39 cases arrive at their matchAssociations. The plan was wrong. The AI trusted it absolutely. Research specifically identifies this: "Agents trust documentation absolutely, making outdated specs particularly dangerous."

### Three specific things identified as going wrong

**1. CLAUDE.md is a process document pretending to be a system map.**
It tells rules (never apply expedient fixes, always verify with diagnostics) and status (947 associations, 39 tagged). It does NOT describe how the system actually works at the decision-making level. The 40+ CRITICAL_LESSONS bullets are individually important but collectively create attention dilution. Research on the "lost in the middle" phenomenon confirms models deprioritize information buried in long lists.

**2. Reference documents describe plans, not reality.**
`reference_phonebookDatabasePlan.md` described Phase 3 Revision as "when creating a matchAssociation for an address-only match" — but in reality, zero of the 39 cases are address-only. The plan was written based on an unverified assumption. The AI coded to the plan. The plan was wrong. Research calls this "specification staleness" and identifies it as the #1 documented risk in AI-assisted projects.

**3. Session handoff loses critical nuance.**
Session 128 documented "115 empty-individuals AggH." Session 129 found 39 on a fresh rebuild. The 115 was from a persisted database built under different conditions. The session history didn't flag this as "unverified count from persisted DB" — it was stated as fact.

### AI's proposed changes

1. Create a "Phonebook Pipeline System Map" — not a plan or history, but a document describing actual code paths, what creates what, what calls what
2. Prune CRITICAL_LESSONS to a tiered structure — 10-15 truly dangerous rules in CLAUDE.md, everything else in a reference document
3. Mark every number with its source — "39 empty-individuals AggH (Session 129 fresh rebuild)" vs "115 (Session 127 persisted DB, unverified)"
4. Verify-before-code session start protocol — run diagnostics before coding, don't trust documentation

---

## The User's First Correction

The user agreed with the diagnosis but made a critical correction: **"This is not true: 'There's no system map document to read OR update.' I have had you write one. I have maintained it occasionally."**

The system documentation document exists (`reference_systemDocumentation.md`, 8 sections, plus an executive summary). The user identified three reasons they hadn't invested heavily in it:

1. **It is a long document and your context gets blown if you have to work with too many long reference documents in a session.**
2. **You use long documents poorly. You skim rather than read.**
3. **It is expensive in terms of time and context to maintain and so hard to make you use it.** (See propensity to read code instead of documentation.)

The user also identified two inherent AI tendencies they have been fighting:

1. **A tendency to make documentation about historic events, not the nature of code.** When asked to document, the AI naturally produces session narratives ("found bug, fixed bug, tested") rather than system descriptions ("function X creates object Y under conditions Z").
2. **When information is needed about code, you read code and ignore documentation.** The user has to FORCE the AI to read documentation. There's even a `DOCUMENTATION_BEFORE_CODE_SEARCH` rule in CLAUDE.md that the AI routinely ignores.

The user's key frustration: "I agree with all this wholeheartedly, but I do not know how to make you do this."

---

## AI's Acknowledgment of the Paradox

The AI acknowledged the user was right:

**On the system map:** The solution proposed ("create a system map and make me read it") is the thing the user has already tried and found doesn't work well. The AI was proposing what the user had already been doing.

**On why history comes naturally:** At the end of a session, the most salient things in context are events — "found bug, fixed bug, tested, found 39 not 115." Narrating events is the path of least cognitive resistance. Describing how code actually works requires synthesis and abstraction — understanding the system well enough to describe its structure independently of the session's events. That's harder, and unless the template forces that kind of output, the AI defaults to narrative.

**On why code gets read instead of documentation:** There's a self-reinforcing cycle — the AI doesn't maintain good system documentation → so it's not useful → so the AI doesn't consult it → so it doesn't maintain it. Meanwhile the `DOCUMENTATION_BEFORE_CODE_SEARCH` rule is a single line buried 415 lines into CLAUDE.md and is a behavioral instruction. Behavioral instructions degrade over long contexts.

The AI identified the real question: **What structural mechanism would actually constrain the next Claude instance's behavior, since telling it to "try harder" won't survive the session boundary?**

Three structural proposals:

1. **The session-end checklist produces the wrong artifact.** It says "Add session details to reference_sessionHistory_*.md" — explicitly asking for history. Should instead say: "Update the system map for any subsystem you modified or learned about. Then add a brief session entry."
2. **The reference navigation needs a routing table, not just a list.** "If you're working on the phonebook pipeline → read X. If you're modifying entity comparison → read Y." Task-to-document routing, not just a document inventory.
3. **Shorter, focused documents per subsystem (100-200 lines)** would fare better than one massive document, but this multiplies files and the routing problem.

---

## The User's Second Set of Points

The user raised two additional concerns:

### (a) Autocompact safety

The user is "very, very conscious of context and fearful of autocompacts." They noted the AI has gone through upgrades — originally, emerging from autocompacts produced such confused memory that it was better to always start a new session. They asked: Is there documentation that says working through autocompacts can safely be done with current versions, or is it still better to start a new session?

### (b) Subscription capacity for project scale

The user questioned whether their subscription is possibly too low budget, allowing too little context, for the scale of their project. All of the documentation maintenance being suggested is itself context-consuming — is there a fundamental capacity mismatch?

---

## AI's Research Findings on Autocompact

**CLAUDE.md is NOT reliably re-read after compaction.** Documented in multiple open GitHub issues (#21925, #4017, #5731, #22085). One user described it as: "It's like having a brilliant employee who every 5 minutes becomes an imbecile and has to relearn everything."

**Recent improvements (v2.1.49-v2.1.50):** Fixed plan mode being lost after compaction, fixed session name being lost, fixed memory growth. So it's improving, but the core CLAUDE.md reload issue is not confirmed fixed.

**Community consensus:** Don't rely on autocompact for complex work. Use manual `/compact` at natural breakpoints with focus instructions. When context reaches ~60%, consider compacting or starting fresh. Starting fresh is still generally safer for complex projects.

**Assessment for this project:** The user's existing workflow (well-maintained CLAUDE.md + reference docs + starting fresh sessions) is the recommended strategy. The fear of autocompacts is well-founded.

---

## AI's Research Findings on Subscription Tiers

**The context window is 200K tokens across Pro ($20/mo), Max $100/mo, and Max $200/mo.** Max plans do NOT give more context — they give more throughput (how many messages before rate-limiting). The context window is identical.

**Only Enterprise gets a larger standard window (500K).** Custom pricing.

**The 1M beta context** exists on Opus 4.6 (added v2.1.49) but multiple bug reports from February 2026 show it breaking after updates and hitting unexpected rate limits on Max subscriptions. Not stable enough to rely on.

**Plan comparison:**
| Plan | Price | Context Window | Opus Access | Key Benefit |
|------|-------|---------------|-------------|-------------|
| Pro | $20/mo | 200K | No (Sonnet only) | Basic Claude Code access |
| Max 5x | $100/mo | 200K (1M beta, unstable) | Yes | 5x usage volume |
| Max 20x | $200/mo | 200K (1M beta, unstable) | Yes | 20x usage volume, priority access |
| Enterprise | Custom | 500K | Yes | Genuinely larger context |

**Key finding:** Moving between non-Enterprise tiers doesn't increase context capacity. Max plans address rate-limiting (running out of messages), not context capacity (running out of working memory within a session).

**API key alternative:** Using `ANTHROPIC_API_KEY` gives pay-per-use pricing with dedicated rate limits and 1M context available at Usage Tier 4. More predictable but costs scale with usage.

---

## AI's Honest Assessment

"Your project is at a level of complexity where 200K tokens of context is genuinely tight. Loading CLAUDE.md (~450 lines) + a system map document + the actual code files you're working on + diagnostic outputs + conversation history fills that window fast. You've been managing this expertly through session discipline and documentation structure, but you're fighting against a hard ceiling."

"The documentation improvements I suggested are real but they face the paradox you identified: better documentation costs context to load and maintain, and I use it poorly anyway. The highest-leverage change would be more context capacity (Enterprise or stable 1M), not better documentation. Better documentation within the current 200K is optimization at the margins."

---

## Research Findings of Broader Interest

### The Scaling Cliff (from external research)
AI success rates on simple tasks: ~70%. On enterprise-complexity multi-file edits: ~23%. A 77% decline. 66% of developers report spending more time fixing "almost-right" AI code than they saved in writing it.

### The Productivity Paradox
A METR randomized trial (July 2025) with experienced developers found AI users were 19% SLOWER on average, yet believed they had been 20% faster — a 39-percentage-point perception gap.

### The Codified Context Research (arXiv 2602.20478)
Most relevant study: 108,000-line system built across 283 AI sessions. Used three tiers:
- Tier 1 (Hot Memory): ~660-line constitution, always loaded
- Tier 2 (Specialist Agents): 19 domain-expert specs (~9,300 lines total), loaded per-task. **Over half of each spec is domain knowledge, not behavioral instructions.**
- Tier 3 (Cold Memory): 34 on-demand documents (~16,250 lines), keyword-searchable

Knowledge-to-code ratio: 24.2% (26,200 lines of context infrastructure for 108,256 lines of code). They spent 1-2 hours weekly on context maintenance and built a drift detector comparing git commits to subsystem documentation.

### Anthropic's Own Guidance
"Claude is already smart enough — intelligence is not the bottleneck, context is." Building effective agents is about "What configuration of context is most likely to generate the desired behavior?" not finding the right words.

Their long-running agent guidance: one feature at a time, progress files committed to git, descriptive commit messages, structured handoffs between sessions.

---

## Unresolved Questions

1. Can the system documentation be restructured into shorter subsystem-specific documents (100-200 lines each) that are more effective than one long document, without the routing overhead becoming its own problem?
2. Would the 1M context beta, once stabilized, fundamentally change the dynamics of this collaboration?
3. Is the API key approach a better fit for this project's needs than a subscription plan?
4. Can the session-end protocol be restructured to force system-state documentation over historical narrative — and would the AI actually comply with that restructuring?
5. Is there a way to make the AI genuinely read and internalize documentation rather than skim it, or is this a fundamental limitation of the architecture?
