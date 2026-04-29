require("dotenv").config();

const { ApolloServer } = require("apollo-server");
const mongoose = require("mongoose");
const typeDefs = require("./graphql");
const { resolvers } = require("./graphql/resolvers");
const jwt = require("jsonwebtoken");

const MONGO_URI = process.env.MONGO_URI;

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) return {};

    try {
      const token = authHeader.replace("Bearer ", "");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      return { studentId: decoded.studentId };
    } catch {
      return {};
    }
  },
});

// Connect to MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Start Server
server.listen({ port: 4000 }).then(({ url }) => {
  console.log(` Server ready at ${url}`);
});
