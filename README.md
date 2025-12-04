# cli-box-prompt

Small interactive picker for terminals. Renders a boxed question with selectable choices, supports hotkeys, inline/footer descriptions, and optional confirmation.

## Install

```sh
npm install cli-box-prompt
# or
npx cli-box-prompt
```

Node.js 18+ (CommonJS).

## Quick start (CLI)

```sh
npx cli-box-prompt
```

## Quick start (API) — free input

```js
const { inputBox } = require('cli-box-prompt');

async function main() {
  const result = await inputBox({
    question: 'What are you doing now?',
    borderStyle: 'round',
    boxWidth: null,
    showFooterHint: true
  });

  console.log('Answer:', result.value);
}

main();
```

## Quick start (API) — picker

```js
const { pickBox } = require('cli-box-prompt');

async function main() {
  const result = await pickBox({
    question: 'What are you doing now?',
    choices: {
      c: { value: 'Coding', description: 'Writing new code right now' },
      r: { value: 'Reviewing', description: 'Reading or reviewing changes' },
      s: { value: 'Sleeping', description: 'Away from keyboard' }
    },
    borderStyle: 'round',
    confirm: true,
    descriptionPlacement: 'inline',   // 'inline' | 'footer'
    descriptionDisplay: 'selected',   // 'selected' | 'always' | 'none'
    showFooterHint: true
  });

  console.log('Index:', result.index);
  console.log('Value:', result.value);
}

main();
```

## API

```js
const { pickBox, inputBox } = require('cli-box-prompt');
```

### `await pickBox(options)`

| option | type | default | description |
| --- | --- | --- | --- |
| `question` | `string` | required | Text shown at the top of the box (multi-line allowed). |
| `choices` | `Array` \| `Object` | required | Either an array or an object. Values can be strings or `{ value, label, description }`. Object keys become hotkeys. |
| `defaultIndex` | `number` | `0` | Initial selected index. |
| `borderStyle` | `'round' \| 'single' \| 'double'` | `'round'` | Border style characters. |
| `selectedColor` | `string \| function` | `null` (defaults to cyan) | Chalk color name (e.g. `'green'`) or custom highlighter function for the selected line. |
| `confirm` | `boolean` | `true` | If `true`, asks for confirmation (Enter/y to confirm, n to go back). |
| `descriptionPlacement` | `'inline' \| 'footer'` | `'inline'` | Where to show descriptions. |
| `descriptionDisplay` | `'selected' \| 'always' \| 'none'` | `'selected'` | When to show descriptions. |
| `showFooterHint` | `boolean` | `true` | Show the hint line “Use arrows or hotkeys, Enter to choose.” |
| `boxWidth` | `number \| null` | `null` | Fixed inner content width (min 15). If `null`, width auto-sizes to content (capped by terminal width). If the terminal is too narrow for 15 inner columns, it renders a small boxed message “Too narrow to render (need at least 15 columns).”. Values below 15 throw. |

### `await inputBox(options)`

Simple free-input prompt.

| option | type | default | description |
| --- | --- | --- | --- |
| `question` | `string` | required | Text shown at the top of the box (multi-line allowed). |
| `borderStyle` | `'round' \| 'single' \| 'double'` | `'round'` | Border style characters. |
| `boxWidth` | `number \| null` | `null` | Fixed inner content width (min 15). |
| `showFooterHint` | `boolean` | `true` | Show the hint line “Type your answer and press Enter.” |
| `hintText` | `string` | `'Type your answer and press Enter.'` | Custom footer hint. |
| `placeholder` | `string` | `''` | Light gray placeholder shown before any input is typed. |
| `pattern` | `RegExp \| string` | `null` | If provided, input must match this pattern (enter is ignored until it matches). Red warning shown while typing when it does not match. |
| `invalidMessage` | `string` | `'Input does not match required format.'` | Message displayed in red when `pattern` is not matched. |

Example enforcing an email shape:

```js
const result = await inputBox({
  question: 'Enter your email:',
  pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/,
  placeholder: 'user@example.com',
  invalidMessage: 'Please enter a valid email address.'
});
```

### Choice shapes

- Array of strings: `['Coding', 'Reviewing']` → hotkeys `1, 2` auto-assigned.
- Array of objects: `[{ value: 'Coding', description: 'Writing new code right now' }]`.
- Object map: `{ c: 'Coding', r: { value: 'Reviewing', description: 'Reading or reviewing changes' } }` → hotkeys `c`, `r`.

### Key handling

- Up/Down arrows to move (wraps around).
- Hotkeys jump/select immediately (and toggle in multi mode).
- Enter: select (or confirm if `confirm: true`).
- Space (multiPickBox): toggle current item.
- Ctrl+C: exit process.

## CLI demo scripts

`bin/cli-box-prompt.js` calls `inputBox` with a sample question; usable via `npx cli-box-prompt` or after a local install `npx .`.

## Tests

```sh
npm test
```

## Notes

- Clears the screen on each render via `console.clear()`.
