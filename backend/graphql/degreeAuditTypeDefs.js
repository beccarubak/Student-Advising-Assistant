const { gql } = require("apollo-server-express");

const degreeProgramTypeDefs = gql`
    type DegreeAudit {
        totalCreditsRequired: Int!
        creditsCompleted: Int!
        creditsRemaining: Int!
        completedCourses: [Course]
        remainingCourses: [Course]
    }

    extend type Query {
        getDegreeAudit(studentId: ID!): DegreeAudit
    }
`;

module.exports = degreeProgramTypeDefs;