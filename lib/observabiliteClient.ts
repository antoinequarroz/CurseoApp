export interface ClientObservabilite {
  addBreadcrumb(breadcrumb: {
    category: string;
    level: 'info' | 'warning';
    message: string;
    data?: Record<string, unknown>;
  }): void;
  captureException(error: Error, contexte: { tags: Record<string, string> }): void;
}

let client: ClientObservabilite | null = null;

export function enregistrerClientObservabilite(nouveauClient: ClientObservabilite | null): void {
  client = nouveauClient;
}

export function obtenirClientObservabilite(): ClientObservabilite | null {
  return client;
}
