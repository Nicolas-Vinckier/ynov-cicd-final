import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

const renderWithFetch = async (payload = []) => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => payload,
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.queryByText('Chargement des métriques...')).not.toBeInTheDocument();
  });
};

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the header title and key dashboard cards', async () => {
    await renderWithFetch();

    expect(screen.getByText('Plateforme de Suivi de Métriques')).toBeInTheDocument();
    expect(screen.getByText('Total Métriques')).toBeInTheDocument();
    expect(screen.getByText('Ajouter une Métrique')).toBeInTheDocument();
    expect(screen.getByText('Journal des Métriques')).toBeInTheDocument();
  });

  it('renders metrics and computed statistics', async () => {
    await renderWithFetch([
      { id: 2, value: 30, timestamp: '2026-06-15T12:01:00.000Z' },
      { id: 1, value: 10, timestamp: '2026-06-15T12:00:00.000Z' },
    ]);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('20.00')).toBeInTheDocument();
    expect(screen.getAllByText('30')).toHaveLength(2);
    expect(screen.getByText('2026-06-15T12:00:00.000Z')).toBeInTheDocument();
  });

  it('submits a new metric and prepends it to the journal', async () => {
    await renderWithFetch();
    jest.useFakeTimers().setSystemTime(new Date('2026-06-15T12:30:00.000Z'));

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 3, value: 42, timestamp: '2026-06-15T12:30:00.000Z' }),
    });

    fireEvent.change(screen.getByLabelText('Valeur de la métrique'), { target: { value: '42' } });
    fireEvent.click(screen.getByText('Envoyer'));

    await waitFor(() => {
      expect(screen.getAllByText('42')).toHaveLength(2);
    });

    expect(global.fetch).toHaveBeenLastCalledWith('/api/metrics', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ value: 42, timestamp: '2026-06-15T12:30:00.000Z' }),
    }));
    expect(screen.getByLabelText('Valeur de la métrique')).toHaveValue(null);
  });

  it('shows a validation error when the submitted value is invalid', async () => {
    await renderWithFetch();

    fireEvent.change(screen.getByLabelText('Valeur de la métrique'), { target: { value: '' } });
    fireEvent.click(screen.getByText('Envoyer'));

    expect(screen.getByRole('alert')).toHaveTextContent('Veuillez entrer une valeur numérique valide');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('shows a loading error when metrics cannot be fetched', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Erreur: Erreur lors de la récupération des métriques');
    });
  });

  it('shows a submit error when the API rejects the metric', async () => {
    await renderWithFetch();

    global.fetch.mockResolvedValueOnce({ ok: false });

    fireEvent.change(screen.getByLabelText('Valeur de la métrique'), { target: { value: '12' } });
    fireEvent.click(screen.getByText('Envoyer'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent("Erreur lors de l'enregistrement de la métrique");
    });
  });
});
