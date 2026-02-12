import { type ParseF, type Parser, type Token } from ".";
import * as mp from ".";

/**
 * The main parser class providing a fluent, chainable interface for building and composing
 * parsing logic. Encapsulates a parse function and provides methods to transform, compose,
 * and execute parsing operations.
 *
 * @template T The type of value produced by this parser on success.
 */
export class P<T> {
    /**
     * The internal parsing function that this parser instance wraps.
     */
    parseF: ParseF<T>;

    /**
     * Private constructor to enforce use of static factory methods.
     */
    private constructor(parseF: typeof this.parseF) {
        this.parseF = parseF;
    }

    /**
     * Creates a new `P` instance from a raw `ParseF` function.
     *
     * @template T The type of value produced by the parser.
     * @param parseF The raw parsing function to wrap.
     * @returns A new `P` instance wrapping the provided parse function.
     */
    static fromParseF<T>(parseF: P<T>["parseF"]): P<T> {
        return new P(parseF);
    }

    // =========================================================================
    // Static Factory Methods
    // =========================================================================

    /**
     * Creates a parser that matches an exact string.
     *
     * @param str The exact string to match.
     * @returns A parser that matches the exact string and returns it.
     */
    static equal(str: Token): P<string> {
        return P.fromParseF(mp.equal(str));
    }

    /**
     * Creates a parser that takes exactly `n` characters from the input.
     *
     * @param n The number of characters to take.
     * @returns A parser that takes `n` characters and returns them as a string.
     */
    static take(n: number): P<string> {
        return P.fromParseF(mp.take(n));
    }

    /**
     * Creates a parser that takes characters from the input until it finds the
     * specified delimiter string.
     *
     * @param delimiter The delimiter string to stop at.
     * @returns A parser that takes characters until the delimiter and returns them as a string.
     */
    static takeUntil(delimiter: string): P<string> {
        return P.fromParseF(mp.takeUntil(delimiter));
    }

    /**
     * Creates a parser that matches a single whitespace character (space, tab, newline, or carriage return).
     *
     * @returns A parser that matches a single whitespace character and returns it.
     */
    static space(): P<string> {
        return P.fromParseF(mp.space);
    }

    /**
     * Creates a parser that matches zero or more whitespace characters.
     *
     * @returns A parser that skips whitespace characters and returns `undefined`.
     */
    static spaces(): P<void> {
        return P.fromParseF(mp.spaces);
    }

    /**
     * Creates a parser that always succeeds with the given value without consuming any input.
     *
     * @template T The type of the value to return.
     * @param value The value to return.
     * @returns A parser that returns the given value without consuming input.
     */
    static pure<T>(value: T): P<T> {
        return P.fromParseF(mp.pure(value));
    }

    /**
     * Creates a parser that always fails with the specified error message.
     *
     * @template T The type parameter (for compatibility).
     * @param message The error message to use.
     * @returns A parser that always fails.
     */
    static fail<T>(message: string): P<T> {
        return P.fromParseF<T>(mp.fail(message));
    }

    /**
     * Creates a parser that matches a JSON-style number (integer or floating-point).
     *
     * @returns A parser that matches a number and returns it as a JavaScript number.
     */
    static number(): P<number> {
        return P.fromParseF(mp.numberF);
    }

    /**
     * Creates a parser that succeeds only if the input has been completely consumed.
     *
     * @returns A parser that succeeds at the end of input and returns `undefined`.
     */
    static endOfInput(): P<void> {
        return P.fromParseF(mp.endOfInput);
    }

    /**
     * Creates a parser that takes all remaining characters from the input.
     *
     * @returns A parser that takes all remaining characters and returns them as a string.
     */
    static breakToEnd(): P<Token> {
        return P.fromParseF(mp.breakToEnd);
    }

    /**
     * Creates a parser that prepends the specified token to the remaining input without consuming anything.
     *
     * @param prepareToken The token to prepend to the remaining input.
     * @returns A parser that prepends the token and returns `undefined`.
     */
    static handBack(prepareToken: Token): P<void> {
        return P.fromParseF(mp.handBack(prepareToken));
    }

    /**
     * Creates a parser that matches a regular expression at the start of the remaining input.
     *
     * @param regex The regular expression to match (must start with ^ to match correctly).
     * @returns A parser that matches the regex and returns the matched string.
     */
    static regex(regex: RegExp): P<Token> {
        return P.fromParseF(mp.regexF(regex));
    }

    // =========================================================================
    // Chainable Methods
    // =========================================================================

    /**
     * Monadic bind operation: chains parsers, using the result of the current parser
     * to determine the next parser.
     *
     * @template X The type of value produced by the next parser.
     * @param fn A function that takes the current parser's result and returns the next parser.
     * @returns A new parser that sequences the operations.
     */
    public bind<X>(fn: (a: T) => P<X>): P<X> {
        return P.fromParseF(
            mp.bind(this.parseF, x => fn(x).parseF)
        );
    }

    /**
     * Chains parsers, ignoring the result of the current parser and executing the next parser.
     *
     * @template X The type of value produced by the next parser.
     * @param p The next parser to execute.
     * @returns A new parser that sequences the operations.
     */
    public semiBind<X>(p: P<X>): P<X> {
        return this.bind(() => p);
    }

