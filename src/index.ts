
export type Token = string
export type ParseError = "END_OF_INPUT" | "EQUAL_FAIL" | "DOESNT_INDEX_OF" | "NOT_SPACE" | "NOT_NUMBER" | "FAIL" | "F"

/**
 * Represents the result of a parsing operation.
 * Either contains a success status with the parsed value and remaining token,
 * or an error status with a message.
 */
export type Parser<T> = {
    status: ParseError,
    message: string
} | {
    status: "SUCCESS",
    value: T,
    slice: Token
}

/**
 * Type representing a parsing function that takes a token (input string) and returns a Parser result.
 */
export type ParseF<T> = (token:Token) => Parser<T>

/**
 * Type representing a parsing function that supports recursion.
 * Can be either a direct ParseF or a function returning a ParseF (for recursive definitions).
 */
export type ParseFunction<T> = ParseF<T> | {fn:() => ParseF<T>}

/**
 * Tries parsing functions in sequence and returns the first successful result.
 * @param x The first parsing function to try
 * @param xs Additional parsing functions to try if the previous ones fail
 * @returns A parser that returns the first successful result from the provided parsers
 */
export let orP = <T>(x:ParseF<T>,... xs: ParseF<T>[]) => (token: Token):Parser<T> => {
    let a = x(token)
    if(a.status == "SUCCESS") return a
    for(let f of xs){
        let a = f(token)
        if(a.status != "SUCCESS") {
            continue
        }
        return a
    }
    return a
}

/**
 * Searches for a specified substring in the token. Returns the part before the substring
 * and continues parsing from the position after the substring.
 * @param str The substring to search for
 * @returns A parser that returns the substring before the matched str, with remaining token starting after str
 */
export let search = (str:Token) => (token:Token):Parser<Token> => {
    let i = token.indexOf(str)
    if(i == -1) {
        return {
            status: "DOESNT_INDEX_OF",
            message: `Except token index of "${str}", actual token limit 100 ${token.slice(0,100)}`
        }
    }
    return {
        status: "SUCCESS",
        slice: token.slice(i + str.length),
        value: token.slice(0,i)
    }
}

/**
 * Checks if a character is a whitespace character (space, tab, newline, carriage return).
 * @param char The character to check
 * @returns True if the character is a whitespace, false otherwise
 */
export function isSpace(char: string) {
    return [" ","\t","\n","\r"].indexOf(char) != -1
}

/**
 * Parses a single whitespace character (space, tab, newline, or carriage return).
 * @returns A parser that returns the parsed whitespace character, with remaining token starting after it
 */
export let space = (token:Token):Parser<string> => {
    let head = token[0] as string
    if(isSpace(head) == false) {
        return {
            status: "NOT_SPACE",
            message: "Except sapce actual " + head
        }
    }

    return {
        status: "SUCCESS",
        slice: token.slice(1),
        value: head
    }
}

/**
 * Parses and removes all leading whitespace characters from the token.
 * Always succeeds regardless of whether whitespace exists.
 * @returns A parser that returns undefined, with remaining token being the input without leading whitespace
 */
export let spaces = (token:Token):Parser<void> => {
    return {
        status: "SUCCESS",
        slice: token.trimStart(),
        value: undefined
    }
}

/**
 * Applies a parser repeatedly until it fails, collecting all successful results into an array.
 * @param p The parser to apply repeatedly
 * @returns A parser that returns an tuple within all successful value of results, with remaining token where parsing stopped
 */
export let many = <T>(p:(token:Token)=>Parser<T>) => (token:Token):Parser<T[]> => {
    let r : T[] = []
    while(true) {
        let a = p(token)
        if(a.status != "SUCCESS") {
            break
        }
        r.push(a.value)
        token = a.slice
    }
    return {
        status: "SUCCESS",
        slice: token,
        value: r
    }
}

/**
 * A parser combinator that parses multiple occurrences of a value until another parser succeeds.
 * 
 * This function repeatedly applies the parse function (`parseF`) to extract values from the input
 * token stream until the end parser (`end`) successfully matches. It collects all parsed values
 * from `parseF` into an array and returns them once the end condition is met.
 * 
 * @template T The type of values produced by the main parser (parseF)
 * @template U The type of value produced by the end parser
 * @param parseF The main parser to apply repeatedly
 * @param end The parser that signals the end condition when successful
 * @returns A new parser that produces an array of T values
 */
export let manyTill = <T,U>(parseF:ParseF<T>,end:ParseF<U>) : ParseF<T[]> => token => {
    let value: T[] = []
    while(true) {
        let end_r = end(token)
        if(end_r.status == "SUCCESS") return {
            status: "SUCCESS",
            value,
            slice: token
        }
        let parse_r = parseF(token)
        if(parse_r.status != "SUCCESS") return {
            status: "SUCCESS",
            value,
            slice: token
        }
        token = parse_r.slice
        value.push(parse_r.value)
    }
}

