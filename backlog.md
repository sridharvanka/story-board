# V2 Backlog

## Improve atomic-idea extraction

The current splitter prompts OpenAI to identify semantic propositions rather than split mechanically at sentence boundaries. An atomic idea should:

- Identify its subject.
- Make one main assertion.
- Make sense without the surrounding paragraph.
- Resolve context-dependent references such as “it,” “then,” and “after that.”
- Preserve attribution, uncertainty, negation, quantities, and causal direction.
- Exclude headings, transitions, duplicates, commentary, and invented facts.
- Remain in the source’s original order.

The prompt includes examples covering dependent sentences, compound claims, and pronoun resolution. It uses GPT-5.4 with medium reasoning and a strict JSON schema. The schema guarantees the response structure, but it cannot guarantee semantic atomicity.

### Candidate improvements

1. **Capture real corrections**
   - Save the original text, generated fragments, and the user’s corrected result.
   - Use real failures to refine the product’s definition of “atomic.”

2. **Add split, merge, and edit controls**
   - Split indicates that a fragment contains multiple claims.
   - Merge indicates that ideas were separated too aggressively.
   - Edits expose missing context, unclear subjects, and poor wording.

3. **Build an evaluation set**
   - Maintain 20–50 representative passages with preferred fragmentations.
   - Score prompt or model changes for atomicity, standalone clarity, source fidelity, coverage, duplication, and over-fragmentation.

4. **Retrieve relevant examples dynamically**
   - Select a few corrected examples resembling the current passage or genre.
   - Avoid applying the same generic examples to scientific explanations, arguments, narratives, and rough notes.

5. **Use a two-pass workflow**
   - Pass one extracts candidate ideas.
   - Pass two audits each candidate for atomicity, standalone clarity, fidelity, omissions, and duplication.
   - This is likely the strongest quality improvement, but increases latency and cost.

6. **Offer a granularity preference**
   - Let users choose between broader conceptual claims and strict subject–predicate propositions.
   - Consider a compact control such as `Concise ↔ Detailed`.

7. **Require source traceability**
   - Associate each generated idea with its source sentence or excerpt.
   - Use the mapping to detect omissions, inventions, and unsupported rewriting.

8. **Evaluate model quality**
   - Compare GPT-5.4 and GPT-5.5 against the same evaluation set.
   - Prefer measured quality gains over changing models based on individual examples.

### Recommended sequence

1. Add split, merge, and edit interactions.
2. Store corrections as structured feedback.
3. Build the evaluation set from real usage.
4. Add dynamic example retrieval.
5. Test a two-pass extraction and audit workflow.
6. Compare model and granularity options using the evaluation set.

