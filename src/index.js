const chalk = require('chalk');
const { renderBox } = require('cli-box-renderer');

function normalizeChoices(raw) {
  if (!raw) throw new Error('choices is required');
  const list = [];

  const pushEntry = (key, item, idx) => {
    const base = typeof item === 'object' && item !== null ? item : { value: item };
    const value = base.value !== undefined ? base.value : base.label;
    const label = base.label !== undefined ? base.label : String(value);
    const description = base.description || '';
    list.push({
      key: key || String(idx + 1),
      label: String(label),
      value,
      description: description ? String(description) : ''
    });
  };

  if (Array.isArray(raw)) {
    raw.forEach((item, idx) => pushEntry(String(idx + 1), item, idx));
    return list;
  }

  if (typeof raw === 'object') {
    Object.entries(raw).forEach(([key, item], idx) => pushEntry(String(key), item, idx));
    return list;
  }

  throw new Error('choices must be an array or an object map.');
}

function buildHighlighter(selectedColor) {
  if (typeof selectedColor === 'function') return selectedColor;
  if (typeof selectedColor === 'string' && typeof chalk[selectedColor] === 'function') {
    return (text) => chalk[selectedColor](text);
  }
  return (text) => chalk.cyan(text);
}

function clampIndex(idx, length) {
  if (!length) return 0;
  const mod = idx % length;
  return mod < 0 ? mod + length : mod;
}

function buildInlineDescriptions(choices, selectedIndex, descriptionDisplay, descriptionPlacement) {
  if (descriptionPlacement !== 'inline') return [];
  if (descriptionDisplay === 'none') return [];

  return choices.map((choice, idx) => {
    if (!choice.description) return [];
    if (descriptionDisplay === 'selected' && idx !== selectedIndex) return [];
    return String(choice.description).split('\n');
  });
}

function buildFooterLines(options) {
  const {
    choices,
    selectedIndex,
    descriptionDisplay,
    descriptionPlacement,
    showFooterHint,
    hintText,
    confirming
  } = options;

  const lines = [];

  if (descriptionPlacement === 'footer' && descriptionDisplay !== 'none') {
    if (descriptionDisplay === 'always') {
      choices.forEach((choice) => {
        if (choice.description) {
          lines.push(`${choice.key}) ${choice.description}`);
        }
      });
    } else if (descriptionDisplay === 'selected') {
      const choice = choices[selectedIndex];
      if (choice && choice.description) {
        lines.push(choice.description);
      }
    }
  }

  if (confirming) {
    lines.push('Enter or y to confirm, n to go back.');
  } else if (showFooterHint) {
    lines.push(hintText);
  }

  return lines;
}

function render(state) {
  const { question, choices, selectedIndex, borderStyle, boxWidth, highlightFn } = state;
  const inlineDescriptions = buildInlineDescriptions(
    choices,
    selectedIndex,
    state.descriptionDisplay,
    state.descriptionPlacement
  );

  const footerLines = buildFooterLines({
    choices,
    selectedIndex,
    descriptionDisplay: state.descriptionDisplay,
    descriptionPlacement: state.descriptionPlacement,
    showFooterHint: state.showFooterHint,
    hintText: state.hintText,
    confirming: state.confirming
  });

  const lines = [];
  String(question)
    .split('\n')
    .forEach((line) => lines.push(line));
  lines.push('');

  choices.forEach(({ key, label }, idx) => {
    const indicator = idx === selectedIndex ? '>' : ' ';
    const prefix = `${indicator}   ${key ? `${key}) ` : ''}`;
    const lineText = `${prefix}${label}`;
    lines.push(idx === selectedIndex ? highlightFn(lineText) : lineText);

    const descLines = inlineDescriptions[idx] || [];
    descLines.forEach((desc) => {
      const descText = `        ${desc}`;
      lines.push(idx === selectedIndex ? highlightFn(descText) : descText);
    });
  });

  if (footerLines.length) {
    lines.push('');
    footerLines.forEach((line) => lines.push(line));
  }

  const { text } = renderBox(lines, { borderStyle, boxWidth });
  console.clear();
  process.stdout.write(`${text}\n`);
}

function isInputValid(state) {
  if (!state.validationRegex) return true;
  if (state.validationRegex.global) state.validationRegex.lastIndex = 0;
  return state.validationRegex.test(state.input);
}

function renderInput(state) {
  const footerLines = [];
  const matchesPattern = isInputValid(state);
  const shouldWarn = state.validationRegex && !matchesPattern;
  const hasInput = state.input.length > 0;
  const cursorChar = state.cursorVisible ? state.cursor : ' ';
  const inputDisplay = hasInput
    ? state.input
    : state.placeholder
    ? chalk.gray(state.placeholder)
    : '';
  const cursorDisplay = !hasInput && state.placeholder ? '' : cursorChar;

  if (shouldWarn) {
    footerLines.push(chalk.red(state.invalidMessage));
  }

  if (state.showFooterHint) {
    footerLines.push(state.hintText);
  }
  const lines = [];
  String(state.question)
    .split('\n')
    .forEach((line) => lines.push(line));
  lines.push('');
  lines.push(`> ${inputDisplay}${cursorDisplay}`);

  if (footerLines.length) {
    lines.push('');
    footerLines.forEach((line) => lines.push(line));
  }

  const { text } = renderBox(lines, { borderStyle: state.borderStyle, boxWidth: state.boxWidth });
  console.clear();
  process.stdout.write(`${text}\n`);
}

