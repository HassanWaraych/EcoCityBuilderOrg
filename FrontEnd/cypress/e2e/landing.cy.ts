describe("Landing Page", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("displays the hero section with game title", () => {
    cy.get(".hero-title").should("be.visible");
    cy.get(".hero-title").should("contain.text", "Build a city");
  });

  it("displays the UN SDG 11 kicker", () => {
    cy.get(".small-kicker").should("contain.text", "UN SDG 11");
  });

  it("displays the game description", () => {
    cy.get(".hero-copy").should("contain.text", "turn-based planning game");
  });

  it("has a Register button that links to /auth/register", () => {
    cy.contains("a", "Register").should("have.attr", "href", "/auth/register");
  });

  it("has a Log in button that links to /auth/login", () => {
    cy.contains("a", "Log in").should("have.attr", "href", "/auth/login");
  });

  it("navigates to register page when Register is clicked", () => {
    cy.contains("a", "Register").click();
    cy.url().should("include", "/auth/register");
  });

  it("navigates to login page when Log in is clicked", () => {
    cy.contains("a", "Log in").click();
    cy.url().should("include", "/auth/login");
  });

  it("shows the core loop section with 3 action cards", () => {
    cy.get(".action-card").should("have.length", 3);
    cy.get(".action-card").eq(0).should("contain.text", "Build up to three actions");
    cy.get(".action-card").eq(1).should("contain.text", "Review development proposals");
    cy.get(".action-card").eq(2).should("contain.text", "Respond to events");
  });
});
