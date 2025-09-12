
export type Token = string
export type ParseError = "END_OF_INPUT" | "EQUAL_FAIL" | "DOESNT_INDEX_OF" | "NOT_SPACE" | "NOT_NUMBER" | "F"
export type Parser<T> = {
    status: ParseError,
    message: string
} | {
    status: "SUCCESS",
    value: T,
    slice: Token
}

/**
 *  `解析函数`类型
 */
export type ParseF<T> = (token:Token) => Parser<T>

/**
 * 有时候需要递归解析，所以需要支持函数版本的解析函数
 */
export type ParseFunction<T> = ParseF<T> | {fn:() => ParseF<T>}

/**
 *   按顺序尝试`解析函数`，返回首个成功的解析结果
 * @param x 
 * @param xs 
 * @returns 
 */
export let orP = <T>(x:ParseFunction<T>,... xs: ParseFunction<T>[]) => (token: Token):Parser<T> => {
    let xfn = typeof x == "function" ? x : x.fn()
    let a = xfn(token)
    if(a.status == "SUCCESS") return a
    for(let f of xs){
        let fn = typeof f == "function" ? f : f.fn()
        let a = fn(token)
        if(a.status != "SUCCESS") {
            continue
        }
        return a
    }
    return a
}

/**
 * 搜索指定字符串，匹配后从匹配位置继续解析后续内容
 * @param str 指定的字符串
 * @returns 指定字符串之前的slice
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
 * 判断是否是单个空白字符
 * @param char 
 * @returns 
 */
export function isSpace(char: string) {
    return [" ","\t","\n","\r"].indexOf(char) != -1
}
/**
 * Parse a white symbol, eg space newline table 
 * 解析单个空白字符
 * @returns 
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

// Remove the leading spaces.
// It will definitely succeed regardless of whether there are any spaces or not, and it will never fail.
/**
 * 解析并去除起始位置的空白字符
 * @returns 
 */
export let spaces = (token:Token):Parser<void> => {
    return {
        status: "SUCCESS",
        slice: token.trimStart(),
        value: undefined
    }
}

/**
 * 重复解析直至失败，返回所有成功结果的列表
 * @param p 解析函数 ParseF
 * @returns 
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
 * 解析单个任意字符 
 * @returns 
 */
export let anyChar = (token:Token):Parser<string> => {
    if(token.length == 0) return {
        status: "END_OF_INPUT",
        message: ""
    }

    return {
        status: "SUCCESS",
        value: token[0] as string,
        slice: token.slice(1)
    }
}

/**
 * 解析与参数完全匹配的字符串
 * @param str 要匹配的字符串
 * @returns 
 */
export let equal = (str:Token) => (token:Token):Parser<string> => {
    let tobe = token.slice(0,str.length)
    if(tobe != str) {
        return {
            status: "EQUAL_FAIL",
            message: `Expect ${str} actual ${tobe} token limit 100=${token.slice(0,100)}`
        }
    }
    return {
        status: "SUCCESS",
        value: str,
        slice: token.slice(str.length)
    }
}
/**
 *  与 equal 相反
 * @param str 
 * @returns 
 */
export let notEqual = (str:Token) => (token:Token):Parser<string> => {
    let tobe = token.slice(0,str.length)
    if(tobe == str) {
        return {
            status: "EQUAL_FAIL",
            message: `Expect not {str} actual ${tobe}`
        }
    }
    return {
        status: "SUCCESS",
        value: token[0] as string,
        slice: token.slice(1)
    }
}

export function isNumber(char:string) {
    let zero = '0'.charCodeAt(0)
    let nine = '9'.charCodeAt(0)
    let code = char.charCodeAt(0)
    return code >= zero && code <= nine
}
/**
 * 解析一个JSON 数字
 * @returns 
 */
