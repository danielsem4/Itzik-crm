import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { Users } from "lucide-react";
import { renderWithProviders } from "@/test/render";
import { PageHeader } from "./PageHeader";
import { DetailList, DetailRow } from "./DetailList";
import { StatCard } from "./StatCard";

describe("PageHeader", () => {
  it("renders an h1, description and actions", () => {
    renderWithProviders(
      <PageHeader title="Sources" description="All docs" actions={<button>Upload</button>} />
    );
    expect(screen.getByRole("heading", { level: 1, name: "Sources" })).toBeInTheDocument();
    expect(screen.getByText("All docs")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument();
  });
});

describe("DetailRow", () => {
  it("renders label/value pairs and an em dash for empty values", () => {
    renderWithProviders(
      <DetailList>
        <DetailRow label="Email">a@b.co</DetailRow>
        <DetailRow label="Phone">{null}</DetailRow>
      </DetailList>
    );
    expect(screen.getByText("Email").nextSibling).toHaveTextContent("a@b.co");
    expect(screen.getByText("Phone").nextSibling).toHaveTextContent("—");
  });
});

describe("StatCard", () => {
  it("renders label, value and hint", () => {
    renderWithProviders(<StatCard icon={Users} label="Total" value={42} hint="On this page" />);
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("On this page")).toBeInTheDocument();
  });
});
