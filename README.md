# myparser

A high-performance, lightweight, and flexible TypeScript library redefining structured text parsing. Built on the core philosophy of **functional composition** and **type safety**, it lets you break down complex parsing logic into reusable, pure functions—turning fragile ad-hoc code into robust, declarative workflows. Whether for simple text extraction, custom format parsing, or complex DSL processing, myparser delivers conciseness, efficiency, and predictability.

## Core Philosophy

myparser is designed around three uncompromising principles, solving the root pain points of traditional parsing (regex chaos, tight coupling, type ambiguity):

1. **Composition Over Monoliths**: Parsing logic is built by combining small, single-responsibility pure functions. No more monolithic regex or tangled string slicing—each parser is a reusable building block that integrates seamlessly with others.

2. **Type Safety by Design**: TypeScript generics enforce strict input/output contracts. Every parser’s result type is automatically inferred, eliminating runtime type errors and enabling full IDE intellisense for a frictionless development experience.

3. **Efficiency Without Compromise**: Slice-based core logic operates on string segments (not character-by-character) to guarantee linear time complexity (O(n)), making it blazingly fast even for extra-long strings.

## Features

- **Pure Function Paradigm**: All parsing operations are side-effect-free pure functions. Logic is predictable, easy to unit test, and naturally compatible with functional composition patterns.

- **Zero Dependencies**: Pure TypeScript implementation (no third-party reliance) weighs less than 5KB after bundling. Avoid dependency bloat, conflicts, and version compatibility headaches.

- **Universal Compatibility**: Leverages only standard String APIs, working seamlessly across browsers, Node.js, Bun, and all JavaScript runtimes—no environment-specific adaptations needed.

- **Rich Combinators**: Chain, branch, and repeat parsers with intuitive combinators (`pipeO`, `composeP`, `orP`, `many`, `before`). Split logic into fine-grained functions for maximum reusability and maintainability.

- **Intuitive Do Syntax**: Use generator functions via `Do` to write sequential parsing logic in a readable, imperative-like style—without sacrificing functional purity or type safety.

- **Slice-Based Performance**: Core parsing uses string slicing instead of character-wise processing, ensuring high throughput for tokenization and string splitting, even with large datasets.

## Quick Start

### Installation

Install via your preferred package manager:

#### Bun

```zsh

bun add @diqye/myparser
```

#### npm

```zsh

npm install --save @diqye/myparser
```

### Example 1: Parse XML-Like Nodes (Demonstrate Composition & Do Syntax)

Parse a list of `<user>` nodes to extract structured data. We’ll show two equivalent approaches:`pipeO` (declarative composition) and `Do` (generator syntax) — highlighting myparser’s flexibility.

```typescript

import { simpleParse, many, pipeO, Do, spaces, equal, search } from "@diqye/myparser";

// Sample XML-like content (real XML/HTML fragments work similarly)
const xml = `
  <user>
    <name>Alice</name>
    <age>30</age>
  </user>
  <user>
    <name>Bob</name>
    <age>25</age>
  </user>
`;

// Approach 1: Use pipeO for declarative, composable parsing
const userParserWithPipeO = pipeO([
  ["", spaces],          // Skip whitespace (reusable primitive)
  ["", equal("<user>")],  // Exact match opening tag
  ["", spaces],
  ["", equal("<name>")], // Match <name> tag
  ["", spaces],
  ["name", search("</name>")], // Extract content until </name>, assign to "name"
  ["", spaces],
  ["", equal("<age>")],  // Match <age> tag
  ["", spaces],
  ["age", search("</age>")],  // Extract content until </age>, assign to "age"
  ["", spaces],
  ["", equal("</user>")], // Match closing tag
]);

// Approach 2: Use Do for imperative-like readability (same logic, different style)
const userParserWithDo = Do(function* () {
  yield spaces;          // Yield parsers to execute sequentially
  yield equal("<user>");
  yield spaces;
  yield equal("<name>");
  yield spaces;
  const name = yield search("</name>"); // Capture result of search
  yield spaces;
  yield equal("<age>");
  yield spaces;
  const age = yield search("</age>");   // Capture age value
  yield spaces;
  yield equal("</user>");
  return { name, age: Number(age) }; // Transform & return structured data
});

// Parse multiple users with `many` (repeat until failure)
const usersWithPipeO = simpleParse(many(userParserWithPipeO), xml);
const usersWithDo = simpleParse(many(userParserWithDo), xml);

console.log(usersWithDo);
// Output: [{ name: "Alice", age: 30 }, { name: "Bob", age: 25 }]

```

*Key Takeaway*: Both approaches reuse core primitives (`spaces`, `equal`, `search`) and combine them with `many` — proving how myparser turns small building blocks into complex parsers.

