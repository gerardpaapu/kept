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

Kept builds a little object store on top of sqlite3.

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

A predicate function is passed an object with utility functions and
a value representing each object in the store.

```js
const doggos = await store.query(
  dogs => dogs
    .where(($, obj) => $.eq($.get(obj, 'breed'), $.val('Alsatian')))
)
```

That syntax is a bit heavy, so we provide helper functions to do most
of the same types of queries.

```js
import { equal } from '@donothing/kept'

const doggos = await store.query(
  dogs => dogs.where(equal('breed', 'Alsatian'))
)
```

additional clauses can be added by chaining `.where(...)` or `.and(...)`

```js
import { equal } from '@donothing/kept'

const doggos = await store.query(
  dogs => dogs
    .where(equal('breed', 'Alsatian'))
    .and(equal('weight', 35))
)
```

### Comparisons

```js
import { equal, greaterThan, lessThan, like } from '@donothing/kept'

// all objects with a weight equal to 4
($, obj) => $.eq($.get(obj, 'weight'), $.val(4)))
equal('weight', 4)

// all objects with a weight greater than 4
($, obj) => $.gt($.get(obj, 'weight'), $.val(4)))
greaterThan('weight', 4)

// all objects with a weight less than 4
($, obj) => 
lessThan('weight', 4)

// all objects with a name that starts with 'F'
($, obj) => $.like($.get(obj, 'name'), 'F%')
like('name', 'F%')
```

### Boolean operations

Truth values can be combined in the normal ways using
`.and(...)`, `.or(...)` and `.not(...)`.

```js
import { and, or, not } from '@donothing/kept'

// all objects with a weight less than 4
// AND a name starting wtih 'F'
($, obj) => $.and(
  $.lt($.get(obj, 'weight'), $.val(4)),
  $.like($.get(obj, 'name'), 'F%')
)

and(
  lessThan('weight', 4),
  like('name', 'F%')
)

// all objects with a weight less than 4
// OR a name starting wtih 'F'
($, obj) => $.or(
  $.lt($.get(obj, 'weight'), $.val(4)),
  $.like($.get(obj, 'name'), 'F%')
)

or(
  lessThan('weight', 4),
  like('name', 'F%')
)

// all objects where the name does NOT start
// with 'F'
($, obj) => $.not($.like($.get(obj, 'name'), 'F%'))
not(like('name', 'F%'))
```

### Values

The second parameter to a predicate is a `TValue`. Values can be
extracted from a value with `$.get(...)`. The id for the record 
can be gotten as `$.id()`, and `$.val(...)` introduces literal numbers
or strings.

```js
// get the id for this record
($, obj) => $.id()

// gets the property 'foo' on obj
($, obj) => $.get(obj, 'foo')

// numbers or strings can be used when wrapped in
// $.val(...)
($, obj) => $.val('some text')
($, obj) => $.val(99)
```

### Any

The `$.any(...)` method allows you to inspect each item
of an array property.

```js
// matches objects like { ingredients: ['Sugar', 'Flour', 'Eggs'] }
($, obj) => $.any(
  $.get(obj, 'ingredients'), 
  ingredient => $.like(ingredient, 'Sugar'))
```

## Order by

`orderBy` uses a subset of the query DSL that returns TValues, the second argument must
be either `'asc'` or `'desc'`

```js
import { equal, prop } from '@donothing/kept'

const doggos = await store.query(
  dogs => dogs
    .where(($, obj) => $.eq($.get(obj, 'breed'), 'Alsatian'))
    .orderBy(($, obj) => $.get(obj, 'weight'), 'asc')
)
```

... or the equivalent with helpers

```js
import { equal, prop } from '@donothing/kept'

const doggos = await store.query(
  dogs => dogs
    .where(equal('breed', 'Alsatian'))
    // the first parameter should be a field of the object 
    // the second parameter should be 'asc' or 'desc'
    .orderBy(prop('weight'), 'asc')
)

```