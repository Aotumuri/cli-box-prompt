#!/usr/bin/env node
const { inputBox } = require("../src");

async function run() {
  const result = await inputBox({
    question: "What are you doing now?",
    borderStyle: "round",
  });

  console.clear();
  console.log("Answer:", result.value);
}

run();