export let numberF: ParseF<number> = token => {
    if(token.length == 0 ) return {
        status: "END_OF_INPUT",
        message: ""
    }
    let head = token.charAt(0)
    if(isNumber(head) == false) return {
        status: "NOT_NUMBER",
        message: ""
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
 * 用onsole.log 打印 前100个token和解析器的结果
 * @param fn  解析器 ParseF
 * @param prefix  打印前缀
 * @param log_result 是否打印结果
 * @returns 
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
 * 当解析流程执行时，先尝试用 `parseFBefore` 定位一个参考点（该解析不消耗token），
 * 然后使用 `parseF` 解析从当前位置到该参考点之前的所有令牌
 * @param parseF  解析目标内容
 * @param parseFBefore  定位参考点
 * @returns 
 */
export let before =  <a,b>(parseF:ParseFunction<a>,parseFBefore:ParseFunction<b>) : ParseFunction<a> => token => {
    let pf = typeof parseF == "function" ? parseF : parseF.fn()
    let pf_before = typeof parseFBefore == "function" ? parseFBefore : parseFBefore.fn()
    let value_before = pf_before(token)
    if(value_before.status != "SUCCESS") return value_before
    let offset = token.length - value_before.slice.length
    let token_before = token.slice(0,offset)
    return pf(token_before)
}
/**
 * 直接跳转至字符串末尾
 * @returns 返回token
 */
export let breakToEnd : ParseF<Token> = token => {
    return {
        status: "SUCCESS",
        value: token,
        slice: ""
    }
}

/**
 * 验证当前位置是否为输入末尾
 * @returns 
 */
export let endOfInput : ParseF<void> = token => {
    if(token.length == 0) return {
        status: "SUCCESS",
        value: undefined,
        slice: ""
    }

    return {
        status: "F",
        message: "token.length = " + token.length
    }
}
/**
 *  基于前序解析结果动态转换解析流程
 * @returns 
 */
export let bind = <a,b>(p:ParseFunction<a>,fn:(a:a)=>ParseF<b>):ParseF<b> => token => {
    let pfn = typeof p == "function" ? p : p.fn()
    let pa = pfn(token)
    if(pa.status != "SUCCESS") return pa
    return fn(pa.value)(pa.slice)
}

/**
 * 射转换解析成功的结果值
 * @returns 
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
 * 快速构建一个ParseF
 * @returns 
 */
export let pure = <a>(a:a):ParseF<a> => token => {
    return {
        status: "SUCCESS",
        value: a,
        slice: token
    }
}

/**
 *  可选解析，确保解析不失败，若p解析器成功则返回p的结果，否则返回值为ndefiend的解析
 * @param p 
 * @returns 
 */
export let optional = <T>(p: ParseFunction<T>):ParseF<T|undefined> => token => {
    let pfn = typeof p == "function" ? p : p.fn()
    let a = pfn(token)
    if(a.status != "SUCCESS") return {
        status: "SUCCESS",
        value: undefined,
        slice: token
    }
    return a
}

/**
 *  *组合多个解析函数，按右结合顺序执行解析并返回结果元组*
 * 解析流程：
 * - 采用右结合方式执行解析，从最右侧的解析函数开始
 * - 每个解析函数处理剩余的令牌，其结果按参数顺序存入元组
 * ## 示例：
 * - composeP (a, b)：先执行 b 解析，剩余令牌由 a 解析，返回 [a 的结果，b 的结果]
 * - composeP (a, b, c)：先执行 c 解析，剩余令牌由 b 解析，再剩余由 a 解析，返回 [a 的结果，b 的结果，c 的结果]
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

export function parse<T>(p:ParseFunction<T>,token:Token):Parser<T>{
    let f = typeof p == "function" ? p : p.fn()
    return f(token)
}

export class ParserException extends Error {
    public code: string
    constructor(code:string,message:string) {
        super(message)
        this.code = code
    }
}

// 解析错误，抛异常
/**
 *  简单解析，解析成功返回解析的值，否则抛异常 `ParserException`
 * @param p 解析函数
 * @param token 要解析的内容
 * @returns 
 */
export function simpleParse<T>(p:ParseFunction<T>,token:Token): T {
    let f = typeof p == "function" ? p : p.fn()
    let r = f(token)
    if(r.status != "SUCCESS") throw new ParserException(r.status,r.message)
    return r.value
}
