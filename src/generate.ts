function generateType(n:number) {
    if(n < 2) {
        console.log("error < 2 ")
        return
    }
    if(n > 26) {
        console.log("error > 26")
        return
    }
    let entries = [] as [string,string,string] []
    let i = 0
    while(i< n) {
        let name = String.fromCharCode('a'.charCodeAt(0) + i)
        entries.push([name,name+"k",name+"v"])
        i++
    }
    let type_var_list = [] as string []
    let parameter_list = [] as string []
    let return_type_list_a = [] as string []
    let return_type_list_b = [] as string []
    for(let [name,k,v] of entries) {
        type_var_list.push(`${k} extends string, ${v}`)
        parameter_list.push(`${name}: [${k},ParseF<${v}>]`)
        return_type_list_a.push(k)
        return_type_list_b.push(`key extends ${k} ? ${v} :`)
    }

    console.log(`
export function pipeO<
    ${type_var_list.join(",\n    ")}
>(
    ${parameter_list.join(",\n    ")}
): ParseF<{
    [key in Exclude<${return_type_list_a.join("|")}, "">]:
        ${return_type_list_b.join("\n        ")}
        never
}>
`.trim())
}
for(let i = 2; i<18;i++) {
    generateType(i)
}