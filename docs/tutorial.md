# myparser 教程

**用函数组合，写一个完整 JSON 解析器**

这篇教程将通过一个**完整可运行的 `parseJson` 实例**，带你理解 myparser 的核心思想、常用组合子，以及如何把“看似复杂的语法”拆解成**小而可组合的 parser**。

如果你曾经：

* 被正则写到怀疑人生
* 手写字符串索引总是 off-by-one
* 想要类型安全却只能靠注释

那你来对地方了。

---

## 1. myparser 的基本模型

在 myparser 中，一切解析逻辑都遵循同一个模型：

```ts
type ParseF<T> = (token: string) => Parser<T>
```

一个 parser：

* **输入**：当前剩余字符串（token）
* **输出**：

  * 成功：返回解析值 + 剩余字符串
  * 失败：返回错误信息

也就是说，parser **不仅返回结果，还推进输入**。

---

## 2. 最简单的 parser：`equal`

我们从最小的例子开始。

```ts
import { parse, equal } from "@diqye/myparser";

parse(equal("hello"), "hello world");
// => "hello"
```

发生了什么？

* `equal("hello")` 匹配输入的前缀
* 成功后：

  * `value = "hello"`
  * `slice = " world"`

你不需要手动维护索引，parser 会自动推进。

---

## 3. 组合 parser：`pipeP`

单个 parser 很弱，**组合才是力量**。

```ts
pipeP(p1, p2, p3)
```

含义是：

> 顺序执行 p1 → p2 → p3
> 每一步都使用上一步剩余的 token

比如：

```ts
pipeP(
  equal("{"),
  equal("}")
)
```

这就是一个 `{}` parser。

---

## 4. JSON 的第一步：定义值类型

```ts
type ObjectValue = { [k: string]: Value };
type Value =
  | null
  | string
  | boolean
  | number
  | ObjectValue
  | Value[];
```

我们的目标是写出一个：

```ts
ParseF<Value>
```

---

## 5. 基础 JSON 值解析

### 5.1 `null`

```ts
const nullF = fmap(equal("null"), () => null);
```

* `equal("null")` 匹配字符串
* `fmap` 把 `"null"` 映射成 `null`

---

### 5.2 boolean

```ts
const booleanF = fmap(
  orP(equal("true"), equal("false")),
  v => v === "true"
);
```

* `orP`：尝试多个 parser，返回第一个成功的
* `fmap`：把字符串转成 boolean

---

### 5.3 number

```ts
const numberF = numberF;
```

（myparser 已内置 JSON 风格数字解析）

---

## 6. 字符串：第一次遇到递归结构

```ts
const stringF = fmap(
  pipeP(
    equal('"'),
    manyTill(
      orP(
        fmap(equal('\\"'), () => '"'),
        anyChar
      ),
      equal('"')
    )
  ),
  xs => xs[1].join("")
);
```

逐层拆解：

* `equal('"')`：吃掉开头引号
* `manyTill`：

  * 不断解析字符
  * 直到遇到结尾 `"`
* 支持转义 `\"`
* `fmap` 把字符数组拼成字符串

📌 **关键点**：
`manyTill` 强制要求“结束符必须出现”，这让字符串解析天然是安全的。

---

## 7. 递归：array 和 object

### 7.1 array

```ts
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
  xs => xs[2]
);
```

要点：

* `sepBy(p, ",")`：解析逗号分隔列表
* `valueF` 是递归引用（注意用 `{ fn: () => valueF }` 延迟求值）
* 自动处理空格

---

### 7.2 object

```ts
const keyValueF = pipeO(
  ["key", stringF],
  ["", spaces],
  ["", equal(":")],
  ["", spaces],
  ["value", bind({ fn: () => valueF }, pure)]
);
```

这里引入了一个非常重要的工具：

### `pipeO`：**结构化输出**

```ts
pipeO(
  ["key", parserA],
  ["value", parserB]
)
```

直接产出：

```ts
{ key: ..., value: ... }
```

而不是数组下标地狱。

完整 object parser：

```ts
const objectF = fmap(
  pipeP(
    equal("{"),
    spaces,
    sepBy(keyValueF, equal(",")),
    spaces,
    equal("}")
  ),
  pairs => {
    const obj: ObjectValue = {};
    for (const kv of pairs[2]) {
      obj[kv.key] = kv.value;
    }
    return obj;
  }
);
```

---

## 8. 最关键的一步：递归 Value

```ts
let valueF: ParseF<Value> = orP(
  nullF,
  booleanF,
  numberF,
  stringF,
  arrayF,
  objectF
);
```

这就是完整 JSON 语义的中心。

---

## 9. 顶层解析 + EOF 校验

```ts
export function parseJson(token: string): Value {
  return parse(
    fmap(
      pipeP(spaces, valueF, spaces, endOfInput),
      x => x[1]
    ),
    token
  );
}
```

* 自动忽略首尾空白
* `endOfInput` 保证没有多余字符
* `parse`：失败直接 throw，适合业务代码

---

## 10. 使用示例

```ts
parseJson('{"a": [1, 2, true]}');
// => { a: [1, 2, true] }
```

---

## 11. 你刚刚学会了什么？

* parser ≠ 正则，而是 **推进输入的纯函数**
* 复杂语法 = 小 parser 的组合
* 递归结构完全可控、可读、可类型推导
* `pipeP` 控制流程
* `pipeO` 控制结构
* `manyTill` / `sepBy` 解决 90% 文法问题
