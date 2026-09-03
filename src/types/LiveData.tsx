type LiveData = {
  data: { [key: string]: LiveRecord };
};

export type LiveRecord = {
  cpu: {
    usage: number;
  };
  ram: {
    used: number;
  };
  swap: {
    used: number;
  };
  disk: {
    used: number;
  };
  network: {
    up: number;
    down: number;
  };
  connections: {
    tcp: number;
    udp: number;
  };
  uptime: number;
  updated_at: string;
  online?: boolean;
  ping?: {
    [taskId: string]: {
      name: string;
      latest: number;
      avg: number;
      tail: number;
      loss: number;
      min: number;
      max: number;
    };
  };
};

export type LiveDataResponse = {
  data: LiveData;
};
