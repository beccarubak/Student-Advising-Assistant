const { gql } = require("apollo-server-express");

const degreeProgramTypeDefs = gql`
    type DegreeAudit {
        totalCreditsRequired: Int!
        creditsCompleted: Int!
        creditsRemaining: Int!
        completedCourses: [Course]
        remainingCourses: [Course]
    }

    type NearGraduationReport {
        studentId: ID!
        firstName: String!
        lastName: String!
        email: String!
        programName: String!
        totalCreditsRequired: Int!
        creditsCompleted: Int!
        creditsRemaining: Int!
    }

    extend type Query {
        getDegreeAudit(studentId: ID!): DegreeAudit
        getStudentsNearingGraduation(threshold: Int): [NearGraduationReport]
    }
`;

module.exports = degreeProgramTypeDefs;