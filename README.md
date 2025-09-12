# myparser
A high-performance, lightweight, and flexible TypeScript library focused on parsing custom-format strings—whether for simple text extraction or precise parsing of complex formats, it delivers a concise and efficient solution.

## Features

- **Pure function**: 每一个解析都是一个简单纯函数，无副作用，解析逻辑可预测、易测试，且支持函数式组合。
- **Zero dependencies**：纯 Typescript 实现，无任何第三方依赖，体积轻量（打包后 < 3.3KB），避免依赖冲突与版本兼容问题。
- **Cross-platform**: 只使用 String 上的标准函数，可无缝运行于浏览器、Node.js、Deno 等所有 JavaScript 运行时，无需适配不同环境。
- **Compose**： 丰富的解析器组合能力（如composeP串联解析步骤、orP多选分支、before在固定的片段内解析），解析逻辑可拆分为细粒度函数，复用性最大化。
- **Type safe**: 所有核心函数均通过 TypeScript 泛型严格约束输入输出类型，解析结果自动推导类型，避免运行时类型错误，IDE 可提供完整类型提示
- **Slice-based efficiency**： 核心解析逻辑均基于slice实现，直接操作字符串片段而非逐个字符处理，确保 token 解析与字符串切割的高性能，尤其在处理超长字符串时保持线性时间复杂度。

## Quick start

### Installation

通过`npm` 或 `bun` 安装
```zsh
bun add @diqye/myparser
```

```zsh
npm install --save @diqye/myparser
```

## 解析出`n 1`这样的数字
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
API 功能详情参考 [./index.tes.ts](src/index.test.ts)

```zsh
src/index.test.ts:
✓ space               解析单个空白字符
✓ spaces [0.02ms]     解析并去除起始位置的空白字符
✓ anychar [0.03ms]    解析任意单个字符
✓ search [0.06ms]     搜索指定字符串，匹配后从匹配位置继续解析后续内容
✓ composeP [0.05ms]   组合多个解析函数，按右结合顺序执行并返回结果元组
✓ bind [0.07ms]       基于前序解析结果动态转换解析流程
✓ fmap [0.02ms]       映射转换解析成功的结果值
✓ many [0.07ms]       重复解析直至失败，返回所有成功结果的列表
✓ orP [0.08ms]        按顺序尝试`解析函数`，返回首个成功的解析结果
✓ equal [0.02ms]      解析与参数完全匹配的字符串
✓ breakToEnd          直接跳转至字符串末尾
✓ endOfInput [0.04ms] 验证当前位置是否为输入末尾
✓ before              解析指定内容前的字符串片段
✓ json [0.93ms]       JSON 格式解析功能测试
✓ simple [0.13ms]     
```