/**
 * A parser combinator that parses zero or more occurrences of a value separated by another parser.
 * 
 * This function parses values using the main parser (`parseF`) and separates them using the
 * separator parser (`sep`). It collects all parsed values from `parseF` into an array, ignoring
 * the separator values. Will return an empty array if no values are parsed.
 * 
 * @template T The type of values produced by the main parser (parseF)
 * @template S The type of values produced by the separator parser
 * @param parseF The main parser to apply for values
 * @param sep The parser to apply for separators between values
 * @returns A new parser that produces an array of T values
 */
export let sepBy = <T, S>(parseF: ParseF<T>, sep: ParseF<S>): ParseF<T[]> => token => {
    const values: T[] = []
    let firstResult = parseF(token)
    if (firstResult.status !== "SUCCESS") return {
        status: "SUCCESS",
        value: values,
        slice: token
    }
    
    values.push(firstResult.value);
    let currentToken = firstResult.slice;
    
    while (true) {
        const sepResult = sep(currentToken)
        if (sepResult.status !== "SUCCESS") return {
            status: "SUCCESS",
            value: values,
            slice: currentToken
        }
        
        currentToken = sepResult.slice
        
        const nextResult = parseF(currentToken)
        if (nextResult.status !== "SUCCESS") return {
            status: "SUCCESS",
            value: values,
            slice: currentToken
        }
        
        values.push(nextResult.value)
        currentToken = nextResult.slice
    }
}

/**
 * Parses the first character of the token. Fails if the token is empty.
 * @returns A parser that returns the first character, with remaining token starting after it
 */
export let anyChar = (token:Token):Parser<string> => {
    if(token.length == 0) return {
        status: "END_OF_INPUT",
        message: "Expect any char actual end of input"
    }

    return {
        status: "SUCCESS",
        value: token[0] as string,
        slice: token.slice(1)
    }
}

/**
 * Parses a substring that exactly matches the specified string.
 * @param str The string to match exactly
 * @returns A parser that returns the matched string, with remaining token starting after it
 */
export let equal = (str:Token) => (token:Token):Parser<string> => {
    let tobe = token.slice(0,str.length)
    if(tobe != str) {
        return {
            status: "EQUAL_FAIL",
            message: `Expect "${str}" actual "${tobe}" token limit 100=${token.slice(0,100)}`
        }
    }
    return {
        status: "SUCCESS",
        value: str,
        slice: token.slice(str.length)
    }
}
/**
 * Parses a single character that does NOT match the specified string.
 * @param str The string to avoid matching
 * @returns A parser that returns the parsed character, with remaining token starting after it
 */
export let notEqual = (str:Token) => (token:Token):Parser<string> => {
    let tobe = token.slice(0,str.length)
    if(tobe == str) {
        return {
            status: "EQUAL_FAIL",
            message: `Expect not "{str}" actual "${tobe}"`
        }
    }
    return {
        status: "SUCCESS",
        value: token[0] as string,
        slice: token.slice(1)
    }
}

/**
 * Checks if a character is a numeric digit (0-9).
 * @param char The character to check
 * @returns True if the character is a digit, false otherwise
 */
export function isNumber(char:string) {
    let zero = '0'.charCodeAt(0)
    let nine = '9'.charCodeAt(0)
    let code = char.charCodeAt(0)
    return code >= zero && code <= nine
}
/**
 * Parses a JSON-style number (integer or floating-point).
 * @returns A parser that returns the parsed number as a Number, with remaining token starting after the number
 */
export let numberF: ParseF<number> = token => {
    if(token.length == 0 ) return {
        status: "END_OF_INPUT",
        message: "Expect number actual end of input"
    }
    let head = token.charAt(0)
    if(isNumber(head) == false) return {
        status: "NOT_NUMBER",
        message: "Not number:" + head
    }
    let have_dot = false
    let i = 1
    while(true){
        if(i == token.length) break
        let c = token.charAt(i)
        if(c == '.') {
            have_dot = true
            i++
            continue
        }
        if(isNumber(c) == false) break
        i++
    }

    return {
        status: "SUCCESS",
        slice: token.slice(i),
        value: have_dot ? parseFloat(token.slice(0,i)) : parseInt(token.slice(0,i))
    }

}

/**
 * Debugging parser that logs the first 100 characters of the token and optionally the parse result.
 * @param fn The parser to wrap
 * @param prefix Prefix for the log message
 * @param log_result Whether to log the parse result
 * @returns A wrapped parser that logs information before parsing
 */
export let plog = <T>(fn:ParseF<T>,prefix="plog=",log_result=false):ParseF<T> => token => {
    console.log(prefix+token.slice(100))
    let r =  fn(token)
    if(log_result) {
        console.log(r)
    }
    return r
}

