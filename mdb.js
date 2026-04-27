const { MongoClient, ServerApiVersion } = require("mongodb");

let client;
let database;

async function connectMongo() {
  if (database) return database;

  client = new MongoClient(process.env.MONGO_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await client.connect();
  database = client.db("TriMergeIQ");

  console.log("✅ Successfully connected to MongoDB!");
  return database;
}

module.exports = connectMongo;