const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request(path: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    return response;
  }

  async get(path: string) {
    return this.request(path);
  }

  async post(path: string, body: any) {
    return this.request(path, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async put(path: string, body: any) {
    return this.request(path, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async delete(path: string) {
    return this.request(path, { method: 'DELETE' });
  }

  getWsUrl() {
    const wsBase = API_BASE.replace('http', 'ws');
    return `${wsBase}/ws/chat?token=${this.token}`;
  }

  getBaseUrl() {
    return API_BASE;
  }
}

export const apiClient = new ApiClient();
