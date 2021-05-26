const originalGitHubWorkspace = process.env["GITHUB_WORKSPACE"];
const originalGitHubRepository = process.env["GITHUB_REPOSITORY"];

beforeEach(() => {
  delete process.env["GITHUB_WORKSPACE"];
  delete process.env["GITHUB_REPOSITORY"];
});

afterAll(() => {
  delete process.env["GITHUB_WORKSPACE"];
  process.env["GITHUB_WORKSPACE"] = originalGitHubWorkspace;

  delete process.env["GITHUB_REPOSITORY"];
  process.env["GITHUB_REPOSITORY"] = originalGitHubRepository;
});
