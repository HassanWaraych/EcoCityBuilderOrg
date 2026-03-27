describe("Dashboard", () => {
  /* ------------------------------------------------------------------ */
  /*  Auth guard                                                         */
  /* ------------------------------------------------------------------ */
  describe("authentication guard", () => {
    it("redirects to login page when not authenticated", () => {
      cy.clearLocalStorage();
      cy.visit("/dashboard");
      cy.url().should("include", "/auth/login");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Authenticated dashboard                                            */
  /* ------------------------------------------------------------------ */
  describe("authenticated user", () => {
    beforeEach(() => {
      cy.createTestUser();
      cy.visit("/dashboard");
    });

    it("displays the player username in the heading", () => {
      cy.get(".route-title").should("contain.text", "your city ledger is ready");
    });

    it("shows a Log out button", () => {
      cy.contains("button", "Log out").should("be.visible");
    });

    it("displays the New session form with city name and difficulty", () => {
      cy.get(".section-title").should("contain.text", "New session");
      cy.get('input[name="cityName"]').should("be.visible");
      cy.get('select[name="difficulty"]').should("be.visible");
      cy.contains("button", "Start game").should("be.visible");
    });

    it("shows difficulty options: Easy, Normal, Hard", () => {
      cy.get('select[name="difficulty"]').children("option").should("have.length", 3);
      cy.get('select[name="difficulty"]').select("easy").should("have.value", "easy");
      cy.get('select[name="difficulty"]').select("normal").should("have.value", "normal");
      cy.get('select[name="difficulty"]').select("hard").should("have.value", "hard");
    });

    it("shows Total games and Best score stats", () => {
      cy.contains("strong", "Total games").should("be.visible");
      cy.contains("strong", "Best score").should("be.visible");
    });

    it("shows the Sessions section", () => {
      cy.get(".section-title").should("contain.text", "Sessions");
    });

    it("shows Achievements section", () => {
      cy.get(".section-title").should("contain.text", "Achievements");
    });

    it("shows Score history table with correct headers", () => {
      cy.get(".section-title").should("contain.text", "Score history");
      cy.get("table thead th").should("contain.text", "City");
      cy.get("table thead th").should("contain.text", "Status");
      cy.get("table thead th").should("contain.text", "Score");
      cy.get("table thead th").should("contain.text", "Tier");
    });

    it("logs out when Log out button is clicked", () => {
      cy.contains("button", "Log out").click();
      cy.url().should("eq", Cypress.config("baseUrl") + "/");
    });

    it("after logout, visiting /dashboard redirects to login", () => {
      cy.contains("button", "Log out").click();
      cy.visit("/dashboard");
      cy.url().should("include", "/auth/login");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Session creation                                                   */
  /* ------------------------------------------------------------------ */
  describe("creating a game session", () => {
    beforeEach(() => {
      cy.createTestUser();
      cy.visit("/dashboard");
    });

    it("creates a new session and navigates to the game page", () => {
      cy.get('input[name="cityName"]').clear().type("Cypress City");
      cy.get('select[name="difficulty"]').select("normal");
      cy.contains("button", "Start game").click();

      cy.url().should("include", "/game/");
      cy.get(".route-title").should("contain.text", "Cypress City");
    });

    it("shows the created session in the Sessions list after going back", () => {
      cy.get('input[name="cityName"]').clear().type("Listed City");
      cy.contains("button", "Start game").click();
      cy.url().should("include", "/game/");

      cy.contains("a", "Dashboard").click();
      cy.url().should("include", "/dashboard");

      cy.contains("strong", "Listed City").should("be.visible");
      cy.contains(".muted", "active").should("be.visible");
    });
  });
});
