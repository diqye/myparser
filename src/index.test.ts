import {expect, test} from "bun:test"
import { anyChar,equal, parse, composeP, search, space, spaces, many, type ParseF, orP, fmap, notEqual, numberF, plog, optional, simpleParse, bind, pure, endOfInput, breakToEnd, before, fail, manyTill, sepBy, pipeO, pipeP, lookup, selectMinConsumingF, take, Do } from "./index"

test("space",()=>{
    let p = parse(
        space,
        " abcd"
    )
    if(p.status != "SUCCESS") return expect().fail("parse sapce failed")
    expect(p.value).toBe(" ")

    let q = parse(space,"")
    expect(q.status).toBe("NOT_SPACE")
    
})
test("spaces",()=>{
    let p = parse(
        spaces,
        " \n\t\r  abcd"
    )
    if(p.status != "SUCCESS") return expect().fail("parse sapces failed")
    expect(p.slice).toBe("abcd")

    let q = parse(
        spaces,
        "d"
    )
    if(q.status != "SUCCESS") return expect().fail("parse sapces failed")
    expect(q.slice).toBe("d")
    
})
test("anychar",()=>{
    let a = parse(
        anyChar,
        "abcd"
    )
    if(a.status != "SUCCESS") return expect().fail("parse anyChar failed")
    expect(a.value).toBe("a")
    expect(a.slice).toBe("bcd")

    expect(parse(anyChar,"").status).toBe("END_OF_INPUT")
})

test("search",()=>{
    let a = parse(search("abc"),"123abc321")
    if(a.status != "SUCCESS") return expect().fail("parse anyChar failed")
    expect(a.value).toBe("123")
    expect(a.slice).toBe("321")
    let b = parse(search("abcd"),"123abc321")
    expect(b.status).toBe("DOESNT_INDEX_OF")
})

test("composeP",()=>{
    let a = parse(composeP(anyChar,anyChar,search("abc")),"123abc321")
    if(a.status != "SUCCESS") return expect().fail("composeP failed")
    let [v1,v2,v3] = a.value
    expect(v1).toBe("2")
    expect(v2).toBe("3")
    expect(v3).toBe("123")
    expect(a.slice).toBe("1")
})

test("pipeP",()=>{
    let a = parse(pipeP(search("abc"),anyChar,anyChar),"123abc321")
    if(a.status != "SUCCESS") return expect().fail("pipeP failed")
    let [v1,v2,v3] = a.value
    expect(v1).toBe("123")
    expect(v2).toBe("3")
    expect(v3).toBe("2")
    expect(a.slice).toBe("1")
})

test("lookup",()=>{
    let r = parse(lookup(anyChar),"abc")
    if(r.status != "SUCCESS") return expect().fail()
    expect(r.value).toBe("a")
    expect(r.slice).toBe("abc")
})

test("bind",()=>{
    let pf = bind(
        anyChar,
        a => pure("a")
    )
    let a = simpleParse(pf,"asdfasdf")
    expect(a).toBe("a")
})
test("fmap",()=>{
    let pf = fmap(anyChar,a=>1)    
    let r = parse(pf,"2")
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
    let a = parse(many(ghParseF),"hhhhgggghghghghgh123")
    if(a.status != "SUCCESS") return expect().fail("many failed")
    expect(a.value).toEqual("hhhhgggghghghghgh".split(""))
    expect(a.slice).toBe("123")
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

    let vs = simpleParse(many(fmap(selectMinConsumingF(
        [search("end1"),search("end2")]),a=>a.trim())),str)
    expect(vs).toEqual([ "12132", "12312312" ])

})

test("orP",()=>{
    let a = simpleParse(orP(equal("hello"),search("o")),"hello 0000oooo")
    expect(a).toBe("hello")
})
test("equal",()=>{
    let p = parse(many(orP(equal("abc"),equal("ABC"))),"abcABCA123")
    if(p.status != "SUCCESS") return expect().fail("equals failed")
    expect(p.value).toEqual(["abc","ABC"])
    expect(p.slice).toBe("A123")
})
test("breakToEnd",()=>{
    let a = simpleParse(breakToEnd,"hello")
    expect(a).toBe("hello")
})
test("endOfInput",()=>{
    let a = simpleParse(endOfInput,"")
    expect(a).toBeUndefined()
})
test("before",()=>{
    let a = before(anyChar,search("c"))("aacdd")
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
        composeP(numberF,search("n ")),
        a => a[0]
    )
    let n_list = simpleParse(many(n_number_f),str)
    expect(n_list).toEqual([1,2,3,4,0,5,6])
    let n_list_before = simpleParse(before(many(n_number_f),search("Part never parse")),str)
    expect(n_list_before).toEqual([1,2,3,4,0])
})

