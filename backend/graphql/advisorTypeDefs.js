const { gql } = require("apollo-server");

const advisorTypeDefs = gql`
  type Advisor {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
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
  }
`;

module.exports = advisorTypeDefs;
