
let global_name = "myparser"

console.log("Removing dist dir")
await Bun.$`rm -rf dist`

console.log("Building dist/esm")
await Bun.build({
    outdir: "dist/esm",
    format: "esm",
    sourcemap: true,
    packages: "bundle",
    minify: true,
    entrypoints: ["src/index.ts"]
})

console.log("Building dist/types")
await Bun.$`tsc -p tsconfig.build.json`

// console.log("Building dist/iife")
// 打包一个自执行文件
// Bun 不支持 iife 导出一个全局变量，目前
// 自己实现一个globalName
// 最后放弃 iife 了
// let global_plugin: Bun.BunPlugin = {
//     name: "global",
//     setup: function (build: Bun.PluginBuilder): void | Promise<void> {
//     }
// }
// await Bun.build({
//     outdir: "dist/iife",
//     format: "iife",
//     packages: "bundle",
//     plugins: [],
//     entrypoints: ["src/index.ts"]
// })

