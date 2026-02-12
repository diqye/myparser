import {P} from "../src/index"
import {expect, test} from "bun:test"

test("simple",()=>{
    const r = P.equal("hello")
    .semiBind(P.spaces())
    .semiBind(P.equal("world"))
    .map(x=>x.toUpperCase())
    .run("hello  world")

    expect(r).toBe("WORLD")
})
test("semiBindKey",()=>{
    const a = P.number().map(n=>({num:n}))
    .semiBindKey("hello",P.equal("null"))
    .semiBindKey("a",P.take(1))
    .semiBindKey("b",P.breakToEnd())
    .run("1000null111232")
    expect(a).toEqual({
        num: 1000,
        hello: "null",
        a: "1",
        b: "11232",
    })
})
test("P json",() => {
    const json_integer = "123457890"
    const json_float = "0.88787"
    const json_string = `"he'\\"llo"`
    const json_true = "true"
    const josn_array = "[1,2, true,\"3\"]" as const
    const josn_obj = `{\n"key":1,"arr":["a",true,\n1,[1,2]],"obj":{"a":"a"}}`

    expect(parseJson(json_true)).toBe(true)
    
    expect(parseJson(json_string)).toBe("he'\"llo")

    expect(parseJson(json_integer)).toBe(123457890)
    expect(parseJson(json_float)).toBe(0.88787)

    expect(parseJson(josn_array)).toEqual([ 1, 2, true, "3" ])

    expect(parseJson("[ ]")).toBeEmpty()

    expect(parseJson("[true,22,[4,false,\"----\",[],[8,[]]]  ]")).toBeArray()

    expect(parseJson(josn_obj)).toEqual(JSON.parse(josn_obj))
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
    // const nullF = fmap(equal("null"),()=>null)
    const nullP = P.equal("null").map(()=>null)

    // const booleanF = fmap(orP(equal("true"),equal("false")),a=>a =="true")
    const booleanP = P.equal("true").or(P.equal("false")).map(a=>a == "true")

    // const stringF = fmap(
    //     pipeP(
    //         equal('"'),
    //         manyTill(
    //             orP(fmap(equal('\\"'),a=>'"'),anyChar),
    //             equal('"')
    //         )
    //     ),
    //     xs => xs[1].join("")
    // )

    const stringP = P.equal('"').semiBind(
        P.equal('\\"').map(()=>'"').or(P.take(1))
        .manyTill(P.equal('"')).map(xs=>xs.join(""))
    )
    
    // const arrayF = fmap(
    //     pipeP(
    //         equal("["),
    //         spaces,
    //         sepBy(
    //             fmap({ fn: () => composeP(spaces, valueF, spaces) }, x => x[1]),
    //             equal(",")
    //         ),
    //         spaces,
    //         equal("]")
    //     ),
    // xs => xs[2])

    const arrayP = P.equal("[")
    .semiBind(P.spaces())
    .bind(()=>{
        return P.spaces()
        .semiBind(valueP)
        .semiBindTap(P.spaces())
        .sepBy(P.equal(","))
    })
    .semiBindTap(P.spaces())
    .semiBindTap(P.equal("]"))


    // const keyValueF = pipeO(
    //     ["key", stringF],
    //     ["", spaces],
    //     ["", equal(":")],
    //     ["", spaces],
    //     ["value", bind({fn:()=>valueF},pure)]
    // )
    const keyValueP = stringP.bind(key=>{
        return P.spaces()
        .semiBind(P.equal(":"))
        .semiBind(P.spaces())
        .semiBind(valueP)
        .map(value =>{
            return {key,value}
        })
    })
    // const keyValueListF = fmap(
    //     pipeP(
    //         equal("{"),
    //         spaces,
    //         sepBy( keyValueF, equal(",")),
    //         spaces, equal("}")
    //     ),
    //     xs => xs[2])
    // const objectF = fmap(keyValueListF,keyValueList=>{
    //     const obj : ObjectValue = {}
    //     for(const kv of keyValueList) {
    //         obj[kv.key] = kv.value
    //     }
    //     return obj
    // })
    const objectP = P.equal("{")
    .semiBind(P.spaces())
    .semiBind(keyValueP.sepBy(P.equal(",")))
    .semiBindTap(P.spaces())
    .semiBindTap(P.equal("}"))
    .map(xs=>{
        const obj : ObjectValue = {}
        for(const kv of xs) {
            obj[kv.key] = kv.value
        }
        return obj
    })

    // let valueF: ParseF<Value> = orP<Value>(
    //     nullF,
    //     booleanF,
    //     numberF,
    //     stringF,
    //     arrayF,
    //     objectF
    // )

    const valueP:P<Value> = nullP
    .or(booleanP)
    .or(P.number())
    .or(stringP)
    .or(arrayP)
    .or(objectP)

    // return parse(
    //     fmap(
    //         pipeP(spaces,valueF,spaces,endOfInput),
    //         x=>x[1]
    //     ),
    //     token
    // )

    return P.spaces().semiBind(valueP).semiBindTap(P.spaces()).semiBindTap(P.endOfInput()).run(token)
}