test("pure",()=>{
    let a = simpleParse(pure("pure"),"")
    expect(a).toBe("pure")
})
test("fail",()=>{
    let p = parse(fail("error message"),"")
    expect(p.status).toBe("FAIL")
})
test("manyTill",()=>{
    let str = "123,8,9,76554,66,0,98,88"
    let number_f = fmap(composeP(equal(","),numberF),a=>a[1])
    let numbers = simpleParse(manyTill(number_f,equal("0")),str)
    expect(numbers).toEqual([123,8,9,76554,66])
})
test("sepBy",()=>{
    let str = "123,8,9,76554,66,0,98,88"
    let numbers = simpleParse(sepBy(numberF,equal(",")),str)
    expect(numbers).toEqual([123,8,9,76554,66,0,98,88])
    let numbers2 = simpleParse(sepBy(numberF,equal(",")),"")
    expect(numbers2).toBeEmpty()
})
test("pipeO",()=>{
    let f = pipeO(["a",anyChar],["",anyChar],["c",numberF])
    let r = simpleParse(f,"ab2cd")
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
    let values = simpleParse(many(    // many function can keep parsing until failure, assemble results into a list
        pipeO(
            ["",spaces],              // remove whitespace
            ["",equal("<value>")],    // exact match <value>
            ["",spaces],              // remove whitespace
            ["",equal("<foo>")],      // exact match <foo>
            ["",spaces],              // remove whitespace 
            ["foo",search("</foo>")], // search </foo> and assign skipped content to foo property of result object
            ["",spaces],              // remove whitespace 
            ["",equal("<bar>")],      // eg
            ["",spaces],              // eg
            ["bar",search("</bar>")], // search </bar> and assign skipped content to bar property of result object
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
        let foo = yield search("</foo>")
        yield spaces
        yield equal("<bar>")
        yield spaces
        let bar = yield search("</bar>")
        yield spaces
        yield equal("</value>")
        return {foo,bar}
    })
    let values = simpleParse(many(f),xml)
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
    | undefined
    | string
    | boolean
    | number
    | ObjectValue
    | Value []
export function parseJson(token:string) : Value {
    let null_f = fmap(equal("null"),a=>null)
    let undefined_f = fmap(equal("undefined"),a=>undefined)
    let boolean_f = fmap(orP(equal("true"),equal("false")),a=>a == "true")
    let string_f_list = composeP(
        equal('"'),
        manyTill(
            orP(fmap(equal('\\"'),a=>'"'),anyChar),
            equal('"')
        ),
        equal('"')
    )
    let string_f = fmap(string_f_list,([,xs])=>xs.join(""))
    let list_f_list = composeP(
        equal("]"),
        spaces,
        sepBy(
            fmap({fn:()=>composeP(spaces,value_f,spaces)},x=>x[1]),
            equal(",")
        ),
        spaces,
        equal("[")
    )
    let list_f = fmap(list_f_list,x=>x[2])
    let pair_f = fmap({
        fn:()=>composeP(
            value_f,
            spaces,
            equal(":"),
            spaces,
            string_f
        )
    },a=>[a[4],a[0]] as const)
    let object_f_list = composeP(
        equal("}"),
        spaces,
        sepBy(
            pair_f,
            equal(",")
        ),
        spaces,
        equal("{")
    )
    let object_f = fmap(object_f_list,a=>{
        let obj : ObjectValue = {}
        let pairs = a[2]
        for(let pair of pairs) {
            obj[pair[0]] = pair[1]
        }
        return obj
    })

    let value_f: ParseF<Value> = orP<Value>(null_f,undefined_f,boolean_f,numberF,string_f,list_f,object_f)
    return simpleParse(
        fmap(
            composeP(endOfInput,spaces,value_f,spaces),
            x=>x[2]
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
        composeP(search("\n"),spaces,equal("- "),spaces),
        a => a[0]
    )
    let level_parse_f = fmap(
        composeP(
            many(item_parse_f),
            fmap(search("\n"),a=>"Level" + a),
            search("# Level")
        ),
        a => {
            return {
                title: a[1],
                list: a[0]
            }
        }
    )
    let result = simpleParse(many(level_parse_f),str_unparsed) 
    expect(result).toEqual([{
        title: "Level 1",
        list: ["l1 one", "l2 two"],
    }, {
        title: "Level 2",
        list: ["l2 one", "l2 two", "l2 three"],
    }])
})

test("take",()=>{
    expect(simpleParse(composeP(breakToEnd,take(2)),"123")).toEqual(["3","12"])
})

test("Do",()=>{
    expect(simpleParse(Do(function* () {
        let a = yield anyChar
        let b = yield anyChar
        let d = yield Do(function*(){
            return yield breakToEnd
        })
        return [a,b,d]
    }),"xxa---")).toEqual([ "x", "x", "a---" ])
})