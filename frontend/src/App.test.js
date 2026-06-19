import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

const renderAppWithMetrics = async metrics => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => metrics,
  });

  await act(async () => {
    render(<App />);
  });
};

describe('App Component', () => {
  beforeEach(() => {
    global.fetch.mockClear();
    jest.restoreAllMocks();
  });

  it('renders the header title, dashboard cards, filters and empty chart state', async () => {
    await renderAppWithMetrics([]);

    expect(screen.getByText('Plateforme de Suivi de Métriques')).toBeInTheDocument();
    expect(screen.getByText('Total Métriques')).toBeInTheDocument();
    expect(screen.getByText('Ajouter une Métrique')).toBeInTheDocument();
    expect(screen.getByText('Filtres')).toBeInTheDocument();
    expect(screen.getByText('Graphique')).toBeInTheDocument();
    expect(screen.getByText('Journal des Métriques')).toBeInTheDocument();
    expect(screen.getByText('Le graphique apparaîtra après la première métrique.')).toBeInTheDocument();
    expect(screen.getByText('Aucune métrique enregistrée pour le moment.')).toBeInTheDocument();
  });

  it('displays metrics, stats, groups and chart when data is returned', async () => {
    const mockMetrics = [
      { id: 2, value: 30, timestamp: '2026-06-19T08:00:00.000Z', group: 'infra' },
      { id: 1, value: 10, timestamp: '2026-06-19T07:00:00.000Z', group: 'production' },
    ];

    await renderAppWithMetrics(mockMetrics);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('20.00')).toBeInTheDocument();
    expect(screen.getAllByText('30')).toHaveLength(2);
    expect(screen.getAllByText('infra').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('production').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText('Courbe des dernières métriques')).toBeInTheDocument();
  });

  it('keeps an unreadable timestamp as-is when formatting the list', async () => {
    await renderAppWithMetrics([
      { id: 1, value: 10, timestamp: 'date illisible', group: null },
    ]);

    expect(screen.getByText('date illisible')).toBeInTheDocument();
    expect(screen.getAllByText('general').length).toBeGreaterThanOrEqual(1);
  });

  it('displays error message if fetching metrics fails', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });

    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText(/Erreur lors de la récupération des métriques/)).toBeInTheDocument();
  });

  it('shows validation error when submitting empty value', async () => {
    await renderAppWithMetrics([]);

    await act(async () => {
      fireEvent.click(screen.getByText('Envoyer'));
    });

    expect(screen.getByText('Veuillez entrer une valeur numérique valide')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('shows validation error when submitting a custom group that is too long', async () => {
    await renderAppWithMetrics([]);

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Valeur numérique'), { target: { value: '42' } });
      fireEvent.change(screen.getByLabelText('Groupe personnalisé'), { target: { value: 'x'.repeat(81) } });
      fireEvent.click(screen.getByText('Envoyer'));
    });

    expect(screen.getByText('Veuillez entrer un groupe valide de 80 caractères maximum')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('successfully submits a new metric with a selected group', async () => {
    const newMetric = { id: 2, value: 20, timestamp: '2026-06-19T08:00:00.000Z', group: 'qualite' };

    await renderAppWithMetrics([
      { id: 1, value: 10, timestamp: '2026-06-19T07:00:00.000Z', group: 'general' },
    ]);

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => newMetric,
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Valeur numérique'), { target: { value: '20' } });
      fireEvent.change(screen.getByLabelText('Groupe de saisie'), { target: { value: 'qualite' } });
      fireEvent.click(screen.getByText('Envoyer'));
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[1][0]).toBe('/api/metrics');
    expect(global.fetch.mock.calls[1][1].method).toBe('POST');
    expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({
      value: 20,
      timestamp: expect.any(String),
      group: 'qualite',
    });
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('15.00')).toBeInTheDocument();
    expect(screen.getAllByText('qualite').length).toBeGreaterThanOrEqual(1);
  });

  it('successfully submits a new metric with a custom group and then clears the custom group input', async () => {
    const newMetric = { id: 1, value: 55, timestamp: '2026-06-19T08:00:00.000Z', group: 'business' };

    await renderAppWithMetrics([]);

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => newMetric,
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Valeur numérique'), { target: { value: '55' } });
      fireEvent.change(screen.getByLabelText('Groupe personnalisé'), { target: { value: 'business' } });
      fireEvent.click(screen.getByText('Envoyer'));
    });

    expect(JSON.parse(global.fetch.mock.calls[1][1].body).group).toBe('business');
    expect(screen.getByLabelText('Groupe personnalisé')).toHaveValue('');
    expect(screen.getAllByText('business').length).toBeGreaterThanOrEqual(1);
  });

  it('displays error if submitting a metric fails', async () => {
    await renderAppWithMetrics([]);

    global.fetch.mockResolvedValueOnce({ ok: false });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Valeur numérique'), { target: { value: '45' } });
      fireEvent.click(screen.getByText('Envoyer'));
    });

    expect(screen.getByText("Erreur lors de l'enregistrement de la métrique")).toBeInTheDocument();
  });

  it('applies numeric, date and group filters through the API query string', async () => {
    await renderAppWithMetrics([
      { id: 1, value: 10, timestamp: '2026-06-19T07:00:00.000Z', group: 'infra' },
    ]);

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 2, value: 30, timestamp: '2026-06-20T07:00:00.000Z', group: 'infra' },
      ],
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Valeur min.'), { target: { value: '20' } });
      fireEvent.change(screen.getByLabelText('Valeur max.'), { target: { value: '40' } });
      fireEvent.change(screen.getByLabelText('Date début'), { target: { value: '2026-06-01' } });
      fireEvent.change(screen.getByLabelText('Date fin'), { target: { value: '2026-06-30' } });
      fireEvent.change(screen.getByLabelText('Groupe', { selector: '#filterGroup' }), { target: { value: 'infra' } });
      fireEvent.click(screen.getByText('Filtrer'));
    });

    expect(global.fetch.mock.calls[1][0]).toContain('/api/metrics?');
    expect(global.fetch.mock.calls[1][0]).toContain('minValue=20');
    expect(global.fetch.mock.calls[1][0]).toContain('maxValue=40');
    expect(global.fetch.mock.calls[1][0]).toContain('startDate=2026-06-01');
    expect(global.fetch.mock.calls[1][0]).toContain('endDate=2026-06-30');
    expect(global.fetch.mock.calls[1][0]).toContain('group=infra');
    await waitFor(() => expect(screen.getAllByText('30').length).toBeGreaterThanOrEqual(1));
  });

  it('resets filters and fetches the complete metric list', async () => {
    await renderAppWithMetrics([]);

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Valeur min.'), { target: { value: '10' } });
      fireEvent.click(screen.getByText('Réinitialiser'));
    });

    expect(screen.getByLabelText('Valeur min.')).toHaveValue(null);
    expect(global.fetch.mock.calls[1][0]).toBe('/api/metrics');
  });

  it('does not clear the database when the confirmation is rejected', async () => {
    await renderAppWithMetrics([
      { id: 1, value: 10, timestamp: '2026-06-19T07:00:00.000Z', group: 'general' },
    ]);
    jest.spyOn(window, 'confirm').mockReturnValue(false);

    await act(async () => {
      fireEvent.click(screen.getByText('Nettoyer la DB'));
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText('10').length).toBeGreaterThanOrEqual(1);
  });

  it('clears metrics from the frontend when the cleanup API call succeeds', async () => {
    await renderAppWithMetrics([
      { id: 1, value: 10, timestamp: '2026-06-19T07:00:00.000Z', group: 'general' },
    ]);
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ deletedCount: 1 }) });

    await act(async () => {
      fireEvent.click(screen.getByText('Nettoyer la DB'));
    });

    expect(global.fetch.mock.calls[1]).toEqual(['/api/metrics', { method: 'DELETE' }]);
    expect(screen.getByText('Aucune métrique enregistrée pour le moment.')).toBeInTheDocument();
  });

  it('displays an error when database cleanup fails', async () => {
    await renderAppWithMetrics([
      { id: 1, value: 10, timestamp: '2026-06-19T07:00:00.000Z', group: 'general' },
    ]);
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    global.fetch.mockResolvedValueOnce({ ok: false });

    await act(async () => {
      fireEvent.click(screen.getByText('Nettoyer la DB'));
    });

    expect(screen.getByText('Erreur lors du nettoyage de la base')).toBeInTheDocument();
  });

  it('correctly toggles the light and dark theme and persists it', async () => {
    window.localStorage.clear();
    await renderAppWithMetrics([]);

    const toggleButton = screen.getByLabelText('Changer le thème');
    
    // Default is dark theme
    expect(document.body.classList.contains('light-theme')).toBe(false);
    expect(window.localStorage.getItem('theme')).toBe('dark');

    // Switch to light theme
    await act(async () => {
      fireEvent.click(toggleButton);
    });
    expect(document.body.classList.contains('light-theme')).toBe(true);
    expect(window.localStorage.getItem('theme')).toBe('light');

    // Switch back to dark theme
    await act(async () => {
      fireEvent.click(toggleButton);
    });
    expect(document.body.classList.contains('light-theme')).toBe(false);
    expect(window.localStorage.getItem('theme')).toBe('dark');
  });

  it('initializes with light theme if stored in localStorage', async () => {
    window.localStorage.setItem('theme', 'light');
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await act(async () => {
      render(<App />);
    });

    expect(document.body.classList.contains('light-theme')).toBe(true);
  });
});
