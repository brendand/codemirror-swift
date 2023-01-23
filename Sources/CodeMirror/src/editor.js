import * as CodeMirror from "codemirror";
import { javascript, javascriptLanguage } from "@codemirror/lang-javascript";
import {EditorState, Compartment} from "@codemirror/state";
import {EditorView} from "@codemirror/view";
import {basicSetup} from "codemirror";
import { indentWithTab } from "@codemirror/commands";
import { html } from "@codemirror/lang-html";
import { json } from "@codemirror/lang-json";
import { xml } from "@codemirror/lang-xml";
import { css } from "@codemirror/lang-css";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";

import {
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
  keymap,
} from "@codemirror/view";

import {
  foldGutter,
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  foldKeymap,
} from "@codemirror/language";

import { history, defaultKeymap, historyKeymap } from "@codemirror/commands";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import {
  closeBrackets,
  autocompletion,
  closeBracketsKeymap,
  completionKeymap,
  snippetCompletion,
} from "@codemirror/autocomplete";

const theme = new Compartment();
const language = new Compartment();
const listener = new Compartment();
const readOnly = new Compartment();
const tabSize = new Compartment();
const lineWrapping = new Compartment();
const SUPPORTED_LANGUAGES_MAP = {
  javascript,
  json,
  html,
  css,
  markdown,
  xml,
  txt: () => [],
};

const baseTheme = EditorView.baseTheme({
  "&": {
    fontSize: "11pt",
    },
  "&light": {
    backgroundColor: "white", // the default codemirror light theme doesn't set this up
    "color-scheme": "light",
  },
  "&dark": {
    "color-scheme": "dark",
  },
});

var completions = [
];

function customCompletions(context) {
    let word = context.matchBefore(/\w*/)
    if (word.from == word.to && !context.explicit)
        return null
        return {
            from: word.from,
        options: completions
        }
};

const myCustomCompletions = javascriptLanguage.data.of({
autocomplete: customCompletions
});

const editorView = new CodeMirror.EditorView({
  doc: "",
  extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      dropCursor(),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      myCustomCompletions,
      autocompletion(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      keymap.of([
          ...closeBracketsKeymap,
             ...defaultKeymap,
             ...searchKeymap,
             ...historyKeymap,
             ...foldKeymap,
             ...completionKeymap,
             indentWithTab,
      ]),
      readOnly.of([]),
      lineWrapping.of([]),
      baseTheme,
      theme.of(oneDark),
      language.of(javascript()),
      listener.of([]),
  ],
  parent: document.body,
});

function getSupportedLanguages() {
  return Object.keys(SUPPORTED_LANGUAGES_MAP);
}

function setDarkMode(active) {
  editorView.dispatch({
    effects: theme.reconfigure(active ? [oneDark] : []),
  });
}

function setFontSize(size) {
    editorView.dispatch({
    effects: baseTheme.querySelector("&").style.fontSize = fontSize + 'pt',
    });
}

function setLanguage(lang) {
  let langFn = SUPPORTED_LANGUAGES_MAP[lang];
  editorView.dispatch({
    effects: language.reconfigure(langFn ? langFn() : []),
  });
}

function setContent(text) {
  editorView.dispatch({
    changes: { from: 0, to: editorView.state.doc.length, insert: text },
  });
}

function insertContent(text) {
    editorView.dispatch({
    changes: { from: editorView.state.selection.main.from, to: editorView.state.selection.main.to, insert: text },
    });
}

function setListener(fn) {
  editorView.dispatch({
    effects: listener.reconfigure(
      EditorView.updateListener.of((v) => {
        if (v.docChanged) {
          fn(v.state.doc.toString());
        }
      })
    ),
  });
}

function setReadOnly(value) {
  editorView.dispatch({
    effects: readOnly.reconfigure(value ? EditorState.readOnly.of(true) : []),
  });
}

function setLineWrapping(enabled) {
  editorView.dispatch({
    effects: lineWrapping.reconfigure(enabled ? EditorView.lineWrapping : []),
  });
}

function setCompletions(comps, snippets) {
    completions = comps;
    
    if (snippets != undefined) {
        for (var snippet of snippets) {
            for (var key in snippet) {
                let completion = snippetCompletion(key, snippet[key]);
                completions.push(completion);
            }
        }
    }
    
    customCompletions(completions)
}


export {
  setDarkMode,
  setFontSize,
  setLanguage,
  getSupportedLanguages,
  setContent,
  insertContent,
  setListener,
  setReadOnly,
  setLineWrapping,
  setCompletions,
  editorView,
};
