#!/usr/bin/env node
const { inputBox } = require("../src");

const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

async function run() {
  const result = await inputBox({
    question: "Enter your email:",
    borderStyle: "round",
    pattern: emailPattern,
    placeholder: "user@example.com",
    invalidMessage: "Please enter a valid email address.",
  });

  console.clear();
  console.log("Email:", result.value);
}

run();
