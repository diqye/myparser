# myparser

A high-performance, lightweight, and flexible TypeScript library redefining structured text parsing. Built on the core philosophy of **functional composition** and **type safety**, it lets you break down complex parsing logic into reusable, pure functions—turning fragile ad-hoc code into robust, declarative workflows. Whether for simple text extraction, custom format parsing, or complex DSL processing, myparser delivers conciseness, efficiency, and predictability.

## Core Philosophy

myparser is designed around three uncompromising principles, solving the root pain points of traditional parsing (regex chaos, tight coupling, type ambiguity):

1. **Composition Over Monoliths**: Parsing logic is built by combining small, single-responsibility pure functions. No more monolithic regex or tangled string slicing—each parser is a reusable building block that integrates seamlessly with others.

2. **Type Safety by Design**: TypeScript generics enforce strict input/output contracts. Every parser's result type is automatically inferred, eliminating runtime type errors and enabling full IDE intellisense for a frictionless development experience.

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

### Example: Complete JSON Parser

[click here for tutorial](./docs/tutorial.md)

Here's a complete JSON parser built with myparser, demonstrating how to compose small parsers into a complex, real-world parser:


```typescript
import { parse, orP, fmap, equal, pipeP, manyTill, sepBy, pipeO, bind, pure, spaces, endOfInput, anyChar, numberF } from "@diqye/myparser";

// Define JSON value types
type ObjectValue = { [k: string]: Value };
type Value = null | string | boolean | number | ObjectValue | Value[];

export function parseJson(token: string): Value {
  // null parser
  const nullF = fmap(equal("null"), () => null);

  // boolean parser
  const booleanF = fmap(orP(equal("true"), equal("false")), a => a === "true");

  // string parser with escape sequence support
  const stringF = fmap(
    pipeP(
      equal('"'),
      manyTill(
        orP(fmap(equal('\\"'), a => '"'), anyChar),
        equal('"')
      )
    ),
    xs => xs[1].join("")
  );

  // array parser (recursive)
  const arrayF = fmap(
    pipeP(
      equal("["),
      spaces,
      sepBy(
        fmap({ fn: () => composeP(spaces, valueF, spaces) }, x => x[1]),
        equal(",")
      ),
      spaces,
      equal("]")
    ),
    xs => xs[2]
  );

  // object parser
  const keyValueF = pipeO(
    ["key", stringF],
    ["", spaces],
    ["", equal(":")],
    ["", spaces],
    ["value", bind({ fn: () => valueF }, pure)]
  );

  const keyValueListF = fmap(
    pipeP(
      equal("{"),
      spaces,
      sepBy(keyValueF, equal(",")),
      spaces,
      equal("}")
    ),
    xs => xs[2]
  );

  const objectF = fmap(keyValueListF, keyValueList => {
    const obj: ObjectValue = {};
    for (const kv of keyValueList) {
      obj[kv.key] = kv.value;
    }
    return obj;
  });

  // Main value parser (recursive definition)
  let valueF: ParseF<Value> = orP<Value>(
    nullF,
    booleanF,
    numberF,
    stringF,
    arrayF,
    objectF
  );

  // Parse with whitespace handling and end-of-input check
  return parse(
    fmap(
      pipeP(spaces, valueF, spaces, endOfInput),
      x => x[1]
    ),
    token
  );
}

// Usage examples:
const json1 = '{"name": "John", "age": 30, "isActive": true}';
console.log(parseJson(json1));
// Output: { name: "John", age: 30, isActive: true }

const json2 = '[1, 2, {"nested": true}, null, "hello"]'
console.log(parseJson(json2));
// Output: [1, 2, { nested: true }, null, "hello"]
```

**Key Takeaways**:
- **Composition**: Complex parsers are built by combining simple primitives (`equal`, `anyChar`, `spaces`)
- **Recursion**: The `valueF` parser references itself to handle nested structures
- **Type Safety**: Full TypeScript inference for the parsed JSON structure
- **Real-world Ready**: Handles all JSON data types including nested objects and arrays

### Example 2: Parse XML-Like Nodes

Parse a list of `<user>` nodes to extract structured data using `pipeO` for declarative composition:

```typescript
import { parse, many, pipeO, spaces, equal, takeUntil } from "@diqye/myparser";

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

const userParser = pipeO(
  ["", spaces],
  ["", equal("<user>")],
  ["", spaces],
  ["", equal("<name>")],
  ["", spaces],
  ["name", takeUntil("</name>")],
  ["", spaces],
  ["", equal("<age>")],
  ["", spaces],
  ["age", takeUntil("</age>")],
  ["", spaces],
  ["", equal("</user>")]
);

const users = parse(many(userParser), xml);
console.log(users);
// Output: [{ name: "Alice", age: "30" }, { name: "Bob", age: "25" }]
```

## Why myparser?

Compare myparser to traditional parsing approaches:

