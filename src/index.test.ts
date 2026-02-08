import {expect, test} from "bun:test"
import { anyChar,equal, parse,safeParse, composeP, takeUntil, space, spaces, many, type ParseF, orP, fmap, notP, numberF, plog, optional, bind, pure, endOfInput, breakToEnd, before, fail, manyTill, sepBy, pipeO, pipeP, lookup, selectMinConsumingF, take, Do, regexF, many1, handBack } from "./index"

test("space",()=>{
    let p = safeParse(
        space,
        " abcd"
    )
    if(p.status != "SUCCESS") return expect().fail("parse sapce failed")
    expect(p.value).toBe(" ")

    let q = safeParse(space,"")
    expect(q.status).toBe("NOT_SPACE")
    
})
test("spaces",()=>{
    let p = safeParse(
        spaces,
        " \n\t\r  abcd"
    )
    if(p.status != "SUCCESS") return expect().fail("parse sapces failed")
    expect(p.slice).toBe("abcd")

    let q = safeParse(
        spaces,
        "d"
    )
    if(q.status != "SUCCESS") return expect().fail("parse sapces failed")
    expect(q.slice).toBe("d")
    
})
test("anychar",()=>{
    let a = safeParse(
        anyChar,
        "abcd"
    )
    if(a.status != "SUCCESS") return expect().fail("parse anyChar failed")
    expect(a.value).toBe("a")
    expect(a.slice).toBe("bcd")

    expect(safeParse(anyChar,"").status).toBe("END_OF_INPUT")
})

test("takeUntil",()=>{
    let a = safeParse(takeUntil("abc"),"123abc321")
    if(a.status != "SUCCESS") return expect().fail("parse anyChar failed")
    expect(a.value).toBe("123")
    expect(a.slice).toBe("321")
    let b = safeParse(takeUntil("abcd"),"123abc321")
    expect(b.status).toBe("DOESNT_INDEX_OF")
})
test("handBack",()=>{
    let a = safeParse(fmap(pipeP(takeUntil("abc"),handBack("abc")),xs=>xs[0]),"123abc321")
    if(a.status != "SUCCESS") return expect().fail("parse anyChar failed")
    
    expect(a.value).toBe("123")
    expect(a.slice).toBe("abc321")
})

test("composeP",()=>{
    let a = safeParse(composeP(anyChar,anyChar,takeUntil("abc")),"123abc321")
    if(a.status != "SUCCESS") return expect().fail("composeP failed")
    let [v1,v2,v3] = a.value
    expect(v1).toBe("2")
    expect(v2).toBe("3")
    expect(v3).toBe("123")
    expect(a.slice).toBe("1")
})

test("pipeP",()=>{
    let a = safeParse(pipeP(takeUntil("abc"),anyChar,anyChar),"123abc321")
    if(a.status != "SUCCESS") return expect().fail("pipeP failed")
    let [v1,v2,v3] = a.value
    expect(v1).toBe("123")
    expect(v2).toBe("3")
    expect(v3).toBe("2")
    expect(a.slice).toBe("1")
})

test("lookup",()=>{
    let r = safeParse(lookup(anyChar),"abc")
    if(r.status != "SUCCESS") return expect().fail()
    expect(r.value).toBe("a")
    expect(r.slice).toBe("abc")
})

test("bind",()=>{
    let pf = bind(
        anyChar,
        a => pure("a")
    )
    let a = parse(pf,"asdfasdf")
    expect(a).toBe("a")
})
test("fmap",()=>{
    let pf = fmap(anyChar,a=>1)    
    let r = safeParse(pf,"2")
    if(r.status == "SUCCESS") return expect(r.value).toBe(1)
})
test("many",()=>{
    let ghParseF : ParseF<string> = token => {
        let r = anyChar(token)
        if(r.status != "SUCCESS") return r
        if("gh".indexOf(r.value) == -1 ) return {
            status: "F",
            message: "fff"
        }
        return r
    }
    let a = safeParse(many(ghParseF),"hhhhgggghghghghgh123")
    if(a.status != "SUCCESS") return expect().fail("many failed")
    expect(a.value).toEqual("hhhhgggghghghghgh".split(""))
    expect(a.slice).toBe("123")
})
test("many1",()=>{
    const parseF = many1(equal("hello"))
    expect(parseF).toThrow()
    expect(parse(parseF,("hellohello"))).toEqual(["hello","hello"])
})

test("selectMinConsumingF",()=>{
    let str=`
    12132
    end1
    12312312
    end2
    werwerw
    end4
    `

    let vs = parse(many(fmap(selectMinConsumingF(
        [takeUntil("end1"),takeUntil("end2")]),a=>a.trim())),str)
    expect(vs).toEqual([ "12132", "12312312" ])

})

