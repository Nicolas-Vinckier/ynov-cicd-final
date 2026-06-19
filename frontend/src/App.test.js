import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import App from "./App";

describe("App Component", () => {
  beforeEach(() => {
    global.fetch.mockClear();
  });

  it("renders the header title and key dashboard cards", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await act(async () => {
      render(<App />);
    });

    expect(
      screen.getByText("Plateforme de Suivi de Métriques"),
    ).toBeInTheDocument();
    expect(screen.getByText("Total Métriques")).toBeInTheDocument();
    expect(screen.getByText("Ajouter une Métrique")).toBeInTheDocument();
    expect(screen.getByText("Journal des Métriques")).toBeInTheDocument();
  });

  it("displays loading state initially and then shows metrics and stats", async () => {
    const mockMetrics = [
      { id: 2, value: 30, timestamp: "19/06/2026 08:00:00" },
      { id: 1, value: 10, timestamp: "19/06/2026 07:00:00" },
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetrics,
    });

    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("20.00")).toBeInTheDocument();
    expect(screen.getAllByText("30")).toHaveLength(2);

    expect(screen.getByText("19/06/2026 08:00:00")).toBeInTheDocument();
    expect(screen.getByText("19/06/2026 07:00:00")).toBeInTheDocument();
  });

  it("displays error message if fetching metrics fails", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
    });

    await act(async () => {
      render(<App />);
    });

    expect(
      screen.getByText(/Erreur lors de la récupération des métriques/),
    ).toBeInTheDocument();
  });

  it("shows validation error when submitting empty value", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await act(async () => {
      render(<App />);
    });

    const submitButton = screen.getByText("Envoyer");

    await act(async () => {
      fireEvent.click(submitButton);
    });
    expect(
      screen.getByText("Veuillez entrer une valeur numérique valide"),
    ).toBeInTheDocument();
  });

  it("successfully submits a new metric, updates stats and prepends it to the list", async () => {
    const initialMetrics = [
      { id: 1, value: 10, timestamp: "19/06/2026 07:00:00" },
    ];
    const newMetric = { id: 2, value: 20, timestamp: "19/06/2026 08:00:00" };

    // Fetch call on mount
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => initialMetrics,
    });

    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("10.00")).toBeInTheDocument();

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => newMetric,
    });

    const input = screen.getByPlaceholderText("Valeur (ex: 23.5)");
    const form = input.closest("form");

    await act(async () => {
      fireEvent.change(input, { target: { value: "20" } });
    });

    await act(async () => {
      fireEvent.submit(form);
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[1][1].method).toBe("POST");

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("15.00")).toBeInTheDocument();
    expect(screen.getAllByText("20")).toHaveLength(2);
  });

  it("displays error if submitting a metric fails", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await act(async () => {
      render(<App />);
    });

    global.fetch.mockResolvedValueOnce({
      ok: false,
    });

    const input = screen.getByPlaceholderText("Valeur (ex: 23.5)");
    const form = input.closest("form");

    await act(async () => {
      fireEvent.change(input, { target: { value: "45" } });
    });

    await act(async () => {
      fireEvent.submit(form);
    });

    expect(
      screen.getByText("Erreur lors de l'enregistrement de la métrique"),
    ).toBeInTheDocument();
  });
});