### Example 2: Parse Custom Delimited Data (Demonstrate Combinators & Filtering)

Parse a log file with custom format `[LEVEL] Timestamp - Message`, extracting only `ERROR` entries before a marker. This showcases `before`, `orP`, and `fmap` for transformation.

```typescript

import { simpleParse, many, before, orP, pipeO, fmap, equal, search, spaces } from "@diqye/myparser";

// Sample log content
const log = `
[INFO] 2024-05-01 10:00:00 - Server started
[ERROR] 2024-05-01 10:05:00 - Database connection failed
[WARN] 2024-05-01 10:06:00 - Low memory
[ERROR] 2024-05-01 10:10:00 - API timeout
--- STOP HERE ---
[INFO] 2024-05-01 10:15:00 - Server restarted
`;

// Parser for log level (only match ERROR/WARN/INFO)
const levelParser = orP(
  equal("[ERROR]"),
  equal("[WARN]"),
  equal("[INFO]")
);

// Parser for a single log entry
const logEntryParser = pipeO([
  ["level", levelParser],       // Extract level
  ["", spaces],
  ["timestamp", search(" - ")], // Extract timestamp until " - "
  ["message", search("\n")],    // Extract message until newline
]);

// Transform to clean up results (remove brackets from level)
const cleanLogParser = fmap(logEntryParser, (entry) => ({
  level: entry.level.replace(/\[|\]/g, ""),
  timestamp: entry.timestamp.trim(),
  message: entry.message.trim(),
}));

// Filter to keep only ERROR entries
const errorParser = fmap(cleanLogParser, (entry) => 
  entry.level === "ERROR" ? entry : null
).filter(Boolean); // Remove nulls (non-ERROR entries)

// Parse all errors BEFORE the "--- STOP HERE ---" marker
const errors = simpleParse(
  before(many(errorParser), search("--- STOP HERE ---")),
  log
);

console.log(errors);
// Output: [
//   { level: "ERROR", timestamp: "2024-05-01 10:05:00", message: "Database connection failed" },
//   { level: "ERROR", timestamp: "2024-05-01 10:10:00", message: "API timeout" }
// ]

```

*Key Takeaway*: myparser’s combinators let you layer logic (parsing → transformation → filtering) without coupling. The `before` combinator safely limits parsing to a segment, avoiding unwanted content.

## Why myparser?

Compare myparser to traditional parsing approaches:

|Approach|Main Pain Points|myparser Advantage|
|---|---|---|
|Regex|Unreadable for complex logic, poor error handling, no types|Composable, readable, type-safe, precise error localization|
|Manual String Slicing|Tight coupling, off-by-one errors, hard to maintain|Decoupled primitives, slice-optimized core, no manual index management|
|Heavy Parsers (PEG.js)|Bulky, dependencies, steep learning curve|Lightweight (5KB), zero dependencies, intuitive functional API|
## Use Cases

- **Custom Config Files**: Parse domain-specific config formats (e.g., INI, YAML-like subsets) with reusable parsers.

- **Log Processing**: Extract structured data (timestamps, levels, messages) from unstructured log lines.

- **DSL Parsing**: Build parsers for custom domain-specific languages (e.g., query syntax, template engines).

- **API Payload Sanitization**: Parse & transform raw string payloads into typed objects.

- **XML/HTML Fragments**: Extract specific tags/attributes without full DOM parsing.

# Myparser Library API Documentation (Concise Table Version)

This document presents all APIs of the library in a concise tabular format, categorized by functionality, including core definitions and descriptions.

## I. Core Type Definitions

|Type Name|Definition|Description|
|---|---|---|
|Token|`export type Token = string`|Basic unit of parsing input, essentially a string.|
|ParseError|Enum type with 10 error identifiers.|Indicates the cause of parsing failure in different scenarios (e.g., END_OF_INPUT, EQUAL_FAIL).|
|Parser<T>|Union type, containing value and remaining Token on success, error message on failure.|Describes the result of a single parsing operation.|
|ParseF<T>|`type ParseF<T> = (token: Token) => Parser<T>`|Basic parser function type, accepting a Token and returning a parsing result.|
|ParseFunction<T>|Union type, supporting direct parser functions or recursive parser functions.|Adapts to scenarios with recursively defined parsers.|
## II. Parser Combinators

