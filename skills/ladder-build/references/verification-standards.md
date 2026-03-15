<verification_standards>

<overview>
Verification is not a formality. It's the proof that the rung holds weight before you step on the next one.
</overview>

<checklist>
For every milestone, confirm:

1. It runs. The code executes without errors. If it's a server, it starts. If it's a CLI, it responds. If it's a UI, it renders.

2. It does what it claims. The "done when" criteria from the build plan are met. Check each one explicitly.

3. Sample data works. If you created test data or fixtures, the feature handles them correctly. Test the happy path AND at least one edge case.

4. It doesn't break previous work. Run or test previous milestones' functionality to confirm they still work. If milestone 3 broke something from milestone 1, fix it now.

5. The user can confirm. Either:
   - Show them the output/behavior
   - Describe what was built and how to test it
   - Run a demo
   The user's thumbs-up is the final gate.
</checklist>

<verification_by_project_type>

| Project Type | Verification Approach |
|-------------|----------------------|
| CLI tool | Run the command, show the output, test with edge-case input |
| Web UI | Run the dev server, describe what the user sees, test interactions |
| API/backend | Hit the endpoints, show request/response, test error cases |
| Data pipeline | Run with sample data, show output, verify correctness |
| Library/SDK | Write and run a usage example, show the API in action |
| Integration | Connect to the real (or mock) service, show the round-trip |

</verification_by_project_type>

<when_to_write_tests>
Not every milestone needs formal test suites, but write tests when:
- The logic is complex and easy to break (calculations, parsing, state machines)
- The milestone will be built upon by many future milestones (core module)
- The user explicitly asks for tests
- You'd otherwise need to manually re-verify on every change

When you do write tests, they're part of the milestone deliverable — not an afterthought.
</when_to_write_tests>

<bug_handling>
If verification reveals a bug:
1. Fix it immediately
2. Re-verify the fix
3. Document it in the milestone report (what went wrong, what was fixed)
4. If the bug reveals a systemic issue, add it to the discovered work queue in the build plan

Never mark a milestone complete with known bugs. A broken rung doesn't hold weight.
</bug_handling>

</verification_standards>
