# myparser 教程

**用链式调用，写一个完整 JSON 解析器**

这篇教程将通过一个**完整可运行的 `parseJson` 实例**，带你理解 myparser 的核心思想、常用方法，以及如何把“看似复杂的语法”拆解成**小而可链式调用的 parser**。

如果你曾经：

* 被正则写到怀疑人生
* 手写字符串索引总是 off-by-one
* 想要类型安全却只能靠注释

那你来对地方了。

---

## 1. myparser 的基本模型

在 myparser 中，一切解析逻辑都围绕 `P` 类展开：

```ts
class P<T> {
  // 静态工厂方法
  static equal(str: string): P<string>
  static number(): P<number>
  static take(n: number): P<string>
  // ...

  // 链式操作方法
  map<X>(fn: (v: T) => X): P<X>
  bind<X>(fn: (a: T) => P<X>): P<X>
  semiBind<X>(p: P<X>): P<X>
  or<X>(p: P<X>): P<T | X>
  many(): P<T[]>
  // ...

  // 执行方法
  run(token: string): T
  safeRun(token: string): Parser<T>
}
```

一个 `P<T>` 实例代表一个**解析器**，它：

* **输入**：当前剩余字符串（token）
* **输出**：
  * 成功：返回解析值 + 剩余字符串
  * 失败：返回错误信息

也就是说，parser **不仅返回结果，还推进输入**。

---

## 2. 最简单的 parser：`P.equal`

我们从最小的例子开始。

```ts
import { P } from "@diqye/myparser";

const result = P.equal("hello").run("hello world");
// => "hello"
```

发生了什么？

* `P.equal("hello")` 创建一个解析器，匹配输入的前缀
* `.run("hello world")` 执行解析
* 成功后：返回匹配的字符串 `"hello"`

你不需要手动维护索引，parser 会自动推进。

---

## 3. 链式调用：组合解析器

单个 parser 很弱，**链式调用才是力量**。

```ts
const result = P.equal("hello")
  .semiBind(P.spaces())
  .semiBind(P.equal("world"))
  .map(x => x.toUpperCase())
  .run("hello  world");

// => "WORLD"
```

含义是：

> 顺序执行 `equal("hello")` → `spaces()` → `equal("world")`
> 每一步都使用上一步剩余的 token

`map` 方法可以将解析结果进行转换。

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
P<Value>
```

---

## 5. 基础 JSON 值解析

### 5.1 `null`

```ts
const nullP = P.equal("null").map(() => null);
```

* `P.equal("null")` 匹配字符串
* `.map()` 把 `"null"` 映射成 `null`

---

### 5.2 boolean

```ts
const booleanP = P.equal("true")
  .or(P.equal("false"))
  .map(a => a === "true");
```

* `.or()`：尝试多个 parser，返回第一个成功的
* `.map()`：把字符串转成 boolean

---

### 5.3 number

```ts
const numberP = P.number();
```

（myparser 已内置 JSON 风格数字解析）

---

## 6. 字符串：第一次遇到递归结构

```ts
const stringP = P.equal('"')
  .semiBind(
    P.equal('\\"').map(() => '"')
      .or(P.take(1))
      .manyTill(P.equal('"'))
      .map(xs => xs.join(""))
  );
```

逐层拆解：

* `P.equal('"')`：吃掉开头引号
* `.manyTill(P.equal('"'))`：
  * 不断解析字符
  * 直到遇到结尾 `"`
* 支持转义 `\"`
* `.map()` 把字符数组拼成字符串

📌 **关键点**：
`manyTill` 强制要求“结束符必须出现”，这让字符串解析天然是安全的。

---

## 7. 递归：array 和 object

### 7.1 array

```ts
const arrayP = P.equal("[")
  .semiBind(P.spaces())
  .bind(() => {
    return P.spaces()
      .semiBind(valueP)
      .semiBindTap(P.spaces())
      .sepBy(P.equal(","))
  })
  .semiBindTap(P.spaces())
  .semiBindTap(P.equal("]"));
```

