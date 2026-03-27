describe("Game Play", () => {
  beforeEach(() => {
    cy.createTestUser();
    cy.visit("/dashboard");

    cy.get('input[name="cityName"]').clear().type("E2E City");
    cy.get('select[name="difficulty"]').select("normal");
    cy.contains("button", "Start game").click();
    cy.url().should("include", "/game/");
  });

  /* ------------------------------------------------------------------ */
  /*  Page structure                                                     */
  /* ------------------------------------------------------------------ */
  describe("game page layout", () => {
    it("displays the city name and turn counter", () => {
      cy.get(".route-title").should("contain.text", "E2E City");
      cy.get(".small-kicker").should("contain.text", "Turn 1 of 15");
    });

    it("displays all 6 metric cards in the HUD", () => {
      cy.get(".hud .metric-card").should("have.length", 6);
      cy.get(".hud").should("contain.text", "Happiness");
      cy.get(".hud").should("contain.text", "Env Health");
      cy.get(".hud").should("contain.text", "Economy");
      cy.get(".hud").should("contain.text", "Carbon");
      cy.get(".hud").should("contain.text", "Budget");
      cy.get(".hud").should("contain.text", "Population");
    });

    it("renders a 10×10 city grid (100 tile buttons)", () => {
      cy.get(".city-grid .tile-button").should("have.length", 100);
    });

    it("shows the Zones sidebar with zone options", () => {
      cy.get(".sidebar-card").should("contain.text", "Zones");
      cy.get(".sidebar-card").should("contain.text", "Residential");
      cy.get(".sidebar-card").should("contain.text", "Commercial");
      cy.get(".sidebar-card").should("contain.text", "Green Space");
      cy.get(".sidebar-card").should("contain.text", "Solar Farm");
    });

    it("shows the Infrastructure sidebar with infrastructure options", () => {
      cy.get(".sidebar-card").should("contain.text", "Infrastructure");
      cy.get(".sidebar-card").should("contain.text", "Road Network");
      cy.get(".sidebar-card").should("contain.text", "Public Transit");
      cy.get(".sidebar-card").should("contain.text", "Wind Turbine");
    });

    it("shows the Proposals section", () => {
      cy.get(".sidebar-card").should("contain.text", "Proposals");
      cy.get(".proposal-card").should("have.length.at.least", 1);
    });

    it("shows a Resolve turn button", () => {
      cy.contains("button", "Resolve turn").should("be.visible");
    });

    it("has Dashboard and Results navigation links", () => {
      cy.contains("a", "Dashboard").should("be.visible");
      cy.contains("a", "Results").should("be.visible");
    });

    it("shows Queued 0/3 initially", () => {
      cy.get(".pill").should("contain.text", "Queued 0/3");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Tile selection                                                     */
  /* ------------------------------------------------------------------ */
  describe("tile interaction", () => {
    it("selects a tile when clicked", () => {
      cy.get(".city-grid .tile-button").first().click();
      cy.get('.city-grid .tile-button[data-selected="true"]').should("have.length", 1);
    });

    it("changes selection when a different tile is clicked", () => {
      cy.get(".city-grid .tile-button").eq(0).click();
      cy.get(".city-grid .tile-button").eq(0).should("have.attr", "data-selected", "true");

      cy.get(".city-grid .tile-button").eq(5).click();
      cy.get(".city-grid .tile-button").eq(5).should("have.attr", "data-selected", "true");
      cy.get(".city-grid .tile-button").eq(0).should("have.attr", "data-selected", "false");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Queuing actions                                                    */
  /* ------------------------------------------------------------------ */
  describe("queuing build actions", () => {
    it("queues a zone action after selecting a tile", () => {
      cy.get(".city-grid .tile-button").first().click();
      cy.get(".sidebar-card .action-card").contains("Residential").click();

      cy.get(".pill").should("contain.text", "Queued 1/3");
      cy.get(".history-list").should("contain.text", "residential");
    });

    it("allows queueing up to 3 actions", () => {
      cy.get(".city-grid .tile-button").eq(0).click();
      cy.get(".sidebar-card .action-card").contains("Residential").click();

      cy.get(".city-grid .tile-button").eq(1).click();
      cy.get(".sidebar-card .action-card").contains("Green Space").click();

      cy.get(".city-grid .tile-button").eq(2).click();
      cy.get(".sidebar-card .action-card").contains("Residential").click();

      cy.get(".pill").should("contain.text", "Queued 3/3");
    });

    it("shows error when queueing without selecting a tile", () => {
      cy.get(".sidebar-card .action-card").contains("Residential").click();
      cy.get(".error-text").should("contain.text", "Select a tile first");
    });

    it("removes a queued action when Remove is clicked", () => {
      cy.get(".city-grid .tile-button").first().click();
      cy.get(".sidebar-card .action-card").contains("Residential").click();
      cy.get(".pill").should("contain.text", "Queued 1/3");

      cy.contains("button", "Remove").click();
      cy.get(".pill").should("contain.text", "Queued 0/3");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Project decisions                                                  */
  /* ------------------------------------------------------------------ */
  describe("project decisions", () => {
    it("highlights Approve button when clicked", () => {
      cy.get(".proposal-card").first().within(() => {
        cy.contains("button", "Approve").click();
        cy.contains("button", "Approve").should("have.class", "btn");
      });
    });

    it("highlights Reject button when clicked", () => {
      cy.get(".proposal-card").first().within(() => {
        cy.contains("button", "Reject").click();
        cy.contains("button", "Reject").should("have.class", "btn");
      });
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Turn resolution                                                    */
  /* ------------------------------------------------------------------ */
  describe("resolving a turn", () => {
    it("shows error if proposals are not decided before resolving", () => {
      cy.contains("button", "Resolve turn").click();
      cy.get(".error-text").should("contain.text", "Approve or reject both proposals");
    });

    it("resolves a turn successfully and advances turn counter", () => {
      cy.get(".proposal-card").each(($card) => {
        cy.wrap($card).within(() => {
          cy.contains("button", "Reject").click();
        });
      });

      cy.contains("button", "Resolve turn").click();

      cy.get(".small-kicker").should("contain.text", "Turn 2 of 15");
      cy.get(".success-text").should("contain.text", "Turn resolved");
      cy.get(".pill").should("contain.text", "Queued 0/3");
    });

    it("resolves a turn with a queued zone action", () => {
      cy.get(".city-grid .tile-button").first().click();
      cy.get(".sidebar-card .action-card").contains("Residential").click();
      cy.get(".pill").should("contain.text", "Queued 1/3");

      cy.get(".proposal-card").each(($card) => {
        cy.wrap($card).within(() => {
          cy.contains("button", "Approve").click();
        });
      });

      cy.contains("button", "Resolve turn").click();

      cy.get(".small-kicker").should("contain.text", "Turn 2 of 15");
    });

    it("updates budget metric after building a zone", () => {
      cy.get(".hud .metric-card").contains("Budget").parent().find("strong").invoke("text").then((initialBudget) => {
        cy.get(".city-grid .tile-button").first().click();
        cy.get(".sidebar-card .action-card").contains("Residential").click();

        cy.get(".proposal-card").each(($card) => {
          cy.wrap($card).within(() => {
            cy.contains("button", "Reject").click();
          });
        });

        cy.contains("button", "Resolve turn").click();
        cy.get(".small-kicker").should("contain.text", "Turn 2 of 15");

        cy.get(".hud .metric-card").contains("Budget").parent().find("strong").invoke("text").then((newBudget) => {
          expect(newBudget).not.to.eq(initialBudget);
        });
      });
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Navigation                                                         */
  /* ------------------------------------------------------------------ */
  describe("navigation from game page", () => {
    it("navigates to dashboard via Dashboard link", () => {
      cy.contains("a", "Dashboard").click();
      cy.url().should("include", "/dashboard");
    });

    it("navigates to results via Results link", () => {
      cy.contains("a", "Results").click();
      cy.url().should("include", "/results");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Results page                                                       */
  /* ------------------------------------------------------------------ */
  describe("results page", () => {
    it("displays session results with metrics and decision history", () => {
      cy.get(".proposal-card").each(($card) => {
        cy.wrap($card).within(() => {
          cy.contains("button", "Reject").click();
        });
      });
      cy.contains("button", "Resolve turn").click();
      cy.get(".small-kicker").should("contain.text", "Turn 2 of 15");

      cy.contains("a", "Results").click();
      cy.url().should("include", "/results");

      cy.get(".route-title").should("contain.text", "E2E City");
      cy.contains("Status:").should("be.visible");
      cy.get(".hud .metric-card").should("have.length", 6);
      cy.get(".section-title").should("contain.text", "Decision history");
      cy.get("table thead th").should("contain.text", "Turn");
      cy.get("table thead th").should("contain.text", "Action");
      cy.get("table thead th").should("contain.text", "Cost");
      cy.get("table tbody tr").should("have.length.at.least", 1);
    });

    it("has a Back to dashboard link", () => {
      cy.contains("a", "Results").click();
      cy.contains("a", "Back to dashboard").should("be.visible");
      cy.contains("a", "Back to dashboard").click();
      cy.url().should("include", "/dashboard");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Auth guard on game page                                            */
  /* ------------------------------------------------------------------ */
  describe("authentication guard", () => {
    it("redirects to login if not authenticated", () => {
      cy.clearLocalStorage();
      cy.visit("/game/some-fake-session-id");
      cy.url().should("include", "/auth/login");
    });
  });
});