test("orP",()=>{
    let a = parse(orP(equal("hello"),takeUntil("o")),"hello 0000oooo")
    expect(a).toBe("hello")
})
test("equal",()=>{
    let p = safeParse(many(orP(equal("abc"),equal("ABC"))),"abcABCA123")
    if(p.status != "SUCCESS") return expect().fail("equals failed")
    expect(p.value).toEqual(["abc","ABC"])
    expect(p.slice).toBe("A123")
})
test("breakToEnd",()=>{
    let a = parse(breakToEnd,"hello")
    expect(a).toBe("hello")
})
test("endOfInput",()=>{
    let a = parse(endOfInput,"")
    expect(a).toBeUndefined()
})
test("before",()=>{
    let a = before(anyChar,takeUntil("c"))("aacdd")
    expect(a).toEqual({
        status: "SUCCESS",
        value: "a",
        slice: "dd",
    })
    let str =`
    n 1 n 2 
    n 3 n 4

    n 0Part never parse
    n 5
    n 6
    `
    let n_number_f = fmap(
        composeP(numberF,takeUntil("n ")),
        a => a[0]
    )
    let n_list = parse(many(n_number_f),str)
    expect(n_list).toEqual([1,2,3,4,0,5,6])
    let n_list_before = parse(before(many(n_number_f),takeUntil("Part never parse")),str)
    expect(n_list_before).toEqual([1,2,3,4,0])
})

test("pure",()=>{
    let a = parse(pure("pure"),"")
    expect(a).toBe("pure")
})
test("fail",()=>{
    let p = safeParse(fail("error message"),"")
    expect(p.status).toBe("FAIL")
})
test("manyTill",()=>{
    const str = "123,8,9,76554,66,0,98,88"
    const f = fmap(manyTill(anyChar,orP<any>(equal(","),endOfInput)),xs=>xs.join(""))
    const r = parse(many(f),str)
    expect(r).toEqual([ "123", "8", "9", "76554", "66", "0", "98" ])
})
test("sepBy",()=>{
    let str = "123,8,9,76554,66,0,98,88"
    let numbers = parse(sepBy(numberF,equal(",")),str)
    expect(numbers).toEqual([123,8,9,76554,66,0,98,88])
    let numbers2 = parse(sepBy(numberF,equal(",")),"")
    expect(numbers2).toBeEmpty()
})
test("pipeO",()=>{
    let f = pipeO(["a",anyChar],["",anyChar],["c",numberF])
    let r = parse(f,"ab2cd")
    expect(r).toEqual({
        a: "a",
        c: 2
    })
    let xml = `
    <value>
        <foo>foo_val</foo>
        <bar>bar_val</bar>
    </value>
    <value>
        <foo>foo_val</foo>
        <bar>bar_val</bar>
    </value>
    <value>
        <foo>foo_val</foo>
        <bar>bar_val</bar>
    </value>
    `
    let values = parse(many(    // many function can keep parsing until failure, assemble results into a list
        pipeO(
            ["",spaces],              // remove whitespace
            ["",equal("<value>")],    // exact match <value>
            ["",spaces],              // remove whitespace
            ["",equal("<foo>")],      // exact match <foo>
            ["",spaces],              // remove whitespace 
            ["foo",takeUntil("</foo>")], // search </foo> and assign skipped content to foo property of result object
            ["",spaces],              // remove whitespace 
            ["",equal("<bar>")],      // eg
            ["",spaces],              // eg
            ["bar",takeUntil("</bar>")], // search </bar> and assign skipped content to bar property of result object
            ["",spaces], 
            ["",equal("</value>")],
        )
    ),xml)
    expect(values).toEqual([
        {
            foo: "foo_val",
            bar: "bar_val",
        }, {
            foo: "foo_val",
            bar: "bar_val",
        }, {
            foo: "foo_val",
            bar: "bar_val",
        }
    ])
})
test("Do xml",()=>{
    let xml = `
    <value>
        <foo>foo_val</foo>
        <bar>bar_val</bar>
    </value>
    <value>
        <foo>foo_val</foo>
        <bar>bar_val</bar>
    </value>
    <value>
        <foo>foo_val</foo>
        <bar>bar_val</bar>
    </value>
    `
    let f = Do(function*(){
        yield spaces
        yield equal("<value>")
        yield spaces
        yield equal("<foo>")
        yield spaces
        let foo = yield takeUntil("</foo>")
        yield spaces
        yield equal("<bar>")
        yield spaces
        let bar = yield takeUntil("</bar>")
        yield spaces
        yield equal("</value>")
        return {foo,bar}
    })
    let values = parse(many(f),xml)
    expect(values).toEqual([
        {
            foo: "foo_val",
            bar: "bar_val",
        }, {
            foo: "foo_val",
            bar: "bar_val",
        }, {
            foo: "foo_val",
            bar: "bar_val",
        }
    ])
})
export type ObjectValue =  {
    [k in string]: Value
}
export type Value = null
    | string
    | boolean
    | number
    | ObjectValue
    | Value []
