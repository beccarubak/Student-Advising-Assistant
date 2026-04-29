const { gql } = require("apollo-server");

const chatInteractionTypeDefs = gql`
    type ChatInteraction {
        id: ID!
        studentId: ID!
        question: String!
        response: String!
        createdAt: String!
    }
    extend type Mutation{
        askQuestion(question: String!): String
    }
`;

module.exports = chatInteractionTypeDefs;