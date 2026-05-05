const { gql } = require("apollo-server");

const advisorTypeDefs = gql`
  type Advisor {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    phone: String
    createdAt: String
  }

  input AdvisorInput {
    firstName: String!
    lastName: String!
    email: String!
  }

  extend type Query {
    getAdvisors: [Advisor]
    getAdvisor(id: ID!): Advisor
  }

  extend type Mutation {
    createAdvisor(input: AdvisorInput!): Advisor
    updateAdvisor(id: ID!, input: AdvisorInput!): Advisor
    deleteAdvisor(id: ID!): Boolean
    updateMyAdvisorProfile(email: String, phone: String): Advisor
  }
`;

module.exports = advisorTypeDefs;
