# Why you probably don't want to use kept

Kept is an experiment, you shouldn't use it for any serious business.

It doesn't have thousands of developer hours in it, I don't offer support to users.

Performance-wise, it's in a bad middle ground. You should either:
1. Define an actual schema and use a SQL database
2. Use a Key/Value Store or Document store that can optimise queries

SQLite's optimiser can't really do much with the schema I'm using or with json based
queries in general as far as I know.

## Why SQLite?

I'm using SQLite as my backing store for two reasons.

I like SQLite, it's fun to work with and there's good tools around it

The environment that I work in already uses sqlite and it's one of
very few binary packages we use. Each binary dependency adds more likelihood
that a build will fail somewhere and I'll get a message on discord. So I don't
want to add more.

## Why would I write this at all?

I want to investigate the hypothesis that we don't need to teach schemas and relationships
before students are able to productively use an datastore in their apps.

They can learn about saving records and loading them, filtering etc, and if they
end up stopping there... they still have a skillset that lets them achieve many
things on their own.

Then ... we can teach them to use a RDBMS as a sophisticated tool for performance sensitive
work and scalable design.

## Also, for fun!

It was fun to write, and I had fun writing it