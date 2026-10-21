import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Exercise the actual card with only React/Next and the server boundary mocked.
// Exposing the internal card here does not change the production component.
const source = ts.transpileModule(
  readFileSync(new URL("../app/components/wall.tsx", import.meta.url), "utf8") + "\nexport { NoteCard };",
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } },
).outputText;

function harness({ ownVote = null, signedIn = true, pending = false, result = { ok: true, message: "Vote updated." } } = {}) {
  const state = [];
  const calls = [];
  const transitions = [];
  let hook = 0;
  const element = (type, props) => ({ type, props });
  const dependencies = {
    "react/jsx-runtime": { jsx: element, jsxs: element },
    react: {
      useEffect() {},
      useState(initial) {
        const index = hook++;
        if (!(index in state)) state[index] = initial;
        return [state[index], (value) => { state[index] = value; }];
      },
      useTransition: () => [pending, (action) => { transitions.push(action()); }],
    },
    "next/navigation": { useRouter: () => ({ refresh() { calls.push({ refresh: true }); } }) },
    "next/link": { default: "a" },
    "@/app/components/arrow-icon": { default: "span" },
    "@/lib/music/artists": { artists: [] },
    "@/lib/music/browser-feed": { getBrowserFeed() { throw new Error("Not used by a card"); } },
    "@/app/actions/studio": { async submitVote(id, value) { calls.push({ id, value }); return result; } },
  };
  const compiled = { exports: {} };
  new Function("require", "module", "exports", source)((name) => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected import: ${name}`);
    return dependencies[name];
  }, compiled, compiled.exports);
  const note = { id: "note-id", ownVote, created_at: "2026-10-21T00:00:00Z", title: "Test note", artist_id: "tribe", upvotes: 1, downvotes: 0 };
  function buttons(node, found = []) {
    if (!node || typeof node !== "object") return found;
    if (node.type === "button") found.push(node);
    const children = node.props?.children;
    for (const child of Array.isArray(children) ? children : [children]) buttons(child, found);
    return found;
  }
  function render() {
    hook = 0;
    return buttons(compiled.exports.NoteCard({ note, signedIn }));
  }
  return { render, calls, transitions, state };
}

test("a recorded vote leaves the opposite direction available", () => {
  for (const [ownVote, upDisabled, downDisabled] of [[null, false, false], [1, true, false], [-1, false, true]]) {
    const app = harness({ ownVote });
    const [up, down] = app.render();
    assert.equal(up.props.disabled, upDisabled);
    assert.equal(down.props.disabled, downDisabled);
    assert.equal(up.props["aria-pressed"], ownVote === 1);
    assert.equal(down.props["aria-pressed"], ownVote === -1);
  }
});

test("switching a vote updates selection and requests fresh database totals", async () => {
  const app = harness({ ownVote: 1 });
  app.render()[1].props.onClick();
  await Promise.all(app.transitions);
  assert.deepEqual(app.calls, [{ id: "note-id", value: -1 }, { refresh: true }]);
  assert.equal(app.render()[0].props.disabled, false);
  assert.equal(app.render()[1].props.disabled, true);
  app.render()[0].props.onClick();
  await Promise.all(app.transitions);
  assert.deepEqual(app.calls.slice(2), [{ id: "note-id", value: 1 }, { refresh: true }]);
  assert.equal(app.render()[0].props.disabled, true);
  assert.equal(app.render()[1].props.disabled, false);
});

test("signed-out and pending cards stay disabled, and failed saves retain the existing vote", async () => {
  for (const options of [{ signedIn: false }, { pending: true }]) {
    assert.ok(harness(options).render().every((button) => button.props.disabled));
  }
  const app = harness({ ownVote: 1, result: { ok: false, message: "Your vote could not be changed." } });
  app.render()[1].props.onClick();
  await Promise.all(app.transitions);
  assert.deepEqual(app.calls, [{ id: "note-id", value: -1 }]);
  assert.equal(app.render()[0].props["aria-pressed"], true);
  assert.equal(app.render()[1].props.disabled, false);
  assert.match(app.state[0], /could not be changed/);
});