export function parseJson(token:string) : Value {
    const nullF = fmap(equal("null"),()=>null)
    const booleanF = fmap(orP(equal("true"),equal("false")),a=>a =="true")
    const stringF = fmap(
        pipeP(
            equal('"'),
            manyTill(
                orP(fmap(equal('\\"'),a=>'"'),anyChar),
                equal('"')
            )
        ),
        xs => xs[1].join("")
    )
    
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
    xs => xs[2])

    const keyValueF = pipeO(
        ["key", stringF],
        ["", spaces],
        ["", equal(":")],
        ["", spaces],
        ["value", bind({fn:()=>valueF},pure)]
    )
    const keyValueListF = fmap(
        pipeP(
            equal("{"),
            spaces,
            sepBy( keyValueF, equal(",")),
            spaces, equal("}")
        ),
        xs => xs[2])
    const objectF = fmap(keyValueListF,keyValueList=>{
        const obj : ObjectValue = {}
        for(const kv of keyValueList) {
            obj[kv.key] = kv.value
        }
        return obj
    })

    let valueF: ParseF<Value> = orP<Value>(
        nullF,
        booleanF,
        numberF,
        stringF,
        arrayF,
        objectF
    )
    return parse(
        fmap(
            pipeP(spaces,valueF,spaces,endOfInput),
            x=>x[1]
        ),
        token
    )
}
test("json test",()=>{
    // parse json doesn't support null

    let json_integer = "123457890"
    let json_float = "0.88787"
    let json_string = `"he'\\"llo"`
    let json_true = "true"
    let josn_array = "[1,2, true,\"3\"]" as const
    let josn_obj = `{\n"key":1,"arr":["a",true,\n1],"obj":{"a":"a"}}`

    expect(parseJson(json_true)).toBe(true)
    
    expect(parseJson(json_string)).toBe("he'\"llo")

    expect(parseJson(json_integer)).toBe(123457890)
    expect(parseJson(json_float)).toBe(0.88787)

    expect(parseJson(josn_array)).toEqual([ 1, 2, true, "3" ])

    expect(parseJson("[ ]")).toBeEmpty()

    expect(parseJson("[true,22,[4,false,\"----\",[],[8,[]]]  ]")).toBeArray()

    expect(parseJson(josn_obj)).toEqual(JSON.parse(josn_obj))

})

test("simple",()=>{
    // 高效率解析出下面所有在level下的无序列表
    // -> [{title:"Level 1",list:["l1 one","l1 two"]},...]
    let str_unparsed = `
    ## Some title

    ### Level 1
        - l1 one
        - l2 two
    
    Something...

    ### Level 2
        - l2 one
        - l2 two
        - l2 three
    ### Others
    ...
    `
    let item_parse_f = fmap(
        composeP(takeUntil("\n"),spaces,equal("- "),spaces),
        a => a[0]
    )
    let level_parse_f = fmap(
        composeP(
            many(item_parse_f),
            fmap(takeUntil("\n"),a=>"Level" + a),
            takeUntil("# Level")
        ),
        a => {
            return {
                title: a[1],
                list: a[0]
            }
        }
    )
    let result = parse(many(level_parse_f),str_unparsed) 
    expect(result).toEqual([{
        title: "Level 1",
        list: ["l1 one", "l2 two"],
    }, {
        title: "Level 2",
        list: ["l2 one", "l2 two", "l2 three"],
    }])
})

test("take", () => {
    expect(parse(composeP(breakToEnd, take(2)), "123")).toEqual(["3", "12"])
    expect(many(fmap(take(1), a => a))("abd de")).toEqual({
        status: "SUCCESS",
        slice: "",
        value: ["a", "b", "d", " ", "d", "e"],
    })
})

test("Do",()=>{
    expect(parse(Do(function* () {
        let a = yield anyChar
        let b = yield anyChar
        let d = yield Do(function*(){
            return yield breakToEnd
        })
        return [a,b,d]
    }),"xxa---")).toEqual([ "x", "x", "a---" ])
})

test(regexF.name,()=>{
    let a = safeParse(regexF(/^[0-9]+/),"123 456")
    let b = safeParse(regexF(/^[0-9]+/),"abc 1 23 456")
    let c = safeParse(regexF(/[0-9]+/),"abc 1 23 456")
    expect(a).toEqual({
        status: "SUCCESS",
        value: "123",
        slice: " 456",
    })
    expect(b).toEqual({
        status: "REGEX_F",
        message: "",
    })
    expect(c).toEqual({
        status: "SUCCESS",
        value: "1",
        slice: " 23 456",
    })
})