/**
 * Parses content from the current position up to (but not including) the position where another parser succeeds.
 * @param parseF The parser to apply to the content before the reference point
 * @param parseFBefore The parser that identifies the reference point (its match is not included)
 * @returns A parser that returns the result of parseF applied to the content before the reference point
 */
export let before =  <a,b>(parseF:ParseF<a>,parseFBefore:ParseF<b>) : ParseF<a> => token => {
    let value_before = parseFBefore(token)
    if(value_before.status != "SUCCESS") return value_before
    let offset = token.length - value_before.slice.length
    let token_before = token.slice(0,offset)
    return parseF(token_before)
}
/**
 * Parses all remaining characters in the token, returning them as the result.
 * @returns A parser that returns the entire remaining token, with an empty slice
 */
export let breakToEnd : ParseF<Token> = token => {
    return {
        status: "SUCCESS",
        value: token,
        slice: ""
    }
}

/**
 * Verifies that the current position is at the end of the input (no remaining token).
 * @returns A parser that returns undefined if at end of input, otherwise fails
 */
export let endOfInput : ParseF<void> = token => {
    if(token.length == 0) return {
        status: "SUCCESS",
        value: undefined,
        slice: ""
    }

    return {
        status: "F",
        message: "Expected end of token, but there is still content remaining. First 100 characters of the content: " + token.slice(0, 100)
    }
}
/**
 * Monadic bind operation: chains parsers, using the result of the first parser to determine the second parser.
 * @param p The first parser to run
 * @param fn A function that takes the result of p and returns the second parser
 * @returns A parser that runs p, then runs the parser from fn with p's result, returning its result
 */
export let bind = <a,b>(p:ParseFunction<a>,fn:(a:a)=>ParseF<b>):ParseF<b> => token => {
    let pfn = typeof p == "function" ? p : p.fn()
    let pa = pfn(token)
    if(pa.status != "SUCCESS") return pa
    return fn(pa.value)(pa.slice)
}

/**
 * Applies a transformation function to the result of a successful parse.
 * @param p The parser whose result to transform
 * @param fn The transformation function to apply to the parsed value
 * @returns A parser that returns the transformed value on success
 */
export let fmap = <a,b>(p:ParseFunction<a>,fn:(a:a)=>b):ParseF<b> => token => {
    let pfn = typeof p == "function" ? p : p.fn()
    let a = pfn(token)
    if(a.status != "SUCCESS") return a
    return {
        ...a,
        value: fn(a.value)
    }
}

/**
 * Creates a parser that always succeeds with a specified value, without consuming any input.
 * @param a The value to return
 * @returns A parser that returns a and leaves the token unchanged
 */
export let pure = <a>(a:a):ParseF<a> => token => {
    return {
        status: "SUCCESS",
        value: a,
        slice: token
    }
}

/**
 * Converts a parser into an optional one: if the original parser fails, returns undefined without consuming input.
 * @param p The parser to make optional
 * @returns A parser that returns p's result on success, or undefined on failure
 */
export let fail = (message=""):ParseF<void> => token => {
    return {
        status: "FAIL",
        message
    }
}

/**
 * Creates a parser that always fails with a specified message.
 * @param message The failure message
 * @returns A parser that fails with the given message
 */
export let optional = <T>(p: ParseF<T>):ParseF<T|undefined> => token => {
    let a = p(token)
    if(a.status != "SUCCESS") return {
        status: "SUCCESS",
        value: undefined,
        slice: token
    }
    return a
}

/**
 * Creates a parser that attempts to parse the given token using `parseF`.
 * 
 * If parsing succeeds, it returns the result but overrides the `slice` field
 * with the original `token`, effectively "looking at" the token without consuming it.
 * If parsing fails, the failure result is returned unchanged.
 *
 * @param parseF - A parser function that takes a token and returns a parse result.
 * @returns A parser function that parses without consuming the token.
 */
export let lookup = <T>(parseF:ParseF<T>):ParseF<T> => token => {
    let parser = parseF(token)
    if(parser.status != "SUCCESS") return parser
    return {
        ...parser,
        slice: token
    }
}

/**
 * Composes multiple parsers in right-associative order: runs parsers from right to left,
 * passing the remaining token from each to the next, and collects results in input order.
 * @param p Multiple parsers to compose
 * @returns A parser that returns an array of results from the composed parsers
 */
