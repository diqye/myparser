# myparser
A high-performance, lightweight, and flexible TypeScript library focused on parsing custom-format strings—whether for simple text extraction or precise parsing of complex formats, it delivers a concise and efficient solution.

## Features

- **Pure function**: Every parsing operation is a simple pure function with no side effects. Parsing logic is predictable, easy to test, and supports functional composition.
- **Zero dependencies**: Pure TypeScript implementation with no third-party dependencies. It is lightweight (less than 3.3KB after packaging), avoiding dependency conflicts and version compatibility issues.
- **Cross-platform**: Only uses standard functions on String, enabling seamless operation in all JavaScript runtimes such as browsers, Node.js, and Bun, without the need for environment-specific adaptations.
- **Compose**: Rich parser composition capabilities (e.g., composeP for chaining parsing steps, orP for multiple selection branches, before for parsing within fixed segments). Parsing logic can be split into fine-grained functions to maximize reusability.
- **Type safe**: All core functions are strictly constrained by TypeScript generics for input and output types. Parsing results have automatically derived types, avoiding runtime type errors, and IDEs can provide complete type hints.
- **Slice-based efficiency**: The core parsing logic is implemented based on slice, directly operating on string segments instead of processing character by character. This ensures high performance in token parsing and string splitting, maintaining linear time complexity especially when handling extra-long strings.


## Quick start

### Installation

通过`npm` 或 `bun` 安装
```zsh
bun add @diqye/myparser
```

```zsh
npm install --save @diqye/myparser
```

## Parse numbers in the format of n 1

```typescript
test("before",()=>{
    let str =`
    n 1 n 2 
    n 3 n 4

    n 0Part never parse
    n 5
    n 6
    `
    
    let n_number_f = fmap(
        composeP(numberF,search("n ")),
        a => a[0]
    )
    let n_list = simpleParse(many(n_number_f),str)
    expect(n_list).toEqual([1,2,3,4,0,5,6])

    let n_list_before = simpleParse(before(many(n_number_f),search("Part never parse")),str)
    expect(n_list_before).toEqual([1,2,3,4,0])
})
```

## API
For detailed API functionality, refer to [./index.tes.ts](src/index.test.ts)

```zsh
src/index.test.ts:
✓ space               Parse a single whitespace character
✓ spaces     [0.02ms] Parse and remove leading whitespace characters
✓ anychar    [0.03ms] Parse any single character
✓ search     [0.06ms] Search for a string and continue parsing after the match
✓ composeP   [0.05ms] Combine parsers in sequence (right-associative) and return a result tuple
✓ bind       [0.07ms] Dynamically chain parsers using results from previous steps
✓ fmap       [0.02ms] Transform values from successful parses
✓ many       [0.07ms] Repeat a parser until failure, collecting all results
✓ orP        [0.08ms] Try parsers sequentially and return the first success
✓ equal      [0.02ms] Parse a string matching the exact input
✓ breakToEnd          Capture all remaining input from current position
✓ endOfInput [0.04ms] Verify parsing has reached the end of input
✓ before              Parse content occurring before a specified marker
✓ json       [0.93ms] Parse JSON-formatted content
✓ simple     [0.13ms] Basic parsing workflow demonstration
✓ optional            Optionally parse content (returns undefined on failure)
✓ pure                Wrap a value in a successful parser result
✓ fail                Create a parser that always fails
```