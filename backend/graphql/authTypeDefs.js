const { gql } = require("apollo-server");

const authTypeDefs = gql`
    type AuthPayload {
        token: String!
    }
    extend type Mutation {
        login(email: String!): AuthPayload
    }
`;

module.exports = authTypeDefs;