import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 300000, // 5 minutes timeout pour les gros fichiers
  maxContentLength: 500 * 1024 * 1024, // 500MB max
  maxBodyLength: 500 * 1024 * 1024, // 500MB max
});

// Function to parse a CSV file natively
export const parseCSV = (file: File): Promise<{ columns: string[], rows: number, data: any[] }> => {
  return new Promise((resolve, reject) => {
    console.log('Parsing CSV file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    // verify if file is empty
    if (file.size === 0) {
      console.error('File size is 0');
      reject(new Error('File is empty'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        console.log('File content length:', text?.length || 'undefined');

        // check if file content is empty
        if (!text || text.trim() === '') {
          console.error('File content is empty or whitespace only');
          reject(new Error('File content is empty'));
          return;
        }

        const lines = text.split('\n').filter(line => line.trim() !== '');
        console.log('Number of non-empty lines:', lines.length);

        if (lines.length === 0) {
          reject(new Error('No valid lines in file'));
          return;
        }

        // Parse lines handling quotes and commas
        const parseLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;

          for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }

          // add last field
          result.push(current.trim());
          return result;
        };

        // Parse first line for columns
        const headers = parseLine(lines[0]);
        console.log('Parsed headers:', headers);

        if (headers.length === 0) {
          reject(new Error('No columns found'));
          return;
        }

        // parse data
        const data: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = parseLine(lines[i]);
          if (values.length === headers.length) {
            const row: any = {};
            headers.forEach((header, index) => {
              row[header] = values[index];
            });
            data.push(row);
          }
        }

        console.log('Parsed data rows:', data.length);

        resolve({
          columns: headers,
          rows: data.length,
          data
        });

      } catch (error) {
        console.error('Error parsing CSV:', error);
        reject(error);
      }
    };

    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
};

// log stream client
export class LogStreamClient {
  private ws: WebSocket | null = null;
  private recordId: number | null = null;
  private callbacks: ((log: any) => void)[] = [];

  connect(recordId: number, onLog: (log: any) => void) {
    this.recordId = recordId;
    this.callbacks.push(onLog);

    // construct WebSocket url via proxy
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/ws/logs/${recordId}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log(`WebSocket connecté pour les logs de l'analyse ${recordId}`);
    };

    this.ws.onmessage = (event) => {
      try {
        const log = JSON.parse(event.data);
        this.callbacks.forEach(callback => callback(log));
      } catch (error) {
        console.error("Erreur parsing log WebSocket:", error);
      }
    };

    this.ws.onclose = () => {
      console.log(`WebSocket déconnecté pour les logs de l'analyse ${recordId}`);
    };

    this.ws.onerror = (error) => {
      console.error("Erreur WebSocket:", error);
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.callbacks = [];
    this.recordId = null;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const logStreamClient = new LogStreamClient();

export const collectionApi = {
  uploadDataset: async (formData: FormData) => {
    const response = await apiClient.post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
  runAnalysis: async (datasetId: string, formData: FormData) => {
    const response = await apiClient.post(`/analyze/${datasetId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
  getHistory: async (userId: string) => {
    const response = await apiClient.get(`/v1/data/history/${userId}`);
    return response.data;
  },
  getResult: async (recordId: number) => {
    const response = await apiClient.get(`/v1/data/result/${recordId}`);
    return response.data;
  },
  getFullResult: async (recordId: number) => {
    const response = await apiClient.get(`/v1/data/result/${recordId}/full`);
    return response.data;
  },
  getProcessingLogs: async (recordId: number) => {
    const response = await apiClient.get(`/v1/data/logs/${recordId}`);
    return response.data;
  },
  deleteAnalysis: async (analysisId: number) => {
    const response = await apiClient.delete(`/v1/data/analysis/${analysisId}`);
    return response.data;
  },
  deleteDataset: async (datasetId: number) => {
    const response = await apiClient.delete(`/v1/data/dataset/${datasetId}`);
    return response.data;
  },
  getServiceHealth: async () => {
    try {
      const response = await apiClient.get("/v1/health");
      console.log("Health check response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Health check failed:", error);
      throw new Error("Impossible de récupérer l'état de santé des services");
    }
  },
  getThroughputMetrics: async () => {
    try {
      const response = await apiClient.get("/v1/metrics/throughput");
      return response.data.throughput;
    } catch (error) {
      console.error("Failed to fetch throughput metrics:", error);
      return [];
    }
  },
  getAccuracyMetrics: async () => {
    try {
      const response = await apiClient.get("/v1/metrics/accuracy");
      return response.data.accuracy;
    } catch (error) {
      console.error("Failed to fetch accuracy metrics:", error);
      return [];
    }
  },
  getDatasets: async (userId: string) => {
    try {
      const history = await collectionApi.getHistory(userId);

      const datasets = history.map((item: any) => ({
        id: item.id.toString(),
        name: item.name || `Dataset ${item.id}`,
        rows: item.row_count || 0,
        columns: item.headers || [],
        sizeKb: (item.file_size || 0) < 1024 ? (item.file_size || 0) / 1024 : Math.round((item.file_size || 0) / 1024),
        uploadedAt: item.created_at || new Date().toISOString(),
        status: (item.status || 'raw') as any,
        source: 'upload' as const,
        owner: userId,
      }));

      return datasets;
    } catch (error) {
      console.error("Error in getDatasets:", error);
      return [];
    }
  },
};