export function composeP<a,b>(a:ParseF<a>,b:ParseF<b>): ParseF<[a,b]>;
export function composeP<a,b,c>(a:ParseF<a>,b:ParseF<b>,c:ParseF<c>): ParseF<[a,b,c]>;
export function composeP<a,b,c,d>(a:ParseF<a>,b:ParseF<b>,c:ParseF<c>,d:ParseF<d>): ParseF<[a,b,c,d]>;
export function composeP<a,b,c,d,e>(a:ParseF<a>,b:ParseF<b>,c:ParseF<c>,d:ParseF<d>,e:ParseF<e>): ParseF<[a,b,c,d,e]>;
export function composeP<a,b,c,d,e,f>(a:ParseF<a>,b:ParseF<b>,c:ParseF<c>,d:ParseF<d>,e:ParseF<e>,f:ParseF<f>): ParseF<[a,b,c,d,e,f]>;
export function composeP<a,b,c,d,e,f,g>(a:ParseF<a>,b:ParseF<b>,c:ParseF<c>,d:ParseF<d>,e:ParseF<e>,f:ParseF<f>,g:ParseF<g>): ParseF<[a,b,c,d,e,f,g]>;
export function composeP<a,b,c,d,e,f,g,h>(a:ParseF<a>,b:ParseF<b>,c:ParseF<c>,d:ParseF<d>,e:ParseF<e>,f:ParseF<f>,g:ParseF<g>,h:ParseF<h>): ParseF<[a,b,c,d,e,f,g,h]>;
export function composeP<a,b,c,d,e,f,g,h,i>(a:ParseF<a>,b:ParseF<b>,c:ParseF<c>,d:ParseF<d>,e:ParseF<e>,f:ParseF<f>,g:ParseF<g>,h:ParseF<h>,i:ParseF<i>): ParseF<[a,b,c,d,e,f,g,h,i]>;
export function composeP(...p: any[]) {
    return (token:Token):any => {
        let r = []
        for(let f of [...p].reverse()) {
            let a = f(token)
            if(a.status != "SUCCESS") return a
            token = a.slice
            r.push(a.value)
        }
        return {
            status: "SUCCESS",
            value: r.reverse(),
            slice: token
        } satisfies Parser<any>
    }
}
/**
 * Composes multiple parsers in left-associative order: runs parsers from left to right,
 * passing the remaining token from each to the next, and collects results in input order.
 * @param p Multiple parsers to compose
 * @returns A parser that returns an array of results from the composed parsers
 */
export function pipeP<a,b>(a:ParseF<a>,b:ParseF<b>): ParseF<[a,b]>;
export function pipeP<a,b,c>(a:ParseF<a>,b:ParseF<b>,c:ParseF<c>): ParseF<[a,b,c]>;
export function pipeP<a,b,c,d>(a:ParseF<a>,b:ParseF<b>,c:ParseF<c>,d:ParseF<d>): ParseF<[a,b,c,d]>;
export function pipeP<a,b,c,d,e>(a:ParseF<a>,b:ParseF<b>,c:ParseF<c>,d:ParseF<d>,e:ParseF<e>): ParseF<[a,b,c,d,e]>;
export function pipeP<a,b,c,d,e,f>(a:ParseF<a>,b:ParseF<b>,c:ParseF<c>,d:ParseF<d>,e:ParseF<e>,f:ParseF<f>): ParseF<[a,b,c,d,e,f]>;
export function pipeP<a,b,c,d,e,f,g>(a:ParseF<a>,b:ParseF<b>,c:ParseF<c>,d:ParseF<d>,e:ParseF<e>,f:ParseF<f>,g:ParseF<g>): ParseF<[a,b,c,d,e,f,g]>;
export function pipeP<a,b,c,d,e,f,g,h>(a:ParseF<a>,b:ParseF<b>,c:ParseF<c>,d:ParseF<d>,e:ParseF<e>,f:ParseF<f>,g:ParseF<g>,h:ParseF<h>): ParseF<[a,b,c,d,e,f,g,h]>;
export function pipeP<a,b,c,d,e,f,g,h,i>(a:ParseF<a>,b:ParseF<b>,c:ParseF<c>,d:ParseF<d>,e:ParseF<e>,f:ParseF<f>,g:ParseF<g>,h:ParseF<h>,i:ParseF<i>): ParseF<[a,b,c,d,e,f,g,h,i]>;
export function pipeP(...p: any[]) {
    return (token:Token):any => {
        let r = []
        for(let f of p) {
            let a = f(token)
            if(a.status != "SUCCESS") return a
            token = a.slice
            r.push(a.value)
        }
        return {
            status: "SUCCESS",
            value: r,
            slice: token
        } satisfies Parser<any>
    }
}

/**
 * Composes multiple parsers in left-associative order: runs parsers from left to right
 * passing the remaining token from each to the next, and collects results with object.
 * ### Example:
 * ```ts
 *  let f = pipeO(["a",anyChar],["",anyChar],["c",numberF])
 *  let r = simpleParse(f,"ab2cd")
 *  expect(r).toEqual({
 *      a: "a",
 *      c: 2
 *  })
 * ```
 */
export function pipeO<
    ak extends string, av,
    bk extends string, bv
