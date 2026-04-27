const http = require("http");
const app = require("./server");
const { run } = require("./server");
const PORT = process.env.PORT || 3000;  

const server = http.createServer(app);

server.listen(PORT, () => {
    run().catch(console.dir);
  console.log(`✅ Server running on http://localhost:${PORT}`);
});