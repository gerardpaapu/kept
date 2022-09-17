# Writing complex queries

If you return the builder as-is, this is the equivalent of `.all()`

```js
const doggos = await store.query(dogs => dogs)
```

### Where clauses

You can filter down the results with `.where(predicate)` or the
equivalent `.and(predicate)`.

A predicate function is passed an object representing each record in the store
and returns a value that represents a boolean.

```js
const alsatians = await store.query(
  dogs => dogs
    .where(dog => dog.get('breed').eq('Alsatian'))
)
```

additional clauses can be added by chaining `.where(...)` or `.and(...)`

```js
const doggos = await store.query(
  dogs => dogs
    .where(dog => dog.get('breed').eq('Alsatian'))
    .and(dog => dog.get('weight').eq(35))
)
```

### Comparisons

on an expression, `.eq( )` can be passed a string or number, or another expression
and represents an equality comparison

```js
value.eq('something')
value.eq(12)
value.eq(value)
```

You can also use `.gt(...)` or `.lt(...)` for "greater than" or "less than" comparisons.

These either take a number or a second expression

```js
value.gt(4)
value.lt(2)
value.lt(value)
```

### Boolean operations

Truth values can be combined in the normal ways using
`.and(...)`, `.or(...)` and `.not()`.

```js
// all objects with a weight less than 4
// OR a name starting wtih 'F'
dog.get('weight').lt(4)
  .or(dog.get('name').like('F%'))

// all objects where the name does NOT start
// with 'F'
dog.get('name').not.like('F%') // these two expressions are equivalent
dog.get('name').like('F%').not()
```

### Values

You can get other values from an expression with `.get(property: string)` or `.id()`

```js
// get the id for this record
(obj) => obj.id()

// gets the property 'foo' on obj
(obj) => obj.get('foo')
```

### Any

The `.any(...)` method allows you to inspect each item
of an array property.

```js
// matches objects like { ingredients: ['Sugar', 'Flour', 'Eggs'] }
recipe =>
  recipe.get('ingredients').any(ingredient => ingredient.like('Sugar'))
```

## Order by

`orderBy` uses a subset of the query DSL that returns TValues, the second argument must
be either `'asc'` or `'desc'`.

```js
// get all alsatians, from lightest to heaviest
const doggos = await store.query(
  dogs => dogs
    .where(dog => dog.get('breed').eq('Alsatian'))
    // the first parameter should be some value derived from the object
    // the second parameter should be 'asc' or 'desc'
    .orderBy(dog => dog.get('weight'), 'asc')
)
```

## Limit and Offset

To get a partial result set, you can specify offset and limit

```js
import { equal, prop } from '@donothing/kept'

const doggos = await store.query(
  dogs => dogs
    .where(dog => dog.get('breed').eq('Alsatian'))pnpm 
    .orderBy(dog => dog.get('weight'), 'asc')
    .offset(3) // start at the 4th result
    .limit(5) // return up to 5 results
)
```