>(
    a: [ak,ParseF<av>],
    b: [bk,ParseF<bv>]
): ParseF<{
    [key in Exclude<ak|bk, "">]:
        key extends ak ? av :
        key extends bk ? bv :
        never
}>
export function pipeO<
    ak extends string, av,
    bk extends string, bv,
    ck extends string, cv
>(
    a: [ak,ParseF<av>],
    b: [bk,ParseF<bv>],
    c: [ck,ParseF<cv>]
): ParseF<{
    [key in Exclude<ak|bk|ck, "">]:
        key extends ak ? av :
        key extends bk ? bv :
        key extends ck ? cv :
        never
}>
export function pipeO<
    ak extends string, av,
    bk extends string, bv,
    ck extends string, cv,
    dk extends string, dv
>(
    a: [ak,ParseF<av>],
    b: [bk,ParseF<bv>],
    c: [ck,ParseF<cv>],
    d: [dk,ParseF<dv>]
): ParseF<{
    [key in Exclude<ak|bk|ck|dk, "">]:
        key extends ak ? av :
        key extends bk ? bv :
        key extends ck ? cv :
        key extends dk ? dv :
        never
}>
export function pipeO<
    ak extends string, av,
    bk extends string, bv,
    ck extends string, cv,
    dk extends string, dv,
    ek extends string, ev
>(
    a: [ak,ParseF<av>],
    b: [bk,ParseF<bv>],
    c: [ck,ParseF<cv>],
    d: [dk,ParseF<dv>],
    e: [ek,ParseF<ev>]
): ParseF<{
    [key in Exclude<ak|bk|ck|dk|ek, "">]:
        key extends ak ? av :
        key extends bk ? bv :
        key extends ck ? cv :
        key extends dk ? dv :
        key extends ek ? ev :
        never
}>
export function pipeO<
    ak extends string, av,
    bk extends string, bv,
    ck extends string, cv,
    dk extends string, dv,
    ek extends string, ev,
    fk extends string, fv
>(
    a: [ak,ParseF<av>],
    b: [bk,ParseF<bv>],
    c: [ck,ParseF<cv>],
    d: [dk,ParseF<dv>],
    e: [ek,ParseF<ev>],
    f: [fk,ParseF<fv>]
): ParseF<{
    [key in Exclude<ak|bk|ck|dk|ek|fk, "">]:
        key extends ak ? av :
        key extends bk ? bv :
        key extends ck ? cv :
        key extends dk ? dv :
        key extends ek ? ev :
        key extends fk ? fv :
        never
}>
export function pipeO<
    ak extends string, av,
    bk extends string, bv,
    ck extends string, cv,
    dk extends string, dv,
    ek extends string, ev,
    fk extends string, fv,
    gk extends string, gv
>(
    a: [ak,ParseF<av>],
    b: [bk,ParseF<bv>],
    c: [ck,ParseF<cv>],
    d: [dk,ParseF<dv>],
    e: [ek,ParseF<ev>],
    f: [fk,ParseF<fv>],
    g: [gk,ParseF<gv>]
): ParseF<{
    [key in Exclude<ak|bk|ck|dk|ek|fk|gk, "">]:
        key extends ak ? av :
        key extends bk ? bv :
        key extends ck ? cv :
        key extends dk ? dv :
        key extends ek ? ev :
        key extends fk ? fv :
        key extends gk ? gv :
        never
}>
export function pipeO<
    ak extends string, av,
    bk extends string, bv,
    ck extends string, cv,
    dk extends string, dv,
    ek extends string, ev,
    fk extends string, fv,
    gk extends string, gv,
    hk extends string, hv
>(
    a: [ak,ParseF<av>],
    b: [bk,ParseF<bv>],
    c: [ck,ParseF<cv>],
    d: [dk,ParseF<dv>],
    e: [ek,ParseF<ev>],
    f: [fk,ParseF<fv>],
    g: [gk,ParseF<gv>],
    h: [hk,ParseF<hv>]
): ParseF<{
    [key in Exclude<ak|bk|ck|dk|ek|fk|gk|hk, "">]:
        key extends ak ? av :
        key extends bk ? bv :
        key extends ck ? cv :
        key extends dk ? dv :
        key extends ek ? ev :
        key extends fk ? fv :
        key extends gk ? gv :
        key extends hk ? hv :
        never
}>
export function pipeO<
    ak extends string, av,
    bk extends string, bv,
    ck extends string, cv,
    dk extends string, dv,
    ek extends string, ev,
    fk extends string, fv,
    gk extends string, gv,
    hk extends string, hv,
    ik extends string, iv
