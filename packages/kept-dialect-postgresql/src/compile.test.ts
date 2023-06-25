import { describe, it, expect } from 'vitest'
import compile from './index'
import * as builder from '@donothing/kept-core/dist/builder'

describe('Compiling to PostgreSQL dialect', () => {
  it('compiles what you would expect', () => {
    const query = builder.empty()
      .where(dog => dog.get('name').like('Fido%'))
      .and(dog => dog.get('weight').lt(10))
      .offset(20).limit(10)
      .orderBy(dog => dog.id(), 'desc')

    expect(compile(query)).toMatchInlineSnapshot(`
      [
        "SELECT id, json 
      FROM objects
      WHERE json->>$1 LIKE $2
      AND json->>$3 < $4
      ORDER BY objects.id DESC
      LIMIT $5 OFFSET $6",
        "name",
        "Fido%",
        "weight",
        10,
        10,
        20,
      ]
    `)
  })
})