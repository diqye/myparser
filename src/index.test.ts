import {expect, test} from "bun:test"
import { anyChar,equal, parse, composeP, search, space, spaces, many, type ParseF, orP, fmap, notEqual, numberF, plog, optional, simpleParse, bind, pure, endOfInput, breakToEnd, before, fail } from "./index"

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
    if(a.status != "SUCCESS") return expect().fail("parse anyChar failed")
    let [v1,v2,v3] = a.value
    expect(v1).toBe("2")
    expect(v2).toBe("3")
    expect(v3).toBe("123")
    expect(a.slice).toBe("1")
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
test("json",()=>{
    // parse json doesn't support null

    let json_integer = "123457890"
    let json_float = "0.88787"
    let json_string = `"he'\\\"llo"`
    let json_true = "true"
    let josn_array = "[1,2, true,\"3\"]" as const
    let josn_obj = `{"key":1,"arr":["a",true,1],"obj":{"a":"a"}}`

    let parseBool : ParseF<boolean> = fmap(
        orP(equal("true"),equal("false")),
        a=> a == "true"
    )

    let pb = parse(parseBool,json_true)
    if(pb.status != "SUCCESS") return expect().fail("bool failed")
    expect(pb.value).toBe(true)
    
    let parseString: ParseF<string> = fmap(
        composeP(
            equal("\""),
            many(orP(equal("\\\""),notEqual("\""))),
            equal("\"")
        ),
        xs => xs[1].join("")
    )

    let ps = parse(parseString,json_string)
    if(ps.status != "SUCCESS") return expect().fail("string failed")
    expect(ps.value).toBe("he'\\\"llo")

    let pn = parse(numberF,json_float)
    if(pn.status != "SUCCESS") return expect().fail("number failed")
    expect(pn.value).toBe(0.88787)
    pn = parse(numberF,json_integer)
    if(pn.status != "SUCCESS") return expect().fail("number failed")
    expect(pn.value).toBe(123457890)

    type Basic = boolean | string | number
    let basic_p = orP<Basic>(parseBool,parseString,numberF)

    type Value = Basic | Object | Value []
    let parseList = (): ParseF<Value[]> => {
        let all_p = orP<Value>(basic_p,{fn: parseList},{fn:parseObject})
        return fmap(
            composeP(
                equal("]"),
                spaces,
                // 最后一项数据
                optional(composeP(all_p,spaces)),
                many(composeP(equal(","),spaces,all_p,spaces)),
                equal("[")
            ),
            ([_1,_2,last,list]) => {
                let r = list.map(a=>a[2])
                if(last) {
                    r.push(last[0])
                }
                return r
            }
        )
    }
    
    // Object
    let parseObject = ():ParseF<Object> =>  {
        let all_p = orP<Value>(basic_p,parseList(),{fn:parseObject})
        let pairs = fmap(composeP(
            all_p,
            spaces,
            equal(":"),
            spaces,
            parseString,
            spaces,
        ),x=> [x[4],x[0]] as const)
        return fmap(
            composeP(
                equal("}"),
                spaces,
                optional(pairs),
                many(composeP(
                    equal(","),
                    spaces,
                    pairs
                )),
                equal("{"),
                spaces
            ),
            ([_1,_2,last,list]) => {
                let obj = {} as any
                for(let [,,pair] of list) {
                    obj[pair[0]] = pair[1]
                }
                if(last) {
                    obj[last[0]] = last[1]
                }
                return obj
            }
        )
    }

    let pa = parse({fn:parseList},josn_array)
    if(pa.status != "SUCCESS") return expect().fail("List failed")
    expect(pa.value).toEqual([ 1, 2, true, "3" ])

    pa = parse({fn:parseList},"[  ]")
    if(pa.status != "SUCCESS") return expect().fail("empty list failed")
    expect(pa.value).toBeEmpty()

    // 嵌套
    pa = parse({fn:parseList},"[true,22,[4,false,\"----\",[],[8,[]]]  ]")
    if(pa.status != "SUCCESS") return expect().fail("empty list failed")
    expect(pa.value).toBeArray()


    let obj = parse(parseObject(),josn_obj)
    if(obj.status != "SUCCESS") return expect().fail("Object failed")
    expect(obj.value).toEqual(JSON.parse(josn_obj))

    let josn_p = orP<Value>(parseBool,parseString,numberF,parseList(),parseObject())
    let v = simpleParse(josn_p,"11")
    expect(v).toBe(11)
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
