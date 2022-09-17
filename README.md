```
888    d8P                 888    
888   d8P                  888    
888  d8P                   888    
888d88K     .d88b. 88888b. 888888 
8888888b   d8P  Y8b888 "88b888    
888  Y88b  88888888888  888888    
888   Y88b Y8b.    888 d88PY88b.  
888    Y88b "Y8888 88888P"  "Y888 
                   888            
                   888            
                   888
```

## Kept: a database for puppies

Kept builds a toy object store on top of sqlite3.

You probably don't want to use this for your serious project. [Here's why](./doc/Why-not.md).

```javascript
import { Store } from '@donothing/kept'

const store = Store('puppies.db')

// insert a new object, and get an id back that you
// can use to retrieve it
const id = await store.add({ name: 'Rover', breed: 'Alsatian' })

// get an object that has previously been stored
const rover = await store.get(id)

// update an existing object or create a new object at a specific ID
await store.put(id, { ...rover, weight: 540 })

// Atomically update an existing object. This is relatively slow and
// can fail in high-concurrency.
await store.update(id, (dog) => {
  return {
    ...dog,
    name: 'Fido'
  }
})

// delete a specific object from the store
await store.delete(id)

// get all the objects where a specific property has the given value
const alsatians = await store.findBy('breed', 'Alsatian')

// just gimme all the objects
const puppers = await store.all()

// we're done here
await store.close()
```

## Complex queries

To do more complex queries, call `.query(build)` with a function build
that takes a query builder and returns a querybuilder.

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
    .where(dog => dog.get('breed').eq('Alsatian'))
    .orderBy(dog => dog.get('weight'), 'asc')
    .offset(3) // start at the 4th result
    .limit(5) // return up to 5 results
)
```