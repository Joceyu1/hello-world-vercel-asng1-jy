import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const element = (type, props) => ({ type, props });
const Spinner = (props) => element("span", { ...props, "data-spinner": true });
const NoteSkeletons = (props) => element("div", { ...props, "data-skeletons": true });
const feedback = { Spinner, NoteSkeletons };
const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

// Run the actual components with controlled network boundaries and a small hook
// host, so requests can remain unresolved while we inspect the rendered state.
function harness(path, dependencies = {}, globals = {}, append = "") {
  const slots = [], effects = [], tasks = [], calls = [];
  let cursor = 0;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], (value) => {
        slots[index] = typeof value === "function" ? value(slots[index]) : value;
      }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect(callback, deps) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || !deps || deps.some((value, i) => !Object.is(value, previous.deps?.[i]))) {
        effects.push(() => {
          previous?.cleanup?.();
          slots[index] = { deps, cleanup: callback() };
        });
      }
    },
    useTransition() {
      const [pending, setPending] = react.useState(false);
      return [pending, (action) => {
        setPending(true);
        const task = (async () => {
          try { return await action(); }
          finally { setPending(false); }
        })();
        tasks.push(task);
      }];
    },
  };
  const imports = {
    "react/jsx-runtime": { jsx: element, jsxs: element },
    react,
    "next/link": { default: "a" },
    "next/navigation": { useRouter: () => ({
      refresh: () => calls.push("refresh"),
      push: (url) => calls.push(["push", url]),
    }) },
    "@/app/components/arrow-icon": { default: "span" },
    "@/app/components/feedback": feedback,
    ...dependencies,
  };
  const source = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8") + append,
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } },
  ).outputText;
  const compiledModule = { exports: {} };
  new Function("require", "module", "exports", ...Object.keys(globals), source)((name) => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected import: ${name}`);
    return imports[name];
  }, compiledModule, compiledModule.exports, ...Object.values(globals));
  return {
    calls, tasks,
    render(props = {}, exported = "default") {
      cursor = 0;
      const tree = compiledModule.exports[exported](props);
      while (effects.length) effects.shift()();
      return tree;
    },
  };
}
function nodes(tree, predicate, output = []) {
  if (!tree || typeof tree !== "object") return output;
  if (Array.isArray(tree)) {
    for (const child of tree) nodes(child, predicate, output);
    return output;
  }
  if (tree.type === Spinner || tree.type === NoteSkeletons) tree = tree.type(tree.props);
  if (predicate(tree)) output.push(tree);
  nodes(tree.props?.children, predicate, output);
  return output;
}
function text(tree) {
  if (tree == null || typeof tree === "boolean") return "";
  if (typeof tree !== "object") return String(tree);
  if (Array.isArray(tree)) return tree.map(text).join(" ");
  return text(tree.props?.children);
}
const buttons = (tree) => nodes(tree, (node) => node.type === "button");
const spinners = (tree) => nodes(tree, (node) => node.props?.["data-spinner"]);
const busy = (tree) => nodes(tree, (node) => node.props?.["aria-busy"] === true);
const linksToNote = (tree) => nodes(tree, (node) => node.type === "a" && node.props?.href === "#wall");
function eventWindow() {
  const listeners = new Map();
  return {
    location: { origin: "https://side-b.test" },
    addEventListener(name, listener) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(listener);
    },
    removeEventListener: (name, listener) => listeners.get(name)?.delete(listener),
    dispatch: (name, event = {}) => { for (const callback of listeners.get(name) ?? []) callback(event); },
  };
}
function loginHarness(response) {
  const window = eventWindow();
  let requests = 0;
  const app = harness("../app/login/page.tsx", {
    "@/lib/supabase/client": { createClient: () => ({ auth: {
      signInWithOAuth: () => { requests++; return response.promise; },
    } }) },
  }, {
    window,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.test", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-test-key" } },
  });
  return { ...app, window, requests: () => requests };
}

test("Google sign-in shows a pending indicator and recovers after a failed request", async () => {
  const response = deferred();
  const app = loginHarness(response);
  const start = buttons(app.render())[0].props.onClick;
  const request = start();
  const waiting = app.render();
  assert.equal(buttons(waiting)[0].props.disabled, true);
  assert.ok(busy(waiting).length && spinners(waiting).length);
  assert.match(text(waiting), /Opening Google/);
  await start();
  assert.equal(app.requests(), 1, "a repeat activation must not start a second redirect");
  response.reject(new Error("Network unavailable"));
  await request;
  const failed = app.render();
  assert.equal(buttons(failed)[0].props.disabled, false);
  assert.equal(spinners(failed).length, 0);
  assert.match(text(failed), /Sign-in could not start/);
});

test("returning from Google through the browser cache restores an actionable sign-in button", async () => {
  const response = deferred();
  const app = loginHarness(response);
  const request = buttons(app.render())[0].props.onClick();
  response.resolve({ error: null });
  await request;
  assert.equal(buttons(app.render())[0].props.disabled, true);
  app.window.dispatch("pageshow", { persisted: true });
  const restored = app.render();
  assert.equal(buttons(restored)[0].props.disabled, false);
  assert.equal(spinners(restored).length, 0);
  assert.match(text(restored), /Sign-in was not completed/);
});

function studioHarness(response) {
  return harness("../app/components/studio.tsx", {
    "@/lib/music/artists": { artists: [{ id: "tribe", name: "A Tribe Called Quest", genre: "Hip hop" }], popGroupArtistIds: [] },
    "@/lib/music/prompt": { moods: ["Golden-hour stroll"], scenes: ["Riverside Park"] },
    "@/app/actions/studio": { publishNote: () => response.promise },
  });
}

test("note generation stays visibly pending until the server confirms publication", async () => {
  for (const ok of [true, false]) {
    const response = deferred();
    const app = studioHarness(response);
    const props = { signedIn: true, popGroupsReady: true };
    let tree = app.render(props);
    nodes(tree, (node) => node.type === "textarea")[0].props.onChange({ target: { value: "An afternoon walk" } });
    tree = app.render(props);
    nodes(tree, (node) => node.type === "form")[0].props.onSubmit({ preventDefault() {} });
    const waiting = app.render(props);
    assert.equal(nodes(waiting, (node) => node.type === "fieldset")[0].props.disabled, true);
    assert.ok(busy(waiting).length && spinners(waiting).length);
    assert.match(text(waiting), /Making your note|Recording your B-side/);
    assert.equal(linksToNote(waiting).length, 0, "an unfinished request must not announce a published note");
    response.resolve({ ok, message: ok ? "Your note is live." : "The note could not be published." });
    await Promise.all(app.tasks);
    const complete = app.render(props);
    assert.equal(nodes(complete, (node) => node.type === "fieldset")[0].props.disabled, false);
    assert.equal(spinners(complete).length, 0);
    assert.match(text(complete), ok ? /Your note is live/ : /could not be published/);
    assert.equal(linksToNote(complete).length, ok ? 1 : 0);
    assert.deepEqual(app.calls, ok ? ["refresh"] : []);
    assert.equal(nodes(complete, (node) => node.type === "textarea")[0].props.value, ok ? "" : "An afternoon walk");
  }
});

const note = { id: "note-id", title: "An afternoon in the city", caption: "A real saved note.", ownVote: 1, artist_id: "tribe", created_at: "2026-11-18T00:00:00Z", upvotes: 1, downvotes: 0 };
function wallHarness(response, extra = {}) {
  return harness("../app/components/wall.tsx", {
    "@/lib/music/artists": { artists: [] },
    "@/lib/music/browser-feed": { getBrowserFeed: () => response.promise },
    "@/app/actions/studio": { submitVote: () => response.promise },
    ...extra,
  }, {}, "\nexport { NoteCard };\n");
}

test("voting shows pending feedback, disables repeat votes, and preserves the saved vote on failure", async () => {
  const response = deferred();
  const app = wallHarness(response);
  const props = { note, signedIn: true };
  buttons(app.render(props, "NoteCard"))[1].props.onClick();
  const waiting = app.render(props, "NoteCard");
  assert.ok(buttons(waiting).every((button) => button.props.disabled));
  assert.ok(busy(waiting).length && spinners(waiting).length);
  assert.match(text(waiting), /Saving (?:your )?vote|Recording your vote/i);
  response.resolve({ ok: false, message: "Your vote could not be changed." });
  await Promise.all(app.tasks);
  const failed = app.render(props, "NoteCard");
  assert.equal(buttons(failed)[0].props["aria-pressed"], true);
  assert.equal(buttons(failed)[1].props.disabled, false);
  assert.equal(spinners(failed).length, 0);
  assert.match(text(failed), /could not be changed/);
});

function profileHarness({ save, upload, signOut }) {
  return harness("../app/profile/profile-form.tsx", {
    "@/lib/supabase/client": { createClient: () => ({
      auth: { signOut: () => signOut.promise },
      storage: { from: () => ({ upload: () => upload.promise }) },
      from: () => {
        const query = { update: () => query, eq: () => query, select: () => query, single: () => save.promise };
        return query;
      },
    }) },
  });
}
const profileProps = { userId: "listener-id", initialFirstName: "Test", initialLastName: "Listener", initialAvatarUrl: null };

test("profile feedback follows uploading and saving, then reports the actual saved outcome", async () => {
  const save = deferred(), upload = deferred(), signOut = deferred();
  const app = profileHarness({ save, upload, signOut });
  let tree = app.render(profileProps);
  nodes(tree, (node) => node.type === "input" && node.props?.type === "file")[0].props.onChange({ target: { files: [{ type: "image/png", size: 123 }] } });
  tree = app.render(profileProps);
  const request = nodes(tree, (node) => node.type === "form")[0].props.onSubmit({ preventDefault() {} });
  const uploading = app.render(profileProps);
  assert.ok(busy(uploading).length && spinners(uploading).length);
  assert.match(text(uploading), /Uploading your profile photo/);
  assert.ok(buttons(uploading).every((button) => button.props.disabled));
  upload.resolve({ error: null });
  await tick();
  assert.match(text(app.render(profileProps)), /Saving your profile/);
  save.resolve({ data: { id: "listener-id" }, error: null });
  await request;
  const complete = app.render(profileProps);
  assert.equal(spinners(complete).length, 0);
  assert.match(text(complete), /Profile saved/);
  assert.ok(buttons(complete).every((button) => !button.props.disabled));
  assert.deepEqual(app.calls, ["refresh"]);
});

test("sign-out request failures remove the spinner and restore usable profile controls", async () => {
  const save = deferred(), upload = deferred(), signOut = deferred();
  const app = profileHarness({ save, upload, signOut });
  const button = buttons(app.render(profileProps)).find((node) => /Sign out/.test(text(node)));
  const request = button.props.onClick();
  const pending = app.render(profileProps);
  assert.ok(spinners(pending).length);
  assert.match(text(pending), /Signing out/);
  signOut.reject(new Error("Connection dropped"));
  await request;
  const failed = app.render(profileProps);
  assert.equal(spinners(failed).length, 0);
  assert.ok(buttons(failed).every((node) => !node.props.disabled));
  assert.match(text(failed), /Connection dropped|Could not sign out/);
  assert.equal(app.calls.length, 0);
});


test("an unresolved community refresh shows skeletons instead of announcing an empty result", async () => {
  for (const outcome of ["empty", "failure"]) {
    const response = deferred();
    const app = wallHarness(response);
    const props = { notes: [], signedIn: true, issue: null };
    const waiting = app.render(props);
    assert.ok(busy(waiting).length && spinners(waiting).length);
    assert.ok(nodes(waiting, (node) => node.props?.["data-skeletons"]).length);
    assert.match(text(waiting), /Loading community notes/);
    assert.doesNotMatch(text(waiting), /No notes yet/);
    if (outcome === "empty") response.resolve({ notes: [], signedIn: true, issue: null });
    else response.reject(new Error("Connection failed"));
    await tick();
    const complete = app.render(props);
    assert.equal(busy(complete).length, 0);
    assert.equal(spinners(complete).length, 0);
    assert.equal(nodes(complete, (node) => node.props?.["data-skeletons"]).length, 0);
    assert.match(text(complete), outcome === "empty" ? /No notes yet/ : /could not refresh/);
    if (outcome === "failure") assert.doesNotMatch(text(complete), /No notes yet/);
  }
});

test("community refresh preserves rendered notes and ignores a stale request after new server data arrives", async () => {
  const first = deferred(), second = deferred();
  const responses = [first, second];
  const app = wallHarness(first, {
    "@/lib/music/browser-feed": { getBrowserFeed: () => responses.shift().promise },
  });
  const originalProps = { notes: [], signedIn: true, issue: null };
  app.render(originalProps);
  const updatedProps = { notes: [note], signedIn: true, issue: null };
  let tree = app.render(updatedProps);
  assert.equal(nodes(tree, (node) => node.props?.note?.id === note.id).length, 1);
  assert.match(text(tree), /Refreshing community notes/);
  assert.equal(nodes(tree, (node) => node.props?.["data-skeletons"]).length, 0);
  first.resolve({ notes: [], signedIn: false, issue: null });
  await tick();
  tree = app.render(updatedProps);
  assert.ok(busy(tree).length, "a stale response must not settle the current refresh");
  assert.equal(nodes(tree, (node) => node.props?.note?.id === note.id).length, 1);
  second.resolve({ notes: [note], signedIn: true, issue: null });
  await tick();
  tree = app.render(updatedProps);
  assert.equal(busy(tree).length, 0);
  assert.equal(spinners(tree).length, 0);
  assert.equal(nodes(tree, (node) => node.props?.note?.id === note.id).length, 1);
});
