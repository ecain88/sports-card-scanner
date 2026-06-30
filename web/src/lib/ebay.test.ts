import { describe, it, expect } from "vitest";
import { buildCardQuery, buildSoldCompsUrl, buildActiveListingsUrl } from "./ebay";

describe("buildCardQuery", () => {
  it("composes fields in a sensible order, skipping blanks", () => {
    const q = buildCardQuery({
      playerName: "Mike Trout",
      year: "2011",
      brand: "Topps",
      cardSet: "Update",
      cardNumber: "US175",
      variation: "",
    });
    expect(q).toBe("2011 Topps Update Mike Trout #US175");
  });

  it("normalizes a leading # on the card number", () => {
    const q = buildCardQuery({ playerName: "X", cardNumber: "#27" });
    expect(q).toBe("X #27");
  });

  it("collapses whitespace and skips empty fields", () => {
    const q = buildCardQuery({ playerName: "  Luka   Doncic ", brand: "" });
    expect(q).toBe("Luka Doncic");
  });
});

describe("buildSoldCompsUrl", () => {
  it("includes sold + completed filters and an encoded query", () => {
    const url = buildSoldCompsUrl("2011 Topps Update Mike Trout #US175");
    expect(url).toContain("https://www.ebay.com/sch/i.html?");
    expect(url).toContain("LH_Sold=1");
    expect(url).toContain("LH_Complete=1");
    expect(url).toContain("_nkw=2011+Topps+Update+Mike+Trout+%23US175");
  });
});

describe("buildActiveListingsUrl", () => {
  it("encodes the query without sold filters", () => {
    const url = buildActiveListingsUrl("Luka Doncic Prizm");
    expect(url).toContain("_nkw=Luka+Doncic+Prizm");
    expect(url).not.toContain("LH_Sold");
  });
});