>(
    a: [ak,ParseF<av>],
    b: [bk,ParseF<bv>],
    c: [ck,ParseF<cv>],
    d: [dk,ParseF<dv>],
    e: [ek,ParseF<ev>],
    f: [fk,ParseF<fv>],
    g: [gk,ParseF<gv>],
    h: [hk,ParseF<hv>],
    i: [ik,ParseF<iv>]
): ParseF<{
    [key in Exclude<ak|bk|ck|dk|ek|fk|gk|hk|ik, "">]:
        key extends ak ? av :
        key extends bk ? bv :
        key extends ck ? cv :
        key extends dk ? dv :
        key extends ek ? ev :
        key extends fk ? fv :
        key extends gk ? gv :
        key extends hk ? hv :
        key extends ik ? iv :
        never
}>
export function pipeO<
    ak extends string, av,
    bk extends string, bv,
    ck extends string, cv,
    dk extends string, dv,
    ek extends string, ev,
    fk extends string, fv,
    gk extends string, gv,
    hk extends string, hv,
    ik extends string, iv,
    jk extends string, jv
>(
    a: [ak,ParseF<av>],
    b: [bk,ParseF<bv>],
    c: [ck,ParseF<cv>],
    d: [dk,ParseF<dv>],
    e: [ek,ParseF<ev>],
    f: [fk,ParseF<fv>],
    g: [gk,ParseF<gv>],
    h: [hk,ParseF<hv>],
    i: [ik,ParseF<iv>],
    j: [jk,ParseF<jv>]
): ParseF<{
    [key in Exclude<ak|bk|ck|dk|ek|fk|gk|hk|ik|jk, "">]:
        key extends ak ? av :
        key extends bk ? bv :
        key extends ck ? cv :
        key extends dk ? dv :
        key extends ek ? ev :
        key extends fk ? fv :
        key extends gk ? gv :
        key extends hk ? hv :
        key extends ik ? iv :
        key extends jk ? jv :
        never
}>
export function pipeO<
    ak extends string, av,
    bk extends string, bv,
    ck extends string, cv,
    dk extends string, dv,
    ek extends string, ev,
    fk extends string, fv,
    gk extends string, gv,
    hk extends string, hv,
    ik extends string, iv,
    jk extends string, jv,
    kk extends string, kv
>(
    a: [ak,ParseF<av>],
    b: [bk,ParseF<bv>],
    c: [ck,ParseF<cv>],
    d: [dk,ParseF<dv>],
    e: [ek,ParseF<ev>],
    f: [fk,ParseF<fv>],
    g: [gk,ParseF<gv>],
    h: [hk,ParseF<hv>],
    i: [ik,ParseF<iv>],
    j: [jk,ParseF<jv>],
    k: [kk,ParseF<kv>]
): ParseF<{
    [key in Exclude<ak|bk|ck|dk|ek|fk|gk|hk|ik|jk|kk, "">]:
        key extends ak ? av :
        key extends bk ? bv :
        key extends ck ? cv :
        key extends dk ? dv :
        key extends ek ? ev :
        key extends fk ? fv :
        key extends gk ? gv :
        key extends hk ? hv :
        key extends ik ? iv :
        key extends jk ? jv :
        key extends kk ? kv :
        never
}>
export function pipeO<
    ak extends string, av,
    bk extends string, bv,
    ck extends string, cv,
    dk extends string, dv,
    ek extends string, ev,
    fk extends string, fv,
    gk extends string, gv,
    hk extends string, hv,
    ik extends string, iv,
    jk extends string, jv,
    kk extends string, kv,
    lk extends string, lv
>(
    a: [ak,ParseF<av>],
    b: [bk,ParseF<bv>],
    c: [ck,ParseF<cv>],
    d: [dk,ParseF<dv>],
    e: [ek,ParseF<ev>],
    f: [fk,ParseF<fv>],
    g: [gk,ParseF<gv>],
    h: [hk,ParseF<hv>],
    i: [ik,ParseF<iv>],
    j: [jk,ParseF<jv>],
    k: [kk,ParseF<kv>],
    l: [lk,ParseF<lv>]
): ParseF<{
    [key in Exclude<ak|bk|ck|dk|ek|fk|gk|hk|ik|jk|kk|lk, "">]:
        key extends ak ? av :
        key extends bk ? bv :
        key extends ck ? cv :
        key extends dk ? dv :
        key extends ek ? ev :
        key extends fk ? fv :
        key extends gk ? gv :
        key extends hk ? hv :
        key extends ik ? iv :
        key extends jk ? jv :
        key extends kk ? kv :
        key extends lk ? lv :
        never
}>
export function pipeO<
    ak extends string, av,
    bk extends string, bv,
    ck extends string, cv,
    dk extends string, dv,
    ek extends string, ev,
    fk extends string, fv,
    gk extends string, gv,
    hk extends string, hv,
    ik extends string, iv,
    jk extends string, jv,
    kk extends string, kv,
    lk extends string, lv,
    mk extends string, mv
