describe("Authentication", () => {
  /* ------------------------------------------------------------------ */
  /*  Registration                                                       */
  /* ------------------------------------------------------------------ */
  describe("Registration Page", () => {
    beforeEach(() => {
      cy.visit("/auth/register");
    });

    it("displays the registration form with all fields", () => {
      cy.get(".route-title").should("contain.text", "Start your planning profile");
      cy.get('input[name="username"]').should("be.visible");
      cy.get('input[name="email"]').should("be.visible");
      cy.get('input[name="password"]').should("be.visible");
      cy.contains("button", "Register").should("be.visible");
    });

    it("has a link to the login page", () => {
      cy.contains("a", "Log in").should("have.attr", "href", "/auth/login");
    });

    it("registers a new user and redirects to dashboard", () => {
      const id = Date.now();
      cy.get('input[name="username"]').type(`newuser_${id}`);
      cy.get('input[name="email"]').type(`newuser_${id}@ecocity.com`);
      cy.get('input[name="password"]').type("SecurePass123");
      cy.contains("button", "Register").click();

      cy.url().should("include", "/dashboard");
      cy.get(".route-title").should("contain.text", `newuser_${id}`);
    });

    it("shows an error for duplicate username/email", () => {
      const id = Date.now();
      const username = `dupuser_${id}`;
      const email = `dup_${id}@ecocity.com`;

      cy.apiRegister(username, email, "SecurePass123");
      cy.visit("/auth/register");

      cy.get('input[name="username"]').type(username);
      cy.get('input[name="email"]').type(email);
      cy.get('input[name="password"]').type("SecurePass123");
      cy.contains("button", "Register").click();

      cy.get(".error-text").should("be.visible");
      cy.get(".error-text").should("contain.text", "already exists");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Login                                                              */
  /* ------------------------------------------------------------------ */
  describe("Login Page", () => {
    const loginId = Date.now();
    const loginEmail = `logintest_${loginId}@ecocity.com`;
    const loginPassword = "SecurePass123";

    before(() => {
      cy.apiRegister(`logintest_${loginId}`, loginEmail, loginPassword);
      cy.clearLocalStorage();
    });

    beforeEach(() => {
      cy.visit("/auth/login");
    });

    it("displays the login form with all fields", () => {
      cy.get(".route-title").should("contain.text", "Resume the city");
      cy.get('input[name="email"]').should("be.visible");
      cy.get('input[name="password"]').should("be.visible");
      cy.contains("button", "Log in").should("be.visible");
    });

    it("has a link to the registration page", () => {
      cy.contains("a", "Register").should("have.attr", "href", "/auth/register");
    });

    it("logs in with valid credentials and redirects to dashboard", () => {
      cy.get('input[name="email"]').type(loginEmail);
      cy.get('input[name="password"]').type(loginPassword);
      cy.contains("button", "Log in").click();

      cy.url().should("include", "/dashboard");
    });

    it("shows an error for wrong password", () => {
      cy.get('input[name="email"]').type(loginEmail);
      cy.get('input[name="password"]').type("WrongPassword99");
      cy.contains("button", "Log in").click();

      cy.get(".error-text").should("be.visible");
      cy.get(".error-text").should("contain.text", "Invalid email or password");
    });

    it("shows an error for non-existent email", () => {
      cy.get('input[name="email"]').type("nobody@ecocity.com");
      cy.get('input[name="password"]').type("SomePassword1");
      cy.contains("button", "Log in").click();

      cy.get(".error-text").should("be.visible");
    });
  });
});
