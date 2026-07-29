export const WorkspaceIssuesQuery = /* GraphQL */ `
  query WorkspaceIssues($slug: String!, $limit: Int) {
    workspace(slug: $slug) {
      id
      name
      slug
      teams {
        id
        key
        name
      }
      issues(limit: $limit) {
        id
        number
        title
        priority
        identifier
        createdAt
        status {
          id
          name
          color
        }
        team {
          id
          key
          name
        }
      }
    }
  }
`

export const IssueDetailQuery = /* GraphQL */ `
  query IssueDetail($id: ID!) {
    issue(id: $id) {
      id
      number
      title
      description
      descriptionDoc
      priority
      identifier
      createdAt
      updatedAt
      status {
        id
        name
        color
      }
      team {
        id
        key
        name
      }
    }
  }
`

export const ViewerQuery = /* GraphQL */ `
  query Viewer {
    viewer {
      id
      fullName
      email
      theme
      onboardingStep
    }
  }
`

export const IssueCreateMutation = /* GraphQL */ `
  mutation IssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      id
      identifier
      title
      number
    }
  }
`

export const IssueUpdateMutation = /* GraphQL */ `
  mutation IssueUpdate($input: IssueUpdateInput!) {
    issueUpdate(input: $input) {
      id
      identifier
      title
      number
      description
      descriptionDoc
      updatedAt
    }
  }
`
