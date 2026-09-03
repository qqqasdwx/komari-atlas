"use client";

import React from "react";

interface PublicInfo {
  disable_password_login: boolean;
  oauth_provider?: string;
  oauth_enable?: boolean;
  o_auth_provider?: string;
  o_auth_enabled?: boolean;
  sitename?: string;
}

interface Response {
  data?: PublicInfo;
}

interface PublicInfoContextType {
  publicInfo: PublicInfo | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const PublicInfoContext = React.createContext<PublicInfoContextType | undefined>(
  undefined
);

export const PublicInfoProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [publicInfo, setPublicInfo] = React.useState<PublicInfo | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const refresh = () => {
    setError(null);
    setIsLoading(true);
    fetch("/api/public")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch public info");
        }
        return response.json();
      })
      .then((resp: Response) => {
        if (resp && resp.data) {
          setPublicInfo(resp.data);
        } else {
          setPublicInfo(null);
        }
      })
      .catch((err) => {
        setError(err.message || "An error occurred while fetching public info");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  React.useEffect(() => {
    refresh();
  }, []);

  return (
    <PublicInfoContext.Provider value={{ publicInfo, isLoading, error, refresh }}>
      {children}
    </PublicInfoContext.Provider>
  );
};

export const usePublicInfo = () => {
  const context = React.useContext(PublicInfoContext);
  if (!context) {
    throw new Error("usePublicInfo must be used within a PublicInfoProvider");
  }
  return context;
};