>(
    a: [ak,ParseF<av>],
    b: [bk,ParseF<bv>],
    c: [ck,ParseF<cv>],
    d: [dk,ParseF<dv>],
    e: [ek,ParseF<ev>],
    f: [fk,ParseF<fv>],
    g: [gk,ParseF<gv>],
    h: [hk,ParseF<hv>],
    i: [ik,ParseF<iv>],
    j: [jk,ParseF<jv>],
    k: [kk,ParseF<kv>],
    l: [lk,ParseF<lv>],
    m: [mk,ParseF<mv>]
): ParseF<{
    [key in Exclude<ak|bk|ck|dk|ek|fk|gk|hk|ik|jk|kk|lk|mk, "">]:
        key extends ak ? av :
        key extends bk ? bv :
        key extends ck ? cv :
        key extends dk ? dv :
        key extends ek ? ev :
        key extends fk ? fv :
        key extends gk ? gv :
        key extends hk ? hv :
        key extends ik ? iv :
        key extends jk ? jv :
        key extends kk ? kv :
        key extends lk ? lv :
        key extends mk ? mv :
        never
}>
export function pipeO<
    ak extends string, av,
    bk extends string, bv,
    ck extends string, cv,
    dk extends string, dv,
    ek extends string, ev,
    fk extends string, fv,
    gk extends string, gv,
    hk extends string, hv,
    ik extends string, iv,
    jk extends string, jv,
    kk extends string, kv,
    lk extends string, lv,
    mk extends string, mv,
    nk extends string, nv
>(
    a: [ak,ParseF<av>],
    b: [bk,ParseF<bv>],
    c: [ck,ParseF<cv>],
    d: [dk,ParseF<dv>],
    e: [ek,ParseF<ev>],
    f: [fk,ParseF<fv>],
    g: [gk,ParseF<gv>],
    h: [hk,ParseF<hv>],
    i: [ik,ParseF<iv>],
    j: [jk,ParseF<jv>],
    k: [kk,ParseF<kv>],
    l: [lk,ParseF<lv>],
    m: [mk,ParseF<mv>],
    n: [nk,ParseF<nv>]
): ParseF<{
    [key in Exclude<ak|bk|ck|dk|ek|fk|gk|hk|ik|jk|kk|lk|mk|nk, "">]:
        key extends ak ? av :
        key extends bk ? bv :
        key extends ck ? cv :
        key extends dk ? dv :
        key extends ek ? ev :
        key extends fk ? fv :
        key extends gk ? gv :
        key extends hk ? hv :
        key extends ik ? iv :
        key extends jk ? jv :
        key extends kk ? kv :
        key extends lk ? lv :
        key extends mk ? mv :
        key extends nk ? nv :
        never
}>
export function pipeO<
    ak extends string, av,
    bk extends string, bv,
    ck extends string, cv,
    dk extends string, dv,
    ek extends string, ev,
    fk extends string, fv,
    gk extends string, gv,
    hk extends string, hv,
    ik extends string, iv,
    jk extends string, jv,
    kk extends string, kv,
    lk extends string, lv,
    mk extends string, mv,
    nk extends string, nv,
    ok extends string, ov
>(
    a: [ak,ParseF<av>],
    b: [bk,ParseF<bv>],
    c: [ck,ParseF<cv>],
    d: [dk,ParseF<dv>],
    e: [ek,ParseF<ev>],
    f: [fk,ParseF<fv>],
    g: [gk,ParseF<gv>],
    h: [hk,ParseF<hv>],
    i: [ik,ParseF<iv>],
    j: [jk,ParseF<jv>],
    k: [kk,ParseF<kv>],
    l: [lk,ParseF<lv>],
    m: [mk,ParseF<mv>],
    n: [nk,ParseF<nv>],
    o: [ok,ParseF<ov>]
): ParseF<{
    [key in Exclude<ak|bk|ck|dk|ek|fk|gk|hk|ik|jk|kk|lk|mk|nk|ok, "">]:
        key extends ak ? av :
        key extends bk ? bv :
        key extends ck ? cv :
        key extends dk ? dv :
        key extends ek ? ev :
        key extends fk ? fv :
        key extends gk ? gv :
        key extends hk ? hv :
        key extends ik ? iv :
        key extends jk ? jv :
        key extends kk ? kv :
        key extends lk ? lv :
        key extends mk ? mv :
        key extends nk ? nv :
        key extends ok ? ov :
        never
}>
export function pipeO<
    ak extends string, av,
    bk extends string, bv,
    ck extends string, cv,
    dk extends string, dv,
    ek extends string, ev,
    fk extends string, fv,
    gk extends string, gv,
    hk extends string, hv,
    ik extends string, iv,
    jk extends string, jv,
    kk extends string, kv,
    lk extends string, lv,
    mk extends string, mv,
    nk extends string, nv,
    ok extends string, ov,
    pk extends string, pv