| Approach | Main Pain Points | myparser Advantage |
|---|---|---|
| Regex | Unreadable for complex logic, poor error handling, no types | Composable, readable, type-safe, precise error localization |
| Manual String Slicing | Tight coupling, off-by-one errors, hard to maintain | Decoupled primitives, slice-optimized core, no manual index management |
| Heavy Parsers (PEG.js) | Bulky, dependencies, steep learning curve | Lightweight (5KB), zero dependencies, intuitive functional API |

## Use Cases

- **Custom Config Files**: Parse domain-specific config formats (e.g., INI, YAML-like subsets) with reusable parsers.

- **Log Processing**: Extract structured data (timestamps, levels, messages) from unstructured log lines.

- **DSL Parsing**: Build parsers for custom domain-specific languages (e.g., query syntax, template engines).

- **API Payload Sanitization**: Parse & transform raw string payloads into typed objects.

- **XML/HTML Fragments**: Extract specific tags/attributes without full DOM parsing.

## API Reference

### Core Types

```typescript
type Token = string
type ParseError = "END_OF_INPUT" | "SELECT_EMPTY" | "EQUAL_FAIL" | "DOESNT_INDEX_OF" | "NOT_SPACE" | "NOT_NUMBER" | "FAIL" | "F" | "REGEX_F" | "AT_LEAST_ONE_SUCCESSFUL"

type Parser<T> =
  | { status: ParseError, message: string }
  | { status: "SUCCESS", value: T, slice: Token }

type ParseF<T> = (token: Token) => Parser<T>
type ParseFunction<T> = ParseF<T> | { fn: () => ParseF<T> }
```

### Parser Combinators

| Function | Signature | Description |
|---|---|---|
| `orP` | `<T>(...parsers: ParseF<T>[]) => ParseF<T>` | Tries parsers in sequence, returns first success |
| `selectMinConsumingF` | `<T>(parsers: ParseF<T>[]) => ParseF<T>` | Selects result consuming fewest tokens |
| `bind` | `<A, B>(p: ParseFunction<A>, fn: (a: A) => ParseF<B>) => ParseF<B>` | Monadic bind for chaining parsers |
| `fmap` | `<A, B>(p: ParseFunction<A>, fn: (a: A) => B) => ParseF<B>` | Maps function over parse result |
| `composeP` | `(...parsers: ParseF<any>[]) => ParseF<any[]>` | Right-associative composition |
| `pipeP` | `(...parsers: ParseF<any>[]) => ParseF<any[]>` | Left-associative composition |
| `pipeO` | `(...pairs: [string, ParseF<any>][]) => ParseF<object>` | Object-building composition |

### Basic Parsers

| Function | Signature | Description |
|---|---|---|
| `takeUntil` | `(delimiter: string) => ParseF<string>` | Consumes until delimiter |
| `space` | `ParseF<string>` | Parses single whitespace char |
| `spaces` | `ParseF<void>` | Consumes all leading whitespace |
| `anyChar` | `ParseF<string>` | Parses first character |
| `equal` | `(str: string) => ParseF<string>` | Matches exact string |
| `notP` | `<A>(p: ParseF<A>) => ParseF<void>` | Succeeds if parser fails |
| `numberF` | `ParseF<number>` | Parses JSON-style numbers |
| `take` | `(n: number) => ParseF<string>` | Takes n characters |
| `regexF` | `(regex: RegExp) => ParseF<string>` | Matches regex pattern |
| `breakToEnd` | `ParseF<string>` | Consumes all remaining input |
| `endOfInput` | `ParseF<void>` | Succeeds at end of input |

### Repetition Parsers

| Function | Signature | Description |
|---|---|---|
| `many` | `<T>(p: ParseF<T>) => ParseF<T[]>` | Zero or more repetitions |
| `many1` | `<T>(p: ParseF<T>) => ParseF<T[]>` | One or more repetitions |
| `manyTill` | `<T, U>(p: ParseF<T>, end: ParseF<U>) => ParseF<T[]>` | Repeats until end parser succeeds |
| `sepBy` | `<T, S>(p: ParseF<T>, sep: ParseF<S>) => ParseF<T[]>` | Parses separated list |

### Utility Functions

| Function | Signature | Description |
|---|---|---|
| `pure` | `<A>(value: A) => ParseF<A>` | Returns value without consuming input |
| `fail` | `(message?: string) => ParseF<never>` | Always fails |
| `optional` | `<T>(p: ParseF<T>) => ParseF<T \| undefined>` | Makes parser optional |
| `lookup` | `<T>(p: ParseF<T>) => ParseF<T>` | Peeks without consuming |
| `before` | `<A, B>(p: ParseF<A>, end: ParseF<B>) => ParseF<A>` | Parses content before end |
| `Do` | `<T>(gen: () => Generator<ParseF<any>, T, any>) => ParseF<T>` | Generator-based syntax |
| `parse` | `<T>(p: ParseFunction<T>, token: string) => T` | Parses and returns value or throws |
| `safeParse` | `<T>(p: ParseFunction<T>, token: string) => Parser<T>` | Parses and returns result object |

## License

MIT