|Function Name|Definition|Function Description|
|---|---|---|
|orP<T>|(x: ParseF<T>, ...xs: ParseF<T>[]) => ParseF<T>|Tries parser functions in sequence and returns the first successful result.|
|selectMinConsumingF<T>|(parseFs: ParseF<T>[]) => ParseF<T>|Selects the successful parsing result that consumes the least Tokens; returns the last error if all fail.|
|bind<a,b>|(p: ParseFunction<a>, fn: (a: a) => ParseF<b>) => ParseF<b>|Chains parsers, using the result of the previous parser to determine the next one.|
|fmap<a,b>|(p: ParseFunction<a>, fn: (a: a) => b) => ParseF<b>|Transforms the value of a successful parsing result without changing Token consumption.|
|composeP|(...p: any[]) => (token: Token) => Parser<any[]>|Right-associative parser combiner, returns results in input order.|
|pipeP|(...p: any[]) => (token: Token) => Parser<any[]>|Left-associative parser combiner, executes sequentially and collects results.|
|pipeO|(...ps: [string, ParseF<any>][]) => ParseF<any>|Left-associative parser combiner, collects results as an object (supports ignoring items without keys).|
## III. Basic Parser Functions

|Function Name|Definition|Function Description|
|---|---|---|
|search|(str: Token) => ParseF<Token>|Searches for the target substring, returns content before the substring and remaining Token (excluding the target substring).|
|space|(token: Token) => Parser<string>|Parses a single whitespace character (space, tab, newline/carriage return).|
|spaces|(token: Token) => Parser<void>|Removes all leading whitespace characters, always succeeds.|
|anyChar|(token: Token) => Parser<string>|Parses the first character, fails if input is empty.|
|equal|(str: Token) => ParseF<string>|Parses a substring that exactly matches the specified string, returns the matched string and remaining Token.|
|notEqual|(str: Token) => ParseF<string>|Parses a single character that does not match the specified string, returns the parsed character and remaining Token.|
|numberF|ParseF<number>|Parses a JSON-style number (integer or floating-point), returns the number and remaining Token.|
|take|(n: number) => ParseF<Token>|Takes the first n characters as the result, returns the substring and remaining Token; fails if input is empty.|
|regexF|(regex: RegExp) => ParseF<Token>|Matches input with the specified regular expression, returns the matched substring and remaining Token; fails if no match.|
|breakToEnd|ParseF<Token>|Parses all remaining characters as the result, returns the entire remaining Token with an empty slice.|
|endOfInput|ParseF<void>|Verifies if the current position is at the end of input; succeeds if Token is empty, fails otherwise.|
## IV. Repeated Parsing Functions

|Function Name|Definition|Function Description|
|---|---|---|
|many<T>|(p: (token: Token) => Parser<T>) => ParseF<T[]>|Applies the parser repeatedly until it fails, collects all successful results into an array (supports empty results).|
|many1<T>|(p: (token: Token) => Parser<T>) => ParseF<T[]>|Applies the parser repeatedly until it fails, requires at least one success; collects results into an array.|
|manyTill<T,U>|(parseF: ParseF<T>, end: ParseF<U>) => ParseF<T[]>|Repeats the main parser until the end parser succeeds, collects results of the main parser into an array.|
|sepBy<T,S>|(parseF: ParseF<T>, sep: ParseF<S>) => ParseF<T[]>|Parses multiple values separated by the separator parser, collects main parser results into an array (supports empty results).|
## V. Utility & Helper Functions

|Function Name|Definition|Function Description|
|---|---|---|
|isSpace|(char: string) => boolean|Checks if a character is a whitespace character (space, tab, newline, carriage return).|
|isNumber|(char: string) => boolean|Checks if a character is a numeric digit (0-9).|
|plog<T>|(fn: ParseF<T>, prefix="plog=", log_result=false) => ParseF<T>|Debug parser, logs the first 100 characters of Token and optional result before parsing.|
|before<a,b>|(parseF: ParseF<a>, parseFBefore: ParseF<b>) => ParseF<a>|Parses content before the position where the end parser succeeds, returns the result of the main parser.|
|pure<a>|(a: a) => ParseF<a>|Always succeeds with the specified value without consuming any Token.|
|fail|(message="") => ParseF<never>|Always fails with the optional specified message.|
|optional<T>|(p: ParseF<T>) => ParseF<T|undefined>|Makes the parser optional; returns undefined without consuming Token if the original parser fails.|
|lookup<T>|(parseF: ParseF<T>) => ParseF<T>|Peeks at the Token without consuming it; returns the result if parsing succeeds, keeps the original Token.|
|Do<T,Y>|(gen: () => Generator<ParseF<any>, T, any>) => ParseF<T>|Uses generator functions to simplify sequential parsing logic, passes results between parsers.|
|simpleParse<T>|(p: ParseFunction<T>, token: Token) => T|Simplified parsing function; returns the parsed value on success, throws a ParserException on failure.|