import { createRequire } from "module";
import { readFileSync } from "fs";
import { pathToFileURL } from "url";

const require = createRequire(
  pathToFileURL(
    "c:/Users/abdur/Documents/Projects/hotcol-user/BackEnd/package.json",
  ).href,
);
const { parse } = require("graphql");

function check(label, path, regex) {
  const src = readFileSync(path, "utf8");
  const m = src.match(regex);
  if (!m) {
    console.log(`${label}: SKIP`);
    return;
  }
  const cleaned = m[1].replace(/\$\{[^}]+\}/g, "\n");
  try {
    parse(cleaned);
    console.log(`${label}: OK`);
  } catch (e) {
    console.log(`${label}: FAIL — ${e.message}`);
  }
}

check(
  "hotcol",
  "c:/Users/abdur/Documents/Projects/hotcol/GraphQl-BackEnd/typeDefs.js",
  /export const typeDefs = gql`([\s\S]*?)`;/,
);
check(
  "hotcol-waiter",
  "c:/Users/abdur/Documents/Projects/hotcol-waiter/BackEnd/index.js",
  /const typeDefs = gql`([\s\S]*?)`;/,
);
check(
  "hotcol-user-waiter-block",
  "c:/Users/abdur/Documents/Projects/hotcol-user/BackEnd/waiterOrderingGraphql.js",
  /waiterOrderingTypeDefsBlock = `([\s\S]*?)`;/,
);
check(
  "hotcol-user",
  "c:/Users/abdur/Documents/Projects/hotcol-user/BackEnd/index.js",
  /const typeDefs = gql`([\s\S]*?)`;/,
);

// Flag any remaining Prisma-style /// inside likely SDL files
for (const p of [
  "c:/Users/abdur/Documents/Projects/hotcol/GraphQl-BackEnd/typeDefs.js",
  "c:/Users/abdur/Documents/Projects/hotcol-user/BackEnd/waiterOrderingGraphql.js",
  "c:/Users/abdur/Documents/Projects/hotcol-user/BackEnd/lodgingGraphql.js",
  "c:/Users/abdur/Documents/Projects/hotcol-user/BackEnd/hrGraphql.js",
  "c:/Users/abdur/Documents/Projects/hotcol-user/BackEnd/crystalNameGraphql.js",
  "c:/Users/abdur/Documents/Projects/hotcol-waiter/BackEnd/index.js",
]) {
  const src = readFileSync(p, "utf8");
  const lines = src.split(/\r?\n/);
  const bad = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*\/\//.test(lines[i]) && /typeDefs|gql`|TypeDefsBlock|Query \{|Mutation \{/.test(src)) {
      // Only report // inside template literal regions — heuristic: line looks like SDL indent + //
      if (/^\s+\/\/\//.test(lines[i]) || (/^\s+\/\/\s/.test(lines[i]) && /:\s|type |input |enum /.test(lines[i + 1] || ""))) {
        bad.push(`${i + 1}:${lines[i].trim()}`);
      }
    }
    if (/^\s+\/\/\//.test(lines[i])) bad.push(`${i + 1}:${lines[i].trim()}`);
  }
  if (bad.length) console.log(`SLASH-COMMENTS ${p}:\n  ${bad.join("\n  ")}`);
}
