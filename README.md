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

Some obvious features that are not supported:

- order by 
- paging (skip x limit y)
- atomic updates
- querying by multiple properties `store.findBy({ breed: 'Alsation', weight: 99 })`
- querying with `like`, `>=` and other comparisons 

I will probably never implement these, and really you should use something like [lmdb](https://www.npmjs.com/package/lmdb)