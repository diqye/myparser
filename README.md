# myparser

A lightweight, and flexible TypeScript library redefining structured text parsing. Built on the core philosophy of **object-oriented chaining** and **type safety**, it lets you break down complex parsing logic into readable, chainable operations—turning fragile ad-hoc code into robust, declarative workflows. Whether for simple text extraction, custom format parsing, or complex DSL processing, myparser delivers conciseness, efficiency, and predictability.

## Core Philosophy

myparser is designed around three uncompromising principles, solving the root pain points of traditional parsing (regex chaos, tight coupling, type ambiguity):

1. **Chaining Over Composition**: Parsing logic is built by chaining small, single-responsibility operations. No more nested function calls or tangled combinators—each parser method naturally flows into the next.

2. **Type Safety by Design**: TypeScript generics enforce strict input/output contracts. Every parser's result type is automatically inferred, eliminating runtime type errors and enabling full IDE intellisense for a frictionless development experience.

3. **Efficiency Without Compromise**: Slice-based core logic operates on string segments (not character-by-character) to guarantee linear time complexity (O(n)), making it blazingly fast even for extra-long strings.

## Features

- **Object-Oriented API**: The `P` class provides an intuitive chainable interface that feels natural to modern JavaScript/TypeScript developers.

- **Zero Dependencies**: Pure TypeScript implementation (no third-party reliance) weighs less than 5KB after bundling. Avoid dependency bloat, conflicts, and version compatibility headaches.

- **Universal Compatibility**: Leverages only standard String APIs, working seamlessly across browsers, Node.js, Bun, and all JavaScript runtimes—no environment-specific adaptations needed.

- **Rich Chaining Methods**: Chain, branch, and repeat parsers with intuitive methods (`.map()`, `.bind()`, `.or()`, `.many()`, `.sepBy()`). Split logic into fine-grained operations for maximum reusability and maintainability.

- **Type-Safe Composition**: Build complex parsers from simple primitives with full TypeScript type support every step of the way.

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

Here's a complete JSON parser built with myparser, demonstrating how to chain small parsers into a complex, real-world parser:


```typescript
import { P } from "@diqye/myparser";

// Define JSON value types
type ObjectValue = { [k: string]: Value };
type Value = null | string | boolean | number | ObjectValue | Value[];

export function parseJson(token: string): Value {
  // null parser
  const nullP = P.equal("null").map(() => null);

  // boolean parser
  const booleanP = P.equal("true").or(P.equal("false")).map(a => a === "true");

  // string parser with escape sequence support
  const stringP = P.equal('"').semiBind(
    P.equal('\\"').map(() => '"').or(P.take(1))
      .manyTill(P.equal('"')).map(xs => xs.join(""))
  );

  // array parser (recursive)
  const arrayP = P.equal("[")
    .semiBind(P.spaces())
    .bind(() => {
      return P.spaces()
        .semiBind(valueP)
        .semiBindTap(P.spaces())
        .sepBy(P.equal(","))
    })
    .semiBindTap(P.spaces())
    .semiBindTap(P.equal("]"));

  // key-value pair parser
  const keyValueP = stringP.bind(key => {
    return P.spaces()
      .semiBind(P.equal(":"))
      .semiBind(P.spaces())
      .semiBind(valueP)
      .map(value => ({ key, value }));
  });

  // object parser
  const objectP = P.equal("{")
    .semiBind(P.spaces())
    .semiBind(keyValueP.sepBy(P.equal(",")))
    .semiBindTap(P.spaces())
    .semiBindTap(P.equal("}"))
    .map(xs => {
      const obj: ObjectValue = {};
      for (const kv of xs) {
        obj[kv.key] = kv.value;
      }
      return obj;
    });

  // Main value parser (recursive)
  const valueP: P<Value> = nullP
    .or(booleanP)
    .or(P.number())
    .or(stringP)
    .or(arrayP)
    .or(objectP);

  // Parse with whitespace handling and end-of-input check
  return P.spaces()
    .semiBind(valueP)
    .semiBindTap(P.spaces())
    .semiBindTap(P.endOfInput())
    .run(token);
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
- **Chaining**: Complex parsers are built by chaining simple primitives (`P.equal`, `P.take`, `P.spaces`)
- **Recursion**: The `valueP` parser references itself to handle nested structures
- **Type Safety**: Full TypeScript inference for the parsed JSON structure
- **Real-world Ready**: Handles all JSON data types including nested objects and arrays

### Example 2: Parse XML-Like Nodes

Parse a list of `<user>` nodes to extract structured data using `semiBindKey` for declarative object building:

```typescript
import { P } from "@diqye/myparser";

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

const userParser = P.spaces()
  .semiBindTap(P.equal("<user>"))
  .semiBindTap(P.spaces())
  .semiBindTap(P.equal("<name>"))
  .semiBindTap(P.spaces())
  .semiBindKey("name", P.takeUntil("</name>"))
  .semiBindTap(P.spaces())
  .semiBindTap(P.equal("<age>"))
  .semiBindTap(P.spaces())
  .semiBindKey("age", P.takeUntil("</age>"))
  .semiBindTap(P.spaces())
  .semiBindTap(P.equal("</user>"));