>(
    a: [ak,ParseF<av>],
    b: [bk,ParseF<bv>],
    c: [ck,ParseF<cv>],
    d: [dk,ParseF<dv>],
    e: [ek,ParseF<ev>],
    f: [fk,ParseF<fv>],
    g: [gk,ParseF<gv>],
    h: [hk,ParseF<hv>],
    i: [ik,ParseF<iv>],
    j: [jk,ParseF<jv>],
    k: [kk,ParseF<kv>],
    l: [lk,ParseF<lv>],
    m: [mk,ParseF<mv>],
    n: [nk,ParseF<nv>],
    o: [ok,ParseF<ov>],
    p: [pk,ParseF<pv>]
): ParseF<{
    [key in Exclude<ak|bk|ck|dk|ek|fk|gk|hk|ik|jk|kk|lk|mk|nk|ok|pk, "">]:
        key extends ak ? av :
        key extends bk ? bv :
        key extends ck ? cv :
        key extends dk ? dv :
        key extends ek ? ev :
        key extends fk ? fv :
        key extends gk ? gv :
        key extends hk ? hv :
        key extends ik ? iv :
        key extends jk ? jv :
        key extends kk ? kv :
        key extends lk ? lv :
        key extends mk ? mv :
        key extends nk ? nv :
        key extends ok ? ov :
        key extends pk ? pv :
        never
}>
export function pipeO<
    ak extends string, av,
    bk extends string, bv,
    ck extends string, cv,
    dk extends string, dv,
    ek extends string, ev,
    fk extends string, fv,
    gk extends string, gv,
    hk extends string, hv,
    ik extends string, iv,
    jk extends string, jv,
    kk extends string, kv,
    lk extends string, lv,
    mk extends string, mv,
    nk extends string, nv,
    ok extends string, ov,
    pk extends string, pv,
    qk extends string, qv
>(
    a: [ak,ParseF<av>],
    b: [bk,ParseF<bv>],
    c: [ck,ParseF<cv>],
    d: [dk,ParseF<dv>],
    e: [ek,ParseF<ev>],
    f: [fk,ParseF<fv>],
    g: [gk,ParseF<gv>],
    h: [hk,ParseF<hv>],
    i: [ik,ParseF<iv>],
    j: [jk,ParseF<jv>],
    k: [kk,ParseF<kv>],
    l: [lk,ParseF<lv>],
    m: [mk,ParseF<mv>],
    n: [nk,ParseF<nv>],
    o: [ok,ParseF<ov>],
    p: [pk,ParseF<pv>],
    q: [qk,ParseF<qv>]
): ParseF<{
    [key in Exclude<ak|bk|ck|dk|ek|fk|gk|hk|ik|jk|kk|lk|mk|nk|ok|pk|qk, "">]:
        key extends ak ? av :
        key extends bk ? bv :
        key extends ck ? cv :
        key extends dk ? dv :
        key extends ek ? ev :
        key extends fk ? fv :
        key extends gk ? gv :
        key extends hk ? hv :
        key extends ik ? iv :
        key extends jk ? jv :
        key extends kk ? kv :
        key extends lk ? lv :
        key extends mk ? mv :
        key extends nk ? nv :
        key extends ok ? ov :
        key extends pk ? pv :
        key extends qk ? qv :
        never
}>
export function pipeO(...ps:[string,ParseF<any>][]) : ParseF<any> {
    return (token:Token):any => {
        let r = {} as any
        for(let [key,f] of ps) {
            let a = f(token)
            if(a.status != "SUCCESS") return a
            token = a.slice
            if(key == "") continue
            r[key] = a.value
        }
        return {
            status: "SUCCESS",
            value: r,
            slice: token
        } satisfies Parser<any>
    }
}

/**
 * Executes a parser with the given token and returns the parse result.
 * Handles both direct ParseF and recursive ParseFunction types.
 * @param p The parser to execute
 * @param token The input token to parse
 * @returns The result of the parsing operation
 */
export function parse<T>(p:ParseFunction<T>,token:Token):Parser<T>{
    let f = typeof p == "function" ? p : p.fn()
    return f(token)
}

/**
 * Exception thrown when parsing fails in simpleParse.
 * Contains an error code and message describing the failure.
 */
export class ParserException extends Error {
    public code: string
    constructor(code:string,message:string) {
        super(message)
        this.code = code
    }
}

/**
 * Simplified parsing function that returns the parsed value on success,
 * or throws a ParserException on failure.
 * @param p The parser to execute
 * @param token The input token to parse
 * @returns The parsed value if successful
 * @throws ParserException if parsing fails
 */
export function simpleParse<T>(p:ParseFunction<T>,token:Token): T {
    let f = typeof p == "function" ? p : p.fn()
    let r = f(token)
    if(r.status != "SUCCESS") throw new ParserException(r.status,r.message)
    return r.value
}