function createState(opts) {
  const choices = normalizeChoices(opts.choices);
  if (!choices.length) throw new Error('choices must not be empty.');

  const selectedIndex = clampIndex(opts.defaultIndex ?? 0, choices.length);
  const highlightFn = buildHighlighter(opts.selectedColor);
  const hintBase = 'Use arrows or hotkeys, Enter to choose.';

  return {
    question: opts.question || '',
    choices,
    selectedIndex,
    borderStyle: opts.borderStyle || 'round',
    confirm: opts.confirm !== false,
    descriptionPlacement: opts.descriptionPlacement || 'inline',
    descriptionDisplay: opts.descriptionDisplay || 'selected',
    showFooterHint: opts.showFooterHint !== false,
    boxWidth: opts.boxWidth ?? null,
    highlightFn,
    confirming: false,
    hintText: hintBase,
    mode: 'single'
  };
}

function finalizeSingle(state) {
  const choice = state.choices[state.selectedIndex];
  return { index: state.selectedIndex, value: choice.value, key: choice.key, label: choice.label };
}

function runPrompt(options) {
  const state = createState(options);

  return new Promise((resolve) => {
    const onData = (buf) => {
      const str = buf.toString();

      if (str === '\u0003') {
        cleanup();
        process.exit(1);
      }

      if (state.confirming) {
        if (str === '\r' || str === '\n' || str.toLowerCase() === 'y') {
          cleanup();
          render(state); // final render
          resolve(finalizeSingle(state));
          return;
        }
        if (str.toLowerCase() === 'n') {
          state.confirming = false;
          render(state);
          return;
        }
        return;
      }

      if (str === '\u001b[A') {
        state.selectedIndex = clampIndex(state.selectedIndex - 1, state.choices.length);
        render(state);
        return;
      }

      if (str === '\u001b[B') {
        state.selectedIndex = clampIndex(state.selectedIndex + 1, state.choices.length);
        render(state);
        return;
      }

      const hotkeyHit = state.choices.findIndex((choice) => choice.key.toLowerCase() === str.toLowerCase());
      if (hotkeyHit !== -1) {
        state.selectedIndex = hotkeyHit;
        if (state.confirm) {
          state.confirming = true;
        } else {
          cleanup();
          render(state);
          resolve(finalizeSingle(state));
          return;
        }
        render(state);
        return;
      }

      if (str === '\r' || str === '\n') {
        if (state.confirm) {
          state.confirming = true;
          render(state);
          return;
        }
        cleanup();
        render(state);
        resolve(finalizeSingle(state));
        return;
      }
    };

    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.off('data', onData);
      process.stdin.pause();
    };

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
    render(state);
  });
}

async function pickBox(options) {
  return runPrompt(options || {});
}

function runInput(options) {
  const rawPattern = options.pattern ?? options.validationPattern ?? null;
  let validationRegex = null;

  if (rawPattern !== null && rawPattern !== undefined) {
    if (rawPattern instanceof RegExp) {
      validationRegex = new RegExp(rawPattern.source, rawPattern.flags);
    } else if (typeof rawPattern === 'string') {
      try {
        validationRegex = new RegExp(rawPattern);
      } catch (err) {
        throw new Error(`Invalid pattern: ${err.message}`);
      }
    } else {
      throw new Error('pattern/validationPattern must be a RegExp or string.');
    }
  }

  const state = {
    question: options.question || '',
    borderStyle: options.borderStyle || 'round',
    boxWidth: options.boxWidth ?? null,
    showFooterHint: options.showFooterHint !== false,
    hintText: options.hintText || 'Type your answer and press Enter.',
    placeholder: options.placeholder || '',
    validationRegex,
    invalidMessage: options.invalidMessage || 'Input does not match required format.',
    input: '',
    cursor: '▌',
    cursorVisible: true
  };

  return new Promise((resolve) => {
    let active = true;
    const blinkTimer = setInterval(() => {
      if (!active) return;
      state.cursorVisible = !state.cursorVisible;
      renderInput(state);
    }, 500);

    const onData = (buf) => {
      const str = buf.toString();

      if (str === '\u0003') {
        cleanup();
        process.exit(1);
      }

      if (str === '\r' || str === '\n') {
        const matchesPattern = isInputValid(state);
        if (!matchesPattern) {
          renderInput(state);
          return;
        }
        cleanup();
        renderInput(state);
        resolve({ value: state.input });
        return;
      }

      if (str === '\u0008' || str === '\u007f') {
        state.input = state.input.slice(0, -1);
        renderInput(state);
        return;
      }

      // Ignore arrow keys/escape sequences
      if (str.startsWith('\u001b')) return;

      state.input += str;
      renderInput(state);
    };

    const cleanup = () => {
      active = false;
      clearInterval(blinkTimer);
      process.stdin.setRawMode(false);
      process.stdin.off('data', onData);
      process.stdin.pause();
    };

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
    renderInput(state);
  });
}

async function inputBox(options) {
  return runInput(options || {});
}

module.exports = { pickBox, inputBox };