const users = userParser.many().run(xml);
console.log(users);
// Output: [{ name: "Alice", age: "30" }, { name: "Bob", age: "25" }]
```

## Why myparser?

Compare myparser to traditional parsing approaches:

| Approach | Main Pain Points | myparser Advantage |
|---|---|---|
| Regex | Unreadable for complex logic, poor error handling, no types | Chainable, readable, type-safe, precise error localization |
| Manual String Slicing | Tight coupling, off-by-one errors, hard to maintain | Decoupled primitives, slice-optimized core, no manual index management |
| Heavy Parsers (PEG.js) | Bulky, dependencies, steep learning curve | Lightweight (5KB), zero dependencies, intuitive object-oriented API |

## Use Cases

- **Custom Config Files**: Parse domain-specific config formats (e.g., INI, YAML-like subsets) with reusable parsers.

- **Log Processing**: Extract structured data (timestamps, levels, messages) from unstructured log lines.

- **DSL Parsing**: Build parsers for custom domain-specific languages (e.g., query syntax, template engines).

- **API Payload Sanitization**: Parse & transform raw string payloads into typed objects.

- **XML/HTML Fragments**: Extract specific tags/attributes without full DOM parsing.

## API Reference

### The `P` Class

The `P` class is the heart of myparser's API. It encapsulates parsers and provides a fluent, chainable interface for building complex parsing logic.

#### Core Types

```typescript
type Token = string
type ParseError = "END_OF_INPUT" | "SELECT_EMPTY" | "EQUAL_FAIL" | "DOESNT_INDEX_OF" | "NOT_SPACE" | "NOT_NUMBER" | "FAIL" | "F" | "REGEX_F" | "AT_LEAST_ONE_SUCCESSFUL"

type Parser<T> =
  | { status: ParseError, message: string }
  | { status: "SUCCESS", value: T, slice: Token }

type ParseF<T> = (token: Token) => Parser<T>
```

### Static Factory Methods

| Method | Signature | Description |
|---|---|---|
| `equal` | `(str: string) => P<string>` | Matches exact string |
| `take` | `(n: number) => P<string>` | Takes n characters |
| `takeUntil` | `(delimiter: string) => P<string>` | Consumes until delimiter |
| `number` | `() => P<number>` | Parses JSON-style numbers |
| `space` | `() => P<string>` | Parses single whitespace char |
| `spaces` | `() => P<void>` | Consumes all leading whitespace |
| `regex` | `(regex: RegExp) => P<string>` | Matches regex pattern |
| `breakToEnd` | `() => P<string>` | Consumes all remaining input |
| `endOfInput` | `() => P<void>` | Succeeds at end of input |
| `pure` | `<T>(value: T) => P<T>` | Returns value without consuming input |
| `fail` | `<T>(message?: string) => P<T>` | Always fails |
| `handBack` | `(token: string) => P<void>` | Prepends token to remaining input |

### Chainable Methods

#### Transformation

| Method | Signature | Description |
|---|---|---|
| `map` | `<X>(fn: (v: T) => X) => P<X>` | Maps function over parse result |
| `bind` | `<X>(fn: (a: T) => P<X>) => P<X>` | Monadic bind for chaining parsers |
| `semiBind` | `<X>(p: P<X>) => P<X>` | Chains parsers, ignoring previous result |
| `semiBindTap` | `<X>(p: P<X>) => P<T>` | Chains parsers, preserving previous result |
| `semiBindKey` | `<K extends string, X>(key: K, p: P<X>) => P<T & { [K]: X }>` | Adds key-value to result object |

#### Composition

| Method | Signature | Description |
|---|---|---|
| `or` | `<X>(p: P<X>) => P<T \| X>` | Tries parsers in sequence, returns first success |
| `many` | `() => P<T[]>` | Zero or more repetitions |
| `many1` | `() => P<T[]>` | One or more repetitions |
| `manyTill` | `<X>(end: P<X>) => P<T[]>` | Repeats until end parser succeeds |
| `sepBy` | `<X>(sep: P<X>) => P<T[]>` | Parses separated list |

#### Execution

| Method | Signature | Description |
|---|---|---|
| `run` | `(token: string) => T` | Parses and returns value or throws |
| `safeRun` | `(token: string) => Parser<T>` | Parses and returns result object |

#### Utilities

| Method | Signature | Description |
|---|---|---|
| `optional` | `() => P<T \| undefined>` | Makes parser optional |
| `not` | `() => P<void>` | Succeeds if parser fails |
| `lookup` | `() => P<T>` | Peeks without consuming |
| `log` | `(prefix?: string, logResult?: boolean) => P<T>` | Logs parse information for debugging |
| `before` | `<X>(before: P<X>) => P<T>` | Parses content before end |

## Traditional Functional API

For backward compatibility, myparser still supports the traditional functional API. Here's the JSON parser example using the functional style:

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

  // Main value parser (recursive)
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
```

The functional API is still fully supported but the `P` class API is recommended for new code due to its improved readability and maintainability.