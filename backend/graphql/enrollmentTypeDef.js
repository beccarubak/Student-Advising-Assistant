const { gql } = require("apollo-server");

const enrollmentTypeDefs = gql`
    type Enrollment {
        id: ID!
        student: Student!
        course: Course!
        term: String!
        grade: String
        status: String
    }
     type CourseEnrollmentSummary {
        courseId: ID!
        courseName: String!
        totalEnrolled: Int!
    }
    enum EnrollmentStatus {
        Enrolled
        Completed
        Dropped
    }

    extend type Query {
        getEnrollments: [Enrollment]
        getStudentEnrollments(studentId: ID!): [Enrollment]
        getCourseEnrollmentSummary: [CourseEnrollmentSummary]
    }

    extend type Mutation {
        enrollStudent(
            studentId: ID!
            courseId: ID!
            term: String!
        ): Enrollment
        
        updateEnrollmentStatus(
            enrollmentId: ID!
            status: EnrollmentStatus!
            grade: String
        ): Enrollment
    }
`;

module.exports = enrollmentTypeDefs;