要点：

* `.sepBy(P.equal(","))`：解析逗号分隔列表
* `valueP` 是递归引用
* 自动处理空格

---

### 7.2 object

首先定义 key-value 对解析器：

```ts
const keyValueP = stringP.bind(key => {
  return P.spaces()
    .semiBind(P.equal(":"))
    .semiBind(P.spaces())
    .semiBind(valueP)
    .map(value => ({ key, value }));
});
```

这里引入了一个非常重要的工具：

### `.bind()`：**依赖前序结果的链式调用**

```ts
parserA.bind(a => parserB(a))
```

含义是：
> 先执行 parserA，得到结果 `a`，然后根据 `a` 决定执行哪个 parserB。

完整 object parser：

```ts
const objectP = P.equal("{")
  .semiBind(P.spaces())
  .semiBind(keyValueP.sepBy(P.equal(",")))
  .semiBindTap(P.spaces())
  .semiBindTap(P.equal("}"))
  .map(xs => {
    const obj: ObjectValue = {};
    for (const kv of xs) {
      obj[kv.key] = kv.value;
    }
    return obj;
  });
```

---

## 8. 最关键的一步：递归 Value

```ts
const valueP: P<Value> = nullP
  .or(booleanP)
  .or(P.number())
  .or(stringP)
  .or(arrayP)
  .or(objectP);
```

这就是完整 JSON 语义的中心。

---

## 9. 顶层解析 + EOF 校验

```ts
export function parseJson(token: string): Value {
  return P.spaces()
    .semiBind(valueP)
    .semiBindTap(P.spaces())
    .semiBindTap(P.endOfInput())
    .run(token);
}
```

* 自动忽略首尾空白
* `P.endOfInput()` 保证没有多余字符
* `.run()`：失败直接 throw，适合业务代码

---

## 10. 使用示例

```ts
parseJson('{"a": [1, 2, true]}');
// => { a: [1, 2, true] }
```

---

## 11. 你刚刚学会了什么？

* parser ≠ 正则，而是 **推进输入的对象**
* 复杂语法 = 小 parser 的链式调用
* 递归结构完全可控、可读、可类型推导
* `.bind()` 控制流程
* `.semiBindKey()` 控制结构
* `manyTill` / `sepBy` 解决 90% 文法问题

---

## 12. 其他常用方法

### 12.1 对象构建：`semiBindKey`

```ts
const result = P.number().map(n => ({ num: n }))
  .semiBindKey("hello", P.equal("null"))
  .semiBindKey("a", P.take(1))
  .semiBindKey("b", P.breakToEnd())
  .run("1000null111232");

// => { num: 1000, hello: "null", a: "1", b: "11232" }
```

### 12.2 可选解析：`optional`

```ts
const parser = P.equal("http")
  .optional()
  .semiBind(P.equal("://"));

parser.run("http://example.com"); // 成功
parser.run("://example.com");    // 成功（http 可选）
```

### 12.3 调试：`log`

```ts
const parser = P.equal("hello")
  .log("after hello")
  .semiBind(P.spaces())
  .log("after spaces")
  .semiBind(P.equal("world"));

parser.run("hello  world");
// 输出：
// after hello: "  world"
// after spaces: "world"
```

---

## 总结

通过这个教程，你已经掌握了 myparser 的核心思想：

1. **Parser 是对象**：每个解析逻辑都是 `P<T>` 类的实例
2. **链式调用表达流程**：`.semiBind()`, `.or()`, `.many()` 等方法自然地表达了解析流程
3. **类型安全**：TypeScript 会自动推断每个步骤的类型
4. **递归结构简单**：递归定义直接写，不需要复杂的延迟求值技巧
5. **代码可读性高**：解析逻辑一目了然，易于维护和调试

myparser 提供了强大而直观的 API，让你能够以声明式的方式构建复杂的解析器，同时保持代码的可读性和类型安全性。