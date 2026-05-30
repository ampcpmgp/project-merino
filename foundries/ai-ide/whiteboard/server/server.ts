import { Hocuspocus } from '@hocuspocus/server'
import { SQLite } from '@hocuspocus/extension-sqlite'

const PORT = process.env.PORT || 3102

const server = new Hocuspocus({
  port: PORT,

  async onConnect() {
    console.log(`[${new Date().toISOString()}] Client connected`)
  },

  async onDisconnect() {
    console.log(`[${new Date().toISOString()}] Client disconnected`)
  },

  async onStoreDocument({ documentName }) {
    console.log(`[${new Date().toISOString()}] Document stored: ${documentName}`)
  },

  extensions: [
    new SQLite({
      database: './db.sqlite',
    }),
  ],
})

console.log(`Hocuspocus server starting on port ${PORT}...`)
server.listen()
console.log(`Hocuspocus server running on http://localhost:${PORT}`)
console.log('SQLite persistence enabled: ./db.sqlite')
