const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request(path: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      ...options.headers as Record<string, string>
    };

    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

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

  async post(path: string, body?: any) {
    if (body === undefined) {
      return this.request(path, { method: 'POST' });
    }
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

  async hasKey(): Promise<boolean> {
    const response = await this.get('/api/settings/has-key');
    const data = await response.json();
    return data.has_key;
  }

  async validateKey(value: string): Promise<{ valid: boolean; error?: string }> {
    const response = await this.post('/api/settings/validate-key', { value });
    return response.json();
  }

  async saveSetting(key: string, value: string) {
    return this.post('/api/settings', { key, value });
  }

  async deleteSetting(key: string) {
    return this.delete(`/api/settings/${key}`);
  }

  async getSetting(key: string) {
    const response = await this.get(`/api/settings/${key}`);
    return response.json();
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