    /**
     * Chains parsers, executing the next parser without modifying the current result.
     * The result of the next parser is discarded.
     *
     * @template X The type of value produced by the next parser (discarded).
     * @param p The next parser to execute.
     * @returns A new parser that sequences the operations.
     */
    public semiBindTap<X>(p: P<X>): P<T> {
        return this.bind(v => p.map(() => v));
    }

    /**
     * Chains parsers, adding the result of the next parser as a key-value pair to the current object result.
     * Requires the current parser to return an object type.
     *
     * @template K The type of the key.
     * @template X The type of the value to add.
     * @param key The key to add to the result object.
     * @param p The parser to get the value for the key.
     * @returns A new parser that combines the results.
     */
    public semiBindKey<K extends string, X>(
        key: K,
        p: P<X>
    ): P<T & { [A in K]: X }> {
        return this.bind(v =>
            p.map(v2 => ({
                ...v,
                [key]: v2
            } as T & { [A in K]: X }))
        );
    }

    // =========================================================================
    // Execution Methods
    // =========================================================================

    /**
     * Runs the parser on the given input string, throwing an exception if parsing fails.
     *
     * @param token The input string to parse.
     * @returns The parsed value if successful.
     * @throws ParserException if parsing fails.
     */
    public run(token: Token): T {
        return mp.parse(this.parseF, token);
    }

    /**
     * Runs the parser on the given input string, returning a detailed result object.
     *
     * @param token The input string to parse.
     * @returns A `Parser` result object containing the status and value.
     */
    public safeRun(token: Token): Parser<T> {
        return mp.safeParse(this.parseF, token);
    }

    // =========================================================================
    // Transformation Methods
    // =========================================================================

    /**
     * Applies a transformation function to the result of the parser.
     *
     * @template X The type of value produced by the transformation.
     * @param fn The transformation function to apply.
     * @returns A new parser that applies the transformation.
     */
    public map<X>(fn: (v: T) => X): P<X> {
        return P.fromParseF(
            mp.fmap(this.parseF, fn)
        );
    }

    // =========================================================================
    // Composition Methods
    // =========================================================================

    /**
     * Creates a parser that tries this parser first, and if it fails, tries the other parser.
     *
     * @template X The type of value produced by the other parser.
     * @param p The other parser to try if this one fails.
     * @returns A new parser that tries both options.
     */
    public or<X>(p: P<X>): P<T | X> {
        return P.fromParseF(
            mp.orP<T | X>(this.parseF, p.parseF)
        );
    }

    /**
     * Creates a parser that runs this parser zero or more times, collecting all results.
     *
     * @returns A new parser that runs repeatedly and collects results into an array.
     */
    public many(): P<T[]> {
        return P.fromParseF(mp.many(this.parseF));
    }

    /**
     * Creates a parser that runs this parser one or more times, collecting all results.
     *
     * @returns A new parser that runs repeatedly and collects results into an array.
     */
    public many1(): P<T[]> {
        return P.fromParseF(mp.many1(this.parseF));
    }

    /**
     * Creates a parser that runs this parser repeatedly until the end parser succeeds.
     *
     * @template X The type of value produced by the end parser.
     * @param endP The parser that signals the end of repetition.
     * @returns A new parser that runs repeatedly until the end parser succeeds.
     */
    public manyTill<X>(endP: P<X>): P<T[]> {
        return P.fromParseF(
            mp.manyTill(this.parseF, endP.parseF)
        );
    }

    // =========================================================================
    // Utility Methods
    // =========================================================================

    /**
     * Creates a parser that looks ahead without consuming any input.
     *
     * @returns A new parser that behaves like this parser but doesn't consume input.
     */
    public lookup(): P<T> {
        return P.fromParseF(mp.lookup(this.parseF));
    }

    /**
     * Creates a parser that logs debugging information.
     *
     * @param prefix Optional prefix for log messages.
     * @param logResult Whether to log the parse result (default: false).
     * @returns A new parser that logs information.
     */
    public log(prefix?: string, logResult?: boolean): P<T> {
        return P.fromParseF(
            mp.plog(this.parseF, prefix, logResult)
        );
    }

    /**
     * Creates a parser that parses zero or more occurrences of this parser, separated by the separator parser.
     *
     * @template X The type of value produced by the separator parser.
     * @param sep The separator parser.
     * @returns A new parser that parses separated values into an array.
     */
    public sepBy<X>(sep: P<X>): P<T[]> {
        return P.fromParseF(
            mp.sepBy(this.parseF, sep.parseF)
        );
    }

    /**
     * Creates a parser that makes this parser optional. If this parser fails, it will succeed with `undefined`.
     *
     * @returns A new parser that is optional.
     */
    public optional(): P<T | undefined> {
        return P.fromParseF(mp.optional(this.parseF));
    }

    /**
     * Creates a parser that succeeds if this parser fails, and fails if this parser succeeds.
     *
     * @returns A new parser that negates this parser.
     */
    public not(): P<void> {
        return P.fromParseF(mp.notP(this.parseF));
    }

    /**
     * Creates a parser that parses this parser followed by the before parser, returning the result of this parser.
     *
     * @template X The type of value produced by the before parser.
     * @param beforeP The parser to parse after this one.
     * @returns A new parser that sequences the operations.
     */
    public before<X>(beforeP: P<X>): P<T> {
        return P.fromParseF(mp.before(this.parseF, beforeP.parseF));
    }
}
