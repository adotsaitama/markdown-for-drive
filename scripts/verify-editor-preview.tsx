import assert from "node:assert/strict";
import { basicSetup } from "codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  highlightingFor,
  syntaxTree,
  type SyntaxNodeRef,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownPreview } from "../src/components/MarkdownPreview";

const source = `# Pipeline verification

\`\`\`ts
const answer: number = 42;
\`\`\`
`;

function editorState(dark: boolean) {
  return EditorState.create({
    doc: source,
    extensions: [
      basicSetup,
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      dark ? oneDark : [],
    ],
  });
}

for (const dark of [false, true]) {
  const state = editorState(dark);
  const nodes: string[] = [];
  syntaxTree(state).iterate({
    enter(node: SyntaxNodeRef) {
      nodes.push(node.name);
    },
  });

  assert(
    nodes.includes("FencedCode"),
    "CodeMirror did not parse the fenced code",
  );
  assert(
    highlightingFor(state, [tags.keyword]),
    `CodeMirror ${dark ? "dark" : "light"} syntax highlighter is missing`,
  );
}

const html = renderToStaticMarkup(
  <MarkdownPreview content={source} dark={false} />,
);

assert.match(
  html,
  /<h1 data-line="1">Pipeline verification<\/h1>/,
  "rehypeSourceLine did not apply data-line to the heading",
);
assert.match(
  html,
  /<pre data-line="3"><code class="hljs language-ts" data-line="3"[^>]*>/,
  "rehypeSourceLine did not apply data-line to the highlighted code block",
);
assert.match(
  html,
  /class="hljs-keyword">const<\/span>/,
  "rehype-highlight did not emit syntax-highlight classes",
);

console.log(
  "Editor and preview pipeline verified: CodeMirror light/dark highlighting, react-markdown rendering, hljs classes, and data-line attributes.",
);
