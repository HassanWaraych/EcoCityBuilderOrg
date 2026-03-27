const API_URL = "http://localhost:4000/api/v1";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Register a new user via the API and store auth in localStorage. */
      apiRegister(username: string, email: string, password: string): Chainable<void>;
      /** Log in via the API and store auth in localStorage. */
      apiLogin(email: string, password: string): Chainable<void>;
      /** Register a user via the UI form and assert redirect to /dashboard. */
      uiRegister(username: string, email: string, password: string): Chainable<void>;
      /** Log in via the UI form and assert redirect to /dashboard. */
      uiLogin(email: string, password: string): Chainable<void>;
      /** Generate a unique test user and register via API. Returns { username, email, password }. */
      createTestUser(): Chainable<{ username: string; email: string; password: string }>;
    }
  }
}

Cypress.Commands.add("apiRegister", (username: string, email: string, password: string) => {
  cy.request("POST", `${API_URL}/auth/register`, { username, email, password }).then(
    (response) => {
      window.localStorage.setItem("ecocity_token", response.body.token);
      window.localStorage.setItem("ecocity_player", JSON.stringify(response.body.player));
    },
  );
});

Cypress.Commands.add("apiLogin", (email: string, password: string) => {
  cy.request("POST", `${API_URL}/auth/login`, { email, password }).then((response) => {
    window.localStorage.setItem("ecocity_token", response.body.token);
    window.localStorage.setItem("ecocity_player", JSON.stringify(response.body.player));
  });
});

Cypress.Commands.add("uiRegister", (username: string, email: string, password: string) => {
  cy.visit("/auth/register");
  cy.get('input[name="username"]').type(username);
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.contains("button", "Register").click();
  cy.url().should("include", "/dashboard");
});

Cypress.Commands.add("uiLogin", (email: string, password: string) => {
  cy.visit("/auth/login");
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.contains("button", "Log in").click();
  cy.url().should("include", "/dashboard");
});

Cypress.Commands.add("createTestUser", () => {
  const id = Date.now();
  const user = {
    username: `testuser_${id}`,
    email: `test_${id}@ecocity.com`,
    password: "TestPass123!",
  };
  cy.apiRegister(user.username, user.email, user.password);
  return cy.wrap(user);
});

export {};
